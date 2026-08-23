# Interactive diagram demos

Status: Evolving
Scope: `@carbonenginejs/runtime/tools/diagrams`, `/tools/ship-tree`, planned `/tools/star-map`, and optional demo UI
Audience: Browser application authors, demo authors, and graphics-adapter implementers
Summary: Describes the reusable browser diagram layer, its first Ship Tree consumer, and planned Star Map and engine-rendered annotations without coupling domain logic to presentation.

## Purpose

Interactive diagrams provide shared viewport, selection, filtering,
layout, and rendering seams for browser tools that display large connected
spaces. The first consumer is a 2D Ship Tree. A 2D Star Map follows, with
3D renderers supplied through injected engine adapters later.

This page distinguishes implemented browser surfaces from approved planned
behavior. Star Map, shell, and ccpwgl annotation names remain plans until their
owning packages export and test them.

## Current foundations

The package currently provides:

- `TnyDemoHost` for serialized demo selection, mounting, and teardown;
- `TnyDemoDataService` for authority-ordered browser providers and explicit
  availability/provenance states;
- `TnyDemoRenderer` for a small injected graphics lifecycle;
- a scoped EVE-like theme; and
- renderer-neutral chart geometry consumed by an optional SVG view in Market
  Details;
- `@carbonenginejs/runtime/tools/diagrams` for mutable models, bounds,
  transforms, selection, and a linear visible-set/picking index; and
- `@carbonenginejs/runtime/tools/ship-tree` and `/tools/ship-tree/ui` for an authored
  tree source contract, offline memory source, deterministic layout,
  controller, optional SVG window, standalone fixture, and catalogue demo.

It does not currently provide a scalable spatial index, label-collision engine,
shared Canvas/WebGL diagram renderer, authoritative production Ship Tree
source, Star Map, or shared navigation shell.

## Layers

The reusable library remains separate from the showcase UI:

```text
provider-bound browser source
              |
              v
mutable domain and diagram records
              |
              v
presentation-neutral Cjs controller
              |
              v
optional Tny SVG, Canvas, or engine adapter
              |
              v
optional Tny window and standalone/catalogue demo
```

The generic layer owns stable node, edge, group, layer, viewport,
selection, focus, filter, and visible-set records. It provides
world-to-screen/screen-to-world transforms, anchored zoom, pan, fit-to-bounds,
focus-selected, deterministic selection, and renderer-neutral layout results.

It does not own SDE joins, authenticated ESI access, a DOM tree, CSS, SVG,
Canvas, WebGL, a concrete graphics engine, or application routing.

## Optional demo shell

A planned `TnyDemoShell` will compose a caller-supplied navigation registry
with `TnyDemoHost`. It may render a compact rail and an expanded grouped
flyout, search registered actions, show optional identity state, and synchronize
an injected router.

The shell does not move those responsibilities into `TnyDemoHost`. The host
continues to own only demo lifecycle. Menu categories and commands are supplied
by the application and are not copied from EVE.

Standalone demos remain directly mountable without constructing the shell.

## Ship Tree

The first Ship Tree renderer is SVG. SVG provides crisp connectors
and labels, direct event targets, deterministic inspection, and a synchronized
accessible representation. Its data and layout remain independent of SVG so a
Canvas or 3D renderer can consume the same results later.

The current synthetic authored-tree demonstration combines:

- injected authored hull progression topology, currently supplied by a bundled
  fixture rather than a production EVE answer;
- deterministic groups, compact image-first cards, authored sparse positions,
  and routed progression trunks;
- faction or organization selection;
- far, medium, and near level-of-detail states;
- search, filtering, persistent selection, and path highlighting;
- a compact source-fed hull preview anchored beside the clicked hull that can hand the selected type to full
  Ship Show Info without importing that window's presentation;
- optional trained-skill or mastery overlays; and
- an action that may open the selected type in Ship Show Info.

Type records may carry already resolved imageURL and masteryIconURL values.
The optional window displays those values but never turns a type, mastery,
faction, or icon identifier into a guessed resource path. Production sources
join the appropriate tools-core resource answer or authoritative image-service
answer through an injected icon source. The bundled fixture uses synthetic
images so it remains independent of an EVE client build.

Viewer identity never decides whether public topology exists. Anonymous users
receive the same hull tree without a personal overlay; manual profiles and
authenticated sources may add explicit viewer state.

## Star Map

The 2D and 3D Star Maps will share provider-neutral region, constellation,
system, and connection records. They share search, selection, route state,
filters, display modes, label priority, and LOD. Projection and rendering are
adapter concerns.

