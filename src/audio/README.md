# Runtime audio

Subpaths:
- `audio`: everything below plus the Web Audio realization;
- `audio/trinity`: Carbon graph classes and portable behavior, without
  evaluating the backend;
- `audio/audioMetadata`: `audioMetadataFromSoundbanksInfo()`;
- `audio/library`: library hydration plus audio-library, SFX-program and
  music-library validation/installation;
- `audio/library-builder`: document construction from decoded values or
  raw resources, kept out of ordinary bundles.

Every entry is browser-safe: import and construction do no DOM, fetch,
Node or device work. `Enable()` is the first point an AudioContext is
created; without one, enablement fails and the graph keeps Carbon's
null-manager behavior.

Realization is strict by default. Wwise behavior the browser cannot
reproduce faithfully is either omitted or admitted only through an explicit
host policy (see the `CjsAudioMan` constructor). A route the shared bus
mixer rejects stays audible on the legacy SFX or music path, with the
blocked authored bus stages omitted.
