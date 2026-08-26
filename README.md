# dx-common-go documentation

Source-backed documentation for the shared Go platform SDK.

## Build

Requires Node.js 20 or newer and a sibling dx-common-go checkout.

~~~bash
DX_COMMON_GO=../dx-common-go bash scripts/gen-api.sh
npm ci
npm run typecheck
npm run build
npm run start
~~~

The development URL is http://localhost:3000/dx-common-go-docs/.

The site intentionally remains current-only until dx-common-go publishes a real Git tag. Consumers should follow the documented commit or pseudo-version pinning policy.
