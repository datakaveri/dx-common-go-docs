---
id: observability
title: observability, metrics & health
---

# observability, metrics & health

```go
import (
    "github.com/datakaveri/dx-common-go/observability"
    "github.com/datakaveri/dx-common-go/metrics"
    "github.com/datakaveri/dx-common-go/health"
)
```

## Purpose

The three operational pillars. **observability** owns the OpenTelemetry SDK lifecycle — one `Init` and every pre-wired signal in the library lights up. **metrics** serves Prometheus and standard HTTP request metrics. **health** aggregates liveness/readiness with checkers for every platform dependency.

## Tracing model — instrument at the driver seam

Every signal is wired where the bytes leave the process, is a **no-op until `Init` runs**, and needs no per-callsite code:

| Signal | Seam | Enable |
|---|---|---|
| HTTP in | otelhttp middleware | `middleware.Standard(log, t, middleware.WithTracing())` |
| Postgres | pgx tracer | `client.NewPool(ctx, cfg, client.WithTracers(…))` |
| Elasticsearch | transport wrap | `esclient.Config.EnableTracing = true` |
| Redis | redisotel | `redis.Config.EnableTracing = true` |
| RabbitMQ | W3C headers on messages | automatic: publisher injects, runner extracts |
| gRPC out | otelgrpc interceptor | default in [grpc/client](/modules/grpc-client) |

```go
shutdown, err := observability.Init(ctx, observability.Config{ServiceName: "dx-catalogue"})
if err != nil { logger.Fatal("otel", zap.Error(err)) }
defer shutdown(context.Background())
```

No endpoint configured (`Endpoint` and `OTEL_EXPORTER_OTLP_ENDPOINT` both empty) → `Init` is a clean no-op; call it unconditionally. Safe under repeated calls (first wins).

## metrics

```go
r.Handle("/metrics", metrics.Handler())                      // Prometheus exposition + Go runtime
rm := metrics.NewRequestMetrics("catalogue")                 // http_requests_total, http_request_duration_seconds
rm.RecordRequest(method, statusCode, elapsed)
```

## health

```go
hh := health.NewHandler()
hh.Register("postgres", health.NewPgxPoolChecker(pool))
hh.Register("redis",    health.NewRedisChecker(rc.Underlying()))
hh.Register("rabbitmq", health.NewRabbitMQChecker(publisher))       // anything with IsConnected() bool
hh.Register("es",       health.NewElasticsearchChecker(esClient))   // any Pinger
hh.Register("s3",       health.NewObjectStoreChecker("minio", store))
r.Get("/healthz/live",  hh.Live)    // process up
r.Get("/healthz/ready", hh.Ready)   // all checkers pass, else 503 with per-dependency status
```

`NewCustomChecker(name, func(ctx) error)` covers anything else; `NewMultiChecker` groups.

## Best practices

- Register a readiness checker for **every hard dependency** and nothing soft — readiness gates traffic, it is not monitoring.
- Traces are the only OTel signal by design; metrics stay Prometheus. Don't add the OTel metrics SDK in services.
- `defer shutdown(ctx)` flushes spans on exit; skipping it loses the last batch.

## Pitfalls

- Enabling `WithTracing()` without `Init` is free; the reverse (Init but no seams) silently traces nothing — enable both, always.
- Liveness must stay dependency-free: a dying database should flip *readiness*, not get the pod killed.

## Related modules

Every module with a seam above; [httpserver](/modules/httpserver).
