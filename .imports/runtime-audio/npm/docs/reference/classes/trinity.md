# Carbon audio graph class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio/trinity` classes under `src/trinity/`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for maintained Carbon audio graph classes.

<!-- class:AudActionLogCB -->
## `AudActionLogCB`

Queues Carbon-shaped audio action records and flushes them to a registered JavaScript callback during manager processing.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudActionRecord -->
## `AudActionRecord`

Provides the base value contract for one queued Carbon audio action.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudActionRecordPostEvent -->
## `AudActionRecordPostEvent`

Records one event post with time, emitter, playing, event, and name identities.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudActionRecordExecuteActionOnPlayingID -->
## `AudActionRecordExecuteActionOnPlayingID`

Records one stop or break action applied to a playing identity.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudActionRecordSetSwitch -->
## `AudActionRecordSetSwitch`

Records one emitter-local switch group and state change.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudActionRecordSetState -->
## `AudActionRecordSetState`

Records one global audio state-group change.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudActionRecordSetRTPC -->
## `AudActionRecordSetRTPC`

Records one global or emitter-local real-time parameter change.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudActionLog.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudEmitter -->
## `AudEmitter`

Represents the concrete content-facing audio emitter with authored placement and attenuation controls.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudEmitter.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudGeometry -->
## `AudGeometry`

Maintains Carbon geometry-set reference counts and routes Wwise-shaped geometry lifecycle values to an optional browser backend.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudGeometry.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudEventCurve -->
## `AudEventCurve`

Fires authored audio events as playback time crosses ordered event keys.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudEventCurve.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudEventKey -->
## `AudEventKey`

Stores one authored event name and time for an audio event curve.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudEventKey.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudGameObjResource -->
## `AudGameObjResource`

Maintains per-object event, RTPC, switch, placement, and culling state for Carbon audio objects.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudGameObjResource.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudListener -->
## `AudListener`

Represents the fixed Carbon listener and its effective orientation and position.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudListener.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudManager -->
## `AudManager`

Coordinates audio lifecycle, banks, global controls, culling, and caller-supplied obstruction/occlusion.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudManager.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudMusicPlayer -->
## `AudMusicPlayer`

Provides the fixed high-priority Carbon emitter dedicated to music events.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudMusicPlayer.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudObstructionOcclusion -->
## `AudObstructionOcclusion`

Owns Carbon's caller-supplied per-emitter obstruction/occlusion fade and backend-delivery lifecycle.

- Export: None
- Source: `src/trinity/audio/AudObstructionOcclusion.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:AudParameter -->
## `AudParameter`

Binds an authored real-time parameter value to its owning audio game object.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudParameter.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudPosition -->
## `AudPosition`

Stores browser-safe front, top, and position vectors for Carbon placement-observer updates.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudPosition.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudSettings -->
## `AudSettings`

Stores Carbon audio path, language, device-name, and spatial-audio settings.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudSettings.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:AudStaticDataRepository -->
## `AudStaticDataRepository`

Indexes event, bank, attenuation, culling, and media-membership metadata for portable audio behavior.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudStaticDataRepository.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudUIPlayer -->
## `AudUIPlayer`

Provides the fixed Carbon UI emitter with dialogue seek and completion callbacks.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudUIPlayer.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:AudioCurveSetDriver -->
## `AudioCurveSetDriver`

Drives a curve set's time from a monitored real-time parameter with a fallback curve.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/AudioCurveSetDriver.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:EmitterState -->
## `EmitterState`

Retains obstruction, occlusion, and retry state for one registered emitter.

- Export: None
- Source: `src/trinity/audio/AudObstructionOcclusion.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:FadingValue -->
## `FadingValue`

Advances one normalized obstruction or occlusion value towards its target.

- Export: None
- Source: `src/trinity/audio/AudObstructionOcclusion.js`
- Visibility: Internal
- Kind: Internal implementation class

<!-- class:SoundPrioritization -->
## `SoundPrioritization`

Ranks audio game objects and keeps the configured highest-priority set awake.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/SoundPrioritization.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:StretchAudio -->
## `StretchAudio`

Positions source, destination, and stretch emitters along one listener-relative beam segment.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/StretchAudio.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:SpatialAudioSettings -->
## `SpatialAudioSettings`

Retains Carbon spatial-audio initialization defaults and getter/setter semantics for manager and injected-backend use.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/audio/SpatialAudioSettings.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2AudioStretchAuto -->
## `Tr2AudioStretchAuto`

Adds authored impact, outburst, and stretch event triggers to a three-emitter audio stretch.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/trinityAudio/Tr2AudioStretchAuto.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2AudioStretchBase -->
## `Tr2AudioStretchBase`

Creates and updates the three Carbon emitters used by a Trinity audio stretch.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/trinityAudio/Tr2AudioStretchBase.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2AudGeometryData -->
## `Tr2AudGeometryData`

Stores vertices, indices, and bounds for Carbon audio geometry data.

- Export: `@carbonenginejs/runtime-audio/trinity`
- Source: `src/trinity/trinityAudioApi/Tr2AudGeometryData.js`
- Visibility: Public
- Kind: Faithful Carbon port
