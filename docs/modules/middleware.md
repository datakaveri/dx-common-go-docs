---
id: middleware
title: middleware
---

# middleware — the standard HTTP stack

```go
import "github.com/datakaveri/dx-common-go/middleware"
```

## Purpose

The chi-compatible middleware every DX service shares — request IDs, structured logging, panic recovery, CORS, compression, timeouts, rate limiting, upload validation — plus `Standard`, the one-call composite that applies the canonical stack in the canonical order.

## When to use it

Every HTTP service. Use `Standard` rather than hand-wiring pieces; add the à-la-carte middlewares (rate limiting, upload validation) per route where needed.

## Key concepts

- **Canonical order matters**: `[otelhttp →] RequestID → RealIP → Logger → CORS → Compression → Recoverer → Timeout`. Logging sees the request ID; recovery wraps handlers; timeout is innermost.
- **Tracing is opt-in but always safe**: `WithTracing()` mounts otelhttp reading the global tracer provider — a no-op until [observability](/modules/observability).Init configures one.
- **Rate limiting** is token-bucket per key: client IP by default, authenticated user ID with `PerUser: true`.

## Public API

```go
func Standard(logger *zap.Logger, timeout time.Duration, opts ...Option) func(chi.Router)
func WithTracing() Option

func RequestID() func(http.Handler) http.Handler
func RequestIDFromContext(ctx context.Context) string
func Logger(logger *zap.Logger) func(http.Handler) http.Handler
func Recovery(logger *zap.Logger) func(http.Handler) http.Handler
func CORS(cfg CORSConfig) func(http.Handler) http.Handler
func DefaultCORSConfig() CORSConfig
func Compression() func(http.Handler) http.Handler
func SelectiveCompression(contentTypes ...string) func(http.Handler) http.Handler
func Timeout(d time.Duration) func(http.Handler) http.Handler

type RateLimitConfig struct{ RequestsPerSecond, BurstSize int; PerUser bool }
type RateLimiter struct{ /* … */ }
func NewRateLimiter(cfg RateLimitConfig) *RateLimiter
func (rl *RateLimiter) Middleware() func(http.Handler) http.Handler
type RateLimitByEndpoint struct{ /* per-pattern limits */ }

func MaxUploadSize(maxBytes int64) func(http.Handler) http.Handler
type UploadConfig struct{ /* size, count, content types */ }
func DefaultUploadConfig() UploadConfig
func ValidateMultipartUpload(cfg UploadConfig) func(http.Handler) http.Handler
```

## Usage

```go
r := chi.NewRouter()
middleware.Standard(logger, 15*time.Second, middleware.WithTracing())(r)

// Per-route extras:
rl := middleware.NewRateLimiter(middleware.RateLimitConfig{RequestsPerSecond: 10, BurstSize: 20, PerUser: true})
r.With(rl.Middleware()).Post("/expensive", handler)
r.With(middleware.ValidateMultipartUpload(middleware.DefaultUploadConfig())).Post("/upload", uploadHandler)
```

Rate-limited responses are `429` in the standard envelope with `X-RateLimit-*` headers.

## Best practices

- Enable `WithTracing()` unconditionally — it costs nothing without a collector.
- Per-user rate limiting requires identity in context, so mount it **after** [auth/resolver](/modules/auth-identity).
- The in-process limiter is per-replica; multiply by replica count when picking budgets, or use the Redis limiter in [database/redis](/modules/redis-cache) for a global bucket.

## Pitfalls

- `Timeout` cancels the request context; handlers that ignore `r.Context()` keep burning CPU after the client got 504.
- Don't wrap `Standard` around websocket/streaming routes — compression and timeout interfere; mount those routes on a sibling router.

## Related modules

[auth/resolver](/modules/auth-identity), [observability](/modules/observability), [dxerrors](/modules/dxerrors).
