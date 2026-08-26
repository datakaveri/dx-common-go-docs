---
title: Release Notes
description: Verified release state and how future release notes will be maintained.
---

# Release notes

## Current source line

There are no published Git tags at the time of this documentation audit. Consequently, there is no v1.0.0 release note and no released-version dropdown.

The current source provides:

- declarative service bootstrap and ordered shutdown;
- typed configuration with shared base settings;
- typed net/http adapters, route tables, standardized problems, and paging;
- SQL contracts, query/repository helpers, transaction propagation, and pgx adapter;
- cache contracts with memory and Redis stores;
- event envelopes, in-memory and AMQP buses, and SQL outbox support;
- identity context, health registry, and gRPC status mapping;
- the maintained foundation package catalogue.

## Future entries

Each tagged release note will record:

- tag, commit, publication date, and minimum Go version;
- added, changed, deprecated, fixed, and removed public APIs;
- security and operational impact;
- affected services and verification evidence;
- an actionable upgrade guide.

See [Versions and compatibility](versions.md) for the release policy.
