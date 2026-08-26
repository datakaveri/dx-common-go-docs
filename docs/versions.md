---
title: Versions and Compatibility
description: Current-source documentation, pinning, release policy, and compatibility guarantees.
---

# Versions and compatibility

## Current state

The dx-common-go source repository has **no published Git tags** as of the documentation audit on 2026-08-05. This site therefore documents the current source line. It does not present an invented release number or frozen version snapshot.

Consumers must pin an approved commit or Go pseudo-version:

~~~text
github.com/datakaveri/dx-common-go v0.0.0-YYYYMMDDHHMMSS-<commit>
~~~

The value in a service's go.mod is the compatibility fact for that build.

## Compatibility policy

Before the first tagged stable release:

- public APIs can change, but changes require affected-service evidence and an upgrade note;
- callers should update deliberately, not through an unpinned branch;
- deprecate and stage widely used API changes when practical;
- platform contract changes require fleet call-site review.

After tagged releases begin, the project should follow semantic versioning:

- patch: backward-compatible fixes;
- minor: backward-compatible features and deprecations;
- major: incompatible public API changes.

This is a release policy, not a claim that those releases already exist.

## Documentation versions

The site remains current-only until the first real tag. At that point:

1. build and test the tag;
2. generate a Docusaurus snapshot from the exact tagged source;
3. add release notes and a source-reference manifest;
4. make the version selector available;
5. retain upgrade notes for supported release lines.

## Updating a service

1. read [Release notes](release-notes.md) and upgrade notes;
2. update the module pin on a branch;
3. run unit, race, integration, contract, and full-stack tests as applicable;
4. inspect direct platform package changes with go list -m and git diff;
5. record the approved version in release evidence.
