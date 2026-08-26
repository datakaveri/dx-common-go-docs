---
title: HTTP
description: Typed handlers, declarative routes, auth gates, raw responses, and error rendering.
---

# HTTP

platform/http adapts typed, framework-free handlers to net/http.

## Handler shapes

~~~go
type Handler[Req, Res any] func(
    ctx context.Context,
    req Req,
) (Res, error)
~~~

Adapters:

| Function | Result |
|---|---|
| Handle | Standard success envelope |
| HandleOptional | Envelope with optional actor |
| HandleVoid | 204 on success |
| HandleRaw | Response escape hatch |

Created and Accepted wrappers select 201 and 202. Raw response helpers include JSON, Blob, Redirect, and NotModified. Use raw responses only for externally owned protocols, downloads, streams, and cache validators.

## Identity binding

Embed httpx.Actor in requests that require a verified subject, httpx.OptionalActor for anonymous-or-identified reads, or httpx.None when identity is irrelevant. The adapter owns binding and prevents a protected handler from running without a subject.

~~~go
func (h *Handler) Get(
    ctx context.Context,
    req GetRequest,
) (Widget, error) {
    return h.service.Get(ctx, req.Actor.Subject, req.ID)
}
~~~

Request fields use the bind tags implemented by the package for path, query, header, and JSON body values. Validate semantic constraints in the application layer.

## Declarative routes

~~~go
func Routes(h *Handler) httpx.RouteSet {
    return httpx.RouteSet{
        Prefix: "/widgets",
        Routes: []httpx.Route{
            httpx.GET(
                "/{id}",
                httpx.Handle(h.Get),
                httpx.OpID("getWidget"),
            ),
            httpx.POST(
                "/",
                httpx.Handle(h.Create),
                httpx.Roles("provider"),
                httpx.OpID("createWidget"),
            ),
        },
    }
}
~~~

Route options include Roles, Public, Optional, Streaming, and OpID. NewRouter mounts health, metrics, and optional docs outside the business base, then applies recovery, tracing, request IDs, real IP, structured request logging, CORS, authentication, role gates, timeouts, and compression.

Streaming routes bypass request timeout and compression.

## Router configuration

RouterSpec defines Base, URN namespace, Health, Metrics, Docs, Auth, error mappers, service middleware, Logger, Timeout, and CORS.

Authentication is injected as middleware so platform/http never decides how JWT or HMAC verification works.

## Problems

Classified platform errors map to stable HTTP status and problem code. Unclassified errors are logged and rendered as a generic 500. Add an ErrorMapper for a domain error whose classification cannot live in the domain package.
