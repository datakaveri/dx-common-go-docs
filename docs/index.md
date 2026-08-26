---
id: index
title: dx-common-go
slug: /
description: Source-backed documentation for the reusable Go platform SDK used by Data Exchange services.
---

# dx-common-go

dx-common-go is the shared Go SDK for Data Exchange services. It provides stable contracts for service bootstrap, configuration, HTTP behavior, errors, identity, paging, SQL, cache, events, health, and gRPC status mapping, plus foundation packages for search, object storage, messaging, observability, security, testing, and integrations.

## Which API should I use?

For new service code, start with platform packages:

| Concern | Preferred package |
|---|---|
| Process lifecycle | platform/bootstrap |
| Typed configuration | platform/config |
| HTTP routes and handlers | platform/http |
| Error taxonomy | platform/errors |
| Identity in context | platform/security/identity |
| Pagination | platform/paging |
| SQL and transactions | platform/database/sql |
| Cache | platform/cache |
| Events and outbox | platform/events |
| Health | platform/observability/health |
| gRPC status mapping | platform/grpc |

Top-level foundation packages remain part of the source tree. Use them where no platform seam exists, or through the explicit adapter package named by the platform API.

## Start here

- [Install and verify](getting-started.md)
- [Architecture and dependency rules](architecture.md)
- [Build a service](guides/service-integration.md)
- [Package catalogue](foundation/package-catalogue.md)
- [Versions and compatibility](versions.md)

For the complete fleet, trust model, and deployment model, use the [Data Exchange platform documentation](https://datakaveri.github.io/cdpg-docs/). For a guided curriculum, use the [Go learning path](https://datakaveri.github.io/go-learning/).

## Documentation truth

These pages were reviewed against the public Go source and service call sites. There are currently no published repository tags; the docs therefore describe the current source line and do not claim a released semantic version. See [Versions and compatibility](versions.md).
