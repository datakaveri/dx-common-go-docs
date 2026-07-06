---
id: cli
title: cmd/dx (CLI)
---

# cmd/dx — developer CLI

```bash
go run github.com/datakaveri/dx-common-go/cmd/dx@latest <command>
```

## Purpose

Small scaffolding commands that keep fleet conventions mechanical.

## Commands

### `dx new migration <title>`

Creates the next zero-padded, paired migration in `./migrations`:

```bash
dx new migration add_status_index
# migrations/0007_add_status_index.up.sql
# migrations/0007_add_status_index.down.sql
```

Sequential numbering is read from the directory, so ordering stays reviewable in diffs (see [postgres → migrate](/modules/postgres)).

### `dx sqlc init`

Drops the platform's standard `sqlc.yaml` (pgx/v5, JSON tags, the paths the [three-legged standard](/modules/postgres) expects) so every service generates identical code shapes.

## Related modules

[postgres](/modules/postgres).
