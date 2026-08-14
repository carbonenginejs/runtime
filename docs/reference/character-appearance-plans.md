# Character appearance plans

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime and renderer maintainers
Summary: Defines a standalone JSON and hydrated model boundary for explicit backend-neutral character planning.

## Evidence boundary

Prototype character rendering provides behavioral evidence for this design.

The prototype mixes three different kinds of information:

- decoded or authored facts, such as resource identities, paths, explicit
  cover/remove category fields, material parameters, sampler bindings, and image
  placement metadata;
- derived facts, such as a selected same-LOD configuration/geometry bundle or
  a material binding recovered from a resource; and
- application policy, such as the native modifier-order table, inferred default
  lipstick, filename-derived texture roles, footwear exceptions, and custom
  decal ordering.

Any resolver must preserve that distinction instead of turning all
three into unlabelled library fields.

## Runtime boundary

```text
CjsCharacterLibrary source records
    |
    v
selection and dependency resolution
    |
    v
coverage and atomic asset resolution
    |
    v
material and texture-role resolution
    |
    v
one explicit CjsCharacterAppearancePlan
    |
    v
engine-specific atlas execution and scene assembly
```

Resource acquisition, decoded image bytes, GPU handles, render targets, cache
leases, and live scene objects remain outside the plan. The plan may identify
those inputs but must remain GPU-free and serializable.

`CjsCharacterAppearancePlan` is an ordinary schema-backed model. Inherited
`CjsModel.from(values)` and instance `SetValues(values)` consume the same
`carbonenginejs.characterAppearancePlan` schema-v4 shape. Inherited
`GetValues({ refs: true })` emits serializable `_id`/`_ref` graph metadata.
There is no alternate wire format or retained document copy.

The complete resolver pipeline is responsible for selection, dependency, LOD,
material, texture-role, placement, and bake-order decisions. Hydration applies
declared model fields and resolves graph identity; it does not validate or
invent resolver policy.

`CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll)` implements
the first exact stage. It follows hydrated paper-doll modifier, character
resource, part-type, and part-source relationships. Every strict selected
source-version match remains a plan part and layer; configuration and geometry
paths are filled only when each candidate is unique, while every exact texture
candidate remains in `texturePaths`. It parses no filenames and assigns no LOD
or model family. It also does not infer candidate or metadata inheritance from
an unversioned inventory: schema v10 version records are self-contained, so any
authoring-time baseline/override merge belongs in the final-library producer.
The resolver also copies every hydrated paper-doll colour selection into a
plan-local `CjsCharacterAppearanceColorSelection`. Exact colour keys, names,
gloss/weight presence, values, and paper-doll provenance are retained; an
unresolved colour reference produces a diagnostic instead of a fabricated
default.

Schema-v10 metadata retains ordered typed references, introduced in schema v8,
beside the unchanged raw dependency strings. When such a reference names an
exact part source with one
published version, the resolver adds that source as a requester-owned
contribution. A terminal `###<finite-number>` on a non-utility dependency is
also decoded when its sex-relative part-source identity exists exactly; its
weight is retained on the resulting appearance layer. Configuration/geometry
support and texture-only masks therefore remain distinct contributors.
Coordination sources with no unique resource version and unmatched suffixed
values remain diagnostics. Recursive
dependency policy, material ownership, texture roles, placement, coverage,
targets, passes, bindings, image decoding, execution, and renderer realization
remain future stages.

## Implemented records and policy utilities

- `CjsCharacterAppearancePlan`: selections, parts, layers, textures, reusable
  coverages, ordered targets, final bindings, origins, and diagnostics for one
  resolved character state.
- `CjsCharacterAppearanceResolver`: exact paper-doll selection plus bounded
  typed dependency contribution projection without resource or render policy.
- `CjsCharacterAppearanceSelection`: one plan-local resolved choice and its
  explicit selection-group ownership.
- `CjsCharacterAppearanceColorSelection`: one plan-local paper-doll colour
  choice with its exact key, A/BC names, optional gloss and weight, and source
  provenance. Renderer policy may use it to resolve an authored material
  definition, but the record does not choose a shader or texture role.
- `CjsCharacterMorphTargetWeight`: one exact renderer-neutral target name,
  finite authored weight, requesting selection, and evidence origin. It asks a
  renderer to realize an authored fit adjustment; it does not identify a mesh
  by filename or require the renderer to hide another garment.
- `CjsCharacterAppearanceLayer`: contribution identity with separate `owner`
  and `contributor` references. Its collection order is inventory order, not
  bake order. A dependency can be owned by one selection while another source
  supplies its mesh, material, or visible alpha.
