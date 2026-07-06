---
id: testing
title: Testing
---

# Testing with dx-common-go

## The strategy

| Layer | Approach |
|---|---|
| Unit | Injectable seams (clock, transport, jitter) — deterministic, no sleeps, no network |
| Integration | Real dependencies via [dxtest/containers](/modules/dxtest); **skip, never fail**, without Docker |
| Contract | Decode responses into the generic envelope types (`DxResponse[T]`) |

## Unit: handlers with the standard envelope

```go
func TestGetItem_NotFound(t *testing.T) {
    h := NewHandler(fakeRepoReturning(dxerrors.NewNotFound("item not found")), sw, zap.NewNop())

    rec := httptest.NewRecorder()
    h.Get(rec, httptest.NewRequest(http.MethodGet, "/items/x", nil))

    require.Equal(t, http.StatusNotFound, rec.Code)
    var body response.DxResponse[any]
    require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
    require.Equal(t, "urn:dx:rs:ResourceNotFound", body.Type)
}
```

## Unit: identity without a gateway

```go
req := httptest.NewRequest(http.MethodPost, "/items", body)
req = req.WithContext(auth.WithUser(req.Context(), auth.DxUser{
    ID: "u-1", Roles: []string{"provider"},
}))
```

Or run the real resolver against self-signed headers:

```go
signed, _ := dxheaders.Sign(user, dxheaders.Config{Secret: secret})
mw := resolver.MustMiddleware(resolver.Config{Headers: dxheaders.Config{Secret: secret}})
```

## Integration: repository against real Postgres

```go
func TestItemRepo(t *testing.T) {
    pg := containers.Postgres(t, containers.WithMigrations(migrationsFS, "migrations"))
    repo := NewItemRepo(pg.Pool)
    // real SQL, real constraints, real error mapping
}
```

## Integration: consumer roundtrip against real RabbitMQ

```go
url := containers.RabbitMQ(t)
pub, _ := rabbitmq.NewReliablePublisher(rabbitmq.PublisherConfig{URL: url, Exchange: "t", ExchangeType: "topic", Logger: zap.NewNop()})
// start a ConsumerRunner, publish, assert delivery — see the library's own
// messaging/rabbitmq/integration_test.go for the full pattern including DLQ assertions.
```

## House rules

- Table-driven tests with `t.Run`; helpers call `t.Helper()`.
- `testify/require` for setup failures, `assert` inside loops.
- Black-box test packages (`package foo_test`) for public-API tests.
- Don't mock what you can run: sqlc queries and repositories are integration-tested, not interface-mocked.
