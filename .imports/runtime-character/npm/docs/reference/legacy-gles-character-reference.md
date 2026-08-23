# Legacy GLES character implementation reference

Status: Experimental
Scope: `@carbonenginejs/runtime-character` evidence and adoption boundary
Audience: Character-library, resolver, and renderer maintainers
Summary: Uses the broadest reviewed executable legacy GLES character reference as a parity inventory while rebuilding from retained source records and decoded definition values.

## Authority boundary

The reviewed legacy GLES editor is the broadest surviving executable reference
in this workspace for the character construction and appearance functionality
currently being rebuilt. It covers substantially more workflow than the
current GPU-free resolver. Individual behaviors in newer adapters may already
be better, so each visible result still requires case-by-case comparison. Its
working flows and regressions are a behavioral parity inventory, not material
to discard.

The compact schema-v2 shape could carry `typeID`, and the later active GLES
harness preserves it when populated. Its coverage and provenance were not
complete, however, and some recovery paths reconstructed type mappings
heuristically. Schema v10 instead retains direct character-resource records
and every supplied decoded definition value admitted by the exact-index build;
typed catalogs are additive and never replace retained definition JSON. Some
project decoded definitions, while others come from separately supplied
profiles or resource inspection. Direct modeled documents stay strict, and
candidate inventories cover recognized indexed resource families rather than
arbitrary unknown files. The goal is to reproduce and improve the old editor's
capabilities programmatically from this stronger evidence without claiming
that every legacy artifact omitted `typeID`.

This makes the two systems authoritative for different questions. The legacy
editor is the primary implementation reference for feature breadth and working
flow. Retained decoded source records and independently qualified external
records are the data authority; schema v10 is their current container and
runtime contract. The editor is not Carbon source, an authored
character-format specification, or a `runtime-character` compatibility
contract. Its development source has no traceable repository history, so its
conventions cannot count as independent prior art. A frozen snapshot and the
later active prototype also disagree in material ways, including layer order,
foundation coverage, LOD handling, and which mesh-backed garments write into
shared atlases.

The evidence labels on this page mean:

- **Reference behavior**: deterministic behavior observed in the old editor;
- **Structurally tested**: a focused test exercised that local algorithm, but
  did not prove correct rendered pixels;
- **Candidate neutral requirement**: a source-neutral input or result shape
  worth representing after independent qualification;
- **Replacement target**: a filename, path, effect-name, fallback, or fixture
  mechanism whose useful outcome must be preserved while its guessed input is
  replaced with typed data or an explicitly owned renderer policy; and
- **Open**: the old editor supplied no reliable or complete answer.

## Reference pipeline

The old editor separated a compact semantic recipe, a catalog projection,
coverage and dependency resolution, a render plan, resource staging, texture
composition, mesh/palette realization, and presentation. That separation is a
useful implementation blueprint. Its retired library and recipe schemas are
not accepted by the current schema-v10 library or schema-v4 appearance plan,
but every in-scope capability must be accounted for before the replacement is
complete.

