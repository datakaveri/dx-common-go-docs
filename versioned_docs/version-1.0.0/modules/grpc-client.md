---
id: grpc-client
title: grpc/client
---

# grpc/client — standard gRPC dialing

```go
import grpcclient "github.com/datakaveri/dx-common-go/grpc/client"
```

## Purpose

`grpc.NewClient` with the platform's client behavior applied by default: a [resilience](/modules/resilience) unary interceptor (retry on transient codes, optional breaker), OpenTelemetry tracing, and keepalive — so services stop hand-rolling dial plumbing.

## Public API

```go
type Config struct{ Target string; TLS bool /* + keepalive knobs */ }
func Dial(cfg Config, opts ...Option) (*grpc.ClientConn, error)
func WithResilience(opts ...resilience.GRPCOption) Option
func WithoutResilience() Option
func WithoutTracing() Option
func WithUnaryInterceptors(i ...grpc.UnaryClientInterceptor) Option
func WithDialOptions(o ...grpc.DialOption) Option
```

## Usage

```go
conn, err := grpcclient.Dial(grpcclient.Config{Target: cfg.UserService.Addr})
if err != nil { return err }
defer conn.Close()
verifier := appidpb.NewAppIdVerificationClient(conn)
```

Everything is no-op-safe: tracing does nothing until `observability.Init` configures a provider; retries touch only idempotent transient codes (Unavailable, ResourceExhausted, …).

## Best practices

- Default is an insecure channel (mesh-terminated TLS); set `TLS` only when the wire itself must be encrypted.
- Share one `ClientConn` per target per process — gRPC multiplexes.

## Pitfalls

- `grpc.NewClient` connects lazily; a bad target surfaces on the first RPC, not at `Dial`. Health-check the dependency separately if boot must fail fast.

## Related modules

[resilience](/modules/resilience), [observability](/modules/observability), [appid](/modules/auth-appid).
