---
id: response-request
title: response & request
---

# response & request — the HTTP contract

```go
import (
    "github.com/datakaveri/dx-common-go/response"
    "github.com/datakaveri/dx-common-go/request"
)
```

## Purpose

Two halves of the platform's HTTP contract. **`response`** renders the standard JSON envelope (type URN, title, detail, result, pagination). **`request`** parses the standard list-endpoint query grammar — page/size, allowlisted sort and filters, temporal ranges — rejecting unknown parameters with a 400 instead of silently ignoring them.

## When to use it

Every endpoint. Handlers never call `json.NewEncoder(w)` or invent envelopes; list endpoints never parse `r.URL.Query()` by hand.

## Key concepts

- **`ServiceWriter` is the canonical writer.** Construct once at boot with your service's URN prefix; every response is tagged `urn:dx:<svc>:success|created`.
- **`PageInfo` is the pagination contract**: camelCase `page/size/totalCount/totalPages/hasNext/hasPrevious` nested under `paginationInfo`.
- **Allowlists everywhere in `request`**: sort columns and filter keys map *through explicit allowlists* to SQL columns — user input never names an identifier directly.

## Public API — response

```go
type DxResponse[T any] struct{ Type, Title, Detail string; Result T }
type DxPagedResponse[T any] struct{ /* + PaginationInfo PageInfo */ }
type PageInfo struct{ Page, Size int; TotalCount int64; TotalPages int; HasNext, HasPrevious bool }
func NewPageInfo(page, size int, totalCount int64) PageInfo

type ServiceWriter struct{ /* urn prefix */ }
func NewServiceWriter(urnPrefix string) *ServiceWriter
func (sw *ServiceWriter) Success(w, result any, title, detail string)
func (sw *ServiceWriter) Created(w, result any, title string)
func (sw *ServiceWriter) Accepted(w, result any, title string)
func (sw *ServiceWriter) PaginatedInfo(w, result any, info PageInfo, title, detail string)
func (sw *ServiceWriter) NoContent(w)

// Generic urn:dx:rs defaults (package-level):
func Write(w, statusCode int, body any)
func WriteSuccess / WriteCreated / WriteAccepted / WritePaginatedInfo / WriteNoContent
```

## Public API — request

```go
type PaginatedRequest struct {
    Page, Size int
    Sort       []SortField          // allowlist-mapped
    Filters    map[string]any       // exact-match, allowlist-mapped
    Fuzzy      map[string]string    // ILIKE-style, allowlist-mapped
    Temporal   []TemporalFilter
}
func From(r *http.Request) *Builder
// Builder: .Sortable(map[string]string) .Filterable(…) .Fuzzy(…) .Temporal(…)
//          .DefaultSize(n) .MaxSize(n) .Build() (PaginatedRequest, error)
```

## Usage

```go
sw := response.NewServiceWriter("urn:dx:catalogue:")

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
    pr, err := request.From(r).
        Sortable(map[string]string{"createdAt": "created_at", "name": "name"}).
        Filterable(map[string]string{"status": "status"}).
        DefaultSize(20).MaxSize(100).
        Build()
    if err != nil {
        dxerrors.WriteError(w, dxerrors.NewValidation("invalid query", err.Error()))
        return
    }
    items, total, err := h.svc.List(r.Context(), pr)
    if err != nil { h.fail(w, "list", err); return }

    sw.PaginatedInfo(w, items, response.NewPageInfo(pr.Page, pr.Size, total), "Success", "items fetched")
}
```

## Best practices

- One `ServiceWriter` per service, injected into handlers — the URN prefix is your namespace, owned by you, not the library.
- Writers take `any` deliberately: `encoding/json` erases static types at the boundary, and Go methods can't carry type parameters. The generic envelope types exist for the *decode* side (tests, clients).
- Map API sort/filter names to SQL columns explicitly, even when identical — the allowlist is the security boundary.

## Pitfalls

- `request` returns 400 on unknown parameters by design; clients relying on ignored params will notice. That's the contract working.
- `PageInfo` is 1-based pages; convert to limit/offset only at the repository (`dao.Page` speaks limit/offset).

## Related modules

[dxerrors](/modules/dxerrors), [postgres](/modules/postgres) (`FindPage` consumes page/size), [openapi](/modules/openapi).
