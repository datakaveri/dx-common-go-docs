---
id: faq
title: FAQ
sidebar_position: 9
---

# FAQ

### Is this a framework I have to adopt wholesale?

No. Every module stands alone — you can adopt exactly one (say, `resilience`) in an existing service. "Framework" describes the *intent* (the library owns infrastructure), not a runtime that takes over your `main`.

### Why is there no ORM?

The three-legged persistence standard (repository DSL + sqlc + raw parameterized SQL) covers what an ORM would, without hidden queries or migration coupling. See [postgres](/modules/postgres).

### Why does a cache miss return `(zero, false, nil)` instead of an error?

A miss is a normal outcome, not a failure — conflating them forces every caller into error-inspection to distinguish "absent" from "Redis is down". The `ok` bool is the contract; errors mean the backend failed.

### Why do some constructors panic (`Must*`) and others return errors?

They all return errors. `Must*` variants exist for boot-time wiring where a config error should end the process anyway (`template.Must` precedent). Use the error-returning form when you need to handle it.

### Why does `PublishJSON` need a context?

Deadlines and tracing. The caller's ctx bounds the publish and carries the trace that gets stamped onto message headers — without it, consumer spans are orphans.

### Do I need the gateway to use auth?

No. `resolver.Config{AllowDirect: true, JWT: …}` validates Bearer JWTs directly against Keycloak. Behind the gateway, HMAC headers are preferred because the JWT was already validated once.

### How do services get the same library version?

Inside the DX workspace, by `replace ../dx-common-go` — the fleet moves atomically. External consumers use tagged releases and semver.

### Where are the SADx modules used?

`crypto/envelope`, `mtls`, and `trust` are dormant in core DX (config-gated off) and exist for federated deployments. They're generic and safe to use elsewhere.

### Why isn't there an Elasticsearch testcontainer helper?

ES 8 containers require TLS/auth plumbing the helper doesn't carry yet; ES integration tests bind `ES_TEST_ADDR` (the compose stack) and skip otherwise. Postgres/Redis/RabbitMQ/MinIO helpers exist today.

### Can I add my service's types to the library?

Only if they're generic (needed by ≥2 services, no business rules). The bar is deliberately high — see [Design Principles → Extending](/design-principles#extending-the-library).
