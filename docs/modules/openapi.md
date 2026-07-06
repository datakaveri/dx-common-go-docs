---
id: openapi
title: openapi
---

# openapi — spec-driven request validation

```go
import "github.com/datakaveri/dx-common-go/openapi"
```

## Purpose

Load an embedded OpenAPI 3 document, validate every incoming request against it before your handlers run, and serve Swagger UI — so the spec in the repo *is* the contract in production.

## When to use it

Every service with an HTTP API. Embed the spec with `go:embed` so binary and contract can never drift.

## Key concepts

- **Requests that fail validation never reach handlers** — clients get a 400 in the standard `dxerrors` envelope whose detail names the offending parameter/field.
- **Pass-through by design**: routes absent from the spec and health paths (`/health*`, `/ready`, `/live`) skip validation.
- **Constructor can fail** (unbuildable route table) → `(mw, error)`; `MustValidationMiddleware` panics for terse boot wiring.

## Public API

```go
type Config struct {
    SpecPath         string `mapstructure:"spec_path"`
    SwaggerUIEnabled bool   `mapstructure:"swagger_ui_enabled"` // default true
    SwaggerUIPath    string `mapstructure:"swagger_ui_path"`    // default /docs
    ValidateRequests bool   `mapstructure:"validate_requests"`  // default true
}
func DefaultConfig() Config

type Loader struct{ /* parsed, validated document */ }
func NewLoader(specPath string) (*Loader, error)
func NewLoaderFromBytes(data []byte) (*Loader, error)
func (l *Loader) Doc() *openapi3.T

func ValidationMiddleware(l *Loader, cfg Config) (func(http.Handler) http.Handler, error)
func MustValidationMiddleware(l *Loader, cfg Config) func(http.Handler) http.Handler
func ServeUI(r chi.Router, l *Loader, cfg Config)
```

## Usage

```go
//go:embed openapi.yaml
var specBytes []byte

loader, err := openapi.NewLoaderFromBytes(specBytes)
if err != nil { return err }

r.Use(openapi.MustValidationMiddleware(loader, cfg.OpenAPI))
openapi.ServeUI(r, loader, cfg.OpenAPI)   // /docs + /openapi.json
```

A failing request:

```json
{"type":"urn:dx:as:InvalidParamValue","title":"Bad Request",
 "detail":"request validation failed",
 "errors":["parameter \"size\" in query has an error: value abc: an invalid integer"]}
```

## Best practices

- Keep `ValidateRequests: true` everywhere, including production — the detail messages describe the *client's* request, not server internals.
- Mount the middleware **before** identity resolution: malformed requests are rejected before any auth work.
- Treat the spec as review-critical: changing it changes the contract.

## Pitfalls

- Validation is only as strict as the spec — undeclared query parameters pass through unless the spec forbids them.
- Multipart bodies validate shape, not content; pair with [middleware](/modules/middleware)'s upload validation for size/type limits.

## Related modules

[dxerrors](/modules/dxerrors) (the 400 envelope), [middleware](/modules/middleware), [validation](/modules/validation) (handler-level body rules beyond the spec).
