---
id: composition
title: Composing modules
---

# Composing modules

The high-value patterns that appear when modules meet.

## Transaction + outbox: atomic write-and-event

The domain row and its event commit or roll back together; the dispatcher delivers with confirms.

```go
err := transaction.InTransaction(ctx, pool, func(ctx context.Context) error {
    if err := policies.Insert(ctx, p); err != nil {          // repository — ambient tx
        return err
    }
    tx, _ := transaction.TxFromContext(ctx)
    return store.Insert(ctx, tx, outbox.Row{                  // outbox — same tx
        Action: "create", Payload: payload, RequestID: reqID,
    })
})
if err == nil {
    dispatcher.Kick()                                          // low-latency delivery
}
```

## Repository + cache: read-through with stampede protection

```go
func (s *Service) Item(ctx context.Context, id string) (Item, error) {
    return cache.GetOrLoad(ctx, s.cache, "item:"+id, 10*time.Minute,
        func(ctx context.Context) (Item, error) {
            return s.repo.FindByID(ctx, id)                    // dxerrors-mapped already
        })
}

func (s *Service) Update(ctx context.Context, it Item) error {
    if err := s.repo.Update(ctx, it); err != nil { return err }
    return s.cache.Delete(ctx, "item:"+it.ID)                  // invalidate on write
}
```

## Resolver + role gate + FGA: three-layer authorization

```go
r.Route("/databanks", func(r chi.Router) {
    r.Use(resolver.MustMiddleware(cfg.Resolver))               // WHO
    r.With(authorization.ForRoles(authorization.RoleProvider)).// WHICH KIND of user
        Post("/", h.Create)
    r.Get("/{id}", h.Get)                                      // WHAT object — FGA inside:
})

// inside h.Get:
ok, err := h.fga.Check(ctx, fga.CheckRequest{User: "user:" + u.ID, Relation: "can_read", Object: "databank:" + id})
```

## Request parser + repository + envelope: a complete list endpoint

```go
pr, err := request.From(r).
    Sortable(map[string]string{"createdAt": "created_at"}).
    Filterable(map[string]string{"status": "status"}).
    Build()
if err != nil { dxerrors.WriteError(w, dxerrors.NewValidation("invalid query", err.Error())); return }

page, err := h.repo.FindPage(ctx, query.FromFilters(pr.Filters), pr.Page, pr.Size)  // limit/offset inside
if err != nil { h.fail(w, "list", err); return }

h.sw.PaginatedInfo(w, page.Data, response.NewPageInfo(pr.Page, pr.Size, page.Total), "Success", "fetched")
```

## One signal context: everything stops together

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

go consumer.Run(ctx, handle)   // messaging
go sched.Start(ctx)            // scheduler
go dispatcher.Run(ctx)         // outbox
err := srv.Run(ctx)            // httpserver — drains on the same signal
auditPub.Close()               // then flush audit queue
shutdown(context.Background()) // then flush spans
```
