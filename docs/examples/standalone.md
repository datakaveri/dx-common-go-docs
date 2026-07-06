---
id: standalone
title: Standalone modules
---

# Standalone module usage

Every module works alone. Each snippet below is complete enough to drop into an existing service that uses none of the rest of the library.

## Just configuration

```go
type Cfg struct{ Port int `mapstructure:"port"` }
cfg, err := config.LoadService[Cfg](config.ServiceOptions{
    Defaults: map[string]any{"port": 9000},
})
```

## Just the error taxonomy

```go
if item == nil {
    dxerrors.WriteError(w, dxerrors.NewNotFound("item not found"))
    return
}
```

## Just resilience around an existing client

```go
httpc := resilience.NewHTTPClient(resilience.WithClientTimeout(3 * time.Second))
resp, err := httpc.Get(url) // retries idempotent transient failures automatically
```

## Just the cache

```go
c := cache.NewMemoryCache() // swap for dxredis.NewCache(...) in prod, same interface
v, err := cache.GetOrLoad(ctx, c, "cfg:flags", time.Minute, loadFlags)
```

## Just a scheduler

```go
s := scheduler.New(logger)
s.Register(scheduler.Job{Name: "tick", Every: 30 * time.Second, Run: doTick})
go s.Start(ctx)
```

## Just object storage

```go
store, err := dxs3.NewClient(ctx, cfg.S3)
err = store.PutObject(ctx, key, "application/json", bytes.NewReader(b), int64(len(b)))
```

## Just a consumer

```go
runner := rabbitmq.NewConsumerRunner(rabbitmq.ConsumerConfig{
    URL: url, Queue: "events", Logger: logger,
    Setup: func(ch *amqp.Channel) error {
        _, err := rabbitmq.DeclareQueueWithDLQ(ch, "app", "topic", "events", "#", true)
        return err
    },
})
go runner.Run(ctx, handle)
```

None of these require adopting anything else — [module independence](/design-principles#module-independence--composition) is a design rule, not an aspiration.
