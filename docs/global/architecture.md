# Runtime global foundation architecture

Status: Evolving
Scope: `@carbonenginejs/runtime`
Audience: Runtime authors and maintainers
Summary: Defines the package dependency boundary, ownership rules, and stability expectations.

## Purpose

The runtime global directories supply the lowest reusable layer for
CarbonEngineJS runtime domains. Consumers can use them without introducing a
dependency on another organization package or pulling browser and Node tool
behavior into the runtime graph.

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
        runtime domains                  browser tools
              \                    /
               \                  /
                v                v
                global foundation
                         |
                         v
       third-party or Web-standard primitives
```

Dependencies point toward the global foundation; it never reaches up into a
runtime domain, engine, format, browser tool, or Node tool package.

## Admission rules

Code belongs in the global foundation only when all of these are true:

1. More than one runtime-facing package needs the same primitive or contract.
2. The behavior is useful without application, rendering, resource, or domain
   policy.
3. The implementation can satisfy the dependency contract above.
4. Its public semantics are stable enough for broad reuse.
5. Owning it here reduces duplicated foundation behavior rather than merely
   shortening an import.

After consolidation, additions should be uncommon and have a clear subpath owner.

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
- stable policy-free nominal bases for backend selection, frame lifecycle, and
  terminal constant payloads, plus Carbon-style script callback invocation; and
- Carbon type descriptors, schema metadata, models, lifecycle state,
  documents, hydration, and dehydration.

The [API reference](./reference/api.md) is the exact current inventory.

## Nominal contract policy

The `/contracts` subpath owns only obligations that are stable below every
runtime and engine layer. Each required base method throws unless a concrete
owner overrides it. Composition validates the concrete identity once and then
calls required methods directly; repeated structural probes are not a contract.

`CjsBackendCandidate` exposes only backend proof and is not a device or RHI
superclass. `CjsConstantPayload` exposes terminal bytes and their dirty
lifecycle; layout, packing, transpose, allocation, upload, and binding stay in
their owning layers. `CjsFrameLifecycle` exposes only the required engine-facing
steps within one requested frame; presentation and the outer tick stay with the
engine.

## Ownership elsewhere

- Browser demos and reusable UI live in `@carbonenginejs/demos`;
  [runtime tools](../tools/README.md) retains file-index support.
- Node filesystems, caches, credentials, servers, command-line interfaces, and
  build orchestration belong in `@carbonenginejs/tools-core`.
- Runtime graph objects and domain readers belong in their owning runtime
  domain layer.
- Backend objects and realization policy belong in `src/trinityal/*` layers.
- Generated schemas, enums, and domain libraries remain generated artifacts
  owned by their producer and consuming domain.

## Consolidated foundation boundary

The former math, constant, and Carbon type-system foundations now live under
coherent runtime subpaths: `/math/*`, `/consts/*`, `/schema`, and `/model`.

The `/global` barrel keeps schema/model/document families on direct subpaths,
but includes nominal contracts. The package root also aggregates runtime
domains; use focused subpaths when a narrow import is required.

## Foundation consolidation

Runtime is the sole maintained source owner for the former utility, math,
constant and Carbon type-system implementations. Their inherited suites run
together; predecessor package names are not compatibility packages.

| Moved family | Runtime subpaths |
| --- | --- |
| Math | `./math` and focused `./math/*` subpaths |
| Constants | `./consts` and focused `./consts/*` subpaths |
| Carbon types/models | `./schema`, `./schema/types`, `./model`, and transitional nested `./model/*` hydration subpaths |

The foundation export must not introduce ambiguous duplicate names or require
eager evaluation of every math, constant, schema, model and document family.

### Shared predicates

There is one curated `@carbonenginejs/runtime/utils/is` surface:

- predicates return literal booleans;
- generally useful structural checks belong here;
- vector and matrix checks join only with explicit math semantics;
- domain checks remain with their domain package;
- browser-tool-specific checks remain in the separate `src/tools` layer;
- established core predicate behavior wins wherever old names overlap.

### Migration map

| Former import | Current import |
| --- | --- |
| `@carbonenginejs/core-math` | `@carbonenginejs/runtime/math` |
| `@carbonenginejs/core-math/<subpath>` | `@carbonenginejs/runtime/math/<subpath>` |
| `@carbonenginejs/core-types/<subpath>` | The matching `@carbonenginejs/runtime/schema`, `/model`, or nested transitional model subpath |
| `@carbonenginejs/core-types` | The direct runtime schema/model subpaths used by the consumer |

The former package names are predecessor identities, not compatibility
packages; maintained source lives here. The one deliberate API correction is
scalar Hermite interpolation:
use `cubicHermite` or `cubicHermiteDerivative` with argument order
`(startValue, startTangent, endValue, endTangent, amount)`.
