---
id: auth-authorization
title: authorization (roles, scopes, fga)
---

# Authorization — auth/authorization, auth/fga

```go
import (
    "github.com/datakaveri/dx-common-go/auth/authorization"
    "github.com/datakaveri/dx-common-go/auth/fga"
)
```

## Purpose

Two authorization layers over the resolved identity:

- **`auth/authorization`** — coarse RBAC in-process: realm roles and delegation scopes as route middleware.
- **`auth/fga`** — fine-grained ReBAC via OpenFGA: "may *this user* do *this action* on *this object*", plus the tuple writes that keep the graph in sync.

## Key concepts

- **Roles are platform vocabulary** (`RoleProvider`, `RoleConsumer`, `RoleOrgAdmin`, `RoleCosAdmin`, `RoleDelegate`) carried on the JWT/headers.
- **Delegation scopes** restrict a delegate token to actions on specific entities (`data-access`, `own-asset-management`, …); `ForScope` checks the scope *and* the entity ID in the route.
- **FGA is the decision point for object-level checks**: services call `Check`; policy writes flow as tuples (usually via the outbox → authz service).

## Public API

```go
// authorization
type DxRole string           // RoleProvider, RoleConsumer, RoleOrgAdmin, RoleCosAdmin, RoleDelegate…
type DelegationScope string  // ScopeDataAccess, ScopeOwnAssetManagement, …
func ForRoles(roles ...DxRole) func(http.Handler) http.Handler
func ForScope(scope DelegationScope, entityIDParam string) func(http.Handler) http.Handler
func NewRoleSet(roles ...DxRole) RoleSet
func NewScopeSet(scopes ...DelegationScope) ScopeSet

// fga
type Config struct{ /* API URL, store ID, model ID, timeouts */ }
func New(cfg Config) (*Client, error)
type CheckRequest struct{ User, Relation, Object string }
func (c *Client) Check(ctx, req CheckRequest) (CheckResponse, error)
// + policy tuple writes/deletes, ListPolicies, group-member operations
```

## Usage

```go
// Route-level RBAC:
r.With(authorization.ForRoles(authorization.RoleProvider, authorization.RoleOrgAdmin)).
    Post("/assets", h.CreateAsset)

// Delegation-scoped route ({assetId} must be covered by the token's scope):
r.With(authorization.ForScope(authorization.ScopeOwnAssetManagement, "assetId")).
    Put("/assets/{assetId}", h.UpdateAsset)

// Object-level check inside a handler:
resp, err := h.fga.Check(r.Context(), fga.CheckRequest{
    User: "user:" + user.ID, Relation: "can_read", Object: "databank:" + id,
})
if err != nil { h.fail(w, "authz", err); return }
if !resp.Allowed { dxerrors.WriteError(w, dxerrors.NewForbidden("no access to this databank")); return }
```

## Best practices

- Layer them: roles gate the *route*, FGA gates the *object*. Neither replaces the other.
- Wrap `fga.Client` calls with [resilience](/modules/resilience) knobs already built in — treat FGA as a hard dependency for allow decisions (fail-closed).
- Tuple writes belong on the event path (outbox → `authz` exchange), not inline with FGA reads.

## Pitfalls

- `ForScope` reads the entity ID from the chi route param you name — a mismatch silently checks the wrong value; test route wiring.
- FGA answers *allowed?* only. Enumerations ("all databanks user can read") are `ListPolicies`-shaped and costlier — design endpoints accordingly.

## Related modules

[identity](/modules/auth-identity), [messaging](/modules/messaging) (tuple sync events).
