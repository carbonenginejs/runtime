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

Authored SetSwitch and SetState events retain deterministic fixed delays. An
immediate setter still updates the music decision before a same-post Play;
a delayed setter stays live on the AudioContext clock, leaves the initial
selection unchanged, and reevaluates every live music instance only when due.
Setter-only posts complete after their last action, and stopping their playing
ID cancels pending changes. The qualified v150 EVE shape has no delay
randomizer, probability, transition time, or extra setter property; those
broader forms remain fail-closed.

Builder-produced music tracks retain their effective v150 dry-output route as
an ordered bus ancestry. Each scheduled track owns a route gain upstream of
segment transitions and downstream of source playback. Authored base Bus
Volume, any bus Make-Up Gain on that dry ancestry, and live Set/Reset Bus
Volume contributions add there. The NodeBase that supplies the effective output
bus also contributes its separate Output Bus Volume; values on descendants
without an output-bus override do not apply. The
application music slider remains an independent downstream control.

When the installed `busGraph` route passes the strict shared-mixer
qualification, music keeps two route-local envelope stages before entering its
stable music category input. Each exact route in a scheduled segment owns its
own transition lane, while overlapping segments on the same route share only an
instance lane for Play/Stop fades. This preserves switch, playlist, and
transition-segment crossfades without merging different Bus routes. A blocked
track stays on the legacy segment, instance, and music-output gains; both paths
receive the application music volume exactly once. Route lanes are established
before asynchronous clip loading, so a late decoded buffer cannot bypass an
already scheduled fade.

If that shared route contains qualified static Parametric EQ and Wwise Delay
slots, its instance lane enters one ordered effect chain per physical Bus after
all route and transition envelopes. One fader after each Bus's effects combines
that Bus's static Bus Volume, global Bus Volume RTPC, and Immediate State gain.
Make-Up Gain, effective NodeBase Output Bus Volume, ducking, and live Bus Volume
actions stay on the route-local gain, so per-instance controls are not merged.
Multiple music instances and SFX entries therefore share the same Bus effect
nodes, including one shared delay line and feedback tail. A blocked or missing
graph keeps the legacy Parametric EQ `busEffects` fallback between the track
route gain and segment gain. The source-proven v150 fields and placement are
exact, while Web Audio biquads and delay primitives remain browser adaptations
rather than native Wwise DSP. EVE build 3444265 has no music route through its
seven static Delay instances.

With `wwiseDynamics: "approximate-web-audio"`, eligible static Wwise
Compressor and Peak Limiter slots may also enter the shared path. Their bus
placement and order are retained, while Web Audio detector, envelope,
lookahead, channel, ratio, and automatic-makeup behavior are documented
approximations. The default `"strict"` policy leaves them blocked from shared
routing; the music track still uses its audible legacy path with those authored
dynamics omitted.

An effect-free or feedback-free-Meter route may likewise enter the shared path.
Qualification requires matching installed catalogs and live readers for every
dynamic Bus-fader contribution. An Audio Bus Voice Volume RTPC keeps a music
route out of the shared mixer because the bus-level per-voice stage is not
realized for music; it is never reinterpreted as Bus Volume. EVE build 3444265
qualifies 2,349 music-track references: two effect-free tracks plus 2,347 whose
only additional barrier was the static send to a return proven silenced at
`-96 dB`. The mixer allocates no wet nodes for that omission. Routes that cross
an audible effect with Voice Volume, State filter/pitch, ducking, or action
controls remain blocked.

A source-proven v150 Wwise Meter may coexist in that sequence by default only
when it writes no Game Parameter, does not apply downstream volume, and has no
dynamic controls or media. The mixer omits this audio-transparent telemetry
stage. Explicit `wwiseMeterFeedback: "omit-telemetry"` also admits the static
signal-transparent subset with a Game Parameter target, but produces no Meter
value and therefore omits any authored audio feedback through that parameter.
Downstream-volume Meter remains blocked.

Dynamic Audio Bus `MaxNumInstances` RTPC paths remain blocked by default.
`wwiseVoiceLimits: "ignore"` may admit an otherwise qualified music route, but
does not enforce the changing voice count, stealing, or virtual-voice policy.
Both policies affect shared-route qualification; the legacy music path remains
the audible fallback when a route is rejected.

