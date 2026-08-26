---
title: Search, Storage, and Security Adapters
description: Elasticsearch, S3, STS, identity verification, signed headers, and trust packages.
---

# Search, storage, and security adapters

## Elasticsearch

database/elasticsearch provides client, mapping, indexing, query, and repository packages. Keep index naming and mappings in the owning service. Application code depends on a search port; the adapter translates domain filters into the shared query primitives.

Operational requirements:

- make index or alias names explicit configuration;
- version mappings and test compatible rollout;
- bound query size and sort fields;
- distinguish authoritative documents from rebuildable projections;
- expose query, indexing, rejection, and refresh metrics.

## Object storage and STS

storage/s3 handles object operations. storage/sts issues bounded temporary credentials. Service code must validate object keys, bucket ownership, media type, size, multipart state, and requested credential scope.

Presigned URL expiry and clock skew are part of the client contract. Never return permanent object-store credentials.

## Verification adapters

auth/jwt and auth/resolver verify caller credentials at an edge. transport/headers signs and verifies normalized downstream subject context. Application code consumes platform/security/identity.Subject after verification; it does not parse JWT claims or trust raw headers.

## Authorization

auth/authorization and auth/fga integrate policy checks. Build the subject, relation, and object from domain semantics, not from an arbitrary client field. A role check can narrow an operation but does not replace resource relationship authorization.

## Trust and envelopes

crypto/envelope, mtls, and trust support protected inter-domain payloads and trust material. Keep private keys in a secret manager, make algorithms and key IDs explicit, reject stale or replayed messages, and test rotation. These packages are primitives; they do not by themselves define exchange governance or an interoperability contract.