- `CjsCharacterResolvedPart`: one source-version contribution with optional
  exact configuration/geometry choices, every retained texture path, and its
  provenance.
- `CjsCharacterTextureAsset` and `CjsCharacterTextureChannel`: a semantic role,
  region, resource URI, optional placement metadata, and a channel selection.
- `CjsCharacterAppearanceBinding`: an opaque consumer identity, sampler name,
  selected texture or composed target, per-sampler bounds, and alpha contract.
  It does not carry a shader path or a live effect object.
- `CjsCharacterCoverage`: one reusable source-channel-minus-subtractions
  expression used by composition and final alpha bindings.
- `CjsCharacterCompositionTarget`: scope, region, output, dimensions, and
  authoritative ordered passes.
- `CjsCharacterCompositionPass`: layer, operation, inputs, destination,
  coverage, strength, logical blend contract, and logical write mask.
- `CjsCharacterModifierOrder`: the verified stable category/makeup ordering
  calculation and its five metadata-controlled endpoint swaps. It is resolver
  policy, not an authored source-library record.
- `CjsCharacterAtlasLayout`: the verified default atlas size and normalized
  body, head, hair, and accessories rectangles.
- `CjsCharacterOrigin`: source document and identity or resource path,
  optional JSON pointer, evidence status (`authored`, `decoded`, `derived`, or
  `policy`), and the rule that produced the value. Other records reference one
  shared origin instead of duplicating provenance fields.

The plan exposes named `Create*`, `Add*`, `Remove*`, and `Delete*` methods for
each top-level child collection. Resolvers and editors use those methods rather
than writing the arrays directly, so model events and any future property-owned
flags remain on one mutation path. The methods do not assign bake order or
interpret child-owned work tokens.

A resolver should give a document-local `_id` only to collection records that
are referenced. The model importer requires every `_ref` to close inside the
same import operation and rejects duplicate `_id` values; it does not reject an
unused `_id`. Source-library record IDs remain named origin data; a
plan that directly references source-library records would instead be a linked
two-document graph and could not hydrate independently.

## Ordering and layer normalization

The reviewed native update resolves rules, loads changed meshes, determines
affected atlas outputs, composes each output, realizes shaders and mesh changes,
and only then binds the composed maps. Resource waits, shader realization,
mesh replacement, finalization, and animation rebinding remain renderer-owned.
The plan carries one authoritative pass-array order for each logical output;
adapters and tests consume that order without serializing the renderer
transaction.

Recipe/group enumeration, dependency traversal, contribution inventory, target
inventory, and composition-pass order are separate. Neither paper-doll modifier
order nor `plan.layers` order is an atlas-order contract. The initial resolver
therefore creates no targets or passes.

The native modifier policy starts with 33 categories and stable-sorts by
`categoryIndex * 1000 + groupIndex`. Only `makeup` has a recognized group
table; other known categories and unknown makeup groups use group index 999.
Authored modifier-location keys retain their complete value as the selection
`groupID`; only the verified `makeup/<group>` prefix is projected into the
`makeup` category and its named suborder for sorting.
An unknown category uses the complete key -1. Equal keys retain their input
inventory order. Five metadata flags can swap the endpoint slots for feet,
loose bottoms, tight/middle tops, tucked/untucked top underwear, and
tucked/untucked socks. Metadata values are ORed across the active modifiers;
missing values are false. `CjsCharacterModifierOrder` exposes that calculation
without mutating source arrays and returns caller-owned order arrays.

The shared atlas defaults to 2048 by 1024. Its normalized rectangles are body
`[0, 0, 0.5, 1]`, head `[0.5, 0, 1, 0.5]`, hair
`[0.5, 0.5, 0.75, 1]`, and accessories `[0.75, 0.5, 1, 1]`.
Composition processes those logical regions in body, head, hair, accessories
order, but each output map owns its own authoritative pass array. Accessory UV
packing is dynamic; no stable semantic suborder for accessory entries is
claimed by `CjsCharacterAtlasLayout`.

Within an atlas, reviewed behavior copies the base and applies sorted
layers. Body diffuse can restore through a cut mask before overlay; body normal
and specular can neutralize through owner coverage before their overlay. Normal
replacement (`mn` or `n`) and additive detail (`tn`) are distinct operations.
These are suitable explicit pass operations, not reasons to preserve the
demo's hardcoded global slot ranks.

The sufficient logical operation vocabulary is:

- `copy`;
- `fill`;
- `alpha-overlay`;
- `colorize`;
- `pattern`;
- `normal-replace`;
- `normal-add`; and
- `restore-base`.

