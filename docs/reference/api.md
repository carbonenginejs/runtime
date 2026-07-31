# Browser tools API

Status: Evolving  
Scope: `@carbonenginejs/tools-browser` version 0.1  
Audience: Library users and browser application authors  
Summary: Lists the currently implemented public subpaths and exports.

## Import contract

The package root re-exports all current browser tool families:

```js
import {
    CjsAudioLibrary,
    CjsChatClient,
    CjsFileIndex,
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
| `.` | Aggregates all current browser tool families. | All exports below. |
| [`./audio`](../../src/audio/index.js) | Reads remote audio documents, builder inputs, complete files, and ranges. | `CjsAudioLibrary` |
| [`./chat`](../../src/chat/index.js) | Requests and optionally filters provider-neutral chat rooms over one realtime client. | `CHAT_TOPICS`, `CjsChatBlockList`, `CjsChatClient`, `CjsChatContract`, `CjsChatRoomSubscription` |
| [`./fileindex`](../../src/fileindex/index.js) | Parses, loads, layers, and safely resolves appfileindex and resfileindex data. | `CjsFileIndex`, `CjsFileIndexEntry`, `CjsFileIndexLibrary`, `CjsFileIndexOverlay`, `CjsFileIndexSource` |
| [`./perobject`](../../src/perobject/index.js) | Names, synthesizes, packs, decodes, and inspects Carbon per-object constant-buffer layouts. | `CjsPerObjectDecoder`, `CjsPerObjectFieldType`, `CjsPerObjectLayoutError`, `CjsPerObjectLimits`, `CjsPerObjectPacker`, `CjsPerObjectRegister`, `CjsPerObjectSynthesizer`, `CjsPerObjectTypes`, `perObjectStruct`, `perObjectStructNames` |
| [`./realtime`](../../src/realtime/index.js) | Consumes Carbon realtime v1 with bounded lifecycle, pressure, reconnect, metrics, subscriptions, and snapshot recovery. | `CjsRealtimeClient`, `CjsRealtimeError`, `CjsRealtimeProtocol`, `CjsRealtimeSubscription`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |
| [`./realtime/wire`](../../src/realtime/CjsRealtimeProtocol.js) | Exposes the side-effect-free Carbon realtime v1 wire constants, constructors, and structural validators. | `CjsRealtimeError`, `CjsRealtimeProtocol`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |

## Environment contract

Published source uses browser-standard or injected Web APIs and imports no Node
built-ins. Audio and file-index URL loading require Fetch-compatible
responses. `CjsAudioLibrary` accepts explicit HTTP(S) records or resolves
logical paths through an injected remote `CjsFileIndexLibrary`; it
structurally supplies `Read` and `ReadRange` to `CjsAudioMan`.
Realtime consumption requires WebSocket and uses Fetch for snapshot recovery
when configured.

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
- [Per-object tooling](../perobject/README.md)
- [Per-object class catalog](classes/perobject.md)
- [Realtime guide](../guides/realtime.md)
- [Class-purpose catalog](classes/README.md)
