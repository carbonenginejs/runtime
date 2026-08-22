# Browser tools API

Status: Evolving  
Scope: `@carbonenginejs/tools-browser` version 0.1  
Audience: Library users and browser application authors  
Summary: Lists the currently implemented public subpaths and exports.

## Import contract

The package root re-exports the presentation-neutral browser tool families:

```js
import {
    CjsAudioLibrary,
    CjsChatClient,
    TnyDemoHost,
    CjsFileIndex,
    CjsESIMarket,
    CjsShipShowInfoController,
    CjsPerObjectDecoder,
    CjsPerObjectPacker,
    CjsRealtimeClient
} from "@carbonenginejs/tools-browser";
```

Use targeted subpaths when a consumer needs one family:

```js
import {
    CjsFileIndexLibrary
} from "@carbonenginejs/tools-browser/fileindex";
```

## Current exports

| Subpath | Purpose | Exports |
| --- | --- | --- |
| `.` | Aggregates presentation-neutral browser tool families. | Logic exports below; optional UI and demo-app subpaths remain explicit. |
| [`./audio`](../../src/audio/index.js) | Reads remote audio documents, builder inputs, complete files, and ranges. | `CjsAudioLibrary` |
| [`./chat`](../../src/chat/index.js) | Requests and optionally filters provider-neutral chat rooms over one realtime client. | `CHAT_TOPICS`, `CjsChatBlockList`, `CjsChatClient`, `CjsChatContract`, `CjsChatRoomSubscription` |
| [`./demo-apps`](../../src/demo-apps/index.js) | Composes optional feature presentations for standalone or catalogue mounting. | `TnyMarketDetailsDemo`, `CreateMarketDetailsDemoDefinition`, `TnyShipShowInfoDemo`, `CreateShipShowInfoDemoDefinition` |
| [`./demos`](../../src/demos/index.js) | Hosts independent demos, selects browser data providers, and coordinates injected graphics adapters. | `TnyDemoDataService`, `TnyDemoHost`, `TnyDemoRenderer` |
| [`./fileindex`](../../src/fileindex/index.js) | Parses, loads, layers, and safely resolves appfileindex and resfileindex data. | `CjsFileIndex`, `CjsFileIndexEntry`, `CjsFileIndexLibrary`, `CjsFileIndexOverlay`, `CjsFileIndexSource` |
| [`./market`](../../src/market/index.js) | Reads, normalizes, and coordinates regional-market data without importing presentation. | `CjsESIMarket`, `CjsESIMarketBackendSource`, `CjsMarketController`, `CjsESIMarketMemorySource`, `CjsESIMarketSource`, and market analysis/formatting functions |
| [`./market/ui`](../../src/market/ui/index.js) | Renders the optional EVE-like Market Details window over the shared controller. | `TnyMarketHistoryChart`, `TnyMarketWindow` |
| `./market/ui.css` | Supplies scoped Market Details feature layout without bundling fonts or images. | `.market-*` classes |
| [`./ship-show-info`](../../src/ship-show-info/index.js) | Coordinates Ship Show Info data and renderer behavior without owning presentation. | `CjsShipShowInfoController`, tools-core public/session adapters, optional market/session decorators, caller-owned memory records, panel constants, and presentation-neutral model helpers |
| [`./ship-show-info/ui`](../../src/ship-show-info/ui/index.js) | Renders the optional EVE-like Ship Show Info window and its zero-WebGL image fallback over the shared controller. | `TnyShipShowInfoWindow`, `TnyShipShowInfoImageRenderer` |
| `./ship-show-info/ui.css` | Supplies scoped Ship Show Info feature layout without bundling fonts or images. | `.ship-show-info-*` classes |
| [`./perobject`](../../src/perobject/index.js) | Names, synthesizes, packs, decodes, and inspects Carbon per-object constant-buffer layouts. | `CjsPerObjectDecoder`, `CjsPerObjectFieldType`, `CjsPerObjectLayoutError`, `CjsPerObjectLimits`, `CjsPerObjectPacker`, `CjsPerObjectRegister`, `CjsPerObjectSynthesizer`, `CjsPerObjectTypes`, `perObjectStruct`, `perObjectStructNames` |
| [`./realtime`](../../src/realtime/index.js) | Consumes Carbon realtime v1 with bounded lifecycle, pressure, reconnect, metrics, subscriptions, and snapshot recovery. | `CjsRealtimeClient`, `CjsRealtimeError`, `CjsRealtimeProtocol`, `CjsRealtimeSubscription`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |
| [`./realtime/wire`](../../src/realtime/CjsRealtimeProtocol.js) | Exposes the side-effect-free Carbon realtime v1 wire constants, constructors, and structural validators. | `CjsRealtimeError`, `CjsRealtimeProtocol`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |
| `./theme/eve.css` | Supplies an asset-free, scoped EVE-like token and primitive stylesheet. | CSS custom properties and `.cjs-eve-*` classes |

The table lists canonical names. Compatibility aliases for published 0.1.x
demo and Show Info names remain identity aliases and are documented in the
[browser demo](../guides/demos.md) and
[Ship Show Info](../guides/ship-show-info.md) guides.

## Environment contract

Published source uses browser-standard or injected Web APIs and imports no Node
built-ins. Audio and file-index URL loading require Fetch-compatible
responses. `CjsAudioLibrary` accepts explicit HTTP(S) records or resolves
logical paths through an injected remote `CjsFileIndexLibrary`; it
structurally supplies `Read` and `ReadRange` to `CjsAudioMan`.
Realtime consumption requires WebSocket and uses Fetch for snapshot recovery
when configured. Demo data providers may use caller-supplied documents, Fetch,
IndexedDB, or other injected browser capabilities. Demo renderers receive an
adapter and never acquire an engine or graphics context.
Market clients use injected Fetch and return mutable normalized records. The
direct ESI adapter bundles no type, region, order, or history dataset; callers
may supply an initial shelf or use a memory source.
Ship Show Info sources likewise bundle no hull, skill, skin, industry, or
market dataset. Its controller only invokes an injected renderer; engine and
WebGL-context acquisition remain adapter or application responsibilities.
Optional demo-app and UI subpaths may use DOM APIs. They remain independently
importable from the package root and presentation-neutral feature subpaths.

## Errors

Audio-library programmer-contract failures use `TypeError`, `RangeError`, or
`SyntaxError`. Missing index records and unsuccessful remote responses throw
labelled `Error` values.

File-index helpers throw labelled `TypeError`, `RangeError`, or `Error`
instances for malformed declarations, unsafe locations, ambiguous layers,
failed HTTP responses, and unavailable Web APIs.

Realtime operations use `CjsRealtimeError` for stable error codes, retry
guidance, connection usability, status or close codes, and bounded observer
details.

## Related documentation

- [Audio-library guide](../guides/audio-libraries.md)
- [File-index guide](../guides/file-indexes.md)
- [Regional-market guide](../guides/market.md)
- [Ship Show Info guide](../guides/ship-show-info.md)
- [Browser demo guide](../guides/demos.md)
- [Per-object tooling](../perobject/README.md)
- [Per-object class catalog](classes/perobject.md)
- [Realtime guide](../guides/realtime.md)
- [Class-purpose catalog](classes/README.md)