Array position is pass order; a duplicate integer sequence would create a
second authority. Selection-group order, target order, and pass order remain
separate concepts. Coverage subtraction is expressed once in a reusable
coverage record rather than as a GPU-oriented mask pass. Projection placement
is resolved into an ordinary alpha overlay before serialization.

The only required logical blend modes are `replace`, `source-over`, and `add`.
Logical write masks are `rgba`, `rgb`, `rg`, `b`, and `a`; renderer-specific bit
masks and blend constants do not cross the contract.

Operation names, blend names, write masks, and provenance classifications are
resolver-owned string values. They remain readable in JSON and are not exposed
through extra static methods on the model.

## Offset and transform normalization

Three different transforms must remain separate:

- decoded PNG placement: image size, atlas offset, atlas extent, target size,
  and whether placement metadata was present;
- an authored sampler transform such as `TransformUV0`, which current evidence
  treats as bounds rather than the PNG offset; and
- projected-decal placement, whose spherical parameters and atlas placement
  belong to the projection contract.

An adapter may combine them into a final sampling transform, but the source
records must not overwrite one with another. Cropped placement is applied once.
The known double-application cause is closed at the policy and structural-test
level and must remain a regression case; the complete visual fixture matrix is
still open.

Diffuse, normal, and specular inputs retain independent sample bounds. A
material-global UV transform is insufficient because the three assets can have
different placement metadata.

Evidence status is deliberately consumer-specific:

| Transform rule | Status |
| --- | --- |
| `TransformUV0` is rectangle bounds `[uMin, vMin, uMax, vMax]`, with identity `[0,0,1,1]`. | **Proven for the reviewed avatar effects.** |
| PNG placement and effect sampling bounds remain separate values. | **Proven format and data-contract requirement.** |
| A direct cropped source uses its authored placement once; a full-atlas intermediate is sampled with identity rather than the cropped placement a second time. | **Cause proven, structurally tested, and exercised live for paper doll `3000001`.** Directly binding its 2039x1701 pants normal/specular sources as full textures reproduced the old vertical offset defect. Composing them at their retained 151-pixel atlas offset into independent 2048x2048 neutral-backed targets corrected the sampling contract. The complete visual fixture matrix remains open. |
| The nude foundation retains its loaded transform, while a configured proof fallback reading the reconstructed full atlas currently uses identity. Ordinary private-map garment consumers retain their loaded transform. | **Implemented experimental demo policy; correctness is not yet proved.** |
| A qualified configured body-atlas consumer copies authored RGBA, applies explicitly assigned ordered cut masks to alpha only, replaces RGB from the shared body atlas, and samples the resulting full target with identity. | **Pass states, CPU pixel behavior, grouping, ambiguity deferral, and atomic rollback are structurally tested; target resolution and live visual proof remain open.** Dependency ownership alone is explicitly insufficient to choose the cut consumer, and the currently checked female and male fixtures use proof fallbacks rather than this branch. |
| The generic head and body foundation textures are paired sex-specific D/N/S inventories in the same exact `head_generic` resource folder. | **Exact inventory and 2048x2048 body placement are proved; the complete body material binding is not.** Binding the paired generic body diffuse through the current rebuilt `skinnedavatar` proof effect was visually disproved because non-head skin became transparent. That proof path therefore retains its prior `ccshape` diffuse fallback. The exact head skin uses `skinnedavatarbrdflinear` with authored normal/specular inputs, so the visible chin/neck discontinuity remains an unresolved material-boundary gate. Direct all-or-nothing D/N/S attachment was also rejected because it made the body foundation unavailable. The paired generic body D/N/S inputs must remain unbound until an authored body-material contract is promoted atomically. |
| A configured head may retain exact authored sub-meshes while its dynamic head-skin channels are reconstructed as full 2048x1024 atlases. | **Structurally tested and exercised live for paper doll `3000001`; complete face correctness remains open.** The exact `head_generic` folder inventories sex-specific generic head D/N/S bases; substituting an unrelated `cc` archetype/skintype fallback was visually disproved by a head/body brightness seam and incorrect chin/neck normals. Retained head-region UV bounds are not sufficient consumer identity: the decoded head contains materially different skin, eyeball, tongue, and teeth surfaces using that region. The GLES experiment therefore binds the head-local D/N/S targets only to the exact `meshIndex 0` / `meshShape` / `C_Skin_blinn1` skin carrier and changes its `TransformUV0` to identity only after all targets are ready. A regression test proves the eye, tongue, and teeth bindings remain untouched. Their complete channel composition remains unresolved. Retaining the Black file's half-atlas transform on a local skin target visibly misplaced the head texture and is also disproved. Eye normal/specular overlays may be composed only after an exact eye consumer contract is recovered. Selected 16x16/8x8 eyebrow placeholders fail the aspect gate; the compositor retains those rejections and selects the first compatible candidate from the same exact family, which is the corresponding 512 atlas input for the reviewed fixture. Eye and eyebrow diffuse colorization remains deferred because this paper doll does not resolve an exact color selection for those modifier groups. |
| Correct transforms for every body, head, hair, accessory, and diffuse/normal/specular/cut-mask binding. | **Not yet proven.** The isolated demo executes a bounded body-diffuse restore-base pass through exact typed masks and structurally tests one qualified diffuse-consumer contract, but the complete consumer and visual fixture matrix remains open. |

