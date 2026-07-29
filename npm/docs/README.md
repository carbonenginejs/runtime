# Runtime audio documentation

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Runtime authors, browser application authors, and integrators  
Summary: Explains the Carbon audio graph, optional Web Audio realization, and package boundaries.

## Purpose

`@carbonenginejs/runtime-audio` owns the complete CarbonEngineJS audio domain:
serializable Carbon audio objects, their portable behavior, event and music
scheduling, and an optional Web Audio realization.

The package is headless by default. Importing it does not create an
`AudioContext`, contact a service, load game data, or touch the document.

## Use this package when

Use `runtime-audio` when an application needs to:

- hydrate or inspect Carbon audio graph objects;
- run emitter, listener, culling, bank, RTPC, switch, or event behavior;
- install one complete audio-library document and realize it through an
  injected Web Audio context and media provider;
- schedule a tools-generated interactive-music graph; or
- provide a compatible application-owned music engine.

Use the `./trinity` subpath when only graph data and portable behavior are
needed.

## Where it fits

```text
             runtime-utils
                  |
                  v
       runtime-audio/trinity
                  |
                  v
          runtime-audio
            ^          ^
            |          |
      applications   runtime-core composition
```

The host supplies the complete document, exact source acquisition, and browser
audio context. Runtime-audio owns source selection, bank slicing, WEM
preparation, decoding, and decoded-buffer policy.
`@carbonenginejs/runtime-resource` owns reusable audio format operations. Node
acquisition, caches, and HTTP services belong in
`@carbonenginejs/tools-core`.

## Start here

For a headless graph:

```js
import {
    AudEmitter
} from "@carbonenginejs/runtime-audio/trinity";

const emitter = AudEmitter.from({
    name: "engine",
    eventPrefix: "ship_",
    position: [ 0, 0, 0 ]
});
```

For browser playback, start with `CjsAudioMan` and the
[browser playback guide](guides/browser-playback.md).

## Documentation map

- [Architecture and boundaries](architecture.md)
- [Browser playback guide](guides/browser-playback.md)
- [Custom and authored music](guides/music.md)
- [Audio manager contract](concepts/audio-manager.md)
- [Current API reference](reference/api.md)
- [Carbon compatibility](reference/carbon-compatibility.md)
- [Class-purpose catalog](reference/classes/README.md)
