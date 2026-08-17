# Browser tools documentation

Status: Evolving  
Scope: `@carbonenginejs/tools-browser`  
Audience: Browser application authors, integrators, and maintainers  
Summary: Explains the browser-facing toolbox, its current clients, and its boundary with runtime and Node packages.

## Purpose

`@carbonenginejs/tools-browser` is the intentionally broad home for usable
browser-facing CarbonEngineJS tools. It may contain clients, remote readers,
inspectors, demos, integration helpers, and reference implementations that are
valuable to library users without belonging in runtime packages.

The package is broad by product shape, not boundaryless. Its published source
uses browser-standard or injected Web APIs and never imports Node built-ins.

## Use this package when

Use `tools-browser` when code:

- provides a usable browser-side integration or developer tool;
- reads caller-selected remote data through browser-safe interfaces;
- can also run in a Node test host through standard or injected Web APIs;
- does not own runtime graph objects, domain schemas, or backend realization.

Move a small general primitive down to `runtime-utils` when several runtime
packages need it. Keep filesystem, cache, credential, server, command-line, and
build behavior in the Node toolchain.

## Where it fits

```text
runtime-utils  runtime-audio  runtime-resource  runtime-trinity/perobject
       ^             ^               ^                    ^
       +-------------+---------------+--------------------+
                             |
                       tools-browser
                             ^
                             +---- browser applications
                             +---- demos and inspectors
                             +---- tools-core wrappers using injected Web APIs
```

The package uses narrow browser-safe runtime subpaths when a domain tool needs
an owning schema or reader. Its public families are remote audio acquisition,
provider-neutral chat, browser demo hosting, regional-market data logic,
remote file-index handling, per-object shader inspection/packing,
presentation-neutral Ship Show Info coordination, and the Carbon realtime v1
client.

## Start here

For remote audio documents, builder inputs, complete files, and ranges, start
with:

```js
import {
    CjsAudioLibrary
} from "@carbonenginejs/tools-browser/audio";
```

For file-index parsing and safe HTTP(S) resolution, start with:

```js
import {
    CjsFileIndex,
    CjsFileIndexSource
} from "@carbonenginejs/tools-browser/fileindex";
```

For a reconnecting realtime consumer, start with:

```js
import {
    CjsRealtimeClient
} from "@carbonenginejs/tools-browser/realtime";
```

For a provider-neutral room listener over that realtime connection, start
with:

```js
import {
    CjsChatClient
} from "@carbonenginejs/tools-browser/chat";
```

For independently mountable demos, browser data providers, and injected
graphics adapters, start with:

```js
import {
    CjsDemoHost,
    CjsDemoDataService,
    CjsDemoRenderer
} from "@carbonenginejs/tools-browser/demos";
```

For optional feature compositions that can mount directly or become
`CjsDemoHost` definitions, start with:

```js
import {
    CjsShipShowInfoDemo,
    CreateShipShowInfoDemoDefinition
} from "@carbonenginejs/tools-browser/demo-apps";
```

For regional-market clients, provider adapters, and presentation-neutral
analysis, start with:

```js
import {
    CjsESIMarket,
    analyzeOrders
} from "@carbonenginejs/tools-browser/market";
```

For Ship Show Info source composition, lazy panel reads, and an injected
renderer contract, start with:

```js
import {
    CjsESIShipShowInfoController,
    CjsESIShipShowInfoMemorySource
} from "@carbonenginejs/tools-browser/ship-show-info";
```

For Carbon per-object constant-buffer inspection, synthesis, and packing,
start with:

```js
import {
    CjsPerObjectDecoder,
    CjsPerObjectPacker
} from "@carbonenginejs/tools-browser/perobject";
```

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Audio-library guide](guides/audio-libraries.md)
- [Chat guide](guides/chat.md)
- [Browser demo guide](guides/demos.md)
- [File-index guide](guides/file-indexes.md)
- [Regional-market guide](guides/market.md)
- [Ship Show Info guide](guides/ship-show-info.md)
- [Per-object tooling](perobject/README.md)
- [Realtime guide](guides/realtime.md)
- [Current API reference](reference/api.md)
- [Class-purpose catalog](reference/classes/README.md)
