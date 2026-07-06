---
id: resilience
title: resilience
---

# resilience — retries, breakers, hardened clients

```go
import "github.com/datakaveri/dx-common-go/resilience"
```

## Purpose

One `Policy` for outbound reliability, consumed three ways: a generic `Retry` loop, a drop-in resilient `*http.Client`, and a gRPC unary interceptor. Plus a standalone circuit breaker to fail fast when a dependency is down.

## Key concepts

- **Retry only idempotent work** — the HTTP wrapper defaults to idempotent methods and 5xx/429; override deliberately.
- **Breaker wraps the dependency, not the call**: one `*CircuitBreaker` per upstream, shared across call sites; when open, calls fail immediately with `ErrOpen`.
- **Deterministic testing**: backoff exposes injectable jitter/sleep seams — no real sleeps in unit tests.

## Public API

```go
type Policy struct{ MaxAttempts int; InitialBackoff, MaxBackoff time.Duration; Multiplier float64 }
func DefaultPolicy() Policy
func NewPolicy(opts ...PolicyOption) Policy

func Retry(ctx context.Context, p Policy, fn func(context.Context) error, opts ...RetryOption) error

func NewCircuitBreaker(opts ...BreakerOption) *CircuitBreaker
// WithFailureThreshold(n), WithCooldown(d), WithFailureClassifier(f), WithOnStateChange(f)
var ErrOpen = errors.New("resilience: circuit breaker is open")

func NewHTTPClient(opts ...HTTPOption) *http.Client
// WithPolicy, WithBreaker, WithClientTimeout, WithRetryMethods, WithRetryStatus, WithBaseTransport, WithHTTPOnRetry

func UnaryClientInterceptor(opts ...GRPCOption) grpc.UnaryClientInterceptor
// WithGRPCPolicy, WithGRPCBreaker, WithRetryableCodes, WithGRPCOnRetry
```

## Usage

```go
// Service-to-service HTTP with retry + breaker:
fgaBreaker := resilience.NewCircuitBreaker(
    resilience.WithFailureThreshold(5),
    resilience.WithCooldown(10*time.Second),
)
httpc := resilience.NewHTTPClient(
    resilience.WithPolicy(resilience.DefaultPolicy()),
    resilience.WithBreaker(fgaBreaker),
    resilience.WithClientTimeout(5*time.Second),
)

// Any operation:
err := resilience.Retry(ctx, resilience.DefaultPolicy(), func(ctx context.Context) error {
    return es.Refresh(ctx, index)
})
```

## Best practices

- Don't hand-roll backoff loops anywhere in a service — that is this module's whole job.
- Classify carefully: retrying non-idempotent POSTs duplicates side effects; put idempotency keys on the wire first.
- Alert on breaker state changes (`WithOnStateChange`) — an open breaker is an incident signal.

## Pitfalls

- Retries multiply load exactly when the dependency is sick — cap `MaxAttempts` low (2–3) for request-path calls.
- The HTTP client re-sends bodies via `GetBody`; streaming one-shot bodies are not retryable.

## Related modules

[grpc/client](/modules/grpc-client) (uses the interceptor by default), [postgres](/modules/postgres) (retryable transactions).
