---
id: postgres
title: postgres (client, dao, repository, query, transaction, migrate, sqlcx)
---

# database/postgres — the persistence stack

```go
import (
    "github.com/datakaveri/dx-common-go/database/postgres/client"
    "github.com/datakaveri/dx-common-go/database/postgres/repository"
    "github.com/datakaveri/dx-common-go/database/postgres/query"
    "github.com/datakaveri/dx-common-go/database/postgres/transaction"
    dxmigrate "github.com/datakaveri/dx-common-go/database/postgres/migrate"
)
```

## Purpose

Everything a service needs against Postgres, without an ORM: pooled connections with tracing, schema migrations that own the schema, a generic repository with a parameterized query DSL, ambient transaction propagation, and a bridge for sqlc-generated queries.

## The three-legged standard (normative)

| Need | Use |
|---|---|
| CRUD + dynamic filter/sort/page | `repository.Base[R]` (embeds the generics DAO + DSL) |
| Static complex reads (JOIN/aggregate) | **sqlc** through `sqlcx.DB(ctx, pool)` |
| Dynamic WHERE + JSONB/PostGIS/window | Raw `$N` SQL via the DAO escape hatches |

No ORM, no JOIN DSL, no hidden SQL. Identifiers come from code or allowlists — never user input; values are always parameters.

## client — the pool

```go
type Config struct{ DSN string; MaxConns, MinConns int32; SearchPath string; /* timeouts */ }
func NewPool(ctx context.Context, cfg Config, opts ...PoolOption) (*pgxpool.Pool, error)
func WithTracers(tracers ...pgx.QueryTracer) PoolOption   // otelpgx, SlowQueryTracer, …
type SlowQueryTracer struct{ /* logs > threshold, default 200ms */ }
```

`SearchPath` selects the active schema from configuration alone — the same value drives the migration runner, so app and migrations always agree.

## migrate — Go owns the schema

SQL-first paired files, embedded in the binary, sequential zero-padded versions, **per-service history table** (`schema_migrations_<svc>`), and loud dirty-state errors:

```go
//go:embed migrations/*.sql
var migrationsFS embed.FS

err := dxmigrate.Run(dxmigrate.Config{
    DSN: cfg.Postgres.DSN, Mode: dxmigrate.ModeMigrate,
    TableName: "schema_migrations_myservice", SearchPath: cfg.Postgres.SearchPath,
}, migrationsFS, "migrations", logger)
```

Migration 0001 is your idempotent baseline (`CREATE TABLE IF NOT EXISTS …`): a no-op against existing databases, a full create on greenfield. Zero-downtime changes follow **expand → migrate → contract**. Run migrations before serving traffic, never lazily.

## repository — embeddable generic base

```go
type ItemRepo struct{ *repository.Base[itemRow] }

func NewItemRepo(pool *pgxpool.Pool) *ItemRepo {
    return &ItemRepo{Base: repository.New[itemRow](pool,
        repository.WithTable[itemRow]("items"),
        repository.WithID[itemRow]("item_id"),
    )}
}

// Inherited surface (all ctx-first, all tx-propagation-aware):
// FindByID, FindOne, FindAll, FindPage, Count, Exists,
// Insert, InsertMap, Update, UpdateReturning, Upsert, SoftDelete, HardDelete,
// Query(ctx).Where(…).OrderBy(…).Limit(…) fluent Finder,
// raw Select / SelectOne / Exec escape hatches.
```

Row structs map by column name via pgx (`db:"column"` tags). Options add platform behaviors:

```go
dao.WithSoftDeleteFilter[itemRow]("status")        // auto-exclude DELETED rows; Unscoped() bypasses
dao.WithAuditColumns[itemRow]("created_by", "updated_by") // filled from dao.WithActor(ctx, id)
```

Optimistic locking: a `version` column pattern with `dao.ErrStaleVersion` on concurrent updates.

## query — the condition DSL

```go
conds := []query.Condition{
    query.Eq("status", "ACTIVE"),
    query.ILike("name", "%solar%"),
    query.In("kind", kinds),
    query.Or(query.IsNull("deleted_at"), query.Gt("expires_at", now)),
}
```

14 operators, `IN` → `= ANY($n)`, grouped `And`/`Or` — values always parameterized. `FromFilters`/`FromTemporal` translate [request](/modules/response-request) output directly.

## transaction — ambient propagation

```go
err := transaction.InTransaction(ctx, pool, func(ctx context.Context) error {
    if err := orders.Insert(ctx, o); err != nil { return err }     // same tx
    if err := outboxStore.Insert(ctx, evt); err != nil { return err } // same tx
    return nil
})
```

Repositories bind to the transaction the context carries — multi-repo atomic units need **no transaction code in the repositories**. Also: `InRetryableTransaction` (serialization-failure retries via [resilience](/modules/resilience)) and `WithAdvisoryLock`.

## sqlcx — sqlc without adapters

```go
q := sqlcgen.New(sqlcx.DB(ctx, pool))   // runs in the ambient tx when present
```

## Best practices

- Repositories translate driver errors **once** at the boundary: `dxerrors.MapPostgresError(err)` — causes stay in the chain.
- `FindPage` returns `dao.Page[T]` (limit/offset + totals via `COUNT(*) OVER()`); convert to `response.PageInfo` in the handler.
- One pool per service; pass `ctx` from your signal context at boot so a hung database can't block startup forever.

## Pitfalls

- The builder interpolates *identifiers* verbatim by design — never feed user input as a column/table name; that is what allowlists are for.
- `SoftDelete` writes the sentinel; without `WithSoftDeleteFilter`, reads still see soft-deleted rows.
- Don't wrap sqlc in service-side interfaces "for testability" — integration-test against real Postgres via [dxtest](/modules/dxtest).

## Related modules

[dxtest](/modules/dxtest), [dxerrors](/modules/dxerrors), [observability](/modules/observability) (pgx tracer), [messaging](/modules/messaging) (outbox shares the tx).
