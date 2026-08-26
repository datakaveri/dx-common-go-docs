---
title: Operational Contracts
description: Lifecycle, health, telemetry, failure policy, and resource ownership for SDK consumers.
---

# Operational contracts

## Lifecycle

Construct shared clients once in Wire, pass interfaces to services, and register one closer with the composition root. No request handler creates a database pool, broker connection, Redis client, or telemetry provider.

bootstrap shuts down in this order:

1. stop accepting and drain HTTP;
2. cancel and wait for workers;
3. run closers in reverse order.

Worker functions must return on context cancellation.

## Mandatory versus degraded

Fail boot or readiness for a dependency required to produce correct results. Continue only when the service has a defined fallback, such as committing events to a durable outbox while the broker is unavailable.

Cache misses are ordinary. Cache failures are operational signals. Do not turn a primary-store error into an empty successful result.

## Telemetry

Adapters emit dependency name, operation, duration, result, and trace context without payload secrets. Applications add domain operation and safe identifiers. Use bounded metric labels; never label by user, resource ID, raw URL, or error string.

## Capacity

Configure bounded SQL pools, Redis timeouts, AMQP prefetch and retry, HTTP body and time limits, object-transfer limits, and worker concurrency. Defaults are starting points, not an SLO.

## Upgrade safety

During a rolling update, old and new service replicas can overlap. Keep HTTP, event, schema, and cache formats compatible for that window. Purge or namespace caches when representation compatibility cannot be maintained.