The 2D view supports pan, zoom, fit, focus, search, selection, and a
data-driven mode/filter toolbar. A 3D view may add orbit, tilt, depth, and a
return-to-2D operation without changing system identities.

The full map requires culling, a spatial index, label collision, and stable
selection across LOD changes. SVG may prove the small 2D contract; the complete
cluster must be able to use Canvas or WebGL without replacing the controller.

SDE positions are 64-bit, while the current graphics runtimes support only
32-bit positions. Sources and controllers retain source coordinates as
JavaScript numbers or `Float64Array` values. A renderer subtracts one shared
64-bit origin from every visible node, edge, and annotation endpoint, then
converts the local result to `Float32Array` for the engine:

```text
local32 = float32(source64 - origin64)
```

Absolute SDE positions are never converted directly to float32. Re-origining
after a large camera move rebuilds local coordinates without changing node
identity, selection, or route state.

For an in-system scene, the tools-core map source requests
`?expand=transform` and consumes `derived.orbit` plus
`derived.localPosition`. The API has already performed the parent-relative
derivation; browser code does not repeat it. The answer remains float64 and its
`frame` remains authoritative until the adapter converts the small local value
to float32. Unparented stargates still require camera-relative rebasing.

For Star Map rendering, a system's own `position` remains galactic layout
data. The renderer must still subtract one shared 64-bit map origin before
creating any 32-bit engine values.

## Renderer boundary

Diagram renderers receive semantic records and viewport state. They do not
fetch domain data or choose the meaning of colours, edge styles, badges, or
map modes.

The initial 2D adapter will be focused on SVG. Later adapters may use Canvas,
ccpwgl, or another engine. `TnyDemoRenderer` remains the lifecycle facade for
complete engine scene loads; it is not widened into a high-frequency graph
mutation protocol.

The first ccpwgl spatial-annotation implementation is planned in ccpwgl rather
than this package. It will render flat text or graphics on planes anchored to a
built ship locator or an explicit world transform. A plane can face the camera
as a billboard or retain an authored scale/rotation/translation transform.
the tools layer will only supply a thin adapter over an injected runtime.

## Data and build identity

Maintained demos consume documented tools-core HTTP answers through injected
browser transports. Static map, type, skill, Dogma, Industry, and Ship Tree
data use the SDE facet. Permitted icons and other resource paths use the
resource facet.

Maintained product and demo code does not call `/sde/*`. Those routes inspect
raw tables for debugging. If a composed answer is missing, the browser reports
the endpoint requirement instead of recreating a table join locally.

Consumers resolve and retain the exact build for each facet. They do not send
an SDE build to a resource route or a resource build to an SDE route.

Sources preserve the difference between:

- a value;
- an authoritative empty answer;
- an omitted optional field;
- authentication required;
- reauthorization required;
- unavailable or unsupported data; and
- a failed request.

An unavailable authenticated source never becomes an anonymous zero-value
answer. Raw JSON, bundled JSON, remote APIs, IndexedDB, and memory may all
adapt to the same controller contracts.

## Accessibility

A visual graph is not the only representation. Ship Tree will maintain a
synchronized outline or tree-grid. Star Map will maintain a searchable grouped
list or outline. Nodes announce their name, kind, selection, relevant
availability, and connection count; decorative edges and backgrounds remain
hidden from assistive technology.

Keyboard operation covers pan, zoom, fit, selection, following connections,
opening details, and returning focus to the navigation shell. Pointer and touch
gestures have keyboard or button equivalents. Status never relies on colour
alone, and transitions respect reduced-motion preferences.

## Planned delivery

1. Add exact-build sources for authoritative Ship Tree topology and bounded
   full-cluster Star Map topology.
2. Add renderer-neutral diagram records, transforms, selection, bounds,
   visible-set, and layout seams with offline fixtures. **Implemented.**
3. Deliver the 2D Ship Tree, SVG renderer, accessible outline, standalone
   example, and catalogue definition. **Implemented with a synthetic authored
   fixture; production topology remains pending.**
4. Deliver the optional registry-driven demo shell without changing
   `TnyDemoHost`.
5. Deliver the 2D Star Map with culling, search, selection, and data-driven
   modes.
6. Integrate later ccpwgl 3D annotations and map rendering through injected
   adapters without acquiring a second engine or graphics context.

## Related documentation

- [Browser tools architecture](../architecture.md)
- [Browser demo hosting](demos.md)
- [Ship Show Info](ship-show-info.md)
- [Package documentation](../README.md)
