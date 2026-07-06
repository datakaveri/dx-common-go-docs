---
id: index
title: API Reference
---

# API Reference

Complete, always-current API documentation for every public package comes from the Go toolchain itself:

## pkg.go.dev (canonical)

**[pkg.go.dev/github.com/datakaveri/dx-common-go](https://pkg.go.dev/github.com/datakaveri/dx-common-go)** renders every exported type, interface, constructor, function, constant, and doc comment for every tagged version — the same content as `go doc`, cross-linked and versioned.

## Local, offline

```bash
go doc github.com/datakaveri/dx-common-go/dxerrors            # package summary
go doc github.com/datakaveri/dx-common-go/dxerrors.WithCause  # one symbol
go doc -all github.com/datakaveri/dx-common-go/messaging/rabbitmq
```

## Generated snapshot in this site

`npm run gen-api` (backed by `scripts/gen-api.sh`) regenerates a `go doc -all` snapshot per package under `docs/api/` from a local library checkout, so a version of this site can freeze the exact surface it documents. Run it before cutting a docs version:

```bash
DX_COMMON_GO=~/workspace/cdpg-claude/dx-common-go npm run gen-api
```

## Why doc comments are the source of truth

Every exported symbol in the library carries a doc comment reviewed with the code — generating reference from them (rather than hand-writing it here) means the API reference cannot drift. These docs add what godoc can't: intent, composition patterns, pitfalls, and examples — see [Modules](/modules).
