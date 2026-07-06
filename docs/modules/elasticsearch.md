---
id: elasticsearch
title: elasticsearch (client, query, repository, mapping, indexing)
---

# database/elasticsearch — search stack

```go
import (
    esclient "github.com/datakaveri/dx-common-go/database/elasticsearch/client"
    esquery "github.com/datakaveri/dx-common-go/database/elasticsearch/query"
    esrepo "github.com/datakaveri/dx-common-go/database/elasticsearch/repository"
    "github.com/datakaveri/dx-common-go/database/elasticsearch/mapping"
    "github.com/datakaveri/dx-common-go/database/elasticsearch/indexing"
)
```

## Purpose

Elasticsearch for catalogue/search services in five focused layers: a thin instrumented **client**, a **pure query DSL** (no IO), typed **repository** execution, index **mapping/alias lifecycle**, and a **bulk indexing** engine with retry and a generic source→index syncer.

## Key concepts

- **DSL is data**: `query.Query` is `map[string]any` built by functions (`Term`, `Match`, `Bool()`, `Range`, geo, KNN, aggregations, suggesters) — testable without a cluster.
- **Zero-downtime index changes** via aliases: create new index → reindex → `SwapAlias` → drop old (`MigrateIndex` orchestrates it).
- **Errors map into the taxonomy**: not-found → 404-shaped, so handlers stay uniform.
- **Tracing at the transport seam**: `Config.EnableTracing` wraps the ES HTTP transport with otelhttp.

## Public API (essentials)

```go
// client
func New(ctx context.Context, cfg Config) (*Client, error)
func IsNotFound(err error) bool

// query — composition
q := esquery.Bool().
    Must(esquery.Match("title", term)).
    Filter(esquery.Term("status", "ACTIVE"),
           esquery.GeoDistance("location", lat, lon, "10km")).
    Build()

// repository — execution
res, err := esrepo.Search(ctx, c, "catalogue", esquery.SearchRequest{Query: q, Size: 20})
items, err := esrepo.HitsAs[CatalogueItem](res)
items, total, err := esrepo.SearchAs[CatalogueItem](ctx, esrepo.NewSearch(c, "catalogue").Query(q).Page(p, s))
// + GetDoc/IndexDoc/UpdateDoc/DeleteDoc, Count, UpdateByQuery, Scroll, PIT
repo := esrepo.New[CatalogueItem](c, "catalogue")   // typed convenience

// mapping — lifecycle
mb := mapping.AutoMap[CatalogueItem]()              // struct → mapping (override per field)
_, err := mapping.EnsureIndex(ctx, c, "catalogue-v2", mb.Build())
err = mapping.MigrateIndex(ctx, c, "catalogue", "catalogue-v2", mapping.MigrateOptions{…})

// indexing — bulk + sync
stats, err := indexing.BulkDo(ctx, c, "catalogue", ops, …)   // IndexOp/UpdateOp/DeleteOp
report, err := indexing.Sync(ctx, c, mySource, indexing.SyncConfig{…}) // any Source → index
```

## Best practices

- Services address **aliases**, never physical index names — migrations then never touch service config.
- Keep queries in the DSL; resort to `map[string]any` literals only for features the DSL lacks (then add them to the DSL).
- Bulk writes: use `BulkIndexWithRetry`'s partial-failure stats; a bulk call "succeeding" with item errors is the classic silent loss.

## Pitfalls

- ES integration tests bind `ES_TEST_ADDR` (compose stack) — there is no ES testcontainer helper yet (ES8 TLS/auth plumbing); they skip without it.
- `HitsAs[T]` decodes `_source` strictly — schema drift between mapping and struct shows up here, not at index time.

## Related modules

[postgres](/modules/postgres) (never import both stores into each other), [observability](/modules/observability), [dxerrors](/modules/dxerrors).
