# Runtime audio documentation

Status: Evolving  
Scope: `@carbonenginejs/runtime/audio`
Audience: Runtime authors, browser application authors, and integrators  
Summary: Explains the Carbon audio graph, optional Web Audio realization, and package boundaries.

## Purpose

`@carbonenginejs/runtime/audio` owns the complete CarbonEngineJS audio domain:
serializable Carbon audio objects, their portable behavior, event and music
scheduling, and an optional Web Audio realization.

The package is headless by default. Importing it does not create an
`AudioContext`, contact a service, load game data, or touch the document.

## Start here

For a headless graph:

```js
import {
    AudEmitter
} from "@carbonenginejs/runtime/audio/trinity";

const emitter = AudEmitter.from({
    name: "engine",
    eventPrefix: "ship_",
    position: [ 0, 0, 0 ]
});
```

For browser playback, start with `CjsAudioMan` and the
[browser playback guide](guides/browser-playback.md). It accepts a complete
audio-library document and a host-owned media provider. See
[architecture](architecture.md) for builder, format, and application ownership.

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Browser playback guide](guides/browser-playback.md)
- [Authored SFX programs](guides/sfx.md)
- [Custom and authored music](guides/music.md)
- [Current API reference](reference/api.md)
- [Carbon compatibility](reference/carbon-compatibility.md)
- [Class-purpose catalog](reference/classes/README.md)
