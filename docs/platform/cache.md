---
title: Cache
description: Scoped caching, memory and Redis adapters, loading, invalidation, locks, and limits.
---

# Cache

platform/cache separates cache semantics from its store.

## Construct a cache

~~~go
store, err := rediscache.Open(ctx, cfg)
if err != nil {
    return fmt.Errorf("open Redis cache: %w", err)
}

c := cache.New(
    store,
    cache.WithPrefix("dx-catalogue-go"),
    cache.WithDefaultTTL(5*time.Minute),
)
defer c.Close()
~~~

Use cache.NewMemory in tests or single-process scenarios where shared state is not required.

## Scoped keys

~~~go
items := c.Namespace("catalogue").Namespace("items").TTL(time.Minute)

var item Item
err := items.Get(ctx, itemID, &item)
switch {
case err == nil:
    return item, nil
case errors.Is(err, cache.ErrMiss):
    // Load from the source of truth.
default:
    return Item{}, fmt.Errorf("read item cache: %w", err)
}
~~~

Namespace and TTL return immutable scopes. Get, Set, SetTTL, Delete, Exists, Invalidate, Lock, Allow, and Key operate within the scope. Root Invalidate is rejected to prevent an accidental whole-cache flush.

## Read-through and write invalidation

~~~go
item, err := cache.GetOrLoad(
    ctx,
    items,
    itemID,
    func(ctx context.Context) (Item, error) {
        return repo.Get(ctx, itemID)
    },
)
~~~

GetOrLoad collapses concurrent in-process loads. Invalidating runs a mutation and removes the key after success. GetOrLoadAhead supports refresh-ahead behavior.

Cache failure must not silently become authoritative state. Decide whether the operation can continue from its primary store, and emit a metric for degraded cache behavior.

## Coordination primitives

Lock is non-blocking and returns ErrLockHeld under contention. Allow is a fixed-window rate counter. Do not use either as a transaction or durable workflow substitute.
