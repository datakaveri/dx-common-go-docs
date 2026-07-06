# dx-common-go-docs

The official developer portal for [dx-common-go](https://github.com/datakaveri/dx-common-go) — the shared Go foundation of the Data Exchange platform.

Built with Docusaurus: versioned docs, offline search, Mermaid diagrams, light/dark themes.

## Develop

```bash
npm install
npm start            # live-reload dev server
npm run build        # production build (broken links fail it)
npm run serve        # serve the production build
```

## Structure

- `docs/` — the "Next" (in-development) docs: orientation → module catalogue → examples → guides
- `versioned_docs/`, `versioned_sidebars/`, `versions.json` — released versions (never edited)
- `scripts/gen-api.sh` — regenerate `go doc -all` API snapshots from a library checkout (`npm run gen-api`)

## Release a docs version

```bash
DX_COMMON_GO=…/dx-common-go npm run gen-api
npm run docusaurus docs:version X.Y.Z
```

## Deploy

Pushes to `main` build and publish to GitHub Pages via `.github/workflows/deploy.yml` (build on PRs too; deploy only from `main`).
