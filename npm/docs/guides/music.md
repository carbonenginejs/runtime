# Use authored or custom music

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Browser application authors and audio integrators  
Summary: Describes the two supported music-engine integration paths and their lifecycle.

## Purpose

Runtime-audio can schedule a tools-generated authored music graph or delegate
music playback to an application-owned engine. Both paths join the same master
destination and event-routing lifecycle.

## Authored graph

Supply the library's `music` section and a loader that returns complete decoded
buffers for graph source IDs:

```js
import {
    CjsAudioSystem
} from "@carbonenginejs/runtime-audio";

const audio = new CjsAudioSystem({
    createContext: () => new AudioContext(),
    musicGraph,
    loadMedia: async (sourceID, track) =>
        loadDecodedMusicBuffer(sourceID, track)
});
```

The built-in `CjsMusicEngine` supports every playable target on an authored
Play event under one public playing ID, authored stops, sequence and
weighted-random playlists, switch and state decisions, segment cue scheduling,
inherited or overridden meter settings, transition boundaries, and
source/destination fade timing and offsets. Linear fades use Web Audio ramps;
the other Wwise interpolation IDs use sampled browser-safe approximations.
Natural playlist transitions apply their bottom-to-top transition matrix,
including long source/destination fades and pre-entry/post-exit flags.
Transition-segment bridges retain their fade envelopes and authored
pre-entry/post-exit windows. Exact nested switch routes are retained:
when two associations select the same music object, `continuePlayback: true`
preserves its iterator and timeline, while `false` restarts it at the
authored transition boundary. Reapplying the currently selected route is
always a no-op. A nested association change uses that nested container's
transition matrix and matches its directly selected child IDs, even when
those children are themselves switch containers. Wwise `Nothing`
associations use explicit ID zero and do not match `Any`; their rules also
apply when playback first enters a target from silence.

Builder-produced music tracks retain their effective v150 dry-output route as
an ordered bus ancestry. Each scheduled track owns a route gain upstream of
segment transitions and downstream of source playback. Authored base Bus
Volume, any bus Make-Up Gain on that dry ancestry, and live Set/Reset Bus
Volume contributions add there. The NodeBase that supplies the effective output
bus also contributes its separate Output Bus Volume; values on descendants
without an output-bus override do not apply. The
application music slider remains an independent downstream control.

The library builder identifies authored music by typed Play/Stop targets and
music argument groups across every selected bank. Event names do not need a
`music_` prefix and event actions do not need to live in `common.bnk`. When one
authored Wwise event contains both SFX and music actions, runtime-audio starts
both sides under one playing ID and reports completion after both have ended.

The source graph may preserve data that the current scheduler does not play.
Stingers, Musical Instrument Digital Interface (MIDI) tracks, Synth One
tracks, and RTPC volume curves remain unsupported.

## Custom engine

For streaming, arbitrary user music, or another playback model, provide a
synchronous gesture-time factory:

```js
import {
    CjsAudioSystem
} from "@carbonenginejs/runtime-audio";

const audio = new CjsAudioSystem({
    createContext: () => new AudioContext(),
    createMusicEngine: ({ context, destination }) =>
        new ApplicationMusicEngine({ context, destination })
});

audio.Attach();
audio.Enable();

const playingID = audio.PostMusicEvent("play_example");
```

A custom engine implements `HandlesEvent`, `PostEvent`, `ExecuteAction`,
`Process`, and `Dispose`. Switch, state, volume, play-position, and seek methods
are optional capabilities. `PostEvent` calls its completion callback exactly
once.

`PostMusicEvent` intentionally bypasses the Carbon event catalog so
application-owned event names do not require synthetic Wwise metadata.

## Cache and cleanup

The built-in engine caches decoded buffers by source ID. Use
`ReleaseMusicMedia(sourceID)` or `ClearMusicMedia()` to release inactive
entries. `SetGraph()` and `Dispose()` cancel stale scheduling and clear
graph-owned cache state. When the engine is owned by `CjsAudioMan`, effective
provider, delivery-mode, and language changes also clear its retained music
media so a later post resolves against the new configuration.

Active `AudioBufferSourceNode` objects retain their buffers until playback
finishes. Cache release changes future reuse, not an already playing source.

## Related documentation

- [Browser playback guide](browser-playback.md)
- [Architecture and boundaries](../architecture.md)
- [Audio manager direction](../concepts/audio-manager.md)
