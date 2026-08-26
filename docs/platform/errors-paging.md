---
title: Errors and Paging
description: Safe error classification, HTTP and gRPC mapping, and one pagination model.
---

# Errors and paging

## platform/errors

Construct a client-safe classification at the layer that understands the failure:

~~~go
if input.Name == "" {
    return platformerrors.Validation("name is required")
}

row, err := repo.Get(ctx, id)
if err != nil {
    return platformerrors.Wrap(
        err,
        platformerrors.CodeDatabase,
        "could not load widget",
    )
}
~~~

Available constructors include Validation, Unauthorized, Forbidden, NotFound, Conflict, Internal, BadGateway, ServiceUnavailable, TooManyRequests, Expired, Database, and MethodNotAllowed.

Wrap keeps the underlying error reachable through errors.Is and errors.As while exposing only the supplied safe message. CodeOf, Message, Details, Classified, and Is... helpers inspect the chain.

The same taxonomy maps through platform/http and platform/grpc. Do not render err.Error directly.

## platform/paging

~~~go
req := paging.NewRequest(page, size)
items, err := widgets.Where(
    dxsql.Eq("org_id", orgID),
).Order(
    dxsql.Asc("created_at"),
    dxsql.Asc("id"),
).Paged(ctx, req)
~~~

Request is 1-based and clamps size to MaxSize. It provides Limit and Offset. Info reports page, size, totalCount, totalPages, hasNext, and hasPrevious. Page[T] always normalizes a nil item slice to an empty JSON array.

Use:

- NewRequest(page, size);
- NewPage(items, request, totalCount);
- `Empty[T](request)`;
- MapPage(page, mapper);
- Params.Parse or Params.Strict at an HTTP boundary;
- SortKey.Parse with a storage-layer allowlist.

Always specify deterministic ordering for pagination. Prefer cursor or keyset pagination for deep, frequently changing collections even when a bounded administrative API uses page/size.
