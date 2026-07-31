# Runtime character documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime integrators and maintainers
Summary: Documentation home for prepared character data, graph construction, controls, and source-backed character classes.

## Purpose

`@carbonenginejs/runtime-character` provides a GPU-free, I/O-free character
composition graph. It hydrates caller-supplied prepared library data, resolves
explicit character selections, and exposes typed dependencies and control
surfaces for an outer adapter.

## Use this package when

Use it when an application already has a prepared character library and needs
typed selection, graph, control, LOD, capability, or CPU rig-binding contracts
without coupling those contracts to acquisition or rendering.

## Where it fits

```text
tools-core/character -> prepared library data
                              |
                              v
runtime-character -> typed character graph and controls
                              |
                              v
runtime-resource and an engine-owned adapter
```

Tools-core owns offline discovery, normalization, linking, and artifact
generation. Runtime-resource owns acquisition, decoding, preparation, cache,
and lifecycle. Engines own GPU realization. None of those responsibilities are
implemented by this package.

## Start here

- [Architecture](architecture.md)
- [Prepared-library contract](reference/prepared-libraries.md)
- [Current and planned work](roadmap.md)
- [Class catalog](reference/classes/README.md)

## Documentation map

- [Architecture](architecture.md) defines ownership and integration boundaries.
- [Extended usage](guides/runtime-usage.md) covers the current runtime surface
  and longer examples.
- [Prepared-library contract](reference/prepared-libraries.md) defines accepted
  data, identity, opaque fields, and atomic LOD selection.
- [Roadmap](roadmap.md) separates unavailable work from the current baseline.
- [Class catalog](reference/classes/README.md) maps every maintained named class
  to reviewed purpose and export metadata.
