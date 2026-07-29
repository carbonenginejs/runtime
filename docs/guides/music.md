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

The built-in `CjsMusicEngine` supports authored event targets and stops,
sequence and weighted-random playlists, switch and state decisions, segment
cue scheduling, transition boundaries, linear source/destination fade timing
and offsets, and transition-segment bridges with their fade envelopes and
authored pre-entry/post-exit windows.

The source graph may preserve data that the current scheduler does not play.
Stingers, Musical Instrument Digital Interface (MIDI) tracks, Synth One
tracks, RTPC volume curves, and non-linear fade curves remain unsupported.

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
graph-owned cache state.

Active `AudioBufferSourceNode` objects retain their buffers until playback
finishes. Cache release changes future reuse, not an already playing source.

## Related documentation

- [Browser playback guide](browser-playback.md)
- [Architecture and boundaries](../architecture.md)
- [Audio manager direction](../concepts/audio-manager.md)
