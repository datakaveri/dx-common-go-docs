---
id: release-notes
title: Release Notes
sidebar_position: 11
---

# Release Notes

## v1.0.0 — 2026-07-06

The first stable surface, produced by five consolidation waves (W0–W4) over the pre-1.0 library. Full upgrade steps: [Migration → v1.0.0](/migration/v1).

### Highlights

- **One way per concern**: single response API (`ServiceWriter` + `PageInfo`), single error surface (`dxerrors` with cause-preserving mapping), single publish (`ReliablePublisher`) and consume (`ConsumerRunner`) paths.
- **Correctness fixes**: malformed config files abort boot; error causes traverse `errors.Is/As` across the taxonomy boundary; audit publishing is a bounded drained queue; `PublishJSON` carries context (deadlines + trace linkage); invalid consumer outcomes dead-letter instead of acking.
- **Naming & structure**: `dxerrors` (no stdlib shadowing), identity under `auth/*` (`auth/headers`, `auth/appid/appidpb`), `FromContext` accessors, `Must*` boot wrappers, ctx-taking dialing constructors.
- **Lifecycle**: `httpserver.Run(ctx)` — one signal context stops server, consumers, schedulers, dispatchers together.
- **Testing**: testcontainers for Postgres/Redis/RabbitMQ/MinIO with env-DSN overrides; coverage ratchet in CI; security-critical packages (JWT, headers, resolver) at 70–90% coverage.

### Removed

Legacy zero-consumer surfaces: the `model` package, deprecated cache/pagination/response/config APIs, the parallel middleware audit system, `errors.Handle*` helpers, per-service URN constant tables, `StartTLS`, and the silent-death `Client.Consume` path.
