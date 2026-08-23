# Runtime foundation consolidation

Status: Evolving
Scope: `@carbonenginejs/runtime` foundation boundary
Audience: Runtime authors, integrators, and maintainers
Summary: Records the consolidated math, constant, and type-system ownership and migration contract.

## Purpose

The runtime global layer is the single stable, browser-safe foundation commonly
consumed by CarbonEngineJS runtime domains.

The surviving repository now contains the former utility, math, constant, and
Carbon type-system implementations. Their inherited test suites run together,
and every advertised package subpath is independently importable.

## Current ownership

`@carbonenginejs/runtime` is the sole current source owner for neutral
mechanics, math, shared constants, Carbon types, schema metadata, registries,
models, documents, lifecycle, hydration, and dehydration.

## Implemented layout

The moved families map directly enough to preserve useful imports:

| Moved family | Runtime subpaths |
| --- | --- |
| Math | `./math` and focused `./math/*` subpaths |
| Constants | `./consts` and focused `./consts/*` subpaths |
| Carbon types/models | `./schema`, `./schema/types`, `./model`, and transitional nested `./model/*` hydration subpaths |

The root export may expose common mechanics and family namespaces. It must not
introduce ambiguous duplicate names or require eager evaluation of every math,
constant, schema, model, and document module.

The package depends on `gl-matrix`. That is compatible with the boundary
because the global foundation prohibits organization dependencies, not focused
browser-safe third-party foundations.

## Shared predicates

There is one curated `@carbonenginejs/runtime/utils/is` surface:

- predicates return literal booleans;
- generally useful structural checks belong here;
- vector and matrix checks join only with explicit math semantics;
- domain checks remain with their domain package;
- browser-tool-specific checks remain in the separate `src/tools` layer;
- established core predicate behavior wins wherever old names overlap.

The goal is a useful shared predicate library, not a reduced compatibility
snapshot.

## Migration map

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

## Stability target

After consolidation, the global foundation should change infrequently. New
responsibilities need a demonstrated cross-runtime use case, browser-safe
semantics, no CarbonEngineJS dependencies, and a coherent public subpath.

The result is a runtime foundation, not a general utility dumping ground.

## Related documentation

- [Package documentation](../README.md)
- [Architecture and admission rules](../architecture.md)
- [Current API reference](../reference/api.md)