| Concern | Old reference strategy | Evidence status | Programmatic direction |
| --- | --- | --- | --- |
| Selection identity | Stored source, version, and path-derived type identities instead of resolved resource paths; the later active path also carried optional `typeID`. Independent selection groups allowed more than one accessory family. | Reference behavior; structurally tested. | Preserve authored/domain identities and resolve resources through typed library relationships. Do not reuse the retired recipe shape. |
| Catalog projection | Walked sources, versions, and types, then combined prepared classification with path-based routing. | Mixed reference behavior and replacement targets. | Preserve the resulting feature coverage while a producer emits explicit category, group, sex, domain identity, and relationship data. Unrecognized decoded definitions remain retained and diagnosable. |
| Resource inheritance | Let version resource families override source-level families independently. | Reference behavior; structurally tested. | Schema-v10 source versions are self-contained. Producers materialize effective inventories; runtimes do not infer baseline inheritance. |
| LOD selection | Earlier code selected configuration and geometry independently by filename. Later code preferred an atomic bundle but retained filename fallbacks. | Conflicting dated experiments. | Resolve one atomic configuration/geometry target from explicit data or retain an ambiguity diagnostic. |
| Dependencies and occlusion | Parsed weighted dependency and occlusion strings, accumulated weights, suppressed matching selections or foundation parts, and emitted utility-shape requests. | Partly data-driven and structurally tested; matching still used path normalization. | Preserve raw values beside typed targets, weights, owners, and provenance. Follow only exact typed relationships. |
| Character topology | Used stable owners, staged required and optional parts, reused unchanged resources, committed topology atomically, and rolled back failed replacements. | Reference behavior; structurally tested. | These are valuable renderer lifecycle requirements, not serializable appearance-plan commands. |
| Skeleton and palettes | Loaded one skeleton, attached geometry resources, and bound each visual mesh index to a palette. | Reference behavior with synthetic tests. | Retain skeleton, geometry, visual-mesh, and palette requirements explicitly. Renderer realization remains outside this package. |
| Morphs | Applied multiple sparse or dense deltas from an immutable base, rebuilt derived geometry state, and reported missing or incompatible targets. | Reference behavior; structurally tested. | Keep exact target names and independent weights. Name normalization and target matching require separate proof. |
| Material planning | Preserved authored effect resources, restricted proposed bindings to declared samplers, and left incomplete composition unresolved. | Reference behavior; structurally tested. | Express explicit material inputs, output channels, ambiguity, and provenance. Never bind a partial composition as a finished map. |
| Atlas placement | Read image dimensions and placement metadata and distinguished a directly bound crop from a reconstructed full atlas. | Reference behavior; structurally tested. | Retain placement metadata separately from authored sampling bounds and apply each transform exactly once. |
| Texture composition | Built separate diffuse, normal, and specular outputs; distinguished replacement normals from additive detail normals; copied a base before ordered overlays. | Candidate neutral requirement; pixel coverage remains incomplete. | Use explicit target records and ordered logical passes. Each channel owns independent inputs, bounds, and completion state. |
| Coverage and cut masks | Combined owner coverage, masks, and selected overlays, with several garment-specific branches. | Mixed local algorithms and fixture policy. | Model reusable coverage and owner/contributor relationships. A category or garment name is not sufficient evidence for a cut rule. |
| Projection layers | Retained authored projection parameters but used local approximations and overrides for atlas placement. | Replacement target; known visual failures. | Retain projection support and preserve its inputs without converting them into a resolved placement until independently qualified. |
| Face surfaces | Partially handled eyes, brows, lashes, hair, and head skin through separate material branches. Tongue and teeth had no complete realization path. | Incomplete reference behavior. | Retain authored surface identity and qualify each consumer independently. Never apply a head-skin target to every head surface. |
| Lighting and camera | Kept studio lights and camera state outside recipe changes. | Reference behavior. | Presentation belongs to scene/renderer state, not character appearance meaning. |

## Useful neutral requirements

The review supports keeping the following questions explicit in a
renderer-neutral plan. It does not by itself prove any concrete values:

- ordered contribution records with separate owner and contributor identity;
- typed resource roles rather than filename-derived channel guesses;
- independent diffuse, normal, specular, alpha, and cut-mask inputs;
- separate masked-normal replacement and additive detail-normal operations;
- explicit image placement, sampling bounds, and composed-target dimensions;
- a distinction between directly sampling a crop and sampling a completed
  atlas;
- atomic configuration, geometry, LOD, skeleton, mesh-index, and palette
  requirements;
- typed dependency and occlusion targets with exact authored weights;
- exact morph-target requests plus explicit applied, deferred, ambiguous, or
  conflicting renderer results;
- incomplete and ambiguous material outputs remaining visible to callers; and
- lifecycle requirements for staging, reuse, atomic replacement, rollback,
  and resource release.

Several of these shapes already exist in the current library or appearance
plan. Their presence does not mean the first-stage resolver has enough evidence
to populate them.

## Reference shortcuts to replace, not features to discard

The old editor used all of the following to deliver real features. The
capability or visible result remains part of the parity target, but these
particular discovery mechanisms must be replaced with retained identities,
typed relationships, decoded metadata, or an explicitly renderer-owned policy:

- routing face, hair, tattoo, accessory, or makeup records by source-path
  regular expressions;
- assigning texture channel, target region, quality, or sampler from filename
  suffixes;
- choosing material defaults from lipstick or eyeshadow path names;
- pairing LOD configuration and geometry by `_lodN` filenames;
- normalizing morph names by deleting punctuation, `Shape`, or LOD suffixes;
- treating a footwear leaf name as proof that nude feet should remain or be
  hidden;
