---
title: Troubleshooting
description: Diagnose module pins, configuration, binding, SQL, cache, events, and shutdown.
---

# Troubleshooting

## Service uses an unexpected API

~~~bash
go list -m github.com/datakaveri/dx-common-go
go mod graph | grep dx-common-go
go env GOWORK
~~~

Check for a workspace or replace directive overriding go.mod. Record the actual pseudo-version, not the branch you expected.

## Environment value is ignored

Use the unprefixed nested key with underscores, confirm the field exists in typed config, and add a default or file key when diagnosing. Load binds known keys, validates after unmarshal, and reports malformed files.

## Handler returns 401 before running

Handle requires an authenticated actor unless the request and route use the optional contract. Confirm the request embeds the correct Actor type, the route is marked Optional when intended, and authentication middleware stores identity.Subject.

## Query ignores the transaction

Pass the callback context from Manager.Do to every repository call. For raw or sqlc access, obtain the querier with sql.Conn(txCtx, db). A background context starts outside the transaction.

## Cache continuously misses

Check service prefix, namespace, key, TTL, serialization shape, and which Redis database or endpoint the process uses. Decode failure intentionally deletes the corrupt value and behaves as ErrMiss.

## Event retries forever

Classify transient and permanent failures. Return ErrDrop only for work that can never succeed and make that drop observable. Inspect version, consumer group, retry, and dead-letter topology before replay.

## Process hangs during shutdown

Every worker and network call must observe the supplied context. Closers should use their shutdown context and have bounded time. Do not start unmanaged goroutines from constructors.
