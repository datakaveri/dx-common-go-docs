---
title: Public API Index
description: Source-backed index of the primary platform package types and functions.
---

# Public API index

This is a navigation index, not a substitute for Go package documentation.

| Package | Primary public API |
|---|---|
| platform/bootstrap | Spec, Deps, Dep, Required, Degrade, Migrations, App, Go, Background, Closer, Probe, Run |
| platform/config | Options, Validator, Load, Base, Configurer, Server, InternalAuth, OpenAPI, PlatformDefaults, CheckSecret |
| platform/http | Handler, Handle, HandleOptional, HandleVoid, HandleRaw, Created, Accepted, Response, JSON, Blob, RouterSpec, RouteSet, GET/POST/PUT/PATCH/DELETE, Roles, Public, Optional, Streaming, OpID, Problem |
| platform/errors | Code, Error, classification constructors, Wrap, CodeOf, Message, Details, Classified, Is helpers |
| platform/paging | Request, NewRequest, Info, NewInfo, InfoFor, Page, NewPage, Empty, MapPage, Params, SortKey |
| platform/security/identity | Subject, Delegation, Kind, Scope, With, From, Require, MustFrom |
| platform/database/sql | DB, Querier, Tx, Config, Open, Manager, NewManager, TxFrom, Repo, NewRepo, Query, predicates, SQL, SQLOne, Conn, MapError |
| platform/database/sql/pgx | Pool, Tracer |
| platform/cache | Cache, Scope, Store, New, Memory, GetOrLoad, Invalidating, GetOrLoadAhead |
| platform/cache/redis | Config, Store, Open, NewStore |
| platform/events | Event, Bus, Handler, Topic, NewTopic, Memory, Outbox, Dispatcher |
| platform/events/amqp | Config, Bus, Open |
| platform/observability/health | Checker, CheckerFunc, Registry, Result, Report |
| platform/grpc | CodeOf, Status, FromStatus |

For exact signatures and method sets, run:

~~~bash
DX_COMMON_GO=../dx-common-go bash scripts/gen-api.sh
~~~

The generator writes a source-reference and exported declaration inventory to docs/reference/generated-api.md.
