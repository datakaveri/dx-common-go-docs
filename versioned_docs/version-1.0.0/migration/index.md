---
id: index
title: Migration Guides
---

# Migration Guides

Breaking changes ship as **coordinated waves**: one library change-set plus a mechanical, scripted migration applied to every consumer in the same change window (the fleet consumes the library by `replace` directive, so there is no version skew to manage inside a wave).

Each guide lists exact old→new mappings and the sed-able steps that were applied fleet-wide.

| Guide | Covers |
|---|---|
| [v1.0.0 (waves W0–W4)](/migration/v1) | The consolidation that produced the 1.0 surface: package renames and moves, contract fixes, lifecycle changes |

## How to read a wave

- **"Blast radius"** — which packages/call sites a change touches.
- **"Mechanical"** — a textual substitution suffices; no semantic decisions.
- Changes marked **behavioral** alter runtime behavior and list the observable difference.
