---
id: auth-appid
title: appid (M2M credentials)
---

# auth/appid — machine-to-machine authentication

```go
import "github.com/datakaveri/dx-common-go/auth/appid"
```

## Purpose

Authentication for non-interactive callers (apps, integrations): verify an app-id/secret pair against the user service over gRPC, and mint service tokens via Keycloak's client-credentials flow. The generated protobuf contract lives alongside in `auth/appid/appidpb`.

## Key concepts

- **Verification is delegated**: this module doesn't store credentials; it calls the platform's verification gRPC endpoint (dx-user-go) and caches nothing sensitive.
- **Middleware translates app credentials into a `DxUser`-shaped identity**, so downstream handlers stay uniform.
- The gRPC dial goes through [grpc/client](/modules/grpc-client): retries on transient codes, tracing, keepalive — for free.

## Public API

```go
type Config struct{ /* verification endpoint, keycloak client creds, timeouts */ }
func NewClient(cfg Config) (*Client, error)
func Middleware(client *Client) func(http.Handler) http.Handler
type VerificationError struct{ /* wraps upstream detail */ }

// appidpb: generated VerifyAppCredentials service + messages
```

## Usage

```go
appClient, err := appid.NewClient(cfg.AppID)
if err != nil { return err }

// Routes that accept app credentials instead of user JWTs:
r.With(appid.Middleware(appClient)).Post("/ingest", h.Ingest)
```

## Best practices

- Scope app-credential routes narrowly; everything else stays on the [resolver](/modules/auth-identity).
- Treat `VerificationError` as 401-shaped; only infrastructure failures should surface as 5xx.

## Pitfalls

- The `.proto` source lives next to the generated code — regenerate with the module's `go_package`; never hand-edit `.pb.go` files (their raw descriptors are length-prefixed byte strings).

## Related modules

[grpc/client](/modules/grpc-client), [identity](/modules/auth-identity).
