---
id: dxtest
title: dxtest/containers
---

# dxtest/containers — integration-test infrastructure

```go
import "github.com/datakaveri/dx-common-go/dxtest/containers"
```

## Purpose

Real dependencies for integration tests with zero setup: one shared container per test binary for Postgres, Redis, RabbitMQ, and MinIO — with environment-DSN overrides for CI reuse, and a hard rule: **tests skip (never fail) when Docker is absent**, so plain `go test ./...` stays green everywhere.

## Public API

```go
func Postgres(t *testing.T, opts ...Option) *PostgresHandle   // .Pool, .DSN
func WithMigrations(fsys fs.FS, dir string) Option            // apply your service migrations first
func WithSetupSQL(fsys fs.FS, dir string) Option
func Redis(t *testing.T) *RedisHandle                          // .Client, .Addr
func RabbitMQ(t *testing.T) string                             // AMQP URL
func MinIO(t *testing.T) ObjectStoreConfig                     // Endpoint, AccessKey, SecretKey
```

Environment overrides (bind an existing instance instead of starting a container): `DX_TEST_PG_DSN`, `DX_TEST_REDIS_ADDR`, `DX_TEST_RABBITMQ_URL`, `DX_TEST_S3_ENDPOINT` (+ `_ACCESS_KEY`/`_SECRET_KEY`). Elasticsearch tests currently bind `ES_TEST_ADDR` (no ES8 container helper yet).

## Usage

```go
func TestItemRepo_CRUD(t *testing.T) {
    pg := containers.Postgres(t, containers.WithMigrations(migrationsFS, "migrations"))
    repo := NewItemRepo(pg.Pool)

    created, err := repo.Insert(context.Background(), item)
    require.NoError(t, err)

    got, err := repo.FindByID(context.Background(), created.ID)
    require.NoError(t, err)
    require.Equal(t, item.Name, got.Name)
}
```

Containers start once per binary (`sync.Once`) and are left for testcontainers' reaper — parallel tests share them safely.

## Best practices

- Namespace your keys/queues/tables per test (or truncate in setup) — the container is shared across the binary's tests.
- In CI, pointing the env DSNs at job services is faster than Docker-in-Docker; the same tests run unchanged.

## Pitfalls

- First run pulls images — expect a one-time delay locally.
- Handles are test-scoped (`t.Cleanup` closes clients); don't stash them in globals.

## Related modules

[postgres](/modules/postgres), [redis-cache](/modules/redis-cache), [messaging](/modules/messaging), [storage-s3](/modules/storage-s3).
