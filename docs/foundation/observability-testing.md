---
title: Observability, Reliability, and Testing
description: Logs, metrics, traces, audit, resilience, and disposable test infrastructure.
---

# Observability, reliability, and testing

## Always-on signals

logging configures structured logs. metrics exposes Prometheus collectors. observability provides tracing helpers. auditing carries structured audit activity.

At service boundaries, include service and version, operation, request or trace ID, safe actor and target identifiers, duration, outcome, and error classification. Do not log bearer tokens, cookie values, private keys, credentials, or unredacted model prompts.

## Resilience

resilience contains reusable retry and circuit behavior. Apply retries only to transient and idempotent operations, use capped exponential backoff with jitter, and respect context cancellation. A circuit breaker protects callers from an unhealthy dependency; it does not make the dependency optional.

platform/bootstrap supervises background workers and owns shutdown. platform/database/sql provides retry only for serialization and deadlock transactions. platform/cache provides bounded locks and fixed-window limits. Choose the narrowest primitive that matches the failure.

## Tests

dxtest provides fixtures and disposable infrastructure helpers, including containers for datastore integration tests.

Test packages should:

- use table-driven cases for domain and mapping rules;
- call typed handlers directly without a router;
- use the in-memory cache and event bus for application tests;
- use container adapters for driver and schema behavior;
- run the race detector for concurrency and lifecycle changes;
- check for goroutine leaks in worker or client packages;
- fuzz parsers, binders, envelopes, and identifier normalization.

See [Testing a service](../guides/testing.md) for the complete verification ladder.
