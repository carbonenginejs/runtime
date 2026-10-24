# PaperDoll application controls

These are application-owned editable settings, not ports of native Carbon
classes. A single CjsPaperDoll owns archetype, eyes, eyebrows and blush. It coordinates
separate eye output and one shared head output; it does not implement a general
appearance dependency graph or replace library appearance plans.

Each component's Configure accepts prepared option records (id, colorAreas,
defaultPalette, palettes), a map of authored three-colour palettes, and an
optional initial/reset option. Blush also accepts an authored reset weight.
Acquisition and capability verification belong to the resource/composition
adapter. The application model is GPU-free and needs no character library.
Database item IDs remain separate from resource option identities.

CjsPaperDollComponent retains typed preset and manual colours across style,
foundation and off/on changes. Its item declares only usable decorated fields:
eyes support the qualified zero/one/two/three-area configurations; eyebrows and
blush support zero or area 1. New layouts fail until explicitly qualified.
Shared storage does not make eyebrow or blush items expose eye-specific fields.
Blush's weight is a float32 value between zero and one. Reset restores the
configured option and palette, clears manual state and restores the blush amount.

Use property setters, as the existing decorator UI adapter does. Setters mark
the component dirty without changing effects. Direct vector mutation, generic
schema hydration and raw field writes are not application editing operations.
Ownerless item instances have independent defaults for reflection; attached
items borrow the component's remembered values. Persistence and copying item
configurations into a doll remain outside this integration.

Call doll.Update({ eyes, head }) outside a render pass. Both callbacks are
synchronous prepared bindings. The eyes callback receives its captured option,
typed colours and active colour areas. The head callback receives captured
eyebrows and blush states, including effective blush weight. One shared head
callback handles simultaneous edits; disabled edits retain state without work.
The adapter builds inactive outputs in authored order and publishes completed
bindings. Successful groups are acknowledged independently, failed groups retry,
and callback edits remain pending. Recursive Update calls defer.

Rebuild forces both groups. RebuildHead invalidates just the shared output when
an external prepared contributor, such as the current freckles toggle, changes.
Component Rebuild marks settings for comparison; unchanged effective settings
do not force rendering. Resource acquisition must finish before application;
asynchronous callbacks and general dependency scheduling are not supported.

The private adapter rebuilds eye diffuse for colour edits and D/N/S for styles.
Head edits rebuild facial diffuse and the separate alpha-bearing brow carrier
together; they retain facial normal/specular and select the brow's own N/S.
The adapter determines these target dependencies, not the editable components.

## Explicit foundation

CjsPaperDollArchetype owns a required selection once configured. It is distinct
from the catalog activity-archetype record. Configure accepts prepared records
with separate archetype/head/generic-head/body identities, skeleton, parts and
explicit per-channel fallback owners. The resolver validates dependency closure,
cycles, unique part identities, model availability and complete head/body D/N/S.
Generic support textures remain separate from selected skin textures.

Part records retain metadata, inventory and exact dependency weights. These
weights are source evidence, not automatically texture opacity or applied morphs.
The input adapter owns resource acquisition, format decoding, role assignment and
LOD selection; the resolver does not infer those from filenames. Resolve returns
an owned snapshot. Only qualified, prepared options belong in Configure.

For configured dolls call Update({ foundation, eyes, head }). A changed or forced
foundation runs first and invalidates both modifier outputs without resetting
their settings. The synchronous foundation binding must publish already prepared
geometry/material resources; it is responsible for compatibility validation.
Failure keeps pending work for retry. Unconfigured dolls retain the earlier
eyes/head-only integration. Async preparation and general archetype switching
are host work, not implied by a successful source-graph resolution.


Archetype also exposes decorated float32 strength. It is independent of authored
source weights, survives option changes and is included in Resolve. Configure
accepts an initial strength (default 1); Reset restores it. Nonfinite and negative
values are rejected; weights above one are supported. A changed strength follows
the foundation-first update path while retaining modifier settings.

For the projected GR2 path, TriGrannyRes.CreateGeometryRes produces independent
geometry and BakeBlendshapeFromScript rewrites an allocated LOD-0 vertex buffer
from immutable source channels. The current implementation supports unpacked
position/normal/tangent/binormal channels, preserves the native small-weight
threshold and rejects packed tangent layouts. It uses canonical absolute morph
targets after the GR2 converter has resolved delta/sparse storage. CPU picking
retains the base geometry; this does not provide deformed picking or automatic
character-bound expansion. Other native bake overloads remain unimplemented.
