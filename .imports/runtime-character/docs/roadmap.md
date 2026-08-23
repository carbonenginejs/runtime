# Runtime character roadmap

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Maintainers
Summary: Tracks evidence-backed work after replacing the speculative v1/v2 character model.

## Current baseline

- schema-v10 model-shaped JSON construction, with schema-v7/v8/v9 migration loading;
- proven native `_id`/`_ref` relationship projection;
- one connected source-record model with named `recordID` values;
- observable create/add/remove/delete/clear editor mutation with lazy
  per-document private indexed lookup;
- direct or injected-loader installation of one combined runtime catalog;
- direct `CjsModel` records for all twelve required source documents, one
  lossless decoded-definition catalog, seven additive typed profile/resource
  catalogs, and nested selection records;
- a standalone schema-v4 appearance-plan data contract with local graph
  identity, provenance, reusable coverage, ordered composition, and bindings;
- a source-to-plan resolver that preserves exact paper-doll source-version
  contributions, all exact texture candidates, uniquely determined
  configuration/geometry candidates, and bounded exact typed dependency
  contributions;
- verified GPU-free modifier-order and shared-atlas layout policy;
- current source-backed native character/interior classes under `src/trinity`;
- exact-name CPU rig binding used by `Tr2SkinnedObject`; and
- a bounded `src/incarna` tranche for recovered historical-only identities.

The old schema-v1/v2 `CjsCharacter*` graph and model family is removed.

## Combined-library producer

The combined runtime contract is now explicit. Producers retain every decoded
character definition in the combined library before adding typed projections,
exact resource candidates, and optional identity enrichment. A definition that
is not yet understood remains available as JSON; it is not a reason to omit
the source. Enrichment must not invent a resource relationship when an exact
join is absent.

Add new folded definition families only from decoded evidence. Keep referenced
configurations, geometry, textures, animations, and effects external as
canonical resource paths. Do not restore the retired schema-v2 part graph as a
compatibility format.

## Continue the source-to-plan resolver

Keep source models direct and source-neutral. The implemented first tranche
resolves selections and degenerate one-configuration/one-geometry source
versions. It also follows a direct exact typed dependency to one unique source
version while leaving recursive traversal and policy-only relationships
unresolved. Continue with category coverage, decoded atomic resource/LOD
bindings, material inputs, recursive dependency policy, and ordered atlas
operations in the backend-neutral character appearance-plan contract. The
reviewed standard tuck case now projects its lower-body dependency owner,
support geometry, and exact mask candidate. The derived top-material transfer
and complete pixel matrix remain open.

The final-library producer now materializes exact decoded baseline and version
metadata plus configuration, geometry, and texture candidate arrays. The
retired compact format distinguished absent overrides from explicit empty
arrays; schema v10 runtime records deliberately do not guess that distinction.
The producer now supplies an additive typed relation beside each retained raw
dependency or occlusion string. Exact unsuffixed targets can resolve to part
sources or modifier locations; suffixed values stay opaque and are not parsed
by the runtime.

Native behavior now establishes the default category/makeup sort and five
metadata-controlled endpoint swaps as explicit resolver policy. It also
establishes the normalized body/head/hair/accessories atlas rectangles. These
are implemented as GPU-free helpers, not authored library facts. Filename
classifiers, inferred material defaults, complete coverage and waist/tuck
realization, brow rules, accessory subordering, and custom-decal ordering
remain unresolved. Waist/tuck realization means the standard/middle-only,
male/female, selection-state, cut-mask, and texture-channel fixture matrix; it
does not reopen the established owner/contributor split.
Each future resolved field needs a source fact, resource inspection, or an
explicit labelled policy decision.

The [legacy GLES character reference](reference/legacy-gles-character-reference.md)
is the functional parity worklist for the replacement system. It is broader
than the current GPU-free resolver, so its in-scope working flows and visible
outcomes remain implementation targets, although individual newer adapter
behaviors may already be better. The replacement must preserve or explicitly
supersede those capabilities while moving their inputs from filename rules,
fixed fallbacks, fixture policies, and hardcoded layer tables to retained
domain identities, typed relationships, decoded metadata, and explicit
renderer policy. No in-scope legacy capability may be silently dropped because
its old discovery mechanism was heuristic.

Authored dependency and occlusion values remain unchanged strings beside the
typed relation list. The resolver follows only a producer-supplied exact typed
part-source relationship and diagnoses everything else. It must not parse
suffixes, infer a target version, recursively expand a category, or fabricate a
contribution.

## Document-to-native adapters

Do not connect schema-v10 records to `Tr2*` objects by filename or old v1/v2
assumptions. Each adapter requires a proven source relationship, focused
synthetic tests, and a clear resource-owner boundary.

## Native Carbon work

Continue verifying maintained `src/trinity` classes against current Carbon
headers and implementations. Generated shells, schema registration, or passing
hydration are not behavioral parity.

## Historical Incarna work

When pinned Incarna assets require an identity absent from current Carbon, add
the smallest honest hydration contract under `src/incarna`. Keep current
Carbon identities in `src/trinity`, and do not recreate unavailable lighting or
rendering systems by guesswork.
