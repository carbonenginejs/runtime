# Runtime audio architecture

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Runtime authors, application integrators, and maintainers  
Summary: Defines audio graph, document, builder, provider, and realization ownership.

## Purpose

`runtime-audio` keeps Carbon audio state and portable behavior usable without a
device while allowing a browser application to attach playback explicitly.
The graph and realization share one package because event, bank, emitter,
culling, source-selection, decode, and music lifecycles form one audio-domain
contract.

## Dependency direction

```text
               runtime-utils
                    |
                    v
        runtime-audio/trinity
                    |
                    v
              CjsAudioMan
             /           \
            v             v
   CjsAudioSystem     media provider
            |
            v
     Web Audio backend
```

The `./trinity` entry exports Carbon graph classes and does not evaluate the
Web Audio backend. The root entry adds `CjsAudioMan`, the lower-level
`CjsAudioSystem`, backend, metadata adapter, SFX interpreter, and music
scheduler without creating a device during import.

The optional `./library-builder` entry is separate so builder-only BNK/HIRC
construction code is absent from ordinary runtime bundles. Playback keeps its
WEM format import lazy until original WEM bytes actually need preparation.
When asked to construct authored SFX from banks, the builder resolves raw
version-150 NodeBase and Actor-Mixer inheritance supplied by
`runtime-resource` and projects qualified per-leaf positioning, dry-volume
distance curves, event culling metadata, and complete effective static
Sound-local Parametric EQ/Wwise Delay overrides into the final document. It
also follows
qualified static Wwise Silence sources to their referenced effect parameters;
the browser realizes their finite lifecycle with one constant-memory silent
carrier rather than treating them as media or empty graph branches.

## Owned responsibilities

The package owns:

- Carbon `Aud*`, `Tr2Audio*`, audio-geometry, action-log, placement, and
  spatial-settings classes;
- emitter, listener, event, bank, RTPC, switch, culling, and music behavior;
- optional neutral catalog validation and direct playlist playback through
  caller-owned track acquisition and availability functions;
- optional authored SFX random, step-sequence, continuous scheduling and
  crossfades, switch/state, parallel/blend, per-leaf spatial routing, gain,
  and live RTPC-curve behavior;
- immutable schema-v2 document validation and installation;
- language/media representation selection;
- individual-file, whole-original-file, and exact-range delivery;
- WEM preparation, browser decoding, pending-work deduplication, and explicit
  decoded/source-byte cache release;
- graph adoption and release through the composed `CjsAudioSystem`; and
- Web Audio playback, HRTF positioning, authored dry-volume distance curves,
  gain, seek, fades, completion, and an optional fixed obstruction/occlusion
  approximation.

`CjsAudioMan` is the public composition root. It receives one complete
document and one structural media provider. `CjsAudioSystem` remains available
as the lower-level graph/backend composition used by the manager.

## Ownership elsewhere

- `@carbonenginejs/runtime-resource` owns WEM, BNK, Ogg, and related format
  parsing and CPU conversion.
- `@carbonenginejs/tools-browser/audio` optionally acquires remote documents,
  builder inputs, complete files, and ranges. It neither builds nor interprets
  the installed library.
- `@carbonenginejs/tools-core` calls the runtime-owned builder and adds
  exact-build acquisition, caches, provider indexing, prefetch, CLI/API, and
  HTTP routes.
- The application owns user-gesture timing, credentials, endpoint selection,
  and the decision to download, import, build, or request the complete
  document. It also owns neutral music-track delivery and decides whether
  jukebox playback mixes with or replaces authored dynamic music.
- `@carbonenginejs/runtime-core` composes an audio-manager service but does not
  absorb audio-domain semantics.

## Environment contract

All public runtime entries are browser-safe. Import and construction perform
no DOM, fetch, Node, or device work. `Enable()` is the first point at which the
supplied/default browser context factory may create an `AudioContext`.
Without a usable context, enablement fails safely and graph events retain
Carbon's null-manager behavior.

## Data flow

```text
complete schema-v2 document
             |
             v
        CjsAudioMan
      /              \
     v                v
selection       SFX/event/music graph
     |                |
     v                v
media provider   CjsAudioSystem
     \                /
      \              /
       v            v
    prepare/decode -> CjsAudioBackend
```

The host may use a packaged artifact, a complete API result, the optional
builder, or another source. Runtime-audio does not care how the document was
obtained. Provider calls receive exact document records and request either an
individual file, a complete original file, or one exact byte range.

The optional neutral music library is a second input to `CjsAudioMan`, not a
Wwise graph section. `CjsJukebox` passes its selected song record to the
injected loader and decodes returned bytes with the realized browser context.
It does not synthesize events or replace `CjsMusicEngine`. A separate injected
probe lets the host hide or disable URLs that are not currently reachable.

## Related documentation

- [Audio manager contract](concepts/audio-manager.md)
- [Browser playback guide](guides/browser-playback.md)
- [Authored SFX programs](guides/sfx.md)
- [Optional jukebox](guides/jukebox.md)
- [API reference](reference/api.md)
- [Carbon compatibility](reference/carbon-compatibility.md)
