---
id: design-principles
title: Design Principles
sidebar_position: 3
---

# Design Principles

dx-common-go is a **library of modules with framework intent**: Spring-Boot's division of labor (the framework owns infrastructure, services own business logic) executed with Go's idioms — composition, generics, functional options, explicit APIs. No reflection magic, no annotations, no ambient behavior.

## Philosophy

1. **The library owns infrastructure; services own domain.** If a service accumulates more than ~30 lines of generic infrastructure, that code belongs here — as a PR to dx-common-go, not a service-local helper.
2. **Business-free by construction.** No domain vocabulary, no service-specific types, no fleet knowledge (each service owns its own URN namespace, its own migrations, its own topology names). The only platform-shaped types are wire-contract mirrors (audit records, email requests) that encode *protocol*, not *business*.
3. **One supported way per concern.** Publishing goes through `ReliablePublisher`; consuming through `ConsumerRunner`; responses through `ServiceWriter`; errors through the `dxerrors` taxonomy. Duplicated or deprecated surfaces get deleted, not accumulated.
4. **Config-driven behavior.** Environment and YAML decide schemas, endpoints, toggles; changing them is never a code change. Missing config files are fine (defaults + env), malformed ones abort boot loudly.
5. **Everything is cancellable.** `context.Context` is the first parameter of anything that blocks — including constructors that dial (`NewPool(ctx, …)`, `redis.NewClient(ctx, …)`). One `signal.NotifyContext` in `main` stops the HTTP server, consumers, schedulers, and dispatchers together.

## Module independence & composition

Modules are independent: importing `resilience` pulls no Postgres; importing `cache` pulls no Redis driver. Services compose them at boot — the library never wires modules into each other behind your back.

**Dependency rules (enforced in review):**

- **Leaf utilities** (`dxerrors`, `config`, `resilience`, `metrics`) import only the standard library (plus their driver). Anything may import them.
- **No cross-store imports**: `database/postgres/*` and `database/elasticsearch/*` never import each other.
- **Within a store, layering is one-directional**: `query`/`client` are leaves → `dao`/`mapping`/`indexing` → `repository`. No layer reaches up.
- **Instrument at the driver seam** (pgx `Tracer`, ES `Transport`, redis `InstrumentTracing`, AMQP headers) — one place per driver covers every call path; no framework-level interception layer.
- Library packages may import the OpenTelemetry **API**, never the SDK — only `observability.Init` (called by services) touches the SDK.

## API conventions

These bind every new exported API:

| Convention | Rule |
|---|---|
| Construction | `New…` constructs; functional `With…` options configure. Constructors that can fail return `(T, error)`; `Must…` variants exist for boot-time wiring |
| Context | `ctx` first, always — including dialing constructors. Context accessors are `XFromContext(ctx)` |
| Lookups | `Get`/`FindByID` = by-ID, not-found is an error. `Find*` = condition queries. `Search*` = ES DSL. **Cache miss = `(zero, false, nil)` — never an error** |
| Errors | Wrap with `%w`; every non-2xx upstream maps into the `dxerrors` taxonomy; log **or** return, never both |
| Enums | Start at `iota + 1` so the zero value is never a silently-valid member |
| Writers | HTTP responses only through `response` writers; errors only through `dxerrors.WriteError`/`WriteServerError` |

## Backward compatibility & versioning

- **Inside the DX fleet**, services consume the library via `replace ../dx-common-go` — one atomic version for the whole fleet. Breaking changes are executed as coordinated *waves*: one library change-set plus a scripted mechanical migration across every consumer, verified fleet-wide before merge. There is no dual-support window inside a wave.
- **Migration guides** document every wave with exact old→new mappings; see [Migration Guides](/migration).
- **Semantic versioning** governs tagged releases (`v1.0.0` onward): patch = fixes, minor = additive API, major = breaking. Documentation is versioned per release — the version you're reading matches a tag.
- Deprecations that do ship carry a `// Deprecated:` comment naming the replacement, and live at most one release.

## Extending the library

A new module qualifies when it is (all four):

1. **Generic** — at least two services need it, and it carries no business rules.
2. **Config-driven** — behavior differences are configuration, not code forks.
3. **Self-contained** — respects the dependency rules above; no cross-store or upward imports.
4. **Tested and documented** — table-driven unit tests with injectable seams (clock, transport, sleep), container-backed integration tests that **skip (never fail)** without Docker, a package comment, and a page in these docs.

Deliberately **not** built, so you don't have to ask: an ORM · JOIN/CTE query DSL (use sqlc) · repository hook chains · a cron-expression engine (use the interval scheduler or K8s CronJobs) · distributed leader election (Postgres advisory locks suffice) · hot config reload (a rollout is the reload) · secrets management (external-secrets → env → `config`).
