---
title: Build a Service
description: End-to-end composition using bootstrap, HTTP, SQL, errors, identity, and health.
---

# Build a service

## 1. Define ports and use case

~~~go
type WidgetRepository interface {
    Get(context.Context, string) (Widget, error)
    Create(context.Context, Widget) (Widget, error)
}

type Service struct {
    widgets WidgetRepository
}

func New(widgets WidgetRepository) *Service {
    return &Service{widgets: widgets}
}
~~~

Keep this package free of transport and driver imports.

## 2. Implement typed handlers

~~~go
type Handler struct {
    service *service.Service
}

func (h *Handler) Get(
    ctx context.Context,
    req GetWidgetRequest,
) (WidgetResponse, error) {
    widget, err := h.service.Get(ctx, req.Actor.Subject, req.ID)
    if err != nil {
        return WidgetResponse{}, fmt.Errorf("get widget: %w", err)
    }
    return toResponse(widget), nil
}
~~~

GetWidgetRequest embeds httpx.Actor and binds its ID from the path. The handler returns values and errors; platform/http renders them.

## 3. Declare routes

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
        },
    }
}
~~~

## 4. Wire the adapter graph

~~~go
func wire(
    _ context.Context,
    app *bootstrap.App[config.Config],
) (http.Handler, error) {
    repo := postgres.NewWidgetRepository(app.DB)
    handler := api.New(service.New(repo))

    return httpx.NewRouter(httpx.RouterSpec{
        Base:    "/v1",
        URNs:    api.URNs,
        Health:  app.Health,
        Metrics: metrics.Handler(),
        Logger:  app.Log,
        Auth: httpx.AuthSpec{
            Authenticate: middleware.Resolve(
                middleware.AuthConfig{
                    HMACSecret: app.Cfg.InternalAuth.SharedSecret,
                    JWT:        app.Cfg.JWT,
                },
            ),
        },
    }, api.Routes(handler)), nil
}
~~~

## 5. Declare process dependencies

Use bootstrap.Spec as shown in [Bootstrap and configuration](../platform/bootstrap-config.md). Register event consumers with Background, mandatory workflow workers with Go, vendor closers with Closer, and non-SQL dependency checks with Probe.

## 6. Verify

- unit-test Service with a fake repository;
- call Handler.Get directly with a verified Subject;
- test repository and migrations against disposable PostgreSQL;
- assert route/OpenAPI drift and auth flags;
- run go test -race ./...;
- exercise the route through the local gateway.