The renderer must choose from the resource actually bound at that stage. It
must not force identity globally, copy PNG placement into `TransformUV0`, bind
a cropped channel as though it were a full atlas, or assume one transform
covers every object and mask.

The configured-head proof does not invent face geometry. The exact decoded
head configuration and geometry already provide the skin, eyeballs, tongue,
teeth, tearducts, wet-eye, eye-shadow, and eyelash carriers. The temporary GLES
adapter preserves those authored surface identities. Retained atlas bounds are
placement evidence, not material ownership. Only the exact head skin carrier
currently receives the reconstructed head-local D/N/S targets. Eyeballs,
tongue, teeth, tearducts, wet-eye, eye-shadow, and eyelash carriers retain their
authored bindings until each consumer's required channel contributions are
proved. This closes the accidental cross-material binding that made other face
surfaces transparent without claiming their final composition is complete.

## Waist and tuck evidence status

The reviewed standard tuck case closes the distinction between dependency
ownership and visible contribution. It does not prove every waist seam, mask,
or channel registration result.

| Relationship | Evidence status | Appearance-plan meaning |
| --- | --- | --- |
| A lower-body selection that authors a standard tuck requests waist coordination, tuck support, tuck-mask, and fitting-shape dependencies. | **Proven authored relationship.** Decoded modifier metadata names the dependency and occlusion edges. | The requesting lower-body selection is the dependency owner. |
| Waist-coordination records suppress or orient tuck, drape, mask, and fitting-shape behavior without supplying visible material. | **Proven for the reviewed decoded records.** Their retained metadata carries coordination and occlusion meaning without a renderable contribution. | Represent coordination separately from a visible layer. |
| The basic tuck dependency supplies support configuration and geometry, while the authored mask dependency resolves to texture candidates. | **Proven decoded resource inventory; exact adapter policy exercised live.** The reviewed female fixture applies the retained mask to support alpha and retains required waist coverage, but the comparison does not isolate the mask pixels or prove a general cut rule. | The support mesh is a decoded contributor. Retain the mask candidate with its lower-body owner and keep the cut operation labelled as fixture-bounded policy. |
| The selected top supplies the visible material and alpha for the tuck support mesh. | **Derived policy realized for one exact female fixture, but not visually proved as the final alpha contract.** Mask-off, opaque-target-alpha, RGB-base, and RGB-blend comparisons did not change the reviewed brown islands. Hiding only the nude body proved those islands were foundation/decal depth competition, not evidence for selected-top alpha. The relationship is not an authored source-document field, is not generalized to other resource combinations, and current plan instances still do not populate a final binding or coverage record. | Record the top as contributor and the lower-body selection as owner, with a `policy` origin until stronger evidence is available. |
| Standard and middle-only coordination across both sexes, top-only, bottom-only, paired garments, cut coverage, and independent diffuse/normal/specular registration all produce correct pixels. | **Not yet proven.** | Keep the full realization matrix and its visual fixtures open without reopening the ownership split. |

The schema-v10 resolver preserves every dependency and occlusion string and
follows only an adjacent exact typed `partSource` relationship. A dependency
source with one version becomes a requester-owned layer; all of that version's
texture paths remain on its contributor. Coordination sources with no unique
resource version, modifier-location occlusions, suffixed strings, selected-top
material transfer, and mask-cut realization remain diagnosed or deferred. One
exact demo adapter applies the reviewed female tuck combination after resource
readiness; the resolver does not infer or serialize that fixture policy and
does not recover roles by parsing a resource name.

## Utility-shape weights and garment fit

Utility-shape dependencies are interpreted only where the retained corpus
proves their syntax. An unsuffixed `utilityshapes/<target>` dependency requests
weight `1`. A terminal `###<finite-number>` requests that numeric weight,
including zero and values greater than one. The resolver preserves the exact
authored string, normalizes the modifier path for identity, and retains the
authored target leaf for renderer matching.