- special-casing brow, tuck, mask, ragdoll, eye, lash, or hair behavior by
  path or effect name;
- hardcoding a default eyelash source or neutral eye maps;
- constructing pattern resource paths from a pattern name;
- guessing a projection rectangle, flip, or darkness from one tattoo fixture;
- replacing failed authored effects with one global GLES shader and treating
  the result as material correctness;
- using fixed studio lights as character data; or
- converting a source-presence test into a claim about correct pixels.

Fallback discovery may exist in a development adapter when it is labelled and
diagnosed. It must not enter a prepared library or resolved appearance plan as
authored truth. Removing a fallback is not complete until its capability has a
programmatic replacement or is recorded as an explicit unresolved parity gap.

## Parity accounting

Every in-scope character construction, appearance, deformation, and
realization capability in the legacy editor must be assigned one visible
state:

- supported from retained source data by the new library and resolver;
- represented in the neutral plan but awaiting renderer realization;
- intentionally renderer-owned and covered by an adapter contract;
- unresolved because the required source relationship is not yet identified;
  or
- deliberately superseded, with the replacement and evidence recorded.

No such capability may be silently dropped. This is a parity gate, not a claim
that the current resolver already diagnoses every omission. Supplied domain
identities remain visible in retained source records; an absent `typeID`
enrichment remains unresolved and is not currently diagnosed by the resolver.
The applicable decoded input must remain retained, fail the build, or carry an
explicit unresolved or superseded result. Unknown fields are preserved inside
decoded definition values, while direct modeled documents remain strict.

## Layer order is not inherited from the editor

There is no single legacy layer table to copy unchanged. The frozen snapshot and the
later GLES prototype used different hardcoded orders, and most makeup families
shared one broad slot with lexical tie-breaking. Those tables prove only that
composition needs deterministic, inspectable order. Their working visual
sequences remain starting hypotheses and regression fixtures while the new
system derives or qualifies explicit programmatic priorities.

The current modifier-order helper and an appearance target's composition-pass
order remain separate contracts. New composition priorities may be spaced to
allow insertion, but their default values require authored, native, artifact,
or controlled visual evidence. The old numeric tables are not defaults.

## Adoption gate

A behavior observed in the legacy editor may enter the neutral
runtime-character contract only when all applicable gates are satisfied. A
renderer-specific behavior may remain in an adapter while it is being proved:

1. The applicable source input is retained under its declared contract;
   unmodeled decoded-definition fields remain inside the lossless definition
   value, while recognized candidate families remain explicit.
2. The behavior can be expressed without a renderer, filename, source path,
   effect name, or particular paper-doll identity.
3. Authored data, current Carbon behavior, a shipped artifact, or an explicitly
   approved policy independently supports it.
4. Ambiguous and missing inputs produce retained diagnostics rather than a
   guessed answer.
5. Focused runtime-character tests prove normalization, identity, ordering,
   ambiguity, and round-trip behavior.
6. A renderer adapter separately proves resource readiness, realization,
   rollback, and pixels where visual correctness is claimed.

Failing a gate does not justify discarding either the input or the capability.
The input stays available for a later producer, resolver, or renderer to
identify programmatically, and the capability remains on the parity worklist.

## Known gaps in the reference

The legacy system does not close these areas:

- an authoritative category and selection-group taxonomy;
- explicit texture roles for every candidate and quality family;
- the complete head-layer order for aging, blemishes, scars, freckles,
  augmentations, tattoos, eyes, brows, blush, eyeliner, and lipstick;
- generalized garment coverage, footwear, tuck, and waist behavior;
- authoritative projection placement for tattoos and other decals;
- complete eye, brow, eyelash, hair, tongue, and teeth material realization;
- exact morph-recipient rules across foundation and garment carriers;
- complete channel registration and UV transforms for every surface; and
- pixel-qualified behavior across sexes, LODs, body shapes, and garment
  combinations.

The old editor remains the first place to inspect how these capabilities were
made to work and which regressions already occurred. Its answer is a candidate
implementation and test oracle; the final inputs and meaning must still come
from retained source data, qualified artifacts, Carbon behavior, or an
explicitly approved policy.

## Related contracts

- [Architecture and ownership](../architecture.md)
- [Character appearance plans](character-appearance-plans.md)
- [Prepared character libraries](prepared-libraries.md)
- [Runtime usage](../guides/runtime-usage.md)
- [Roadmap](../roadmap.md)
