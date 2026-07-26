# Audio resource class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime-resource/audio` classes
Audience: Users, maintainers, and automated readers
Summary: Catalogs raw audio-byte owners and individually addressable audio resource views.

<!-- class:CjsAudioBufferRes -->
## `CjsAudioBufferRes`

Physical audio byte-owner resource whose payload may back one complete file or several logical audio files.

- Export: `@carbonenginejs/runtime-resource/audio`
- Source: `src/audio/CjsAudioBufferRes.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
- Notes: Owns raw payload retention and locks without interpreting media IDs,
  bank members, decoding, or playback.

<!-- class:CjsAudioRes -->
## `CjsAudioRes`

Individually addressable audio resource representing one complete file over either a complete or windowed physical source.

- Export: `@carbonenginejs/runtime-resource/audio`
- Source: `src/audio/CjsAudioRes.js`
- Visibility: Public
- Kind: Original CarbonEngineJS class
- Notes: Carries immutable media metadata, returns detached byte windows, and
  delegates locks and payload liveness to its backing resource.
