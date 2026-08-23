# Browser demo hosting

Status: Evolving
Scope: `@carbonenginejs/runtime/tools/demos`, `@carbonenginejs/runtime/tools/demo-apps`, and `@carbonenginejs/runtime/tools/theme/eve.css`
Audience: Browser demo authors and runtime integrators
Summary: Hosts independent demos together, composes browser data sources, and keeps graphics, audio, and character runtimes behind injected domain adapters.

## Purpose

The demo family gives related browser tools one parent-container contract
without turning them into one application. Each demo remains directly
constructible and mountable, while `TnyDemoHost` can select the same demo
definition inside a shared catalogue or landing page.

The family is browser-only. Published source has no Node host contract, imports
no Node built-ins, and does not depend on `@carbonenginejs/tools-core`.
Filesystem access, credentials, exact-build acquisition, servers, and command
line behavior remain outside this package.

Browser-safe runtime packages remain valid dependencies. Development tests may
run under Node as a browser-compatible test host; that does not make Node a
runtime dependency of the published source.

## Current imports

```js
import {
    TnyDemoDataService,
    TnyDemoHost,
    TnyDemoRenderer
} from "@carbonenginejs/runtime/tools/demos";

import {
    TnyMarketDetailsDemo,
    TnyShipShowInfoDemo,
    CreateMarketDetailsDemoDefinition,
    CreateShipShowInfoDemoDefinition
} from "@carbonenginejs/runtime/tools/demo-apps";

import "@carbonenginejs/runtime/tools/theme/eve.css";
```

The JavaScript and stylesheet subpaths are independent. A demo can use the
host without the EVE-like theme, or the theme without the host.

The canonical optional-layer prefix is `Tny`. The published 0.1.x names
`CjsDemoDataService`, `CjsDemoHost`, `CjsDemoRenderer`, and
`CjsShipShowInfoDemo` remain temporary aliases of the corresponding `Tny*`
classes; they do not create parallel implementations. New code should use the
canonical names shown above.

## Logic and presentation boundary

The reusable library is the deliverable. A demo is only one composition and
showcase of that library.

A migrated feature keeps three independently consumable layers:

```text
source/client and domain records
              |
              v
presentation-neutral behavior or controller
              |
              v
optional EVE-like UI
              |
              v
standalone or catalogue demo entry point
```

Data and control flow downward in that diagram. Import dependencies point back
toward the earlier layers:

- source/client code imports no UI, theme, DOM constructor, or demo entry;
- behavior can depend on source/client contracts but not on rendered markup;
- optional UI imports the reusable logic and owns elements, layout, and feature
  styles;
- a demo entry composes providers, runtime adapters, UI, theme, routing, and
  fixture or live configuration; and
- a product may import the source/client and behavior layers while supplying
  entirely different components and styling.

The `./demos` JavaScript is coordination logic, not a component set.
`TnyDemoHost` treats its container as an opaque caller-owned value and never
creates markup. `TnyDemoDataService` and `TnyDemoRenderer` have no presentation
dependency. `./demo-apps` contains optional feature compositions and may import
feature UI. The separately imported `./theme/eve.css` subpath is UI-only.

Ship Show Info and Market Details demonstrate this split through their logic,
optional UI, stylesheet, and `./demo-apps` exports. A single export that only
yields a pre-styled component is insufficient because another host would have
to copy the data and behavior to render its own UI.

## One definition, two launch shapes

A demo definition has a stable ID, optional presentation metadata, and a
factory. The factory returns an object with asynchronous `Mount` and `Destroy`
methods:

```js
const showInfoDefinition = {
    id: "ship-show-info",
    label: "Ship Show Info",
    create({ context })
    {
        return new ShipShowInfoDemo(context);
    }
};
```

The demo can run by itself:

```js
const demo = showInfoDefinition.create({ context });

await demo.Mount(document.querySelector("[data-demo]"), {
    context,
    options: null,
    signal: new AbortController().signal
});
```

The same definition can run under a parent container:

```js
const host = new TnyDemoHost({
    container: document.querySelector("[data-demo]"),
    context,
    demos: [ marketDetailsDefinition, showInfoDefinition ]
});

await host.Open("ship-show-info");
```

