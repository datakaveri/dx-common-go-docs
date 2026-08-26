---
title: Testing a Service
description: Fakes, in-memory adapters, containers, race tests, and contract verification.
---

# Testing a service

## Application test

Use a small fake that records calls and returns controlled values:

~~~go
func TestService_Get_deniesWrongOrganization(t *testing.T) {
    t.Parallel()

    repo := &fakeWidgetRepository{
        widget: Widget{ID: "w1", OrgID: "org-b"},
    }
    svc := New(repo)

    _, err := svc.Get(
        context.Background(),
        identity.Subject{ID: "u1", Org: "org-a"},
        "w1",
    )

    require.Error(t, err)
    assert.True(t, platformerrors.IsForbidden(err))
}
~~~

## Adapter choices

- cache.NewMemory for real cache semantics without Redis;
- events.NewMemory for typed publish/subscribe tests;
- health.CheckerFunc for dependency outcomes;
- dxtest containers for PostgreSQL, Redis, RabbitMQ, or Elasticsearch behavior;
- net/http/httptest only for transport integration; typed handlers need no recorder.

## Database tests

Apply embedded migrations, create isolated schema or database state, and test:

- named column scanning;
- not-found and constraint error mapping;
- transaction commit, rollback, nesting, and retry safety;
- deterministic paging;
- soft-delete scope;
- SKIP LOCKED work claiming where used.

## Event tests

Test envelope ID/version/correlation, consumer group, duplicate delivery, retryable failure, ErrDrop policy, shutdown, and dead-letter behavior. An in-memory bus proves application contracts; the AMQP adapter still needs integration coverage.

## Required commands

~~~bash
go test ./...
go test -race ./...
go vet ./...
~~~

Add repository lint, fuzz, integration, and full-stack targets to the service gate. Run tests with a clean module cache periodically so an undeclared dependency does not remain hidden.
