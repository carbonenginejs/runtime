# Audio realization class catalog

Status: Experimental  
Scope: `@carbonenginejs/runtime/audio` classes under `src/audio/`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for realization and music classes.

<!-- class:CjsAudioMan -->
## `CjsAudioMan`

Installs one complete audio-library document and owns media selection, delivery, preparation, decode retention, and the composed audio system.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsAudioMan.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsAudioSystem -->
## `CjsAudioSystem`

Audio system composition root: repository + manager + backend, attached to the graph seams.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsAudioSystem.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsJukebox -->
## `CjsJukebox`

Optional, neutral playlist player.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsJukebox.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMusicEngine -->
## `CjsMusicEngine`

Interactive-music engine over the extracted Wwise music graph.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsMusicEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsMusicEngineScheduledClip -->
## `CjsMusicEngineScheduledClip`

One retained music clip whose disposable Web Audio source may be resumed.

- Source: `src/audio/CjsMusicEngine.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsMusicEngineScheduledSegment -->
## `CjsMusicEngineScheduledSegment`

Owns the Web Audio sources, fade state, and route nodes for one scheduled music segment.

- Source: `src/audio/CjsMusicEngine.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:MusicInstance -->
## `MusicInstance`

One posted music event's selection, scheduling, and transport state.

- Source: `src/audio/CjsMusicEngine.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsSfxEngine -->
## `CjsSfxEngine`

Resolves authored SFX containers into one or more playable media selections.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsSfxEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsSfxEngineSelectionTransactionLedger -->
## `CjsSfxEngineSelectionTransactionLedger`

Owns speculative SFX selection leases, snapshots, and settlement.

- Source: `src/audio/CjsSfxEngine.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebAudioSoundEngine -->
## `CjsWebAudioSoundEngine`

WebAudio backend for the audio graph: emitter nodes, playing sources, listener pose.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsWebAudioSoundEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWwiseSoundEngineStub -->
## `CjsWwiseSoundEngineStub`

A headless `ICjsWwiseSoundEngine`: coherent state, no sound.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/CjsWwiseSoundEngineStub.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ICjsAudioGlobalReaders -->
## `ICjsAudioGlobalReaders`

The global RTPC and State values the shared bus mixer and the music engine read.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/ICjsAudioGlobalReaders.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ICjsMusicEngine -->
## `ICjsMusicEngine`

What `CjsWebAudioSoundEngine` and `CjsAudioSystem` call on a music engine.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/ICjsMusicEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ICjsSfxControls -->
## `ICjsSfxControls`

One SFX post's live evaluation context: what `CjsSfxEngine` and `CjsAudioMan` read and write while resolving and playing an event.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/ICjsSfxControls.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ICjsWwiseSoundEngine -->
## `ICjsWwiseSoundEngine`

What Carbon Audio (`AudManager`, `AudGameObjResource`, `AudGeometry` ...) calls on `AudGameObjResource.backend`.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/ICjsWwiseSoundEngine.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsBusDuckingController -->
## `CjsBusDuckingController`

Shared activity clock for Wwise Audio Bus auto-ducking.

- Source: `src/audio/internal/busDucking.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsSharedBusMixer -->
## `CjsSharedBusMixer`

Owns the shared Web Audio node topology for strictly qualified Bus routes.

- Source: `src/audio/internal/busGraphMixer.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsBusGraphRuntime -->
## `CjsBusGraphRuntime`

Owns stable, generation-scoped handles into one installed Audio Bus graph.

- Source: `src/audio/internal/busGraphRuntime.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendGlobalReaders -->
## `CjsAudioBackendGlobalReaders`

Reads global RTPC and State values from one `CjsWebAudioSoundEngine`.

- Source: `src/audio/internal/CjsAudioBackendGlobalReaders.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendSfxControls -->
## `CjsAudioBackendSfxControls`