`Open` serializes switching so two demos never own the same container at once.
It aborts the outgoing demo before awaiting `Destroy`, then awaits the incoming
demo's `Mount`. The host does not render navigation, change the URL, or decide
which demo is initial; a catalogue page, router, or standalone entry point owns
those choices.

The context is a caller-owned mutable record. A useful shape is:

```js
const context = {
    data,
    assets,
    runtimes: {
        CreateRenderer,
        audio,
        character
    }
};
```

These names are an application convention, not a required schema. Keeping the
context caller-owned lets a parent provide shared capabilities while a
standalone entry point supplies only what its one demo needs.

The maintained Show Info helper makes the options factory explicit:

```js
const showInfoDefinition = CreateShipShowInfoDemoDefinition({
    CreateOptions(context)
    {
        return {
            shipSource: context.showInfoSource,
            renderer: context.CreateShowInfoRenderer?.()
        };
    }
});

const standalone = new TnyShipShowInfoDemo({
    shipSource,
    renderer
});
```

Both values create the same `TnyShipShowInfoDemo` instance shape. The factory
is the only catalogue-specific seam; it does not hide provider selection or
business rules.

## Rendering adapters

`TnyDemoRenderer` is a lifecycle and cancellation facade over an injected
graphics adapter. It never imports, locates, or constructs ccpwgl, TrinityJS,
WebGL, WebGPU, or another engine.

An adapter implements:

```text
Mount(container)
Load(request, { signal, ...options }) -> Promise
Unmount()
Destroy()
SetView(view, options) -> Promise       optional
```

The request is deliberately adapter-owned. A ship adapter may accept DNA and
SKIN requests; a scene adapter may accept a prepared scene plan. The facade
only supplies cancellation and suppresses a result that completes after a
newer load.

```js
const renderer = new TnyDemoRenderer({ adapter });

await renderer.Mount(surface);
await renderer.Load({ kind: "ship", dna }, { signal });
await renderer.SetView("top", { smooth: true });
await renderer.Unmount();
```

For a shared ccpwgl viewport, `Mount` relocates the existing viewport and
`Unmount` returns it. `Destroy` releases the adapter/session; it must not destroy
an injected shared engine unless that adapter explicitly owns the engine. A
TrinityJS adapter can honor the same lifecycle with a different implementation.

No concrete graphics adapter ships yet. The first ccpwgl adapter should be
extracted with the Ship Show Info demo so its shared-context and page-switching
requirements remain executable rather than hypothetical.

## Audio and character runtimes

Graphics is only one form of runtime capability. Audio and character systems
follow a related producer/consumer pattern but do not have a viewport and must
not be forced through the rendering contract.

```text
browser data source
        |
        v
owning library builder or prepared library document
        |
        v
domain runtime or injected domain adapter
        |
        v
demo presentation
```

- `runtime-audio` owns audio graph/runtime behavior and its library-builder
  input contract. `runtime/tools/audio` already reads prepared remote audio
  documents and supplies browser media bytes.
- `runtime-character` owns character planning, appearance behavior, and its
  prepared library/plan contracts. A future browser adapter may read or install
  those documents without moving character semantics here.
- Graphics runtimes own scene and rendering behavior. A demo renderer adapter
  translates a demo request into that engine's native operations.

The parent context may expose all three capabilities, but each keeps its native
contract. Shared code coordinates acquisition, lifecycle, and presentation;
it does not invent one universal `Engine` interface.

Library builders may run in a browser when their owning package supports it, or
their output may be pre-built and supplied as a document. The demo neither
knows nor assumes which path produced the answer.

## Browser data sources

`TnyDemoDataService` selects the first provider whose optional `CanRead`
accepts a request, then awaits that provider's `Read` method. Provider order is
authority order, not a race:

```js
const data = new TnyDemoDataService({
    providers: [ manualProfileSource, exactBuildSource, publicLiveSource ]
});

const result = await data.Read({
    facet: "ship-type",
    typeID: 1
}, { signal });
```

A provider may read from:

- a JavaScript object or raw JSON document supplied by the caller;
- JSON bundled by the consuming application's build;
- an optional JSON file fetched at runtime;
- a remote public or same-origin API;
- IndexedDB or another browser-owned database; or
- transient browser memory.

Bundling is a deployment choice. The tools layer neither bundles a dataset nor
requires the data to be remote. A provider adapts any of these sources to the
same `CanRead`/`Read` contract.

Providers return a mutable terminal record:

```js
{
    status: "ready",
    presence: "value",
    value: typeRecord,
    provenance: [ { kind: "bundled-json", version: "example" } ]
}
```

Supported terminal statuses are:

```text
ready
unsupported
authentication-required
reauthorization-required
unavailable
failed
```

For `ready`, presence is `value`, `empty`, or `omitted`. This preserves the
difference between a supplied value, an authoritative empty answer, and an
optional field that the source did not carry.

Once a provider accepts a request, its terminal answer is returned. The service
does not silently fall back from an unavailable exact-build source to a lower
authority live source. If fallback is valid for a facet, an explicit composite
provider owns that policy and records the changed provenance.

## Anonymous, manual, and automatic data

Data availability and viewer identity are independent:

- Anonymous demos may still have complete public or bundled data.
- Manual profiles may live in memory or IndexedDB without an ESI grant.
- Automatic character data may be available through a narrow same-origin API.
- Authentication does not prove a scope, a successful request, or the presence
  of a public definition source.

The data service carries terminal availability and provenance. Domain services
still own skill evaluation, Dogma, Industry, fitting, market, character, and
audio semantics.

An injected fetch implementation that is retained by a provider must be bound
when constructed:

```js
this.fetchImpl = fetchImpl.bind(globalThis);
```

Tests for such a provider should use a receiver-recording non-arrow function so
a browser `Illegal invocation` failure remains detectable.

## Shared EVE-like theme

The stylesheet is scoped to `.cjs-eve-theme`; it never styles arbitrary host
page elements:

```html
<main class="cjs-eve-theme cjs-eve-window">
    <header class="cjs-eve-titlebar">
        <span class="cjs-eve-title-mark" aria-hidden="true"></span>
        Ship Show Info
    </header>
</main>
```

It currently supplies tokens and compact primitives for window chrome,
sidebars, navigation rows, tabs, buttons, fields, panels, section headings,
tables, statuses, icons, values, and muted text.

The package ships no EVE font, icon, texture, or decoded game data. Hosts may
set `--cjs-eve-font-family` and resolve permitted UI artwork through their own
asset capability. Feature layout, camera motion, charts, and domain-specific
status remain owned by each demo.

## Ownership and security

The tools layer owns:

- browser demo selection and lifecycle coordination;
- browser data-provider selection and terminal result normalization;
- graphics-adapter cancellation and viewport lifecycle coordination; and
- public, asset-free theme tokens and primitives.

It does not own:

- Node acquisition, servers, credentials, filesystems, or persistent server
  caches;
- authorization, sessions, ESI tokens, or a general authenticated proxy;
- domain library construction already owned by a runtime package;
- a rendering engine or graphics context;
- application routing or navigation; or
- bundled game data, fonts, icons, or textures.

## Migration pattern

Market Details and Ship Show Info establish the pattern for later demos. A
feature moves only after its provider boundaries are browser-safe:

1. commit a reviewable baseline in the source repository so the move has a
   checkable before-and-after diff;
2. separate source/client, presentation-neutral behavior, optional UI, and demo
   composition exports;
3. adopt the scoped theme while retaining feature layout classes;
4. expose each demo through one independent definition and entry point;
5. place both definitions in one optional catalogue host;
6. extract the existing shared ccpwgl viewport behavior behind one injected
   adapter without creating another engine or graphics context; and
7. retain standalone URLs that construct the same demo definitions directly.

Do not migrate untracked-only source. Without a committed baseline there is no
provenance or reliable way to prove that behavior was preserved. Do not move
session, grant, token, or restricted adjacent material into a public demo; an
authenticated demo consumes only narrow, documented browser records from an
injected host capability.

Future audio, character, and TrinityJS demos should reuse the host and data
contracts while injecting their own domain runtime capabilities.
