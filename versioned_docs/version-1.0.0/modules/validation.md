---
id: validation
title: validation
---

# validation — request-body rules

```go
import "github.com/datakaveri/dx-common-go/validation"
```

## Purpose

Fluent, handler-level validation for decoded request bodies and single parameters — the rules your OpenAPI spec can't express (cross-field logic, business formats), returning taxonomy errors that render as proper 400s.

## When to use it

After the [openapi](/modules/openapi) middleware has enforced structure, for anything semantic: required-if, enum membership, length windows, custom checks.

## Public API

```go
func ValidateRequest[T any](r *http.Request, rules func(*T) *Validator) (T, dxerrors.DxError)
func ValidateRawRequest[T any](r *http.Request) (T, dxerrors.DxError)     // decode-only
func ValidateQueryParam(r *http.Request, name string) (string, dxerrors.DxError)
func ValidateHeaderParam(r *http.Request, name string) (string, dxerrors.DxError)

type Validator struct{ /* accumulates field errors */ }
func New() *Validator
// (v *Validator) String(name, value string, opts ...StringOption)
//                Integer(name string, value int, opts ...IntOption)
//                Email / UUID / URL / Phone(name, value string)
//                Custom(name string, ok bool, msg string)
//                Error() dxerrors.DxError   // nil when everything passed

func MinLen(n int) StringOption; func MaxLen(n int) StringOption
func Pattern(re string) StringOption; func OneOf(values ...string) StringOption
func Min(n int) IntOption; func Max(n int) IntOption
```

## Usage

```go
type CreateItem struct {
    Name   string `json:"name"`
    Kind   string `json:"kind"`
    Copies int    `json:"copies"`
}

body, dxErr := validation.ValidateRequest(r, func(b *CreateItem) *validation.Validator {
    return validation.New().
        String("name", b.Name, validation.MinLen(3), validation.MaxLen(120)).
        String("kind", b.Kind, validation.OneOf("dataset", "model")).
        Integer("copies", b.Copies, validation.Min(1), validation.Max(10))
})
if dxErr != nil {
    dxerrors.WriteError(w, dxErr)
    return
}
```

All failures are collected into one 400 whose `errors` array names every bad field — clients fix everything in one round trip.

## Best practices

- Let the spec do structure; keep these rules semantic. Duplicate neither direction.
- Prefer `OneOf` over hand-rolled maps for enums — the error message enumerates the valid values for the client.

## Pitfalls

- `ValidateRequest` consumes the body; read it exactly once.

## Related modules

[openapi](/modules/openapi), [dxerrors](/modules/dxerrors).
