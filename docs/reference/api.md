# Browser tools API

Status: Evolving  
Scope: `@carbonenginejs/tools-browser` version 0.1  
Audience: Library users and browser application authors  
Summary: Lists the currently implemented public subpaths and exports.

## Import contract

The package root re-exports all current browser tool families:

```js
import {
    CjsChatClient,
    CjsFileIndex,
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
| `.` | Aggregates all current browser tool families. | All exports below. |
| [`./chat`](../../src/chat/index.js) | Requests and optionally filters provider-neutral chat rooms over one realtime client. | `CHAT_TOPICS`, `CjsChatBlockList`, `CjsChatClient`, `CjsChatContract`, `CjsChatRoomSubscription` |
| [`./fileindex`](../../src/fileindex/index.js) | Parses, loads, layers, and safely resolves appfileindex and resfileindex data. | `CjsFileIndex`, `CjsFileIndexEntry`, `CjsFileIndexLibrary`, `CjsFileIndexOverlay`, `CjsFileIndexSource` |
| [`./realtime`](../../src/realtime/index.js) | Consumes Carbon realtime v1 with validation, reconnect, subscriptions, and snapshot recovery. | `CjsRealtimeClient`, `CjsRealtimeError`, `CjsRealtimeProtocol`, `CjsRealtimeSubscription`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |

## Environment contract

Published source uses browser-standard or injected Web APIs and imports no Node
built-ins. File-index loading requires Fetch-compatible responses. Realtime
consumption requires WebSocket and uses Fetch for snapshot recovery when
configured.

## Errors

File-index helpers throw labelled `TypeError`, `RangeError`, or `Error`
instances for malformed declarations, unsafe locations, ambiguous layers,
failed HTTP responses, and unavailable Web APIs.

Realtime operations use `CjsRealtimeError` for stable error codes, retry
guidance, connection usability, status or close codes, and bounded observer
details.

## Related documentation

- [File-index guide](../guides/file-indexes.md)
- [Realtime guide](../guides/realtime.md)
- [Class-purpose catalog](classes/README.md)
