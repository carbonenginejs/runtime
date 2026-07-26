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
| [`./audio`](../../src/audio/index.js) | Builds, loads, and adapts deterministic audio libraries to CjsResMan. | `CjsAudioLibrary`, `CjsAudioLibraryBuilder` |
| [`./chat`](../../src/chat/index.js) | Requests and optionally filters provider-neutral chat rooms over one realtime client. | `CHAT_TOPICS`, `CjsChatBlockList`, `CjsChatClient`, `CjsChatContract`, `CjsChatRoomSubscription` |
| [`./fileindex`](../../src/fileindex/index.js) | Parses, loads, layers, and safely resolves appfileindex and resfileindex data. | `CjsFileIndex`, `CjsFileIndexEntry`, `CjsFileIndexLibrary`, `CjsFileIndexOverlay`, `CjsFileIndexSource` |
| [`./realtime`](../../src/realtime/index.js) | Consumes Carbon realtime v1 with validation, reconnect, subscriptions, and snapshot recovery. | `CjsRealtimeClient`, `CjsRealtimeError`, `CjsRealtimeProtocol`, `CjsRealtimeSubscription`, `REALTIME_PROTOCOL`, `REALTIME_PROTOCOL_VERSION`, `REALTIME_ROUTE`, `REALTIME_SUBPROTOCOL` |

## Environment contract

Published source uses browser-standard or injected Web APIs and imports no Node
built-ins. Audio-library and file-index loading require Fetch-compatible
responses when a URL is supplied. Complete audio builds require injected bank
access and may inject worker-backed bank inspection. Audio resource access
accepts a CjsResMan or creates an audio-only manager and consumes structural
whole-file, exact-media, or range source capabilities. Realtime consumption
requires WebSocket and uses Fetch for snapshot recovery when configured.

Audio configuration is registered before `Initialize()`. A prebuilt
`libraryResFilePath`/`library` replaces the sound-bank build inputs, while
`enrichResPath`/`enrich` overlays either form. API base, individual-file, and
offset options declare transport availability; they do not assert browser
decode support. Async `GetCapabilities()` can instead test both API delivery
modes concurrently with one bank-owned media record before the first resource
lookup.
Canonical-to-URL mapping remains exclusively in CjsResMan. URL-backed
providers receive resolved URLs; structural sources receive normalized
resource paths.
The returned `CjsAudioRes` and backing `CjsAudioBufferRes` classes are owned
and exported by `@carbonenginejs/runtime-resource/resource/audio`.

## Errors

Audio-library programmer-contract failures use `TypeError`, `RangeError`, or
`SyntaxError`. Operational lookup, source, HTTP, backing-window, and resource
registration failures use `CjsError` with stable `CJS_AUDIO_*` codes.

File-index helpers throw labelled `TypeError`, `RangeError`, or `Error`
instances for malformed declarations, unsafe locations, ambiguous layers,
failed HTTP responses, and unavailable Web APIs.

Realtime operations use `CjsRealtimeError` for stable error codes, retry
guidance, connection usability, status or close codes, and bounded observer
details.

## Related documentation

- [Audio-library guide](../guides/audio-libraries.md)
- [File-index guide](../guides/file-indexes.md)
- [Realtime guide](../guides/realtime.md)
- [Class-purpose catalog](classes/README.md)
