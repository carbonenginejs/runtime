# Audio manager contract

Status: Experimental
Scope: `@carbonenginejs/runtime-audio`  
Audience: Runtime authors and application integrators  
Summary: Defines the whole-library manager and its acquisition-free runtime boundary.

## Contract

`CjsAudioMan` installs one complete schema-v2 audio-library document and owns:

- immutable document installation;
- event, bank, loose-media, embedded-member, and prepared-variant resolution;
- explicit language and delivery selection;
- individual-file, whole-bank/local-slice, and exact-range reads;
- WEM or browser-native media preparation and decoding;
- pending decode deduplication and explicit decoded/source cache release; and
- the Carbon manager, emitter, listener, backend, and music lifecycles.

It accepts a structural provider:

```js
{
    Read(sourceRecord, context),
    ReadRange?(bankRecord, { offset, byteLength, signal }),
    CanRead?(sourceRecord, context),
    CanReadRange?(bankRecord, context)
}
```

`Read` may return bytes, `{ bytes, mediaType }`, an `AudioBuffer`, or PCM
channel data. `ReadRange` may return HTTP-206 bytes or a complete original
file marked `complete: true`; the manager slices the latter locally.

## Document acquisition

The caller decides how the complete document exists:

- import or download a built artifact;
- receive a complete result from an API;
- call `@carbonenginejs/runtime-audio/library-builder` with already acquired
  inputs; or
- package it through another application-specific process.

Neither manager nor builder discovers or downloads builder inputs. The
optional builder accepts supplied index rows, SoundbanksInfo or metadata,
optional neutral enrichment, and optional bank access.

## Lower-level system

`CjsAudioMan` composes `CjsAudioSystem`, which in turn owns `AudManager`,
`AudStaticDataRepository`, `CjsAudioBackend`, and optional `CjsMusicEngine`.
Direct `CjsAudioSystem` use remains possible for specialized integrations, but
ordinary consumers should install a complete document through `CjsAudioMan`.

## Non-goals

- Making a general resource manager interpret audio events or banks.
- Requiring a Node service for browser playback.
- Treating filenames or URLs as canonical Wwise media identity.
- Downloading SoundbanksInfo, indexes, enrichment, or banks inside the
  builder.
- Claiming buffer playback is long-form streaming.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [API reference](../reference/api.md)
- [Browser playback guide](../guides/browser-playback.md)
