# Runtime character architecture

Status: Evolving
Reviewed: 2026-09-08
Scope: `@carbonenginejs/runtime/character`
Audience: Maintainers and runtime integrators
Summary: Separates source documents, CPU planning, injected realization, and native class ownership.

## Ownership

| Concern | Owner |
| --- | --- |
| Source records, library hydration, named identities and editor mutation | Character models; [document contract](reference/prepared-libraries.md) |
| Twelve static-data reads and library compilation | `CjsCharacterLibraryBuilder`, using fetch or an injected byte source |
| Generic byte decoding, selected-asset caching and lifecycle | `@carbonenginejs/runtime/resource` |
| Selection, dependencies, qualified LOD/material/coverage policy and logical composition | CPU character planning; [appearance-plan contract](reference/character-appearance-plans.md) |
| Live textures, buffers, effects, scene objects, uploads, draws and backend readiness/loss | Injected realization AL and its resource/graphics hosts |
| Endpoint, build/target selection, credentials and publication | Application or tooling |

The builder accepts decoded values or orchestrates cFSD decoding through
resource-format readers. It does not discover installations, manage caches or
embed selected asset bytes. Tools-core can supply exact-build bytes and persist
the resulting library without owning a second compiler.
`CjsCharacterLibraryManager` installs one combined model or calls an injected
object loader; `CjsCharacterLibrary.InspectResourceForData` can request PNG
inspection through an injected resource manager.

## Documents and plans

```text
cFSD / decoded records + retained definitions and exact resource inventories
  -> CjsCharacterLibraryBuilder
  -> schema-v10 CjsCharacterLibrary
  -> CjsCharacterAppearanceResolver
  -> standalone schema-v4 CjsCharacterAppearancePlan
  -> CjsCharacterAppearanceConstruction (construction operations)
  -> injected appearance AL
  -> resource preparation, composition and scene realization
```

Source records retain their public fields and named `recordID` identities.
Inherited `from`, `SetValues` and `GetValues({ refs: true })` handle hydration
and graph serialization. Graph-local `_id`/`_ref` tokens are not domain IDs.
The [document contract](reference/prepared-libraries.md) owns collection,
relationship, migration and mutation details.

The resolver retains every exact selected source-version contribution and
texture candidate. It uses unique configuration/geometry candidates or retained
atomic model bundles, including bounded labelled LOD/family selection; it does
not merge version inventories. It also projects colour selections, bounded
typed dependencies, exact selection suppression and proved utility weights.
These are implemented stages, not evidence that complete material, coverage
and composition resolution is available.

The plan closes its own graph identities; source identities survive as
provenance. It carries logical texture roles, independent sampling/placement,
coverage, ordered passes, consumer identities and diagnostics. It contains no
canvas, device, decoded bytes, cache lease, live resource or renderer callback.
Pass-array position is composition order, not an instruction to serialize the
renderer lifecycle. Authored, decoded, derived and policy values remain
distinguishable.

## Appearance realization

`CjsCharacter`, `CjsCharacterAppearanceConstruction` and
`CjsCharacterAppearanceManager` share the CPU lifecycle: construction intent,
revision serialization and an opaque committed stage. The injected AL owns
`Prepare`, `Commit` and `Release`, with optional handoff, morph, warmup or
diagnostic capabilities. The coordinator does not inspect GPU state.

Backend implementations live separately under `src/character/gles`,
`src/character/webgl2` or a future `src/character/webgpu`. Current explicit
exports include `@carbonenginejs/runtime/character/gles` and
`@carbonenginejs/runtime/character/webgl2`; the root character entry does not
eagerly import or re-export them. Resource access and native factories are
injected; no backend has a Node/local-file fallback.

The GLES reference is split into these seams:

| Class | Responsibility |
| --- | --- |
| `CjsCharacterGlesAppearanceAL` | Prepare → Commit/Handoff → Release through injected resource, visual and configured-operation hosts |
| `CjsCharacterGlesFoundationTranslator` | Neutral foundation intent to reviewed GLES operations |
| `CjsCharacterGlesAtlasPlacement`, `CjsCharacterGlesAtlasPlanning` | Validate authored placement and produce detached composition descriptors |
| `CjsCharacterGlesAtlasRenderer` | Execute through an atlas host; reverse-order cleanup |
| `CjsCharacterGlesPaletteCompatibility` | Temporary 58-bone right-hand workaround |
| `CjsCharacterGlesTriangleCoverage`, `CjsCharacterGlesMorphDeformation` | Reversible index-coverage and vertex-morph leases |

The geometry host supplies `GetMeshes`, `EnsureSystemMirror`,
`UploadIndices`, `UploadVertices`, `GetVertexChannelDeclaration`,
`RebuildMeshBounds` and `RebuildBounds`. The atlas host supplies target
creation, effect preparation, execution, finalization and cleanup. Only hosts
know their Tw2/GR2/WebGL representation. Foundation/resource paths, coverage
roles and provenance remain CPU outputs; shader choice, palette workarounds,
mask execution, mesh finalization and animation attachment remain backend work.

