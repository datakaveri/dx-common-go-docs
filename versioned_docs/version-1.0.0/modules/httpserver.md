---
id: httpserver
title: httpserver
---

# httpserver — graceful HTTP serving

```go
import "github.com/datakaveri/dx-common-go/httpserver"
```

## Purpose

A production-ready wrapper around `http.Server`: hardened timeouts, optional TLS from config, and **context-driven graceful shutdown** so one signal stops your HTTP server and every other component together.

## When to use it

Every service that serves HTTP. Use `Run(ctx)` when the service has any other long-running component (consumers, schedulers, dispatchers); `Start()` when HTTP is the only component.

## Key concepts

- **`Run(ctx)` is the composition seam.** `main` owns signal wiring (`signal.NotifyContext`) and hands the same ctx to the server, consumers, and jobs. When ctx cancels, `Run` stops accepting, drains in-flight requests within `ShutdownTimeout`, then returns.
- **`Start()` = `NotifyContext` + `Run`** — sugar for single-component services.
- **TLS via config**: setting both `TLSCertFile` and `TLSKeyFile` makes `Run` serve HTTPS (min TLS 1.2). No separate API.

## Public API

```go
type Config struct {
    Port            int           `mapstructure:"port"`
    ReadTimeout     time.Duration `mapstructure:"read_timeout"`      // default 15s
    WriteTimeout    time.Duration `mapstructure:"write_timeout"`     // default 30s
    IdleTimeout     time.Duration `mapstructure:"idle_timeout"`
    ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`  // default 10s
    TLSCertFile     string        `mapstructure:"tls_cert_file"`
    TLSKeyFile      string        `mapstructure:"tls_key_file"`
}
func DefaultConfig() Config

type Server struct{ /* unexported */ }
func New(cfg Config, handler http.Handler, logger *zap.Logger) *Server
func (s *Server) Run(ctx context.Context) error  // serve until ctx cancels, then drain
func (s *Server) Start() error                   // Run wired to SIGINT/SIGTERM
```

## Usage — multi-component service

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

go consumerRunner.Run(ctx, handle)   // same ctx
go sched.Start(ctx)                  // same ctx

if err := httpserver.New(cfg.Server, router, logger).Run(ctx); err != nil {
    logger.Fatal("server", zap.Error(err))
}
// ctx cancelled → server drained; consumers/schedulers stopping on the same signal.
```

## Best practices

- Never install your own `signal.Notify` alongside `Start()` — that is double signal handling. Multi-component services use `Run(ctx)`.
- Keep `ShutdownTimeout` above your slowest expected in-flight request; the drain returns an error if it exceeds the budget.
- Behind an ingress that terminates TLS, leave the TLS fields empty — inter-service identity comes from [auth/headers](/modules/auth-identity), not transport encryption.

## Pitfalls

- `Run` returns `nil` after a clean drain — treat any non-nil error as fatal (bind failure, bad keypair, exceeded drain budget).
- A blocked handler that ignores its request context can hold shutdown hostage until `ShutdownTimeout`; always propagate `r.Context()`.

## Related modules

[middleware](/modules/middleware) (the standard stack), [observability](/modules/observability) (tracing on by config), [config](/modules/config).
