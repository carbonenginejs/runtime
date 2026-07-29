# Runtime audio architecture

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Runtime authors, application integrators, and maintainers  
Summary: Defines audio graph, realization, media-provider, and package ownership boundaries.

## Purpose

`runtime-audio` keeps Carbon audio state and portable behavior usable without a
device while allowing an application to attach browser playback explicitly.
The graph and realization share one package because event, bank, emitter,
culling, and music lifecycles form one audio-domain contract.

## Dependency direction

```text
                  runtime-utils
                        |
                        v
            runtime-audio/trinity
                        |
                        v
            CjsAudioSystem + backend
                        ^
                        |
          host loaders and AudioContext
```

The `./trinity` entry exports Carbon graph classes and does not evaluate the
Web Audio backend. The root entry adds the composition root, backend, metadata
adapter, and music scheduler without creating a device during import.

## Owned responsibilities

The current package owns:

- Carbon `Aud*`, `Tr2Audio*`, and audio-geometry model classes;
- emitter, listener, event, bank, RTPC, switch, and culling behavior;
- graph adoption and release through `CjsAudioSystem`;
- per-source Web Audio playback, positioning, gain, seek, and completion;
- authored interactive-music scheduling; and
- explicit lifecycle and decoded-music cache release.

`CjsAudioSystem` is the current public composition root. It receives split
`audioMetadata`, `musicGraph`, `loadBuffer`, and `loadMedia` inputs.

## Ownership elsewhere

- `@carbonenginejs/runtime-resource` owns WEM, BNK, Ogg, and related format
  parsing and CPU conversion, plus logical/physical raw audio resources.
- `@carbonenginejs/tools-browser/audio` owns browser-safe audio-library
  construction, loading, enrichment, delivery probing, and adaptation to
  CjsResMan audio resources.
- `@carbonenginejs/tools-core` wraps that builder with exact-build
  acquisition, caches, provider indexing, prefetch, CLI/API, and Node HTTP
  routes.
- The application owns user-gesture timing, `AudioContext` construction,
  source credentials, URLs, and decoded-buffer policy.
- `@carbonenginejs/runtime-core` may compose an audio service, but does not
  absorb audio-domain event, bank, or playback semantics.
- A general resource manager may budget raw or converted resources, but does
  not interpret banks or resolve audio events.

## Environment contract

Importing either public entry is side-effect-free. Constructing
`CjsAudioSystem` remains headless until `Enable()` calls the supplied
`createContext` factory. Without a context, enablement fails safely and graph
events remain queued under the null-manager behavior.

The built-in backend is buffer-based. Complete encoded items become decoded
`AudioBuffer` values before playback. Long music and ambience require an
application-owned streaming engine; `loadMedia` is not a streaming contract.

## Data flow

```text
generated audio library or caller metadata
                    |
                    v
     host validation and source selection
                    |
          +---------+---------+
          |                   |
          v                   v
   event metadata        music graph
          |                   |
          v                   v
  CjsAudioSystem       CjsMusicEngine
          \                   /
           \                 /
            v               v
              CjsAudioBackend
                     |
                     v
               Web Audio graph
```

The host may use a generated library, static files, a local service, or another
provider. Runtime-audio consumes plain values and loader functions rather than
depending on one transport.

## Planned boundary

The approved `CjsAudioMan` direction installs one complete audio library and
owns media-variant selection and decode orchestration. It is not a current
export. See [Audio manager direction](concepts/audio-manager.md) for the
activation gates.

## Related documentation

- [Package documentation](README.md)
- [Browser playback guide](guides/browser-playback.md)
- [Current API reference](reference/api.md)
- [Carbon compatibility](reference/carbon-compatibility.md)
