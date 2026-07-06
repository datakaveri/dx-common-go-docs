---
id: service-integration
title: Service integration
---

# Full service integration

The canonical boot sequence, annotated. This is the shape of every `dx-*-go` service and of [`examples/minimal-service`](https://github.com/datakaveri/dx-common-go/tree/main/examples/minimal-service).

```go
func main() {
    if err := run(); err != nil {
        log.Fatal(err)
    }
}

func run() error {
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    // 1. Config — malformed file aborts here; Validate() runs if defined.
    cfg, err := config.LoadService[Config](config.ServiceOptions{Defaults: defaults})
    if err != nil { return fmt.Errorf("config: %w", err) }

    // 2. One signal context for every component.
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    // 3. Observability — no-op without an endpoint; always call it.
    shutdown, err := observability.Init(ctx, observability.Config{ServiceName: "dx-demo"})
    if err != nil { return err }
    defer shutdown(context.Background())

    // 4. Migrations BEFORE serving traffic. Go owns the schema.
    if err := dxmigrate.Run(migrateCfg(cfg), migrationsFS, "migrations", logger); err != nil {
        return fmt.Errorf("migrate: %w", err)
    }

    // 5. Dependencies — all ctx-bounded dials.
    pool, err := client.NewPool(ctx, cfg.Postgres, client.WithTracers( /* otelpgx, slow-query */ ))
    if err != nil { return err }
    defer pool.Close()

    pub, err := rabbitmq.NewReliablePublisher(rabbitmq.PublisherConfig{
        URL: cfg.RabbitMQ.URL, Exchange: "events", ExchangeType: "topic", Confirms: true, Logger: logger,
    })
    if err != nil { return err }
    defer pub.Close()

    // 6. Domain wiring — repositories, services, outbox, jobs.
    repo := NewItemRepo(pool)
    store := outbox.NewPGStore(pool, "item_outbox")
    disp := outbox.NewDispatcher(store, publishRow(pub), logger)
    go disp.Run(ctx)

    sched := scheduler.New(logger)
    sched.Register(scheduler.Job{Name: "cleanup", Every: time.Hour, Run: repo.Cleanup},
        scheduler.WithSingleton(pool))
    go sched.Start(ctx)

    // 7. Audit (nil-safe when disabled) — close AFTER the server drains.
    auditPub, err := auditing.NewPublisher(cfg.Auditing, logger)
    if err != nil { return err }
    defer auditPub.Close()

    // 8. HTTP surface.
    loader := openapi.MustLoad(specBytes)                      // NewLoaderFromBytes + panic wrapper shown inline
    sw := response.NewServiceWriter("urn:dx:demo:")
    h := NewHandler(repo, sw, logger)

    r := chi.NewRouter()
    middleware.Standard(logger, 15*time.Second, middleware.WithTracing())(r)
    r.Use(openapi.MustValidationMiddleware(loader, cfg.OpenAPI))
    r.Use(resolver.MustMiddleware(cfg.Resolver))
    r.Use(auditing.Middleware(auditPub, "dx-demo"))

    hh := health.NewHandler()
    hh.Register("postgres", health.NewPgxPoolChecker(pool))
    hh.Register("rabbitmq", health.NewRabbitMQChecker(pub))
    r.Get("/healthz/live", hh.Live)
    r.Get("/healthz/ready", hh.Ready)
    r.Handle("/metrics", metrics.Handler())
    mountRoutes(r, h)

    // 9. Serve until the signal context cancels; everything above stops on the same ctx.
    return httpserver.New(cfg.Server, r, logger).Run(ctx)
}
```

## The order matters

1. **Config first** — nothing else can be constructed without it, and a bad file must stop the world.
2. **Migrations before the pool serves traffic** — never lazily on first request.
3. **Middleware order**: tracing outermost → request ID → validation → identity → audit. Validation before identity means malformed requests cost no auth work; audit after identity means records carry the real user.
4. **Shutdown is the boot sequence reversed**, driven by one context: server drains → audit queue flushes → spans flush → pools close (deferred).
