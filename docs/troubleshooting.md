---
id: troubleshooting
title: Troubleshooting
sidebar_position: 10
---

# Troubleshooting

### `config.LoadService: reading config file: …` at boot

Your config file exists but doesn't parse. This is intentional (previously the service silently booted on defaults). Fix the YAML; a *missing* file is still fine.

### `resolver: at least one of Headers.Secret or AllowDirect must be set`

Both identity paths are disabled. Set the HMAC secret (behind the gateway) or `AllowDirect: true` + JWT config (direct mode).

### `jwt: enabled=false is not allowed when DX_ENV=production`

The dev-mode synthetic user is blocked in production-like environments by design. Enable real validation or fix `DX_ENV`.

### 401 `invalid subject signature` on gateway traffic

Secret mismatch or clock skew beyond the replay window (MaxAge 60s + skew). Check both sides' secrets (and `PreviousSecrets` during rotation) and NTP.

### Requests 400 with `request validation failed`

The OpenAPI middleware rejected the request; the `errors` array names the field. If the route shouldn't validate, it's missing from your spec (spec-absent routes pass through).

### Consumer keeps redelivering the same message

Your handler returns `Requeue` for a permanent failure. Poison messages must return `DeadLetter` (they land on `<queue>.dlq`, preserved). Set `MaxAttempts` as a backstop.

### `resilience: circuit breaker is open`

The upstream crossed its failure threshold; calls fail fast during cooldown. This is the feature. Fix the upstream; tune `WithFailureThreshold`/`WithCooldown` if it trips too eagerly.

### Integration tests skip with "provider not healthy"

Docker isn't running. That's the designed behavior (`go test ./...` stays green); start Docker or export the `DX_TEST_*` env DSNs to bind existing instances.

### Migration fails with a dirty-state error

A previous migration failed partway; golang-migrate refuses to continue. Fix the schema by hand, then `migrate force <version>` (one-off with the same config) before restarting. The loud failure is intentional.

### Graceful shutdown hangs ~10s

Some in-flight request (or a handler ignoring `r.Context()`) is holding the drain until `ShutdownTimeout`. Propagate contexts in handlers; tune the timeout to your slowest legitimate request.

### Traces missing for RabbitMQ consumers

The publisher stamped no trace context — almost always a `PublishJSON` called with a background context. Pass the request ctx.
