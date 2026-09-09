# Runtime audio architecture

Status: Evolving  
Scope: `@carbonenginejs/runtime/audio`
Audience: Runtime authors, application integrators, and maintainers  
Summary: Defines audio graph, document, builder, provider, and realization ownership.

## Purpose

Carbon audio state and portable behavior work without a device; browser
playback attaches explicitly. Graph and realization share one package because
event, bank, emitter, culling, source-selection, decode, and music lifecycles
form one domain contract.

## Dependency direction

```text
                    global
                    |
                    v
               audio/trinity
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
The builder resolves supplied version-150 NodeBase and Actor-Mixer inheritance;
its [document contract](reference/api.md#complete-document) and
[compatibility ledger](reference/carbon-compatibility.md#compatibility-ledger)
define qualified SFX projections and browser realization limits.

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
- schema-v2 document validation and detached installation;
- deterministic document construction from decoded inputs, raw indexed
  resources through fetch, or one injected byte source;
- language/media representation selection;
- individual-file, whole-original-file, and exact-range delivery;
- WEM preparation, browser decoding, pending-work deduplication, and explicit
  decoded/source-byte cache release;
- graph adoption and release through the composed `CjsAudioSystem`; and
- Web Audio playback, HRTF positioning, authored dry-volume distance curves,
  gain, seek, fades, completion, and an optional fixed obstruction/occlusion
  approximation.

`CjsAudioMan` is the public composition root. It receives one complete
document and one structural media provider. It composes `CjsAudioSystem`, which
owns `AudManager`, `AudStaticDataRepository`, `CjsAudioBackend`, and optional
`CjsMusicEngine`. Specialized integrations may use `CjsAudioSystem` directly
or supply a compatible music engine. A general resource manager need not
interpret audio events or banks.

## Ownership elsewhere

- `@carbonenginejs/runtime/resource` owns WEM, BNK, Ogg, and related format
  parsing and CPU conversion.
- `@carbonenginejs/tools-core` calls the runtime-owned builder and adds
  exact-build acquisition, caches, provider indexing, prefetch, CLI/API, and
  HTTP routes.
- The application owns user-gesture timing, credentials, endpoint selection,
  and the decision to download, import, build, or request the complete
  document. It also owns neutral music-track delivery and decides whether
  jukebox playback mixes with or replaces authored dynamic music.
- `@carbonenginejs/runtime/core` composes an audio-manager service but does not
  absorb audio-domain semantics.

The three data-only generated class identities live under
`src/audio/generated`. Tools-core owns their source-generation process; this
runtime contains the reviewed outputs and never imports generator inputs.

## Environment contract

All public runtime entries are browser-safe. Import and ordinary construction
perform no DOM, fetch, Node, or device work. Explicit
[builder/loading calls](reference/api.md#builder) may fetch caller-selected
resources; browser playback requires no Node service. `Enable()` is the first
point at which the supplied/default context factory may create an `AudioContext`.
Without a usable context, enablement fails safely and graph events retain
Carbon's null-manager behavior.

The optional neutral music library is a separate `CjsAudioMan` input, not a
Wwise graph section. `CjsJukebox` sends selected song records to an injected
loader, decodes bytes with the browser context, and uses an injected
availability probe. It neither synthesizes Wwise events nor replaces
`CjsMusicEngine`; see [Optional jukebox](guides/jukebox.md).

## Related documentation

- [Browser playback guide](guides/browser-playback.md)
- [Authored SFX programs](guides/sfx.md)
- [Optional jukebox](guides/jukebox.md)
- [API reference](reference/api.md)
- [Carbon compatibility](reference/carbon-compatibility.md)
