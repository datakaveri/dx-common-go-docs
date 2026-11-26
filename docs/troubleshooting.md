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

## Disabled dependency behaves as enabled, or panics on first use

A constructor returned a typed nil pointer through an interface: for example, a nil `*credits.Client` as a `service.CreditProvisioner`, or a nil `*grpcserver.Server` as a `bootstrap.Servable`. The interface is then non-nil, so `if x != nil` takes the "on" branch.

Fix: return the interface type itself, and return a bare `nil` when the dependency is off. See rule 3 in [Structure a composition root](guides/composition-root.md#rules).

## Service rejects a credential that is correct in the env file

When a local run loads an env file with shell `source` or `. file`, a value containing `$` inside double quotes is expanded as a variable. A password such as `"ab$cd"` arrives shortened, and the dependency rejects it.

Two signs point to this:

- the service's own error names an authentication failure;
- the value works when typed directly.

Load env files literally: use a dotenv loader, or `docker run --env-file`, which does not expand values.

## Whole service becomes unready when an optional dependency is down

`App.Probe` registers a **critical** readiness check, so one failing check turns `/healthz/ready` into 503 and removes every replica from traffic.

For a dependency the service degrades around, register the check with `app.Health.AddOptional`. It is still reported, but it no longer decides readiness.
