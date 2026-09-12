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
### Incarna placeholders, and what a checker makes of them

Found 2026-09-12 by running `carbon-class --check` across the runtime for the
first time. Five classes under `src/character/incarna/` carry Carbon-shaped names
that resolve to no Carbon declaration.

THAT IS THE METHOD, NOT A DEFECT. No character class survives in Carbon, so this
lane works by sniffing any smell of one - a comment, a reference, a stray name -
and standing up a placeholder. A name with no declaration behind it is the
EXPECTED shape here. What is worth recording is which smell each placeholder came
from, and that the checkers cannot yet tell a placeholder from a port.

#### `Tr2InteriorCell`: the smell it was built from

`Tr2InteriorPlaceable.h:36` says placeables *"inhabit one or more
Tr2InteriorCells, as determined by a ..."* - and that comment is the ONLY
occurrence in the whole of Carbon. No header declares it, no source defines it.

So the NAME is Carbon's and nothing else is. Our
`src/character/incarna/interior/Tr2InteriorCell.js` is a placeholder built from
that one line, which is correct practice for this lane - but its SHAPE is
unevidenced, so nothing about its fields or methods should be trusted as ported.
Cite the mention in the file so the next reader knows how thin the evidence is.

#### The incarna curves invert Carbon's own naming

`Tr2ColorCurve`, `Tr2ColorKey`, `Tr2ScalarCurve` and `Tr2ScalarKey` under
`src/character/incarna/curves/` each say *"Adapted from CCPWGL Tw2ColorCurve2
(MIT)"*. They are ccpwgl classes with a `Tr2` prefix swapped on.

Two problems with that, neither about the code:

- **Carbon has curve classes for both**, named the other way round:
  `Tr2CurveColor.h` and `Tr2CurveScalar.h` (plus `Tr2CurveColorMixer`,
  `Tr2CurveScalarExpression`, `Tr2ScalarExprKeyCurve`). Carbon puts the noun
  first - `Tr2Curve` + kind - so `Tr2ColorCurve` reads as Carbon while using
  ccpwgl's word order.
- **A `Tr2` prefix asserts a Carbon donor.** These have a ccpwgl donor, which is
  a different provenance with different rules: ccpwgl is a loose guide and is
  polluted with concepts that came FROM us, so a ccpwgl adaptation needs its
  origin established rather than assumed.

Open question for this lane, not answered here: whether the incarna curves should
BE `Tr2CurveColor`/`Tr2CurveScalar` - a real port of classes that exist - or
whether Incarna genuinely needs its own curve types, in which case they should not
wear a prefix that claims otherwise.
### Skinned per-object data is character work, not Trinity work

**Both skinned per-object classes live in a Trinity header and have no Trinity
producer.** Every allocation site is a skinned or interior path, so they belong to
this domain however their donor file is named. Verified against Carbon 2026-09-11.

| class | donor | allocated by |
|---|---|---|
| `Tr2PerObjectDataSkinned` | `Tr2PerObjectData.h:100`, extends `Tr2PerObjectDataPSBuffer` | `Interior/Tr2IntSkinnedObject.cpp:322`; consumed at `:217` and `Tr2SkinnedModel.cpp:120,130` |
| `Tr2PerAreaDataSkinned` | `Tr2PerObjectData.h:152`, extends `Tr2PerObjectData` | `Interior/Tr2IntSkinnedObject.cpp:255`, `Tr2SkinnedModel.cpp:59` |

Neither exists here. A Trinity-side plan to "restore the four per-object classes"
should therefore stop at `Tr2PerObjectDataPSBuffer` and
`Tr2PerObjectDataStandard`; these two need the interior renderer, which is the
part being reverse-engineered, so adding the classes alone completes nothing.

#### The VS buffer layout, exactly

`TR2_MAX_BONES_PER_MESHAREA` is **69**, and the allocation is
`(69 * 3 + 5 + 4) * 16` = **3,456 bytes**, three registers per joint:

| region | offset | size |
|---|---|---|
| joint palette | 0 | 3,312 bytes (69 x 3 registers) |
| world matrix | 3,312 | 64 |
| **unwritten** | 3,376 | 16 |
| mirror matrix | 3,392 | 64 |

Both skinned classes target the **per-object VS register, 3** (`Tr2Renderer.cpp:40`;
per-object PS is 4 at `:41`). So this is the same binding `Tr2PerObjectDataStandard`
uses with a 40-register buffer - same slot, far more in it.

