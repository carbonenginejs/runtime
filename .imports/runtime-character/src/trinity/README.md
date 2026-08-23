# src/trinity — verified Trinity classes (owned here)

This folder holds only **verified Trinity classes, interfaces, and enums** for
the character/interior domain, moved out of `runtime-trinity` and **owned by
runtime-character** as of 2026-07-18. Every class identity under
`src/trinity/` must correspond 1:1 to Trinity evidence in the Carbon C++ source
(`carbonengine`; schema authority is tools-core's Carbon schema build —
format-carbon retired 2026-07-20). Everything **outside** this folder is
CarbonEngineJS-owned document or adapter code and must not claim a Trinity
counterpart.

That is the whole reason this folder exists: **verified Trinity identities and
invented CarbonEngineJS identities never mix in one directory.** A source-
backed Trinity class lives here under its Trinity family; anything we make up
lives outside with a `Cjs` prefix.

## Inventory (claimed 2026-07-18, updated 2026-07-20)

| Family | Classes |
|---|---|
| `interior/` | ITr2InteriorLight (type-only Carbon interface), Tr2InteriorScene, Tr2InteriorPlaceable, Tr2IntSkinnedObject, Tr2IntKeyGenerator, Tr2InteriorLightSet, Tr2InteriorLightSource, Tr2InteriorPerLightPSData, Tr2InteriorPerObjectLightData, Tr2InteriorPerObjectPSData, Tr2InteriorPerObjectVSData, Tr2PerObjectParticleVSData, + `enums.js` |
| `wod/` | WodBakingScene |
| `trinityCore/` | ITr2AnimationUpdater and ITr2SkinnedObject (type-only Carbon interfaces), Tr2GStateAnimation, Tr2GStateParameter, Tr2Model, Tr2SkinnedModel, Tr2SkinnedObject, Tr2SkinnedObjectLod (non-Blue native helper), and the intentionally unexported TriMatrix conversion shell |

`WodBakingScene` is the package-owned Carbon identity for the character bake
scene. Carbon renders its `Avatar` (`Tr2SkinnedObject`) through the normal
managed opaque skinned-object batch path; runtime-character keeps the scene
record and method obligations, while texture render-target work, material
realization, and GPU draw execution remain engine or adapter responsibilities.
The only `WodAvatar2Builder` evidence found in this Carbon checkout is the
friend declaration on `Tr2IntSkinnedObject`; no constructible runtime-character
class is claimed until matching source is available.

Note: `WodPlaceableRes` is NOT here despite being wod-family - it is a `*Res`
resource class, owned by **runtime-resource** (trinity's generator skips it with
that reason; resource ownership wins over the character family rule).

## Incarna recovery boundary

The local tools-core Incarna fallback index is discovery evidence for old
interior Black graphs. It does not make downloaded assets, decoded corpora, or
tools-core readers package content, and runtime-character must stay GPU-free
and I/O-free.

The current Carbon checkout only has the modern `Interior/` and `Wod/` source
listed above. Recovered Incarna Black root counts from the pinned organization
research identify these legacy class names as likely required for scene loading
but not source-backed by current Carbon:

- `Tr2InteriorStatic`;
- `Tr2InteriorFlare`;
- `Tr2InteriorParticleObject`;
- `Tr2HighLevelShader`; and
- `Tr2ShaderManager`.

Do not silently invent these as full native parity classes. If pinned evidence
requires them, add only the smallest reviewed hydration contracts under
`src/incarna`, cite the reproducible overlay or recovery evidence, and keep
rendering, effect realization, acquisition, and cache access with their owning
packages/adapters.

The Incarna lighting system is out of scope. It appears to have depended on
third-party or otherwise unavailable lighting data, so future visual proofs
should use supported direct lights and documented neutral fallbacks rather than
trying to recreate the original indirect/radiosity stack.

`TriMatrix` is current Carbon and therefore lives in `src/trinity/trinityCore`.
It remains intentionally unexported because its row-major Blue wrapper still
needs an explicit conversion contract with runtime-utils matrices. Its only
runtime schema consumers are `Tr2InteriorPlaceable.transform` and
`Tr2SkinnedObject.transform`.

`Tr2GStateAnimation` and `Tr2GStateParameter` are character runtime classes,
not general Granny resource classes. The parameter value record is usable now.
The state-machine evaluator remains an explicit Carbon-shaped shell until a
legally distributable decoder can provide the authored client GSF graph. The
generic `Tr2GrannyAnimation` graph stays in `runtime-trinity`, while
`Tr2GrannyStateRes` and its decoded resource payload stay in
`runtime-resource`.

`ITr2AnimationUpdater` and `ITr2SkinnedObject` remain type-only interfaces.
`Tr2SkinnedObject.GetBoneIndex`, `GetBoneTransform`, and `GetBonePosition`
adapt the verified native queries to the maintained updater's JavaScript name
and matrix arrays. They do not claim that rig binding, skinning-matrix queues,
or GPU palette upload are implemented.

`Tr2SkinnedModel.GetSkeleton` consumes only an already supplied structural
`TriGeometryRes` surface (`GetSkeletonCount` and `GetSkeletonData`) and retains
Carbon's exact, case-sensitive `skeletonName` selection. Resource acquisition
and payload decoding remain outside this package. Binding reset delegation and
the skinned object's skeleton tag are source-backed. The bounded `UpdateBones`
adaptation rebuilds exact-name animation/render-rig mappings, advances that tag,
and produces an immediate CPU 3x4 palette. It deliberately does not claim the
native cloth synchronization, delayed matrix queues, dynamic-bounds update, or
backend upload lifecycle.

## Ownership mechanics

- The org class-ownership registry and runtime-trinity's accepted generated
  summary assign these schema families and classes reason
  **"owned by runtime-character"**. `tools-core` owns Carbon scanning and class
  emission; reviewed output is routed to this package rather than re-emitted
  into runtime-trinity.
- The files here started as verbatim copies of the trinity generator's output
  (schema-derived field shells + a few Carbon method stubs). They are now
  hand-owned: regenerate them here if tooling is ever wired up, otherwise
  maintain by hand against the Carbon source.
- Carbon `BLUE_INTERFACE` declarations such as `ITr2InteriorLight` are kept as
  type-only contracts. They are not registered as constructible models; the
  nested `LightSourceItem` fields belong to a native helper struct, not to the
  interface.

## Provenance rules (they differ INSIDE vs OUTSIDE this folder)

Inside `src/trinity/`:
- **Carbon C++ is truth.** Fields, families, and method
  signatures follow Carbon; mark Carbon methods `@carbon.method` with an
  `@impl.*` status. JS-only helpers should be free functions or `#private` —
  if a public method with no Carbon counterpart is unavoidable, mark it
  `@impl.custom` (optionally `@impl.reason("...")`).
- Reference-JavaScript or application behavior does not belong here merely
  because it operates on a real Trinity class. Put scene drivers, convenience
  behavior, composition policy, and other CarbonEngineJS inventions in a
  `Cjs*` class or adapter outside `src/trinity/`. A method kept here must have a
  verified Trinity counterpart; incomplete native behavior may remain an
  explicitly marked throwing method until its engine/runtime owner exists.

Outside `src/trinity/`: CarbonEngineJS-original document and adapter code, no
Carbon fidelity obligations, `Cjs` prefix required for public classes.

## Adapter pointer

An outer interior/character adapter may follow the scene-owned frame-context
conventions documented by `runtime-trinity`. That adapter must remain outside
`src/trinity/` and must not add non-native public methods to a Trinity class.