Version-2 `busStates` also provisions routed LPF and HPF stages for built-in
music. Signed State offsets accumulate across the bus ancestry under the
project's qualified additive filter behavior, blend with the shared STMG
timeline, and clamp once before Wwise cutoff conversion. Audio Bus Pitch is
intentionally ignored for music, matching Wwise; it does not alter clip rate,
cue timing, or the interactive-music schedule.

The library builder identifies authored music by typed Play/Stop targets and
music argument groups across every selected bank. Event names do not need a
`music_` prefix and event actions do not need to live in `common.bnk`. When one
authored Wwise event contains both SFX and music actions, runtime-audio starts
both sides under one playing ID and reports completion after both have ended.

Music Track property-0 Voice Volume RTPCs are preserved when the v150 record
uses a Game Parameter control, additive accumulation, and Wwise dB scaling.
Each track owns a pre-bus gain stage, so different tracks on one output route
remain independent. The stage reads the global Game Parameter lane, falls back
to the authored STMG default when present, evaluates the serialized Wwise
interpolation, and follows scheduled global RTPC transitions on the audio
clock. It is a track-local browser realization rather than a Bus Volume
reinterpretation. As with other authored automation, non-linear Wwise
interpolation is sampled
into browser-safe value curves. EVE build 3453885 contains five such tracks;
they are reached by `music_eve_dynamic_play` and
`music_switch_zarzakh_zone_damage`.

The source graph may preserve data that the current scheduler does not play.
Stingers, Musical Instrument Digital Interface (MIDI) tracks, Synth One
tracks, and Music Track RTPC properties outside the qualified Voice Volume
shape remain unsupported.

Authored Wwise music Pause/Resume playback remains a scheduler barrier. The
portable music graph does retain the seven fully qualified actions in EVE
build 3453885, in authored event order: five element/game-object actions for
dynamic, cemetery, and login music plus the global-named pair whose authored
mode is all music on the posting game object. The retained records preserve
target, mode, curve, action flags, and the 1, 2, 7, or 10 second transition.
The metadata-only `music_login_resume` Event has no action and therefore has no
program.

The browser scheduler does not execute those programs yet. Wwise Resume
continues the paused musical timeline; the UI transport instead recreates
sources at an item entry cue. Reusing that extension would be audibly
incorrect. Runtime execution remains blocked until layered clip offsets,
playlist iterators, pending media and switch preparations, and active musical
fade progress can be frozen and restored.

The MIDI omission is a fidelity gap rather than dead data. The shipping native
client links the Wwise Synth One source plug-in, so those MIDI clips are
audible synthesized layers in the original, not unused authoring residue.
Anything comparing this package's music output against the native client
should expect those layers to be missing rather than treat their absence as
evidence the data is inert.

## Demo examples

After starting the package demo and enabling Audio, use **Authored music >
Example** to play one verified EVE event for each browser-playable behavior:

- a direct Music Segment;
- Sequence Continuous, Sequence Step, Random Continuous, and Random Step
  playlists;
- Random and Sequence Music Tracks;
- the nested dynamic switch/state graph; and
- a transition-segment bridge.

Choose an example and press **play**. While authored music owns the demo
transport, **previous**, **next**, and **random** choose audio inside the
currently selected example: a leaf Music Segment or one of a Random/Sequence
Music Track's authored subtracks. The Example selector does not move. A direct
segment or fixed one-item playlist therefore greys all three selection actions.

These controls are an explicit browser transport extension, not Wwise event
actions. Selecting an item applies a short crossfade, restarts that item at its
entry cue, and then starts a fresh traversal of the authored playlist. Playlist
random/shuffle history therefore restarts; an explicitly selected Sequence
Music Track continues from the following subtrack. The controls do not seek
within decoded media. When one segment layers several selectable
tracks, the controls advance them along a bounded coordinated path rather than
materializing the potentially enormous Cartesian product; automatic playback
still makes each authored Wwise choice independently. **Pause** similarly fades the current scheduled
item because Web Audio buffer sources cannot be suspended individually;
pressing **play** replays the retained item from its entry cue rather than its
exact sample position. The transport greys actions that are not currently
applicable.

The authored panel always obtains its audio from the SoundBank graph and WEM
delivery path. A bank WEM can contain the same recording as an external classic
soundtrack file, so the two panels may sound identical without sharing a
runtime source or substituting one delivery path for the other.

The Dynamic switch graph also
enables the **Dynamic mood** selector, which posts EVE's authored setter events
while the graph is running. The demo deliberately omits MIDI, Synth One,
stingers, and destinations without WEM media records because the built-in
browser scheduler cannot currently render them.

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
