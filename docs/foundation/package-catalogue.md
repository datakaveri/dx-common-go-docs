---
title: Foundation Package Catalogue
description: Maintained non-platform packages, their roles, and preferred platform equivalents.
---

# Foundation package catalogue

The source tree contains platform contracts and a broader set of foundation packages. When an equivalent platform package exists, new services should prefer it.

## Identity, security, and trust

| Packages | Purpose |
|---|---|
| auth, auth/jwt, auth/resolver | JWT and identity resolution adapters |
| auth/authorization, auth/fga | Authorization clients and OpenFGA integration |
| auth/appid | Application-credential integration |
| crypto/envelope | Signed and encrypted envelope primitives |
| mtls | Mutual-TLS configuration and clients |
| transport/headers | Signed downstream subject headers |
| trust | Trust-list and certificate support |

Use platform/security/identity for application-layer caller data and platform/http/middleware for the standard HTTP resolver.

## Data and storage

| Packages | Purpose |
|---|---|
| database/postgres/client | PostgreSQL client utilities |
| database/postgres/dao | Established DAO helpers |
| database/postgres/migrate | Embedded schema migrations |
| database/postgres/query | Query helpers |
| database/postgres/repository | Established repository helpers |
| database/postgres/sqlcx | sqlc support |
| database/postgres/transaction | Transaction utilities |
| database/elasticsearch/client | Elasticsearch client |
| database/elasticsearch/indexing, mapping, query, repository | Search index and repository support |
| database/redis | Redis client support |
| storage/s3, storage/sts | S3 objects and short-lived credentials |

Prefer platform/database/sql for new PostgreSQL access and platform/cache for cache semantics. Search, S3, and STS currently use their foundation packages.

## Messaging and background work

| Packages | Purpose |
|---|---|
| messaging/rabbitmq | RabbitMQ client, publisher, and consumer support |
| messaging/outbox | Established outbox support |
| scheduler | Recurring jobs |
| notify/email | Email templates and SMTP dispatch |

Prefer platform/events and platform/events/amqp for new domain events. Use scheduler or email packages where no platform seam exists.

## HTTP and contracts

| Packages | Purpose |
|---|---|
| httpserver | Established HTTP server lifecycle |
| middleware | HTTP middleware collection |
| openapi | OpenAPI serving and validation |
| request, response | Established request and response types |
| validation | Input validation |
| pagination, model | Established common models |

Prefer platform/bootstrap, platform/http, platform/errors, and platform/paging in new services.

## Operations and engineering

| Packages | Purpose |
|---|---|
| logging | Structured logging configuration |
| metrics | Prometheus metrics |
| observability | Tracing and telemetry helpers |
| health | Established health endpoints |
| resilience | Retry, circuit-breaker, and reliability helpers |
| auditing | Audit event support |
| config | Established configuration loader |
| dxtest, dxtest/containers, dxtest/fixtures | Test helpers and disposable infrastructure |
| grpc/client | gRPC client support |
| errors | Established error package |

Prefer the platform equivalent where listed in [dx-common-go](../index.md). Direct foundation use remains valid for capabilities without an equivalent.
