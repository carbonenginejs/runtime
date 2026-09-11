# Character appearance plans

Status: Evolving
Reviewed: 2026-09-08
Scope: `@carbonenginejs/runtime/character`
Audience: Character-runtime and renderer maintainers
Summary: Defines a standalone JSON and hydrated model boundary for explicit backend-neutral character planning.

Authored, decoded, derived and policy inputs retain explicit provenance.
The plan must not promote prototype filename rules or fallbacks into authored
source facts.

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

`CjsCharacterAppearancePlan` uses inherited model hydration and serialization
with the same `carbonenginejs.characterAppearancePlan` schema-v4 shape, not an
alternate wire format or retained document copy. See
[graph serialization](../guides/runtime-usage.md#serialize-a-model-graph).

The complete resolver pipeline is responsible for selection, dependency, LOD,
material, texture-role, placement, and bake-order decisions. Hydration applies
declared model fields and resolves graph identity; it does not validate or
invent resolver policy.

`CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll, options)` implements
the first exact stage. It follows hydrated paper-doll modifier, character
resource, part-type, and part-source relationships. Every strict selected
source-version match remains a plan part and layer. Configuration and geometry
paths are filled when each candidate is unique, or when the producer retained
exactly one configuration/geometry model bundle decoded from the
configuration's own mesh relationship. A producer may label a bundle with a
derived LOD only when both retained paths carry the same terminal `_lod<number>`
identity; `lodOrigin` keeps that derivation explicit. A matching normalized
paired resource stem is retained separately as `modelFamily`, with its own
origin. With a non-negative integer `options.requestedLod`, one exact labelled LOD
match wins; multiple matches require one normalized part-family match. If none
matches, the current resolver can still select a sole retained bundle, or
individually unique configuration/geometry candidates. Requested and resolved
LOD are separate fields. It does not search for a nearest LOD or guess between
multiple family matches. Every
candidate inventory remains lossless and every exact texture candidate remains
in `texturePaths`. It also does not infer candidate or metadata inheritance from
an unversioned inventory: schema v10 version records are self-contained, so any
authoring-time baseline/override merge belongs in the final-library producer.
The resolver also copies every hydrated paper-doll colour selection into a
plan-local `CjsCharacterAppearanceColorSelection`. Exact colour keys, names,
gloss/weight presence, values, and paper-doll provenance are retained; an
unresolved colour reference produces a diagnostic instead of a fabricated
default.

Schema-v10 metadata retains ordered typed references, introduced in schema v8,
beside the unchanged raw dependency strings. When such a reference names an
exact part source, the resolver first selects the unique dependency version
matching the requesting source version. If no such peer exists, it selects the
unique unversioned dependency as the authored family default. Ambiguous or
missing results remain diagnostics. The selected source becomes a
requester-owned contribution. A terminal numeric `###` on a non-utility dependency is also decoded when an
adjacent typed relation and an exact sex-relative part source qualify it. The
finite effective weight (`relation.weight` when supplied, otherwise the suffix)
is retained on the resulting appearance layer. Configuration/geometry
support and texture-only masks therefore remain distinct contributors.
Unmatched suffixed values remain diagnostics. Recursive
dependency policy remains unresolved, but an active selection is now suppressed
when another active selection has either an exact typed modifier-location
occlusion or an exact typed `clothingRemovesCategory` relationship targeting
its location. The suppressed selection and its provenance remain in the plan;
its layers, unreferenced parts, utility requests, and modifier-order policy do
not. Cyclic exact suppression remains active with an explicit conflict
diagnostic. Material ownership, texture roles, placement, coverage,
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
That named suborder is not a complete cosmetic bake order. It currently names
implants, eyes, eyeshadow, eyebrow base, eyebrows, scarring, freckles, blush,
eyelashes, and augmentations. Aging, blemish, eyeliner, lipstick, and body
augmentations fall through as unknown makeup groups and retain input order.
This remains modifier inventory policy only; it must not silently become an
appearance target's pass order.
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

Keep decoded PNG placement (size, offset, extent, target size and metadata
presence), authored sampler bounds, and projected decals' spherical parameters
and atlas placement distinct. An adapter may combine them for sampling without
overwriting source values. The double-placement cause is structurally closed and must remain a
regression case; the full visual matrix remains open.

| Transform rule | Status |
| --- | --- |
| `TransformUV0` is rectangle bounds `[uMin, vMin, uMax, vMax]`, with identity `[0,0,1,1]`. | Proven for reviewed avatar effects. |
| PNG placement and effect sampling bounds remain separate values. | Proven format and data-contract requirement. |
| A cropped source uses its authored placement once; a reconstructed full-atlas intermediate is sampled with identity. | Cause proven and structurally tested; the complete visual matrix remains open. |
| Projection parameters may be applied only when a typed relationship proves the input is a raw projected decal rather than an already-authored atlas. | Adoption gate; no filename or material-name inference is allowed. |
| Diffuse, normal, specular, and cut inputs retain independent placement and sampling bounds. | Proven contract requirement; complete consumer qualification remains open. |
| Rebinding reconstructed textures requires an explicit consumer contract and atomic readiness. | Renderer-owned adoption gate. |

Choose transforms from the resource actually bound at that stage: never force
identity globally, copy PNG placement into `TransformUV0`, or treat a cropped
channel as a full atlas. One transform cannot cover every object and mask.

Several materially distinct surfaces may share an atlas region; bounds prove
placement, not ownership. Rebinding requires a typed consumer relationship;
unqualified consumers retain authored bindings.
These rules do not establish complete renderer or visual parity.

## Dependency ownership and garment coverage

Layers retain separate requesting owners and visible contributors. A dependency
may coordinate other parts without supplying visible material. Tuck-support
geometry, mask candidates and selected-top material transfer are distinct
relationships; bounded resolution does not imply complete cut-mask or visual
qualification. `clothingAlsoCoversCategory` and `clothingRuleException` do not
yet supply general coverage policy.

## Utility-shape weights and garment fit

Utility-shape dependencies are interpreted only where the retained corpus
proves their syntax. An unsuffixed `utilityshapes/<target>` dependency requests
weight `1`. A terminal `###<finite-number>` requests that numeric weight,
including zero and values greater than one. An adjacent typed relation must
match the authored string; its supplied finite weight takes precedence.
The resolver preserves the exact
authored string, normalizes the modifier path for identity, and retains the
authored target leaf for renderer matching.

Exact active utility-shape occlusions suppress the same normalized utility
path. Conflicting active weights for one path produce a diagnostic and no
target request. Single-`#`, bare-`#` and malformed utility suffixes remain
unresolved. Non-utility weighted dependencies use the separate bounded rule
above. No weight is clamped.

The output is programmatic: `plan.morphTargets` contains the exact target and
weight requests for any garment combination. A renderer may match those names
against morph targets exposed by loaded geometry, but that matching and the
actual vertex deformation remain renderer-owned. Missing targets must remain
explicitly deferred; they must not become guessed coverage or garment-specific
hide rules.

Authored category occlusion and utility deformation remain separate rules.
Removing one category does not imply removal of every lower-body contribution.
A renderer may apply exact requested utility targets to retained geometry, but
must report missing targets rather than inventing a hide rule.

## Qualification limits

Complete material/texture-role resolution, normal-input combination, category
coverage, accessory packing and waist/tuck pixel qualification are not implied
by this data contract. Missing evidence produces diagnostics or an explicit
`policy` origin, never an unlabelled filename inference.

## Current contract tests

See the [plan fixtures](../../../test/character/runtime-character/character-appearance-plan.test.js),
[resolver checks](../../../test/character/runtime-character/character-appearance-resolver.test.js)
and [composition-policy checks](../../../test/character/runtime-character/character-composition-policy.test.js)
for the contracts above. The fixtures retain:

- shared diffuse-alpha-minus-cut-red coverage for normal clear, replacement,
  addition and final consumer alpha;
- replacement before additive normal detail, with independent diffuse, normal
  and specular sample bounds; and
- source-library immutability, standalone graph round trips and dangling or
  ambiguous-input diagnostics.

These tests import built output. The plan fixture still asserts schema v1;
its policy-backed order is not fresh schema-v4 or visual qualification.
