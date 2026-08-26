---
title: Getting Started
description: Add dx-common-go, choose the right package, and verify a service integration.
---

# Getting started

## Requirements

- Go 1.25 or newer
- a Go module for your service
- only the infrastructure used by the adapters you choose

## Add the module

Until a tagged release is published, pin an approved commit or Go pseudo-version:

~~~bash
go get github.com/datakaveri/dx-common-go@<approved-commit>
go mod tidy
go test ./...
~~~

Do not use an unreviewed moving branch in a release build. Record the exact module version in go.mod and deployment evidence.

For a workspace checkout, Go workspaces are preferable to a committed replace directive:

~~~bash
go work init ./dx-common-go ./dx-example-go
go work sync
~~~

## Minimal platform package

Platform errors and paging have no infrastructure dependency:

~~~go
package widgets

import (
    "context"
    "fmt"

    platformerrors "github.com/datakaveri/dx-common-go/platform/errors"
    "github.com/datakaveri/dx-common-go/platform/paging"
)

type Service struct{}

func (Service) List(
    _ context.Context,
    req paging.Request,
) (paging.Page[string], error) {
    return paging.NewPage([]string{"one"}, req, 1), nil
}

func (Service) Get(_ context.Context, id string) (string, error) {
    if id == "" {
        return "", platformerrors.Validation("id is required")
    }
    return "", fmt.Errorf(
        "load widget %q: %w",
        id,
        platformerrors.NotFound("widget not found"),
    )
}
~~~

## Selection rule

1. Use a platform package when it covers the concern.
2. Use its named adapter package for a vendor implementation, such as platform/database/sql/pgx, platform/cache/redis, or platform/events/amqp.
3. Use a top-level foundation package only when the platform surface does not cover that capability.
4. Keep vendor clients at the composition or adapter boundary.

Next: [Build a complete service](guides/service-integration.md).
