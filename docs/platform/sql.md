---
title: SQL and Transactions
description: Portable SQL interfaces, transaction propagation, repository DSL, and pgx escape hatches.
---

# SQL and transactions

## Open a database

platform/database/sql defines DB, Querier, Tx, Rows, Row, Stats, Config, and Manager. Open currently uses the pgx adapter internally:

~~~go
db, err := dxsql.Open(ctx, cfg, dxsql.WithLogger(log))
if err != nil {
    return fmt.Errorf("open database: %w", err)
}
defer db.Close()

txManager := dxsql.NewManager(db)
~~~

## Transaction propagation

Manager.Do attaches the transaction to context. Repositories obtain it through TxFrom or Conn:

~~~go
err := txManager.Do(ctx, func(txCtx context.Context) error {
    if _, err := policies.Insert(txCtx, values); err != nil {
        return fmt.Errorf("insert policy: %w", err)
    }
    if err := outbox.Write(txCtx, event); err != nil {
        return fmt.Errorf("write event: %w", err)
    }
    return nil
})
~~~

Nested Do joins the outer transaction. DoRetry retries serialization failure and deadlock; its callback must be safe to rerun. Lock provides a non-blocking session advisory lock for singleton work.

## Generic repository

NewRepo[T] derives columns from db field tags. Options set table, ID, and soft-delete behavior.

~~~go
widgets := dxsql.NewRepo[widgetRow](
    db,
    dxsql.WithTable[widgetRow]("widgets"),
    dxsql.WithID[widgetRow]("widget_id"),
)

row, err := widgets.Where(
    dxsql.Eq("org_id", orgID),
    dxsql.Eq("widget_id", widgetID),
).One(ctx)
~~~

Predicates include equality/inequality, ranges, LIKE/ILIKE, IN, null checks, And, Or, Not, and parameterized Raw. Queries support Find, One, Count, Exists, Paged, and ForUpdate with optional SKIP LOCKED.

Insert, Update, and Delete are parameterized. Update and Delete refuse an unbounded operation.

## Escape hatches

Use SQL[T] or SQLOne[T] for joins, CTEs, window functions, JSONB, or PostGIS operations. Use Conn(ctx, db) with generated sqlc Queries so the ambient transaction is preserved.

The platform/database/sql/pgx package exposes Pool(db) only when an existing adapter genuinely requires pgxpool. Keep that import named and confined to adapter or composition code.

## Error behavior

MapError translates known driver conditions into platform classifications. Check IsRetryable only for transaction retry decisions. Preserve context cancellation and wrap operation context with %w.
