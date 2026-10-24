# PaperDoll application controls

These are application-owned editable settings, not ports of native Carbon
classes. A single CjsPaperDoll owns eyes, eyebrows and blush. It coordinates
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
