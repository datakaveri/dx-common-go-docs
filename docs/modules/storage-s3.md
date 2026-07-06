---
id: storage-s3
title: storage/s3 (+ sts)
---

# storage/s3 — object storage (S3 / MinIO)

```go
import (
    dxs3 "github.com/datakaveri/dx-common-go/storage/s3"
    "github.com/datakaveri/dx-common-go/storage/s3/sts"
)
```

## Purpose

One client for any S3-compatible backend (AWS S3 or MinIO): object CRUD, ranged reads, listing, presigned URLs, and the full multipart lifecycle — behind small capability interfaces so consumers depend on exactly what they use. The sibling `sts` package vends **short-lived, prefix-scoped credentials** for direct client access.

## Key concepts

- **Keys are opaque** — layout, naming, and tenancy policy belong to the caller. The module is deliberately business-free.
- **Capability interfaces** (`Reader`, `Writer`, `Presigner`, `Multipart`, `ObjectStore`) let services accept the narrowest contract; `*Client` implements them all.
- **`sts` is a separate package** so services that only move objects never pull the STS SDK into their build.

## Public API

```go
type Config struct {
    Provider        string // "s3" | "minio"
    Endpoint, Region, AccessKeyID, SecretAccessKey, Bucket string
    UseSSL, ForcePathStyle bool
}
func NewClient(ctx context.Context, cfg Config) (*Client, error)

// objects
PutObject(ctx, key, contentType string, body io.Reader, size int64) error
GetObject(ctx, key) (io.ReadCloser, *ObjectInfo, error)
GetObjectRange(ctx, key, offset, length int64) (io.ReadCloser, *ObjectInfo, error)
HeadObject(ctx, key) (*ObjectInfo, error)
ObjectExists(ctx, key) (bool, error)
DeleteObject / CopyObject / ListObjects(ctx, prefix, …opts)

// presign: time-limited GET / PUT / UploadPart URLs
// multipart: Initiate / UploadPart / Complete / Abort / ListMultipartUploads
HealthCheck(ctx) error   // plugs into health.NewObjectStoreChecker

// sts
type Request struct{ /* role, session, policy, duration */ }
func NewVendor(ctx context.Context, cfg sts.Config) (*Vendor, error)
func PrefixPolicy(bucket, prefix string, actions []string) (string, error)
func PrefixReadOnlyPolicy(bucket, prefix string) (string, error)
```

## Usage

```go
store, err := dxs3.NewClient(ctx, dxs3.Config{
    Provider: "minio", Endpoint: "http://minio:9000",
    AccessKeyID: id, SecretAccessKey: secret,
    Bucket: "databanks", ForcePathStyle: true,
})

err = store.PutObject(ctx, "db/"+id+"/data.csv", "text/csv", f, size)
url, err := store.PresignGetObject(ctx, key, 15*time.Minute)   // hand to the browser

// Direct-upload credentials scoped to one prefix:
policy, _ := sts.PrefixPolicy("databanks", "db/"+id+"/", sts.WriteActions)
creds, err := vendor.Credentials(ctx, sts.Request{Policy: policy, DurationSeconds: 900})
```

## Best practices

- Accept `dxs3.Reader`/`Writer` in your services, not `*Client` — tests then need only a tiny fake.
- Multipart: non-final parts must be ≥ 5 MiB; always `Abort` on failure paths or orphaned uploads accumulate.
- Bucket lifecycle (create/policies) is deployment's job, not the service's.

## Pitfalls

- MinIO needs `ForcePathStyle: true`; forgetting it yields opaque DNS-style errors.
- Presigned URLs embed the *signing-time* endpoint — behind split internal/external endpoints, sign with the public one.

## Related modules

[dxtest](/modules/dxtest) (MinIO container), [observability](/modules/observability) (object-store readiness checker).
