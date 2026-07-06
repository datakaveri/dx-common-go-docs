---
id: index
title: Examples
---

# Examples

Practical, copy-adaptable examples from single-module usage to a fully composed service.

| Page | What it shows |
|---|---|
| [Standalone modules](/examples/standalone) | Each major module used alone, minimal ceremony |
| [Composing modules](/examples/composition) | The patterns that emerge when modules meet: tx+outbox, cache+repo, resolver+authz |
| [Service integration](/examples/service-integration) | The full boot sequence of a real service, annotated |
| [Testing](/examples/testing) | Unit seams and container-backed integration tests |

The always-compiling reference is [`examples/minimal-service`](https://github.com/datakaveri/dx-common-go/tree/main/examples/minimal-service) in the library repo — CI builds it on every commit, so it cannot drift from the current API. When these docs and that code disagree, the code wins; file a docs issue.
