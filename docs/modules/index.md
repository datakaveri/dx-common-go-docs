---
id: index
title: Modules
---

# Modules

Every dx-common-go module documented on its own page, self-contained by design: **purpose → when to use it → key concepts → public API → configuration → examples → pitfalls**. Use the grouped sidebar, or jump from the [Package Overview](/package-overview) table.

## Reading a module page

Each page answers the same questions in the same order, so once you've read one module you know how to read them all:

1. **What problem does it solve, and when should I reach for it?**
2. **What are the two or three concepts I must hold in my head?**
3. **What is the exported surface?** (types, constructors, functions, config)
4. **How do I wire it — alone, and alongside its typical companions?**
5. **What goes wrong in practice?** (pitfalls, performance notes, limitations)

## Module independence

Modules never require each other at runtime beyond the leaf utilities (`dxerrors`, `config`, `resilience`, `metrics`). "Related modules" links on each page are *composition suggestions*, not dependencies — you can adopt exactly one module in an existing service and nothing else.