Exact active utility-shape occlusions suppress the same normalized utility
path. Conflicting active weights for one path produce a diagnostic and no
target request. Single-`#`, bare-`#`, malformed, and non-utility suffixes remain
opaque because their semantics are not proved. No weight is clamped.

The output is programmatic: `plan.morphTargets` contains the exact target and
weight requests for any garment combination. A renderer may match those names
against morph targets exposed by loaded geometry, but that matching and the
actual vertex deformation remain renderer-owned. Missing targets must remain
explicitly deferred; they must not become guessed coverage or garment-specific
hide rules.

For the reviewed male robe fixture, authored category occlusion removes middle
layers but retains `bottomouter`. The robe therefore does not prove that pants
should be hidden. Live GLES evidence instead applies exact utility targets to
the retained pants, nude legs, and boots. This proves the utility-deformation
path for that fixture, not that every requested target exists on every loaded
resource.

## Decisions that are closed

- Full normal/specular texture coverage does not establish garment ownership;
  ownership must come from diffuse/cut semantics.
- The yellow spacesuit mismatch is not a material-palette mismatch; its paired
  material values and zone maps agree.
- Catsuit fragments are not explained by a retained mid/top selection.
- Global PNG placement is not an eyebrow fix; eyebrow placement requires its
  own proven rule.
- A blank third field in a retained `.type` definition does not imply
  `default.color`. In the reviewed library, only 49 of 878 blank variants have
  such a sibling, while 1,415 of 1,418 nonblank variants match their explicitly
  named sibling color. Eyebrow `default.color` selection may be offered only as
  an explicitly labelled presentation fallback, not runtime-library semantics.
- A dependency is not necessarily another renderable part. Some records may
  express category replacement or compatibility instead.
- Dependency ownership and contribution are different relationships. In the
  reviewed standard tuck case, the lower-body selection owns the dependency,
  the tuck configuration/geometry is a decoded support contribution, the mask
  is a policy-labelled coverage candidate, and the selected top is the derived
  visible-material contributor.
- Source byte offsets end at JSON decoding. They are not runtime atlas offsets.
- Paperdoll background identity is an exact portrait-resource relationship;
  light and light-color identities are separate opaque identifiers.
- A present zero relationship identity is a `null` sentinel, while a positive
  missing source-library identity remains its named domain value.

## Questions that remain open

- whether plain `n` and masked `mn` have fully distinct authored roles;
- the complete standard/middle-only, male/female, selection-state, cut-mask,
  and texture-channel realization matrix for the closed waist/tuck ownership
  split;
- complete category-removal semantics and `clothingRuleException` behavior;
- whether authored inputs can override the native category priority rather
  than merely contributing metadata-controlled swaps;
- whether native PaperDoll always applies both replacement and additive normal
  inputs when both exist; and
- several remaining diffuse/normal/specular registration failures.

Until those questions are answered, the resolver should emit diagnostics or an
explicit `policy` origin. It must not silently recover an answer from a
filename.

## Current contract tests

The data-only contract and first-stage resolver tests prove:

- equivalent hydration through inherited `from` and `SetValues`;
- JSON graph round-trip through inherited `GetValues({ refs: true })`;
- authoritative target pass-array order;
- distinct owner and contributor references;
- one diffuse-minus-cut coverage reused by normal clear/replacement/addition
  and consumer alpha reconstruction;
- replacement normal before independent additive normal detail;
- independent diffuse, normal, and specular sample bounds;
- native rejection of unresolved or duplicate graph identities; and
- resolver-owned operation strings remaining ordinary model data;
- exact paper-doll selection and source-record relationship traversal;
- strict resource-version identity and unique configuration/geometry
  resolution without filename parsing;
- refusal to infer baseline candidate or metadata inheritance, or choose among
  duplicate exact resource-version inventories;
- explicit diagnostics for dangling effective version-metadata relationships;
- exact preservation of raw dependency and occlusion strings beside typed
  references, requester-owned projection of a unique exact dependency source,
  and per-value diagnostics for unresolved references without fabricated
  targets;
- retention and diagnosis of categories absent from the native modifier order;
- contribution relationships without inferred pass order;
- deterministic diagnostics for dangling, ambiguous, and policy-dependent
  inputs; and
- source-library immutability and standalone plan graph round trips;
- exact modifier sort keys, stable equal-key order, metadata endpoint swaps,
  and caller-owned atlas-layout values.
