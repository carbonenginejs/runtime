# Runtime character architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-character` ownership and composition boundaries
Audience: Character-runtime integrators and maintainers
Summary: Defines the package's data, graph, control, resource, and engine boundaries.

## Current composition boundary

The package turns prepared, caller-owned character data into typed runtime
records. `CjsCharacterLibrary` expands supported compact artifacts, hydrates
`CjsCharacterLibraryData`, indexes its catalogs, and constructs
`CjsCharacterGraph` values from explicit selections or prepared recipe links.

The resulting graph is inert. It declares configuration, geometry, texture,
animation, and related dependencies without fetching or decoding them. An outer
adapter asks runtime-resource for prepared resources and associates them with
the graph. An engine-owned adapter realizes render state and GPU objects.

## Ownership

- `runtime-character` owns typed character records, prepared-library hydration,
  selection and LOD policy, control composition, structural sinks, CPU rig
  binding, and the source-backed character/interior class subset.
- `tools-core/character` owns offline discovery, normalization, identity
  linking, coverage reports, and deterministic library generation.
- `runtime-resource` owns paths, fetching, caches, decoders, preparation,
  retries, and resource lifecycle.
- Engine packages own material realization, texture composition, buffer
  uploads, rendering, and backend capability proof.

The package does not inspect an installed client, write generated libraries,
own a resource manager, create a renderer, or infer resource meaning from a
filename.

## Prepared-data boundary

Prepared libraries may contain normalized schema-v1 records or compact
schema-v2 catalogs. Expansion is deterministic and happens before schema
hydration. Runtime indexes are transient; persisted data remains detached from
those indexes.

Some prepared fields are intentionally opaque. Hydration preserves their
authored values without assigning semantics that the runtime does not
implement. The exact rules are in the
[prepared-library contract](reference/prepared-libraries.md).

## Source-backed class boundary

Classes under `src/trinity/` correspond to verified Carbon class, interface, or
enum identities in the character and interior domain. CarbonEngineJS-owned
composition policy uses `Cjs*` classes outside that tree.

Source identity does not imply behavioral parity. Incomplete native behavior
stays explicit, and GPU, resource-manager, cloth, delayed-palette, and
host-native state-machine work remains with its owning layer.

## Resource and LOD boundary

A character model selection keeps its configuration and geometry together as
one atomic `CjsCharacterLodBundle`. Fallback selects another complete bundle;
it does not combine one LOD's configuration with another LOD's geometry.

Capability inspection remains separate from selection. A compatible skeleton
does not prove that a mesh actively references the bones or morph targets
needed by a feature.

## Control boundary

`CjsCharacterControlApplicator` composes backend-neutral layers.
`CjsCharacterControlBinding` applies full snapshots to a structural sink while
restoring values removed from a later snapshot. Concrete animation, camera,
speech, tracking, and rendering systems remain replaceable outer adapters.
