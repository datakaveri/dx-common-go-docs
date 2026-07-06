---
id: best-practices
title: Best Practices
sidebar_position: 7
---

# Best Practices

The cross-module rules that keep 15+ services consistent. Module-specific practice lives on each module page; this is the platform-wide contract.

## Boot & lifecycle

- **One `signal.NotifyContext` in `main`**, passed to *everything* long-running (`httpserver.Run`, `ConsumerRunner.Run`, `scheduler.Start`, `Dispatcher.Run`). Never install a second signal handler.
- **Migrations run before traffic**, in `main` or an init container — never lazily.
- **Constructors that dial take your boot context** — a hung dependency then can't hang boot forever.
- Shutdown order = boot order reversed: drain HTTP → flush audit → flush spans → close pools/publishers (defers handle this naturally).

## Errors

- Handle an error **once**: wrap with `%w` on the way up, log at the top via `WriteServerError`'s closure.
- Translate driver errors at the repository boundary (`dxerrors.MapPostgresError`) so causes stay in the chain and handlers stay driver-agnostic.
- Never branch on `err.Error()` text or plain type assertions — `errors.Is/As` and `dxerrors.From` only.
- Client-visible messages carry no internals; internals ride the *cause*.

## HTTP contract

- Responses only through `response` writers, errors only through `dxerrors` writers. Zero hand-rolled envelopes.
- Every list endpoint parses through `request.From(r)` with explicit allowlists; unknown params are a 400, not a shrug.
- Specs are embedded and validated (`ValidateRequests: true`) in every environment.

## Data

- Respect the three-legged persistence standard: repository DSL for CRUD/dynamic, sqlc for static complex reads, raw `$N` SQL for the exotic tail. No ORMs, no string-built identifiers from input.
- State-changing domain events go through the **outbox**; consumers are idempotent (message-id dedup) because delivery is at-least-once.
- Cache is an optimization, never a source of truth: misses are normal, write failures are tolerated, invalidation happens on write.

## Concurrency

- No fire-and-forget goroutines: everything `go`-ed is owned by a context and awaited on shutdown (the library's own workers model this).
- Channels are size 0 or 1 unless a written justification says otherwise; bounded queues drop-with-warning rather than block request paths (see auditing).

## Observability

- `observability.Init` unconditionally; `WithTracing()` unconditionally; per-driver tracing flags on. All free without a collector.
- Readiness = hard dependencies only. Liveness = process up, nothing else.
- Alert on breaker state changes and DLQ depth — those are the platform's early-warning signals.

## Testing & CI

- The five gates on every repo: `gofmt`, `go build`, `go vet`, `go test -race`, `golangci-lint` — plus the library's coverage ratchet.
- Integration tests skip without Docker; they never fail for environmental reasons.
- More than ~30 lines of generic infrastructure in a service is a PR to dx-common-go instead.
