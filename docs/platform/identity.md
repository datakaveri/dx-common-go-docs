---
title: Identity
description: Verified subjects, delegation, scopes, context propagation, and authorization boundaries.
---

# Identity

platform/security/identity carries verified caller data. It does not verify tokens or headers.

## Subject

Subject contains ID, email, name, organization, roles, and an optional Delegation. Helpers answer role, scope, actor, and delegation questions without coupling domain code to token claims.

Delegation contains:

- Actor — the agent, app, or delegated user actually acting;
- GrantID — the auditable grant;
- Kind — agent, app, or user;
- Scopes — capabilities, optionally narrowed to an entity.

An empty delegated scope set conveys no authority. Delegation intersects with the subject's permission; it never widens it.

## Context

~~~go
ctx = identity.With(ctx, subject)

subject, ok := identity.From(ctx)
subject, err := identity.Require(ctx)
subject = identity.MustFrom(ctx) // tests and proven invariants only
~~~

At HTTP boundaries, prefer httpx.Actor or httpx.OptionalActor so the adapter enforces the subject requirement before the handler runs.

## Authorization boundary

Role and scope helpers are local predicates and do not perform relationship authorization. A resource operation can require:

1. verified subject;
2. route role or scope;
3. positive OpenFGA subject–relation–object decision;
4. when delegated, a valid grant and agent state.

Use Subject.Actor for audit and rate-limit attribution. Use Subject.ID plus the delegation intersection for authorization.
