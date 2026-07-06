---
id: redis-cache
title: cache & database/redis
---

# cache & database/redis — caching, locks, rate limits

```go
import (
    "github.com/datakaveri/dx-common-go/cache"
    dxredis "github.com/datakaveri/dx-common-go/database/redis"
)
```

## Purpose

`cache` defines the **contract** and the read-through pattern; `database/redis` is the **production implementation** plus Redis-specific primitives (typed helpers, distributed mutex, fixed-window rate limiter). Services depend on `cache.Cache`; tests use `MemoryCache`.

## Key concepts

- **Miss is never an error** (normative): `Get → (value, ok, err)`, `GetJSON → (ok, err)`. `ok=false` means absent; a non-nil error means the backend failed.
- **`GetOrLoad[T]` is the read-through path** with singleflight stampede protection: N concurrent misses of one key run the loader once. The flight group is namespaced per cache instance — two caches sharing a logical key never bleed loads.
- **Prefix-scoped safety**: `WithKeyPrefix` namespaces keys *and* makes `Clear` safe (it refuses to flush an unprefixed shared DB).

## Public API

```go
// cache
type Cache interface {
    Get(ctx, key string) (value string, ok bool, err error)
    GetJSON(ctx, key string, dest any) (ok bool, err error)
    Set(ctx, key string, value any, ttl time.Duration) error
    Delete(ctx, key string) error
    Exists(ctx, key string) (bool, error)
    Clear(ctx) error
}
func GetOrLoad[T any](ctx, c Cache, key string, ttl time.Duration,
    load func(context.Context) (T, error)) (T, error)
func NewMemoryCache() *MemoryCache     // dev/tests

// database/redis
func NewClient(ctx context.Context, cfg Config) (*Client, error)  // pings on construct
func NewCache(c *Client, opts ...CacheOption) cache.Cache
func WithKeyPrefix(p string) CacheOption
func WithDefaultTTL(d time.Duration) CacheOption

func GetJSON[T any](ctx, c *Client, key string, dest *T) (bool, error)  // typed client helpers
func SetJSON[T any](ctx, c *Client, key string, v T, ttl time.Duration) error
func GetOrSet[T any](…)  func Increment(…)  func TTL(…)  func Exists(…)  func Delete(…)

func NewMutex(c *Client, key string, ttl time.Duration) *Mutex   // Lock(ctx) (bool, error); Unlock(ctx) error
func Allow(ctx, c *Client, key string, limit int, window time.Duration) (bool, error) // fixed-window limiter
```

## Usage

```go
rc, err := dxredis.NewClient(ctx, cfg.Redis)
c := dxredis.NewCache(rc, dxredis.WithKeyPrefix("catalogue:"), dxredis.WithDefaultTTL(5*time.Minute))

item, err := cache.GetOrLoad(ctx, c, "item:"+id, 10*time.Minute,
    func(ctx context.Context) (Item, error) { return repo.FindByID(ctx, id) })
```

Distributed exclusivity and API budgets:

```go
m := dxredis.NewMutex(rc, "job:refresh", 30*time.Second)
if ok, _ := m.Lock(ctx); ok { defer m.Unlock(ctx); refresh(ctx) }

if ok, _ := dxredis.Allow(ctx, rc, "quota:"+user.ID, 100, time.Minute); !ok {
    dxerrors.WriteError(w, dxerrors.NewTooManyRequests("quota exceeded"))
    return
}
```

## Best practices

- One key must always decode into the same `T` under `GetOrLoad` — mixed types under one key corrupt the read side.
- Cache write failures are deliberately best-effort (a failed `Set` is a future miss); never fail a request because the cache write failed.
- Prefer the `Mutex` for short critical sections only; for singleton scheduled work, the Postgres advisory lock in [scheduler](/modules/scheduler) is the platform default.

## Pitfalls

- `MemoryCache` is per-process — fine for tests, wrong for multi-replica correctness.
- `Allow` is fixed-window (burst at window edges); the in-process token bucket in [middleware](/modules/middleware) has smoother shaping but is per-replica.

## Related modules

[middleware](/modules/middleware), [scheduler](/modules/scheduler), [dxtest](/modules/dxtest) (Redis container).