#### Two owners write one buffer, and that is the shape to preserve

`Tr2PerAreaDataSkinned::SetPerObjectDataToDevice` creates the buffer, locks it,
calls the OBJECT's `UpdateVertexShaderCBMirror` to place world and mirror, then
memcpy's its own joints at offset 0 for `m_jointCount * 3 * 16` bytes. It then
clears the VS family from the mask and delegates the remainder to the object:

    constantTypeMask = constantTypeMask & ~perFrameVsMask;
    if( constantTypeMask ) m_perObjectDataPtr->SetPerObjectDataToDevice( ... );

So the per-AREA class owns the joint prefix, the per-OBJECT class owns the matrix
tail, and the object also answers for the pixel half. A static helper over a plain
`{ vs, ps }` record cannot express that; it needs the instance relationship
(`m_perObjectDataPtr`). `CCP_ASSERT( m_jointCount <= TR2_MAX_BONES_PER_MESHAREA )`
guards the prefix.

The object-level upload copies **only** world and mirror - not the joint palette it
borrows, and not `m_worldPos`, which it stores but never uploads.

#### The transpose rule does NOT apply here, and that needs checking before use

`EveSpaceObject2.cpp:667-668` writes `Transpose( m_worldTransform )` into the
standard per-object VS data. The skinned path does a **raw byte copy** -
`memcpy( VS + ..., &m_worldMat.m[0][0], 4 * 16 )` (`Tr2PerObjectData.cpp:102-103`,
and again at `:117-118` for the indirect writer). No transpose.

The only caller of `SetWorldMatrix` is `Tr2IntSkinnedObject.cpp:331`, passing a
parameter its own comment calls "The world transform of the object", untouched;
`:332` sets the mirror to `IdentityMatrix()`.

So either the interior skinned shader reads the opposite orientation from the
standard path, or the matrix is already transposed further upstream. **Read it off
the shader.** Applying RawData's ordinary `SetAndTranspose` rule here would
double-transpose, and per the math conventions skill this class of error passes
every identity-matrix fixture. Test with rotation plus non-uniform scale.

#### One constructor zeroes, the other does not

`Tr2PerObjectDataPSBuffer()` explicitly `memset`s its 1,280-byte PS storage to
zero. `Tr2PerObjectDataStandard()` sets only the active size and leaves its
640-byte VS storage **uninitialised** - that is what its
`cppcheck-suppress uninitMemberVar` is for.

Since a short copy preserves the remaining storage, the PS tail is zeros in Carbon
and zeros in JS, which is faithful and needs no note. The **VS tail is garbage in
Carbon and zeros in JS**, which cannot be reproduced and is the only half that is a
real divergence.

#### Our current state: the fields exist, the mechanism does not

`CjsPerObjectLayouts` declares `boneOffsets` (4 x UINT32) in one layout and
`currentBoneOffset` / `prevBoneOffset` / `_unused x 2` in another, both annotated
"GPU ring offsets - engine-owned". **Nothing live writes them**, and no bone buffer
or ring exists: every other `boneOffsets` reference is under
`src/trinity/dropped/perObjectData`, and `CjsSb` appears only inside the WebGL
GLSL emitter as translated-shader naming. The only live skinning state is
`Tr2MeshArea.m_jointCount`, "fed by `Tr2MeshBase.BindToRig`" - a count, with no
matrices going anywhere.

#### ccpwgl already solves this, and differently from Carbon

ccpwgl's Carbon path does **not** use Carbon's inline joint region. Bones ride a
dedicated UBO and the per-object VS block carries only addressing: register 26 holds
`boneOffsets` as **uint bit patterns**, and the translated shader computes
`boneIndex = blendIndex + floatBitsToInt(cb3[26].xy)`. Because its bone UBO is
per-object and base-0, `cur = prev = 0`, and zero's float bit pattern is exactly
uint 0. Its legacy GLES layout keeps an inline `JointMat` instead, which the Carbon
path explicitly does not copy.

That gives the first skinned bring-up a choice worth making deliberately:

- **per-object base-0 buffer**, as ccpwgl does - the zeros already sitting in our
  layout are then correct and nothing needs writing; or
- **a shared ring**, which is what `prevBoneOffset` implies and what Carbon's
  `Tr2DynamicRingBuffer` family exists for. It is the only option that can carry
  last frame's bones for temporal effects, and it is also the path whose indexed
  fetch produced the `ld_structured` self-clobber fixed in `68c147f`.

