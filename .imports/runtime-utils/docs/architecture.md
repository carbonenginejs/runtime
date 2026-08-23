# Runtime utilities architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-utils`
Audience: Runtime authors and maintainers
Summary: Defines the package dependency boundary, ownership rules, and stability expectations.

## Purpose

`runtime-utils` supplies the lowest reusable layer for CarbonEngineJS runtime
libraries. Consumers can use it without introducing a dependency on another
organization package or pulling browser and Node tool behavior into the
runtime graph.

## Dependency contract

Organization-dependency-free means:

- published source must not import another `@carbonenginejs/*` package;
- public subpaths must remain safe to import independently;
- published source must not import Node built-ins or reference Node-only
  globals;
- module evaluation must not perform environment-specific work.

It does not mean that all third-party dependencies are prohibited. A focused,
browser-safe dependency such as `gl-matrix` is acceptable when it supplies a
foundation primitive, preserves independent subpaths, and does not introduce
organization dependency cycles.

## Dependency direction

```text
      runtime-* packages                tools-browser
              \                    /
               \                  /
                v                v
                   runtime-utils
                         |
                         v
       third-party or Web-standard primitives
```

Dependencies point toward `runtime-utils`; `runtime-utils` never reaches back
into a runtime, engine, format, browser tool, or Node tool package.

## Admission rules

Code belongs in `runtime-utils` only when all of these are true:

1. More than one runtime-facing package needs the same primitive or contract.
2. The behavior is useful without application, rendering, resource, or domain
   policy.
3. The implementation can satisfy the dependency contract above.
4. Its public semantics are stable enough for broad reuse.
5. Owning it here reduces duplicated foundation behavior rather than merely
   shortening an import.

With foundation consolidation complete, new responsibilities should be
uncommon. Additions require a demonstrated cross-package need and a clear
subpath owner.

## Current ownership

The implemented package currently owns:

- neutral array, byte, text, JSON, lookup, and path mechanics;
- structured operational errors without logging or transport policy;
- shared `isSomething` predicates and small validation assertions;
- browser-standard gzip decompression helpers;
- scalar, vector, quaternion, matrix, geometry, mesh, tangent, noise, and curve
  math;
- shared media, graphics, render-context, audio, shader, D3D, and WebGPU
  constants;
- stable policy-free nominal bases for backend selection and terminal constant
  payloads; and
- Carbon type descriptors, schema metadata, models, lifecycle state,
  documents, hydration, and dehydration.

The [API reference](reference/api.md) is the exact current inventory.

## Nominal contract policy

The `/contracts` subpath owns only obligations that are stable below every
runtime and engine layer. Each required base method throws unless a concrete
owner overrides it. Composition validates the concrete identity once and then
calls required methods directly; repeated structural probes are not a contract.

`CjsBackendCandidate` exposes only backend proof and is not a device or RHI
superclass. `CjsConstantPayload` exposes terminal bytes and their dirty
lifecycle; layout, packing, transpose, allocation, upload, and binding stay in
their owning layers.

## Ownership elsewhere

- Browser-facing demos, clients, remote readers, inspectors, integration
  helpers, and usable reference implementations belong in
  `@carbonenginejs/tools-browser`.
- Node filesystems, caches, credentials, servers, command-line interfaces, and
  build orchestration belong in `@carbonenginejs/tools-core`.
- Runtime graph objects and domain readers belong in their owning
  `runtime-*` package.
- Backend objects and realization policy belong in `engine-*` packages.
- Generated schemas, enums, and domain libraries remain generated artifacts
  owned by their producer and consuming domain.

## Consolidated foundation boundary

The former math, constant, and Carbon type-system foundations now live under
coherent `runtime-utils` subpaths. Former math and constant family suffixes
remain available at the top level for mechanical migration, while `/math/*`
and `/const/*` aliases group the same implementations.

The root intentionally excludes type/model/document barrels so importing a
neutral utility does not initialize registry and model families. See
[Foundation consolidation](concepts/foundation-consolidation.md) for the
layout and migration status.
