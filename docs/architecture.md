---
title: Architecture and Dependency Rules
description: Package layers, stable seams, adapters, escape hatches, and design constraints.
---

# Architecture and dependency rules

The SDK is organized so domain code depends on small interfaces and portable value types, while infrastructure remains at the edge.

~~~mermaid
flowchart TB
    L4[L4 service composition] --> L3[L3 adapters and bootstrap]
    L3 --> L2[L2 application services]
    L2 --> L1[L1 ports]
    L1 --> L0[L0 errors, identity, paging, config values]
    Adapters[pgx, Redis, AMQP adapters] --> Contracts[SQL, cache, event contracts]
    Contracts --> L0
~~~

## Package roles

- platform/config, platform/errors, platform/paging, and platform/security/identity are portable kernel contracts.
- platform/http adapts typed handlers to net/http and owns response rendering.
- platform/database/sql, platform/cache, and platform/events define interfaces and portable behavior.
- platform/database/sql/pgx, platform/cache/redis, and platform/events/amqp are named vendor adapters and escape hatches.
- platform/bootstrap is a composition root. No business package imports it.

## Dependency direction

Business and application packages:

- may use context, domain types, and portable platform contracts;
- define narrow repository/client interfaces next to their consumer;
- do not import pgx, Redis, AMQP, router, cloud, or search clients.

Adapter packages implement those ports. cmd/server chooses implementations and owns concrete dependency construction.

## What the SDK owns

The SDK owns behavior that must be uniform across services: configuration precedence, safe error rendering, identity context, route declarations, response envelopes, health, transaction propagation, event envelopes, cache semantics, worker supervision, and shutdown order.

It does not own domain rules, domain entities, service-specific SQL, service-specific event payloads, or orchestration between business capabilities.

## Abstraction test

Add a reusable abstraction only when:

1. at least two real consumers need the same semantic contract;
2. the API reduces policy variation rather than hiding useful behavior;
3. failure, lifecycle, and observability semantics are explicit;
4. an escape hatch exists for operations the contract should not absorb;
5. focused tests prove both the interface and primary adapter.

See [Extension points](guides/extension-points.md) before expanding the SDK.
