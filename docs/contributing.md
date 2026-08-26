---
title: Contributing
description: API design, tests, source-backed docs, and release evidence for dx-common-go.
---

# Contributing

## Change checklist

1. Start from concrete service call sites.
2. Keep the public contract narrow and vendor-neutral.
3. Document failure, cancellation, concurrency, lifecycle, and observability.
4. Add unit and adapter conformance tests.
5. Run affected service tests, not only SDK tests.
6. Update this site and the public API inventory.
7. Add an upgrade note for any changed call site.

## Verification

~~~bash
go test ./...
go test -race ./...
go vet ./...

cd ../dx-common-go-docs
DX_COMMON_GO=../dx-common-go bash scripts/gen-api.sh
npm run typecheck
npm run build
~~~

Do not document a version that has not been tagged. Do not copy product architecture into this site; link to the platform documentation. Do not use a documentation example that imports a vendor package from an application layer.

## Public API review

For every exported identifier, ask whether external service code must name it. Prefer returning an existing interface over exposing an implementation type. Removing an unnecessary export before release is cheaper than supporting it indefinitely.
