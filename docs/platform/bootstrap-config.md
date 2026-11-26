---
title: Bootstrap and Configuration
description: Declarative process lifecycle, typed config, dependencies, workers, and shutdown.
---

# Bootstrap and configuration

## platform/config

Load merges platform defaults, service defaults, an optional YAML file, then environment variables:

~~~go
type Config struct {
    platformconfig.Base
    Postgres dxsql.Config
}

func (c Config) Validate() error {
    return platformconfig.CheckSecret(
        "internal_auth.shared_secret",
        c.InternalAuth.SharedSecret,
    )
}

cfg, err := platformconfig.Load[Config](platformconfig.Options{
    Defaults: map[string]any{
        "postgres.max_conns": 10,
    },
})
~~~

Config implements Configurer by embedding Base. Base contains log level, server timeouts and request limit, schema mode, internal HMAC settings, and OpenAPI settings.

Environment names replace dots with underscores: postgres.max_conns becomes POSTGRES_MAX_CONNS. A missing file is valid; malformed configuration is not.

## platform/bootstrap

Run accepts a declarative Spec:

~~~go
bootstrap.Run(bootstrap.Spec[config.Config]{
    Name:    "dx-example-go",
    Version: buildVersion,
    Config:  config.Options(),
    Deps: func(c *config.Config) bootstrap.Deps {
        return bootstrap.Deps{
            Migrations: bootstrap.Migrations(
                exampledb.Migrations,
                "migrations",
                "schema_migrations_example",
            ),
            Postgres: bootstrap.Required(c.Postgres),
        }
    },
    Wire: wire,
})
~~~

The order is fixed by `run` and `serve` in `platform/bootstrap/bootstrap.go`. The two sections below give it step by step.

## Boot sequence

Verified against `platform/bootstrap/bootstrap.go` at dx-common-go `cca4d75`, and exercised end-to-end on 2026-11-26 (see [Structure a composition root](../guides/composition-root.md#how-it-was-verified)).

1. **Boot mode.** `bootMode` reads `DX_BOOT_MODE`: `serve` (or unset), `config-check`, or `migrate-only`. It runs first, so a typo fails before an unrelated config error can hide it. An unknown value is an error, never a silent fallback to serving.
2. **Signals.** `signal.NotifyContext` installs the SIGINT/SIGTERM handler before migrations, so a stop signal during a migration cancels it cleanly.
3. **Config.** `Spec.Load`, or `config.Load[C]` by default. No logger exists yet, so a failure is written to stderr by `Run`. `config-check` exits 0 here, without contacting any dependency.
4. **Logger, then telemetry.** The logger is built from config, so `log_level` and `log_format` take effect. OpenTelemetry starts next. If it fails, a warning is logged and the service runs without tracing. Telemetry is registered as the **first** closer, so it flushes **last**.
5. **Migrations.** These run on a dedicated connection before the pool opens, so no repository sees an older schema than the code expects.
   - A failure is always fatal, even with `Degrade(postgres)`.
   - `schema_mode` has no default and must be set when migrations are declared.
   - Declaring migrations without Postgres is an error.
   - `migrate-only` forces `schema_mode=migrate` and exits 0. It errors if the service declares no migrations.
6. **Postgres.** Opens the pool. With `Required`, a failure is fatal. With `Degrade`, it logs a warning and leaves `App.DB` nil. On success it registers the critical `postgres` readiness check and the `postgres` closer.
7. **`Spec.Wire`, then `Spec.GRPC`.** The service builds everything else. `GRPC` always runs after `Wire`, so it may read what `Wire` built. Returning a nil `Servable` means "no gRPC server".
8. **Serve.** Workers, the HTTP server and the gRPC server start **concurrently** in one errgroup, a group of goroutines that is cancelled together. The process then waits for a stop signal, or for any server or non-supervised worker to fail.

HTTP server defaults:

| Setting | Default |
|---|---|
| read timeout | 15 s |
| write timeout | 30 s |
| idle timeout | 120 s |
| read-header timeout | 10 s |

A negative write or idle timeout means "no limit", for streaming responses.

## Shutdown sequence

`serve` stops in this order:

1. **Drain HTTP.** `http.Server.Shutdown` stops accepting connections and waits for in-flight requests. The gRPC server is cancelled by the **same** context, so it runs its own `GracefulStop` at the same time as the HTTP drain, not before or after it. The gRPC drain is bounded by `grpc.shutdown_timeout`, then a forced `Stop`.
2. **Cancel workers** with their own context, only after HTTP has drained.
3. **Wait for workers** and the gRPC server. A worker that ignores cancellation makes the process exit non-zero.
4. **Run closers** in reverse registration order. A failing closer is logged and the rest still run. **Successful closers log nothing**, so the closing order cannot be read from logs; it is guaranteed by code.

**Time limits:** each of phases 1, 3 and 4 is bounded **separately** by `server.shutdown_timeout`, which defaults to 20 s. The worst case is therefore about 60 s.

**Exit code:** non-zero if a worker failed, a port could not be bound, or workers outlived the limit. Otherwise 0.

## App registrations

Wire receives App with Cfg, Log, Name, Version, DB, Tx, and Health. It can register:

- Go(name, fn) — a worker whose failure stops the service;
- Background(name, fn) — a supervised worker restarted with capped backoff, from 500 ms doubling to 30 s;
- Closer(name, fn) — a LIFO shutdown hook;
- Probe(name, checker) — a **critical** readiness check. It calls `Health.Add`, so a failing check turns `/healthz/ready` into 503.

For a dependency the service genuinely works without, register its check with `app.Health.AddOptional(name, checker)` instead. It is reported in `/healthz/ready` but never makes the replica unready. `Probe` has no optional variant.

Use Required when no correct response is possible without the dependency. Use Degrade only when Wire handles the nil dependency and a tested fallback exists.

## Current dependency set

Bootstrap directly resolves PostgreSQL and embedded migrations. Construct cache, event, search, storage, and vendor clients in Wire, register their health checks and closers, and keep them behind platform or service ports. [Structure a composition root](../guides/composition-root.md) shows a layout that keeps a growing `Wire` readable.

## Known gaps

Recorded 2026-11-26. Planned work, not current behaviour.

| Gap | Effect | Direction |
|---|---|---|
| Each shutdown phase gets its own `server.shutdown_timeout` | Worst case is about 60 s, longer than the Kubernetes default 30 s grace period. The pod can be killed before closers run, so buffered audit or telemetry data is lost. | One total budget split across phases, set below the grace period |
| No readiness flip before draining | The listener closes as soon as SIGTERM arrives. Requests routed during endpoint propagation can fail on every rollout unless the deployment adds a `preStop` delay (not checked). | Report not-ready, wait briefly, then drain |
| A supervised (`Background`) worker that returns nil is never restarted, and its backoff never resets after a healthy run | A loop that exits cleanly by mistake stops for good. A worker that fails once a day still waits up to 30 s after a long healthy run. | Reset backoff after a healthy period; document or log clean exits |
| Silent successful closers | The shutdown order and timings can't be observed | Log one line per step with its duration |
| `App.Probe` is always critical | An optional dependency registered with `Probe` can take every replica out of traffic. Example: dx-user-go's RabbitMQ check, where the broker is optional by design. | Use `Health.AddOptional` for optional dependencies (deferred for dx-user-go) |
