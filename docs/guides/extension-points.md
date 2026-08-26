---
title: Extension Points
description: Add adapters and reusable contracts without leaking vendors or growing a universal abstraction.
---

# Extension points

## Add a vendor adapter

When a platform interface already exists:

1. implement it in a named subpackage, such as platform/cache/newstore;
2. accept explicit typed configuration;
3. expose a constructor and lifecycle ownership;
4. map vendor errors to existing semantics;
5. implement health and telemetry;
6. run the same conformance tests as the primary adapter.

Do not add vendor options to the portable interface.

## Add a platform contract

Start from two service call sites and write the narrow semantic intersection. Keep domain payload types owned by the services. Make failure, concurrency, cancellation, retries, and shutdown visible in the API.

Avoid:

- a mega-client that wraps unrelated systems;
- generic options with undocumented combinations;
- interfaces mirroring every method of a vendor SDK;
- hidden goroutines or global clients;
- automatically retrying non-idempotent work;
- swallowing unsupported versions or degraded state.

## Escape hatches

An escape hatch should be explicit and easy to audit:

- platform/database/sql/pgx.Pool for an adapter needing pgxpool;
- platform/database/sql.SQL or sqlc for queries outside the repository DSL;
- platform/http.HandleRaw for protocol-owned responses;
- cache.Scope.Key only when a real external integration needs the rendered key.

If escape-hatch usage becomes common, revisit the contract with evidence. Do not expand it after one unusual operation.
