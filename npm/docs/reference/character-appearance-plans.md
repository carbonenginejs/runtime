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
- application policy, such as the global bake-order table, inferred default
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
`carbonenginejs.characterAppearancePlan` schema-v1 shape. Inherited
`GetValues({ refs: true })` emits serializable `_id`/`_ref` graph metadata.
There is no alternate wire format or retained document copy.

The complete resolver pipeline is responsible for selection, dependency, LOD,
material, texture-role, placement, and bake-order decisions. Hydration applies
declared model fields and resolves graph identity; it does not validate or
invent resolver policy.

`CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll)` implements
the first exact stage. It follows hydrated paper-doll modifier, character
resource, part-type, and part-source relationships. It emits a part only when
one strict resource-version match contains exactly one configuration candidate
and one geometry candidate. It parses no filenames and assigns no LOD or model
family. It also does not infer candidate or metadata inheritance from an
unversioned inventory: schema v6 version records are self-contained, so any
authoring-time baseline/override merge belongs in the final-library producer. Dependency
resolution, material selection, texture roles, placement,
coverage, targets, passes, bindings, image decoding, execution, and renderer
realization remain future stages; diagnostics make those omissions explicit.

## Implemented records

- `CjsCharacterAppearancePlan`: selections, parts, layers, textures, reusable
  coverages, ordered targets, final bindings, origins, and diagnostics for one
  resolved character state.
- `CjsCharacterAppearanceResolver`: exact first-stage paper-doll selection and
  unique-candidate resolution without resource or render policy.
- `CjsCharacterAppearanceSelection`: one plan-local resolved choice and its
  explicit selection-group ownership.
- `CjsCharacterAppearanceLayer`: contribution identity with separate `owner`
  and `contributor` references. Its collection order is inventory order, not
  bake order. A dependency can be owned by one selection while another source
  supplies its mesh, material, or visible alpha.
- `CjsCharacterResolvedPart`: one atomic configuration/geometry LOD binding
  and its provenance.
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
- `CjsCharacterOrigin`: source document and identity or resource path,
  optional JSON pointer, evidence status (`authored`, `decoded`, `derived`, or
  `policy`), and the rule that produced the value. Other records reference one
  shared origin instead of duplicating provenance fields.

A resolver should give a document-local `_id` only to collection records that
are referenced. The model importer requires every `_ref` to close inside the
same import operation and rejects duplicate `_id` values; it does not reject an
unused `_id`. Source-library record IDs remain named origin data; a
plan that directly references source-library records would instead be a linked
two-document graph and could not hydrate independently.

## Ordering and layer normalization

The prototype implementation loads foundation geometry and configuration,
binds base textures, loads configured parts, then bakes shared head/body
atlases. A fallback helper bakes at a different point. The new plan must contain
one authoritative pass-array order and both the runtime adapter and tests must
consume that order.

Recipe/group enumeration, dependency traversal, contribution inventory, target
inventory, and composition-pass order are separate. Neither paper-doll modifier
order nor `plan.layers` order is an atlas-order contract. The initial resolver
therefore creates no targets or passes.

Within an atlas, the current implementation copies the base and applies sorted
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
records must not overwrite one with another. Cropped placement is applied once;
the known double-application failure is closed and must remain a regression
case.

Diffuse, normal, and specular inputs retain independent sample bounds. A
material-global UV transform is insufficient because the three assets can have
different placement metadata.

## Decisions that are closed

- Full normal/specular texture coverage does not establish garment ownership;
  ownership must come from diffuse/cut semantics.
- The yellow spacesuit mismatch is not a material-palette mismatch; its paired
  material values and zone maps agree.
- Catsuit fragments are not explained by a retained mid/top selection.
- Global PNG placement is not an eyebrow fix; eyebrow placement requires its
  own proven rule.
- A dependency is not necessarily another renderable part. Some records may
  express category replacement or compatibility instead.
- Dependency ownership and contribution are different relationships; tuck is
  the clearest current example.
- Source byte offsets end at JSON decoding. They are not runtime atlas offsets.
- Paperdoll background identity is an exact portrait-resource relationship;
  light and light-color identities are separate opaque identifiers.
- A present zero relationship identity is a `null` sentinel, while a positive
  missing source-library identity remains its named domain value.

## Questions that remain open

- whether plain `n` and masked `mn` have fully distinct authored roles;
- the exact waist/tuck ownership rules;
- complete category-removal semantics and `clothingRuleException` behavior;
- which source establishes layer priority rather than merely recording current
  demo policy;
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
- contribution relationships without inferred pass order;
- deterministic diagnostics for dangling, ambiguous, and policy-dependent
  inputs; and
- source-library immutability and standalone plan graph round trips.