`test/character/runtime-character/cpu-gpu-boundary.test.js` guards the CPU
surface against upper/sibling runtime imports and concrete GPU operations,
allows resource imports only in `library-builder/`, rejects Node local-file
imports, and checks backend isolation from the root entry and legacy Tw2 global
facade. Shared model, schema, path and math utilities come from `global`.

### Realization requirements

A renderer integration is ready for promotion only when it has:

- typed owner, contributor, consumer, and resource relationships;
- independent placement and sampling transforms for every texture channel;
- explicit handling of cropped inputs versus reconstructed full atlases;
- deterministic composition order, blend operations, write masks, and neutral
  target initialization;
- atomic resource readiness before changing an authored binding;
- direct reporting of missing identities, targets, or relationships rather
  than filename inference;
- focused synthetic tests for hydration, planning, composition, and failure
  rollback; and
- renderer-specific tests proving its shader inputs and consumer bindings use
  the same conventions as the maintained backend.

An adapter's labelled provisional policy stays outside source documents and
must not be serialized as an authored fact. A reviewed earlier capability is
preserved, explicitly superseded or left open, never silently dropped because
its previous discovery mechanism was heuristic.

## Formats and native identities

Generic format readers decode bytes to plain values/inspection; they must not
import character. Registration or an outer `Target`/`Identify` adapter selects
the character schema. Direct source-document records, lossless loose-definition
envelopes, producer-derived indexes and hydrated Black/Red object targets are
distinct categories; [prepared libraries](reference/prepared-libraries.md)
defines their mapping.

Current Carbon-derived character identities belong under
`src/character/trinity` in their source family. They describe CPU scene/LOD,
skeleton, light/per-object and batch intent; a resource-typed field is a
reference contract, not GPU allocation. Carbon headers and implementations
remain authoritative: registration or hydration is not behavioral parity.
`CjsCharacterRigBinding` supplies exact-name rig mapping and native 3x4 palette
packing used by `Tr2SkinnedObject.UpdateBones`.

Reviewed historical-only identities belong under `src/character/incarna`,
not the current native tree. The bounded tranche contains
`Tr2InteriorCell`, `Tr2ColorCurve`, `Tr2ColorKey`, `Tr2ScalarCurve` and
`Tr2ScalarKey`, corroborated by records reaching end-of-object/end-of-file
under a labelled historical Black schema hypothesis. Curve behavior adapts
historical Curve2 evaluation without importing the old Tw2 parent/testing
surface. Current `Tr2CurveColor`, `Tr2CurveScalar` and `Tr2CurveScalarKey`
remain the modern authority in `@carbonenginejs/runtime/trinity`.
`WodPlaceableRes` belongs to `@carbonenginejs/runtime/resource`, even when
character/interior schemas reference it.

The removed schema-v1/v2 character graph is not a compatibility surface.
Consumers migrate to the schema-v10 direct source library and separate
schema-v4 plan, not speculative legacy models.
### Undiscovered: three of Carbon's four interior interfaces

**Found 2026-09-11 by comparing Carbon's declarations against ours. Not dropped,
not deferred - simply never noticed, and nothing records a decision about them.**

`trinity/trinity/Include/ITr2Interior.h` declares four interfaces, all
`BLUE_INTERFACE`:

| Carbon | line | here |
|---|---|---|
| `ITr2InteriorCullable` | :27 | **nothing at all** |
| `ITr2Interior` | :33 | **nothing at all** |
| `ITr2InteriorDynamic` | :44 | **nothing at all** |
| `ITr2InteriorLight` | :69 | `src/character/trinity/interior/ITr2InteriorLight.js` |

The one that exists is a **typedef contract** - a JSDoc `@typedef` with
`export {}` and no class - and its own comment gives the reason: a
`BLUE_INTERFACE` is not a constructible Blue model, so it must not be registered
with `type.define`. That treatment looks right and is the precedent the other
three should follow if they are represented the same way.

**Why they were invisible.** Every check we have looks for a declared class.
`ITr2InteriorLight` declares none, so it does not appear in a class catalog, a
parity audit, or the naming lint - and the three that are absent look identical
to the one that is present. They surfaced only from a donor-side sweep: reading
what Carbon's headers declare and subtracting what we declare, which is the
opposite direction from every existing checker.

**These belong to the character library**, being the interior scene's
cullable/dynamic/light contracts rather than anything in Trinity proper.

Interior work that touches culling, dynamic interiors or interior lighting should
decide their disposition first. The adjacent `Tr2InteriorPerLightPSData` and
`Tr2InteriorPerObjectPSData` DO exist here, so the data structures arrived
without the contracts that describe who produces them.

