---
id: dxerrors
title: dxerrors
---

# dxerrors — the error taxonomy

```go
import "github.com/datakaveri/dx-common-go/dxerrors"
```

## Purpose

One error vocabulary for the whole platform: a small set of codes, each mapped to an HTTP status, a problem-type URN, and a human title — so a handler returns a taxonomy value and the client always sees the same envelope, while the *underlying cause* stays attached for logs and `errors.Is/As`.

## When to use it

Everywhere an error crosses the HTTP boundary, and everywhere a lower-level failure (Postgres, upstream HTTP) needs translating into a client-visible category.

## Key concepts

- **Taxonomy for clients, cause for operators.** `WithCause` attaches the underlying error without leaking it: clients get the mapped envelope; `errors.Is(err, pgx.ErrNoRows)` still works server-side.
- **Concrete type, interface compatibility.** Constructors return `*Error`; the `DxError` interface remains for signatures. Extract from any wrapped chain with `From(err)` — never a plain type assertion.
- **Two writers, one behavior.** `WriteError` writes a taxonomy value. `WriteServerError` is the handler-layer "translate or 500": known taxonomy passes through, anything else logs via your closure and returns a generic 500 that leaks nothing.

## Public API

```go
type ErrorCode string      // ERR_VALIDATION, ERR_UNAUTHORIZED, ERR_FORBIDDEN, ERR_NOT_FOUND,
                           // ERR_CONFLICT, ERR_INTERNAL, ERR_BAD_GATEWAY, ERR_SERVICE_UNAVAILABLE,
                           // ERR_TOO_MANY_REQUESTS, ERR_EXPIRED, ERR_DATABASE, ERR_METHOD_NOT_ALLOWED

type Error struct{ /* code, message, details, cause */ }
// Error implements error, Unwrap, and the DxError interface:
type DxError interface {
    error
    Code() ErrorCode; HTTPStatus() int; URN() string
    Title() string; Details() []string; Message() string
}

func NewValidation(msg string, details ...string) *Error   // 400
func NewUnauthorized(msg string, details ...string) *Error // 401
func NewForbidden(msg string, details ...string) *Error    // 403
func NewNotFound(msg string, details ...string) *Error     // 404
func NewConflict(msg string, details ...string) *Error     // 409
func NewInternal(msg string, details ...string) *Error     // 500
// … NewDatabase, NewExpired, NewBadGateway, NewServiceUnavailable,
//   NewTooManyRequests, NewMethodNotAllowed

func WithCause(e DxError, cause error) DxError    // attach, copy-on-write
func From(err error) (DxError, bool)              // errors.As over the chain
func MapPostgresError(err error) error            // pgx/pgconn → taxonomy, cause preserved
func WriteError(w http.ResponseWriter, err DxError)
func WriteServerError(w http.ResponseWriter, err error, logUnexpected func(error))
func IsNotFoundError(err error) bool              // + IsValidationError, IsAuthorizationError
```

## Usage

```go
// Repository: translate driver errors once, keep the cause.
row, err := q.FindByID(ctx, id)
if err != nil {
    return nil, dxerrors.MapPostgresError(err) // ErrNoRows → 404, 23505 → 409, …
}

// Handler: one-line closer.
func (h *Handler) fail(w http.ResponseWriter, op string, err error) {
    dxerrors.WriteServerError(w, err, func(e error) {
        h.logger.Error(op+" failed", zap.Error(e))
    })
}

// Branching on category through any wrapping:
if dxErr, ok := dxerrors.From(err); ok && dxErr.Code() == dxerrors.ErrConflict { … }
```

The wire shape:

```json
{"type":"urn:dx:as:ResourceAlreadyExists","title":"Conflict",
 "detail":"resource already exists: duplicate key","errors":[]}
```

## Best practices

- Handle an error **once**: return it up, let the top of the stack log through `WriteServerError`'s closure.
- Never `err.(DxError)` — wrapped values slip through and flatten to 500s. `From` exists precisely for this.
- Messages in constructors are client-visible; put anything sensitive in the *cause*, not the message.

## Pitfalls

- `MapPostgresError` passes unknown errors through wrapped (not forced into the taxonomy) — `WriteServerError` then correctly treats them as unexpected 500s.
- Error URNs are fixed to the platform's `urn:dx:as/rs` namespaces by the Java contract; success URNs are per-service via [response](/modules/response-request).

## Related modules

[response & request](/modules/response-request), [postgres](/modules/postgres) (whose DAO maps through this taxonomy).
