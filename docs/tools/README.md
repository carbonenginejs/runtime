# Browser tools documentation

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools`  
Audience: Browser application authors, integrators, and maintainers  
Summary: Explains the browser-facing toolbox, its current clients, and its boundary with runtime and Node packages.

## Purpose

`@carbonenginejs/runtime/tools` is the intentionally broad home for usable
browser-facing CarbonEngineJS tools. It may contain clients, remote readers,
inspectors, demos, integration helpers, and reference implementations that are
valuable to library users without belonging in runtime packages.

The subpath is broad by product shape, not boundaryless. Its published source
uses browser-standard or injected Web APIs and never imports Node built-ins.

## Use this package when

Use the runtime `/tools` subpath when code:

- provides a usable browser-side integration or developer tool;
- reads caller-selected remote data through browser-safe interfaces;
- can also run in a Node test host through standard or injected Web APIs;
- does not own runtime graph objects, domain schemas, or backend realization.

Move a small general primitive down to `global/utils` when several runtime
layers need it. Keep filesystem, cache, credential, server, command-line, and
build behavior in the Node toolchain.

## Where it fits

```text
global/utils  audio  resource  trinity/perobject
       ^             ^               ^                    ^
       +-------------+---------------+--------------------+
                             |
                        runtime/tools
                             ^
                             +---- browser applications
                             +---- demos and inspectors
                             +---- browser clients of tools-core HTTP/wire APIs
```

The package uses narrow browser-safe runtime subpaths when a domain tool needs
an owning schema or reader. Its public families are provider-neutral chat,
browser demo hosting, regional-market data logic,
remote file-index handling, per-object shader inspection/packing,
presentation-neutral Ship Show Info coordination, and the Carbon realtime v1
client.

## Start here

For file-index parsing and safe HTTP(S) resolution, start with:

```js
import {
    CjsFileIndex,
    CjsFileIndexSource
} from "@carbonenginejs/runtime/tools/fileindex";
```

For a reconnecting realtime consumer, start with:

```js
import {
    CjsRealtimeClient
} from "@carbonenginejs/runtime/tools/realtime";
```

For a provider-neutral room listener over that realtime connection, start
with:

```js
import {
    CjsChatClient
} from "@carbonenginejs/runtime/tools/chat";
```

For independently mountable demos, browser data providers, and injected
graphics adapters, start with:

```js
import {
    TnyDemoHost,
    TnyDemoDataService,
    TnyDemoRenderer
} from "@carbonenginejs/runtime/tools/demos";
```

For optional feature compositions that can mount directly or become
`TnyDemoHost` definitions, start with:

```js
import {
    TnyMarketDetailsDemo,
    TnyShipShowInfoDemo,
    CreateMarketDetailsDemoDefinition,
    CreateShipShowInfoDemoDefinition
} from "@carbonenginejs/runtime/tools/demo-apps";
```

For regional-market clients, provider adapters, and presentation-neutral
analysis, start with:

```js
import {
    CjsMarketController,
    CjsESIMarket,
    analyzeOrders
} from "@carbonenginejs/runtime/tools/market";
```

For Ship Show Info source composition, lazy panel reads, and an injected
renderer contract, start with:

```js
import {
    CjsShipShowInfoController,
    CjsESIShipShowInfoMemorySource
} from "@carbonenginejs/runtime/tools/ship-show-info";
```

For Carbon per-object constant-buffer inspection, synthesis, and packing,
start with:

```js
import {
    CjsPerObjectDecoder,
    CjsPerObjectPacker
} from "@carbonenginejs/runtime/tools/perobject";
```

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Chat guide](guides/chat.md)
- [Browser demo guide](guides/demos.md)
- [Planned interactive diagram demos](guides/interactive-diagrams.md)
- [File-index guide](guides/file-indexes.md)
- [Regional-market guide](guides/market.md)
- [Ship Show Info guide](guides/ship-show-info.md)
- [Per-object tooling](perobject/README.md)
- [Realtime guide](guides/realtime.md)
- [Current API reference](reference/api.md)
- [Class-purpose catalog](reference/classes/README.md)
