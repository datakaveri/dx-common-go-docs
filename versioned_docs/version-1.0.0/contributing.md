---
id: contributing
title: Contributing
sidebar_position: 12
---

# Contributing

## To the library

1. **Check the bar**: new modules must be generic (≥2 services), config-driven, dependency-clean, tested, documented. See [Design Principles → Extending](/design-principles#extending-the-library).
2. **Follow the API conventions** on that same page — `New…`/`With…`, ctx-first, `FromContext`, taxonomy errors, enums from 1.
3. **Gates** (all enforced in CI): `gofmt`, `go build`, `go vet`, `go test -race`, `golangci-lint`, the coverage ratchet (`scripts/check-coverage-floors.sh`), and the `examples/minimal-service` compile guard.
4. **Tests**: table-driven units with injectable seams; integration via `dxtest/containers`, skipping without Docker.
5. **Breaking changes** ship as a wave: the library change + the mechanical fleet migration + a migration-guide entry, landed together.

## To these docs

- One page per module, following the shared skeleton (purpose → concepts → API → usage → practices → pitfalls → related). Consistency is a feature; match the existing pages.
- Code samples must compile against the current library — if an API changes, the sample changes in the same wave.
- Local preview: `npm start`. Production build check: `npm run build` (broken links fail the build).
- New module page? Add it to `sidebars.ts` under its concern group and to the [Package Overview](/package-overview) table.

## Cutting a docs version

When the library tags `vX.Y.Z`:

```bash
DX_COMMON_GO=…/dx-common-go npm run gen-api   # freeze the API snapshot
npm run docusaurus docs:version X.Y.Z         # snapshot docs/ → versioned_docs/
# bump themeConfig … versions.current.label to the next dev version
```

Older versions stay served; `docs/` remains the in-development "current".
