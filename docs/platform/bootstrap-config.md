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

The startup order is fixed: signals, typed config, logger, schema migrations, stores, service wiring, workers, and HTTP. Shutdown drains HTTP, stops workers, then closes infrastructure in reverse registration order.

## App registrations

Wire receives App with Cfg, Log, Name, Version, DB, Tx, and Health. It can register:

- Go(name, fn) — a worker whose failure stops the service;
- Background(name, fn) — a supervised worker restarted with capped backoff;
- Closer(name, fn) — a LIFO shutdown hook;
- Probe(name, checker) — a service-specific readiness check.

Use Required when no correct response is possible without the dependency. Use Degrade only when Wire handles the nil dependency and a tested fallback exists.

## Current dependency set

Bootstrap directly resolves PostgreSQL and embedded migrations. Construct cache, event, search, storage, and vendor clients in Wire, register their health checks and closers, and keep them behind platform or service ports.