Live SFX controls for one emitter's post, reading the backend's switch, state, RTPC and voice-property state for that game object.

- Source: `src/audio/internal/CjsAudioBackendSfxControls.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendSfxProgramBatch -->
## `CjsAudioBackendSfxProgramBatch`

Owns one overlapping Trigger-Rate or Crossfade batch within a program slot.

- Source: `src/audio/internal/CjsAudioBackendSfxProgramSlot.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendSfxProgramSlot -->
## `CjsAudioBackendSfxProgramSlot`

Owns one backend SFX program slot and its cancellation state.

- Source: `src/audio/internal/CjsAudioBackendSfxProgramSlot.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendSfxVoice -->
## `CjsAudioBackendSfxVoice`

Owns one realized SFX voice's authored, runtime, and Web Audio state.

- Source: `src/audio/internal/CjsAudioBackendSfxVoice.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioBackendSfxVoiceLimitLedger -->
## `CjsAudioBackendSfxVoiceLimitLedger`

Owns backend SFX voice-limit reservations and their owner/key invariants.

- Source: `src/audio/internal/CjsAudioBackendSfxVoiceLimitLedger.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioManSharedAcquisition -->
## `CjsAudioManSharedAcquisition`

Owns one shared acquisition, its caller leases, and orphan cancellation.

- Source: `src/audio/internal/CjsAudioManSharedAcquisition.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsSfxEngineRtpcOverlayControls -->
## `CjsSfxEngineRtpcOverlayControls`

A post's controls with the RTPC values a program's own Set Game Parameter actions have applied so far laid over them.

- Source: `src/audio/internal/CjsSfxEngineRtpcOverlayControls.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWwiseFilteredControl -->
## `CjsWwiseFilteredControl`

Owns one voice-local approximation of a filtered Wwise control timeline.

- Source: `src/audio/internal/sourceEffectRtpc.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWwiseSourceEffectRtpcLane -->
## `CjsWwiseSourceEffectRtpcLane`

Owns live AudioParam bindings for one realized source-effect chain.

- Source: `src/audio/internal/sourceEffectRtpc.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:WwiseRoomVerbReader -->
## `WwiseRoomVerbReader`

Sequential little-endian reader for one exact v150 RoomVerb payload.

- Source: `src/audio/internal/wwiseRoomVerb.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilder -->
## `CjsAudioLibraryBuilder`

Builds a deterministic schema-v2 audio-library document from caller-supplied values and bank access.

- Export: `@carbonenginejs/runtime/audio/library-builder`
- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderBankInspectionSession -->
## `CjsAudioLibraryBuilderBankInspectionSession`

Owns ordered bank inspection and its coupled projections.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderBusGraphConstructionSession -->
## `CjsAudioLibraryBuilderBusGraphConstructionSession`

Owns Wwise Bus graph qualification, route interning, and projection.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderSfxEventLoweringSession -->
## `CjsAudioLibraryBuilderSfxEventLoweringSession`

Owns recursive SFX event lowering, publication, and diagnostics.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderSfxNameCatalogAccumulator -->
## `CjsAudioLibraryBuilderSfxNameCatalogAccumulator`

Owns ordered Wwise name and default-value catalog accumulation.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderSfxNodeLoweringSession -->
## `CjsAudioLibraryBuilderSfxNodeLoweringSession`

Owns recursive SFX node lowering, memoized summaries, and synthetic IDs.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibraryBuilderWwiseNodeBaseAncestry -->
## `CjsAudioLibraryBuilderWwiseNodeBaseAncestry`

Traces and caches mechanical Wwise NodeBase parent ancestry.

- Source: `src/audio/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsAudioLibrary -->
## `CjsAudioLibrary`

Immutable hydrated audio-library value with the shared model export seam.

- Export: `@carbonenginejs/runtime/audio`
- Source: `src/audio/library/CjsAudioLibrary.js`
- Visibility: Public
- Kind: CarbonEngineJS
