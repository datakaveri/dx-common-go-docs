---
title: Structure a Composition Root
description: Keep a growing Wire function readable — one ordered build list, one file per dependency, transports that only read.
---

# Structure a composition root

The composition root is the one place where a service assembles itself: `cmd/server`, the code behind `Spec.Wire` and `Spec.GRPC`. [Bootstrap](../platform/bootstrap-config.md) owns the *order* of start-up and shutdown. This guide is about the code *inside* `Wire` once a service has more than two or three dependencies.

Worked example: [`dx-user-go/cmd/server`](https://github.com/datakaveri/dx-user-go/tree/dev/cmd/server) on `dev`, merged in [PR #24](https://github.com/datakaveri/dx-user-go/pull/24) (merge commit `207ce6e`). **Status: implemented on `dev`**; not yet released to `main` or deployed.

## The problem

A `Wire` function grows one dependency at a time. Before the refactor, dx-user-go's `main.go` was 363 lines:

- the `Spec`;
- a ~190-line `wire()` building about 15 components in an order that mattered but wasn't visible;
- gRPC set-up that read a struct `wire()` filled as a side effect;
- assorted helpers.

Nobody could say what started in which order, which dependencies were optional, or what closed at shutdown.

## The layout

One small file per job, all `package main`:

| File | One job |
|---|---|
| `main.go` | Only the `bootstrap.Spec` |
| `components.go` | `build()`: the ordered list of everything the service is made of, returning one `components` value |
| one file per outside system | Open it, register its closer and probe, return it. dx-user-go has `broker.go`, `identity.go`, `credits.go`, `catalogue.go`, `mail.go` and `audit.go`. |
| `http.go`, `grpc.go` | Turn `components` into an interface. They only read it. |
| `doc.go` | A short boot/shutdown outline for readers of the code |

`main.go` then reads as a description of the service:

~~~go
func main() {
    var c *components // written once by Wire, then only read by GRPC

    bootstrap.Run(bootstrap.Spec[config.Config]{
        Name:   "dx-user-go",
        Config: config.Options(),
        Deps: func(cfg *config.Config) bootstrap.Deps {
            return bootstrap.Deps{
                Migrations: bootstrap.Migrations(userdb.Migrations, "migrations", "schema_migrations_user"),
                Postgres:   bootstrap.Required(cfg.Postgres),
            }
        },
        Wire: func(_ context.Context, app *bootstrap.App[config.Config]) (http.Handler, error) {
            built, err := build(app)
            if err != nil {
                return nil, err
            }
            c = built
            return newHTTPHandler(app, c)
        },
        GRPC: func(app *bootstrap.App[config.Config]) (bootstrap.Servable, error) {
            return newGRPCServer(app, c)
        },
    })
}
~~~

`build()` is a numbered list that fits on one screen. Its doc comment states the order, and which steps register closers:

~~~go
// build connects every dependency bootstrap does not manage and assembles the
// domain services, in this order:
//
//  1. token issuer        (fatal if the signing key is invalid)
//  2. message broker      (optional)        registers shutdown hook "rabbitmq"
//  3. workload signer     (off, or fatal if misconfigured)
//  4. credits client      (off, or fatal)   registers shutdown hook "credits"
//  5. catalogue client    (optional, fatal if misconfigured) — hook "catalogue"
//  ...
func build(app *bootstrap.App[config.Config]) (*components, error)
~~~

Each dependency file holds one constructor with a comment covering three things:

- **what it is**, in plain words;
- **whether it is required, optional, or must be stated** (no default);
- **what happens when it is missing.**

~~~go
// openCatalogue connects to dx-catalogue-go, which answers "does this item
// exist, and who owns it?" for rules that name specific items.
//
//   - catalogue.address empty: returns noCatalogue, which refuses every item
//     check (fails closed).
//   - address set: a client that cannot be built is fatal.
func openCatalogue(app *bootstrap.App[config.Config], signer *issuer.Source) (credential.Items, error)
~~~

## Rules

1. **One built value, only read afterwards.** `build` returns everything in one struct. `Spec.GRPC` may read it because bootstrap always calls `Wire` first. Don't have `Wire` fill fields that another callback reads later.
2. **Closer order is part of the contract.** Closers run in reverse registration order. Register them in the order dependencies are opened, and write that order down in `build`'s comment. Moving a step reorders shutdown.
3. **Return a true nil for "off" when the result is an interface.** In Go, a nil pointer stored in an interface is not equal to `nil`. If `openCredits` returned a nil `*credits.Client` as a `service.CreditProvisioner`, the caller's `if credits != nil` would see "on" and panic on first use. So:
   - return the interface type itself;
   - return a bare `nil` when the dependency is off;
   - the same goes for `bootstrap.Servable`: a nil `*grpcserver.Server` stored in it is not "no gRPC server".
4. **Build shared clients once.** dx-user-go created five identical Keycloak clients and two workload signers, each with its own token cache. One of each, passed down, behaves the same and is easier to follow.
5. **Lazy clients hide misconfiguration.** `grpc/client.Dial` uses `grpc.NewClient`, which connects on the first RPC. A wrong address therefore starts cleanly and fails on the first request. Test the real call path, not just start-up.
6. **Keep behaviour while moving code.** When restructuring, keep every log and error string byte-identical, because operators search for them. Diff the string literals before and after.
7. **Optional dependencies must not decide readiness.** `App.Probe` is critical. Use `app.Health.AddOptional` for a dependency the service degrades around. See [Known gaps](../platform/bootstrap-config.md#known-gaps).

## How it was verified

The refactor was accepted only after each layer below passed. Reuse the same ladder for any composition-root change.

| Layer | Check | What it proves |
|---|---|---|
| Unit | `go build ./... && go vet ./... && go test ./...`, plus tests for moved helpers (path-scoped middleware, fail-closed fallback, gRPC off at port 0) | Nothing broke at compile or unit level |
| Boot modes | `DX_BOOT_MODE=config-check` exits 0; an unknown mode exits 1; without a database, old and new binaries print the same error | Config and failure paths are unchanged |
| Local stack | Run with Postgres and RabbitMQ; `/healthz/ready` up; SIGTERM logs `shutting down` → `stopped`, exit 0 | Normal start and stop work |
| Real environment | The same binary against the hosted dev environment, exercising every controller | Wiring holds against real dependencies |
| Every optional part on | gRPC port set, strict workload identity, credits, catalogue, e-mail | Each constructor and closer runs |
| Reject path | Direct HTTP and gRPC calls without a valid workload credential → 401 / `Unauthenticated` | The verifier is wired into both interfaces |
| Accept path | The same calls through a local `dx-gateway-go` → 200 with the right user | Signed subject headers are trusted only from a verified gateway |
| Outbound call | A request that makes dx-user-go call dx-catalogue-go succeeds; with the catalogue stopped, the same request fails | The signer and the downstream client are really used, not just built |

The full procedure, with commands and safety rules for shared environments, is [Verify a boot cycle](https://datakaveri.github.io/go-learning/operations/verify-boot-cycle) in the CDPG Go Developer Portal.
