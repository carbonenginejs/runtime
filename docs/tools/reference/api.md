# Browser tools API

Status: Evolving  
Scope: `@carbonenginejs/runtime/tools`  
Audience: Library users and browser application authors  
Summary: Lists the currently implemented public subpaths and exports.

## Import contract

The package root re-exports the presentation-neutral browser tool families:

```js
import {
    CjsChatClient,
    TnyDemoHost,
    CjsFileIndex,
    CjsESIMarket,
    CjsShipShowInfoController,
    CjsPerObjectDecoder,
    CjsPerObjectPacker,
    CjsRealtimeClient
} from "@carbonenginejs/runtime/tools";
```

Use targeted subpaths when a consumer needs one family:

```js
import {
    CjsFileIndexLibrary
} from "@carbonenginejs/runtime/tools/fileindex";
```

## Current exports

| Subpath | Purpose | Exports |
| --- | --- | --- |
| `./tools` | Aggregates presentation-neutral browser tool families. | Logic exports below; optional UI and demo-app subpaths remain explicit. |
| [`./tools/chat`](../../../src/tools/chat/index.js) | Requests and optionally filters provider-neutral chat rooms over one realtime client. | `CHAT_TOPICS`, `CjsChatBlockList`, `CjsChatClient`, `CjsChatContract`, `CjsChatRoomSubscription` |
| [`./tools/demo-apps`](../../../src/tools/demo-apps/index.js) | Composes optional feature presentations for standalone or catalogue mounting. | `TnyMarketDetailsDemo`, `CreateMarketDetailsDemoDefinition`, `TnyShipShowInfoDemo`, `CreateShipShowInfoDemoDefinition` |
| [`./tools/demos`](../../../src/tools/demos/index.js) | Hosts independent demos, selects browser data providers, and coordinates injected graphics adapters. | `TnyDemoDataService`, `TnyDemoHost`, `TnyDemoRenderer` |
| [`./tools/diagrams`](../../../src/tools/diagrams/index.js) | Supplies reusable diagram models, selection, viewport transforms, and spatial lookup. | Diagram classes and `diagramBoundsFromRecords` |
| [`./tools/fileindex`](../../../src/tools/fileindex/index.js) | Parses, loads, layers, and safely resolves appfileindex and resfileindex data. | `CjsFileIndex`, `CjsFileIndexEntry`, `CjsFileIndexLibrary`, `CjsFileIndexOverlay`, `CjsFileIndexSource` |
| [`./tools/market`](../../../src/tools/market/index.js) | Reads, normalizes, and coordinates regional-market data without importing presentation. | `CjsESIMarket`, `CjsESIMarketBackendSource`, `CjsMarketController`, `CjsESIMarketMemorySource`, `CjsESIMarketSource`, and market analysis/formatting functions |
| [`./tools/market/ui`](../../../src/tools/market/ui/index.js) | Renders the optional EVE-like Market Details window over the shared controller. | `TnyMarketHistoryChart`, `TnyMarketWindow` |
| `./tools/market/ui.css` | Supplies scoped Market Details feature layout without bundling fonts or images. | `.market-*` classes |
| [`./tools/ship-show-info`](../../../src/tools/ship-show-info/index.js) | Coordinates Ship Show Info data and renderer behavior without owning presentation. | `CjsShipShowInfoController`, tools-core public/session adapters, optional market/session decorators, caller-owned memory records, panel constants, and presentation-neutral model helpers |
| [`./tools/ship-show-info/ui`](../../../src/tools/ship-show-info/ui/index.js) | Renders the optional EVE-like Ship Show Info window and its zero-WebGL image fallback over the shared controller. | `TnyShipShowInfoWindow`, `TnyShipShowInfoImageRenderer` |
| `./tools/ship-show-info/ui.css` | Supplies scoped Ship Show Info feature layout without bundling fonts or images. | `.ship-show-info-*` classes |
| [`./tools/ship-tree`](../../../src/tools/ship-tree/index.js) | Supplies the provider-neutral Ship Tree controller, memory source, and layout. | Ship Tree logic exports |
| [`./tools/ship-tree/ui`](../../../src/tools/ship-tree/ui/index.js) | Renders the optional Ship Tree window. | `TnyShipTreeWindow` |
| `./tools/ship-tree/ui.css` | Supplies scoped Ship Tree feature layout. | `.ship-tree-*` classes |
| [`./tools/perobject`](../../../src/tools/perobject/index.js) | Names, synthesizes, packs, decodes, and inspects Carbon per-object constant-buffer layouts. | `CjsPerObjectDecoder`, `CjsPerObjectFieldType`, `CjsPerObjectLayoutError`, `CjsPerObjectLimits`, `CjsPerObjectPacker`, `CjsPerObjectRegister`, `CjsPerObjectSynthesizer`, `CjsPerObjectTypes`, `perObjectStruct`, `perObjectStructNames` |
| [`./tools/realtime`](../../../src/tools/realtime/index.js) | Consumes Carbon realtime v1 with bounded lifecycle, pressure, reconnect, metrics, subscriptions, and snapshot recovery. | `CjsRealtimeClient`, `CjsRealtimeError`, `CjsRealtimeProtocol`, `CjsRealtimeSubscription`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |
| [`./tools/realtime/wire`](../../../src/tools/realtime/CjsRealtimeProtocol.js) | Exposes the side-effect-free Carbon realtime v1 wire constants, constructors, and structural validators. | `CjsRealtimeError`, `CjsRealtimeProtocol`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |
| `./tools/theme/eve.css` | Supplies an asset-free, scoped EVE-like token and primitive stylesheet. | CSS custom properties and `.cjs-eve-*` classes |

The table lists canonical names. Compatibility aliases for published 0.1.x
demo and Show Info names remain identity aliases and are documented in the
[browser demo](../guides/demos.md) and
[Ship Show Info](../guides/ship-show-info.md) guides.

## Environment contract

Published source uses browser-standard or injected Web APIs and imports no Node
built-ins. File-index URL loading requires Fetch-compatible responses.
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

File-index helpers throw labelled `TypeError`, `RangeError`, or `Error`
instances for malformed declarations, unsafe locations, ambiguous layers,
failed HTTP responses, and unavailable Web APIs.

Realtime operations use `CjsRealtimeError` for stable error codes, retry
guidance, connection usability, status or close codes, and bounded observer
details.

## Related documentation

- [File-index guide](../guides/file-indexes.md)
- [Regional-market guide](../guides/market.md)
- [Ship Show Info guide](../guides/ship-show-info.md)
- [Browser demo guide](../guides/demos.md)
- [Per-object tooling](../perobject/README.md)
- [Per-object class catalog](classes/perobject.md)
- [Realtime guide](../guides/realtime.md)
- [Class-purpose catalog](classes/README.md)
