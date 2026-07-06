#!/usr/bin/env bash
# Generate per-package `go doc -all` snapshots into docs/api/.
# Usage: DX_COMMON_GO=/path/to/dx-common-go bash scripts/gen-api.sh
set -euo pipefail
cd "$(dirname "$0")/.."

LIB="${DX_COMMON_GO:-../cdpg-claude/dx-common-go}"
[ -d "$LIB" ] || { echo "library checkout not found: $LIB (set DX_COMMON_GO)"; exit 1; }

out="docs/api"
find "$out" -name 'pkg-*.md' -delete 2>/dev/null || true

(cd "$LIB" && go list ./... 2>/dev/null) | grep -vE 'examples|internal|appidpb|cmd/' | while read -r pkg; do
  rel="${pkg#github.com/datakaveri/dx-common-go/}"
  slug="pkg-$(echo "$rel" | tr '/' '-')"
  {
    echo "---"
    echo "id: $slug"
    echo "title: $rel"
    echo "---"
    echo
    echo "# \`$rel\`"
    echo
    echo '```'
    (cd "$LIB" && go doc -all "./$rel" 2>/dev/null || echo "no exported symbols")
    echo '```'
  } > "$out/$slug.md"
  echo "generated $out/$slug.md"
done
