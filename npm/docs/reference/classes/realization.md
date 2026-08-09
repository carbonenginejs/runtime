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

<!-- class:CjsAudioBackendSfxProgramBatch -->
## `CjsAudioBackendSfxProgramBatch`

Owns one overlapping Trigger-Rate or Crossfade batch within a program slot.

- Export: None
- Source: `src/internal/CjsAudioBackendSfxProgramSlot.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioBackendSfxProgramSlot -->
## `CjsAudioBackendSfxProgramSlot`

Owns one backend SFX program slot and its cancellation state.

- Export: None
- Source: `src/internal/CjsAudioBackendSfxProgramSlot.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioBackendSfxVoice -->
## `CjsAudioBackendSfxVoice`

Owns one realized SFX voice's authored, runtime, and disposable Web Audio state.

- Export: None
- Source: `src/internal/CjsAudioBackendSfxVoice.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioBackendSfxVoiceLimitLedger -->
## `CjsAudioBackendSfxVoiceLimitLedger`

Owns backend SFX voice-limit reservations and their owner/key invariants.

- Export: None
- Source: `src/internal/CjsAudioBackendSfxVoiceLimitLedger.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioManSharedAcquisition -->
## `CjsAudioManSharedAcquisition`

Owns one shared acquisition, its caller leases, and orphan cancellation.

- Export: None
- Source: `src/internal/CjsAudioManSharedAcquisition.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsBusDuckingController -->
## `CjsBusDuckingController`

Coordinates transport-driven Wwise Audio Bus ducking activity shared by SFX and music routes.

- Export: None
- Source: `src/internal/busDucking.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsBusGraphRuntime -->
## `CjsBusGraphRuntime`

Owns stable generation-scoped route handles for one installed Wwise Audio Bus graph.

- Export: None
- Source: `src/internal/busGraphRuntime.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsSharedBusMixer -->
## `CjsSharedBusMixer`

Owns fail-closed shared Web Audio topology, qualified effect placement, explicit Meter telemetry omission, dynamic voice-limit route policy, and transparent-path admission of complete distributed Bus controls.

- Export: None
- Source: `src/internal/busGraphMixer.js`
- Visibility: Internal
- Kind: Internal implementation class

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

<!-- class:CjsAudioLibraryBuilderBankInspectionSession -->
## `CjsAudioLibraryBuilderBankInspectionSession`

Owns ordered bank inspection and its identity and embedded-media projections.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioLibraryBuilderBusGraphConstructionSession -->
## `CjsAudioLibraryBuilderBusGraphConstructionSession`

Owns Wwise Bus graph qualification, route interning, and projection.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioLibraryBuilderSfxEventLoweringSession -->
## `CjsAudioLibraryBuilderSfxEventLoweringSession`

Owns recursive SFX event lowering, publication, and diagnostics.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioLibraryBuilderSfxNameCatalogAccumulator -->
## `CjsAudioLibraryBuilderSfxNameCatalogAccumulator`

Owns ordered Wwise name and default-value catalog accumulation.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioLibraryBuilderSfxNodeLoweringSession -->
## `CjsAudioLibraryBuilderSfxNodeLoweringSession`

Owns recursive SFX node lowering, memoized summaries, and synthetic IDs.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:CjsAudioLibraryBuilderWwiseNodeBaseAncestry -->
## `CjsAudioLibraryBuilderWwiseNodeBaseAncestry`

Traces and caches mechanical Wwise NodeBase parent ancestry.

- Export: None
- Source: `src/library-builder/CjsAudioLibraryBuilder.js`
- Visibility: Internal
- Kind: Internal implementation class

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

<!-- class:CjsMusicEngineScheduledSegment -->
## `CjsMusicEngineScheduledSegment`

Owns the Web Audio sources, fades, routes, and cleanup for one scheduled music segment.

- Export: None
- Source: `src/CjsMusicEngine.js`
- Visibility: Internal
- Kind: Internal implementation class

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

<!-- class:CjsSfxEngineSelectionTransactionLedger -->
## `CjsSfxEngineSelectionTransactionLedger`

Owns speculative SFX selection leases, snapshots, and settlement.

- Export: None
- Source: `src/CjsSfxEngine.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:MusicInstance -->
## `MusicInstance`

Tracks selection, scheduling-frontier, and browser-transport state for one active music event.

- Export: None
- Source: `src/CjsMusicEngine.js`
- Visibility: Internal
- Kind: Internal implementation class