`Tr2DynamicRingBuffer`, `Tr2RingVertexBuffer` and `Tr2RingIndexBuffer` are all
absent from our tree, so the ring option starts with three unported classes.

### `Tr2SkinnedObjectLod` is missing its three detail-model accessors

Surfaced 2026-09-11 by a Trinity-side naming cleanup, and recorded here because
the class is ours: anything skinned belongs to this domain regardless of which
donor directory the header sits in.

`Tr2SkinnedObjectLod` declares three accessors that our port does not have
(`trinity/trinity/Tr2SkinnedObjectLOD.h:65-67`):

    Tr2SkinnedModel* GetHighDetailModel();
    Tr2SkinnedModel* GetMediumDetailModel();
    Tr2SkinnedModel* GetLowDetailModel();

Our class holds the state they return - `highDetailProxy`, `mediumDetailProxy`
and `lowDetailProxy` - and reads all three internally, so this is three
accessors over existing fields, not a feature.

**How they were found is the transferable part.** They had been invisible because
the JS class was renamed `Tr2SkinnedObjectLod` to `Tr2SkinnedObjectLOD`, on
evidence that turned out to be an `#include "Tr2SkinnedObjectLOD.h"` line rather
than a declaration. Carbon's FILE is `Tr2SkinnedObjectLOD.h`; Carbon's CLASS is
`Tr2SkinnedObjectLod`. The method-parity lint matches on exact class name, so the
rename silently unmatched the class and took its gap report with it. Reverting
the name (`runtime` commit `86b674a5`) made all three appear at once.

So a parity checker reporting nothing for a character class is not evidence of
parity - confirm the class name matches Carbon's DECLARATION, not its filename.

### Interior and WoD knowledge scattered through Trinity, collected 2026-09-11

**Every item below is a comment in a Trinity source file, not in the character
domain, so none of it was findable from here.** Swept by searching `src` for
interior / WoD / Incarna outside `src/character`. Each line is quoted with its
file so a thread can be picked up at the site; the Carbon cites are the donor
lines those comments name, not claims verified in this sweep.

**Portal visibility exists as a concept.** `Tr2VisibilityEvent.js:10` says the
events are what "Tr2VisibilityResults and the interior/portal visibility consumers
read", and `Tr2VisibilityResults.js:9` that results are collected "for the
interior". Our `Tr2VisibilityResults` folder cites donor `Tr2InteriorScene.h`, so
the interior scene's visibility machinery is partly present under a Trinity path.

**The interior scene owns a background cubemap, toggled by a render step.**
`TriStepToggleCubemap.js` holds a "Carbon-private `Tr2InteriorScene` pointer;
runtime-only and not serialized" (:11) and "Enables or disables the interior
scene's background cubemap" (:28).

**Interiors and WoD baking share a per-frame block.** `CjsPerFrameLayouts.js:24`
describes a "block used by interiors, WoD baking, and primitives", and :106 records
that a reduced block "binds in place of the full VS one
(`Tr2InteriorScene.cpp:856`)". That is the only WoD-baking reference anywhere
outside the character domain.

**Interior placeables have their own per-object filler.**
`CjsPerObjectLayouts.js:415-416`: the layout's "only Carbon filler is
`Tr2InteriorPlaceable::GetPerObjectData`
(`Interior/Tr2InteriorPlaceable.cpp:555-585`), and interior placeables are not"
in this package. An exact donor range for a class we do not have.

**Interior additive animation was reverse-engineered in ccpwgl.**
`Tr2GrannyAnimation.js:1338-1339` cites a "proven reverse-engineered
`composeInteriorAdditivePose`" at
`ccpwgl/src/interior/character/Tr2InteriorAdditiveAnimation.js`. Given how little
exists for this engine, an already-proven reverse-engineering of an interior
animation compose is worth reading before redoing it.

**The interior light count is a signed bit-cast.** `RawData.js:68` names it as the
example of a "SIGNED integer bit-cast (two's complement)", so a consumer reading it
as unsigned will be wrong for negative values.

#### Deliberately excluded from the list

`Tr2RenderUtils.js` ("interior-edge flip", "interior vertices"),
`Tr2Blitter.js:295`, `Tr2RenderStateSetup.js:349` and
`Tr2EffectStateManager.js:1365` all say "interior" about GEOMETRY - quad
triangulation edges, and hulls drawing their own inside faces when the cull mode
inverted. Nothing to do with the interior engine, and worth knowing so the same
sweep does not keep re-finding them.

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

