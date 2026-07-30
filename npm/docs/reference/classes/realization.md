# Audio realization class catalog

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio` classes under `src/`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for realization and music classes.

<!-- class:CjsAudioBackend -->
## `CjsAudioBackend`

Realizes Carbon audio graph operations as Web Audio nodes and active playback sources.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsAudioBackend.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsAudioMan -->
## `CjsAudioMan`

Installs one complete audio-library document and owns media selection, delivery, preparation, decode retention, and the composed audio system.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsAudioMan.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsAudioLibraryBuilder -->
## `CjsAudioLibraryBuilder`

Builds a deterministic schema-v2 audio-library document from caller-supplied values and bank access.

- Export: `@carbonenginejs/runtime-audio/library-builder`
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsAudioSystem -->
## `CjsAudioSystem`

Composes repository, manager, backend, graph adoption, and optional music behavior for one audio owner.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsAudioSystem.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsMusicEngine -->
## `CjsMusicEngine`

Schedules an authored interactive-music graph against decoded Web Audio buffers.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsMusicEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsJukebox -->
## `CjsJukebox`

Plays an optional neutral music-library playlist through caller-supplied browser acquisition.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsJukebox.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:CjsSfxEngine -->
## `CjsSfxEngine`

Resolves an optional authored SFX program into media voices and live RTPC gains.

- Export: `@carbonenginejs/runtime-audio`
- Source: `src/CjsSfxEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS original

<!-- class:MusicInstance -->
## `MusicInstance`

Tracks the scheduling, playlist, source, and fade state of one active music event.

- Export: None
- Source: `src/CjsMusicEngine.js`
- Visibility: Internal
- Kind: Internal implementation class
