# Runtime audio

Subpaths:
- `audio`: everything below plus the Web Audio realization;
- `audio/trinity`: Carbon graph classes and portable behavior, without
  evaluating the backend;
- `audio/audioMetadata`: `audioMetadataFromSoundbanksInfo()`;
- `audio/library`: library hydration plus audio-library, SFX-program and
  music-library validation/installation;
- `audio/library-builder`: document construction from decoded values or
  raw resources, kept out of ordinary bundles.

Every entry is browser-safe: import and construction do no DOM, fetch,
Node or device work. `Enable()` is the first point an AudioContext is
created; without one, enablement fails and the graph keeps Carbon's
null-manager behavior.

Realization is strict by default. Wwise behavior the browser cannot
reproduce faithfully is either omitted or admitted only through an explicit
host policy (see the `CjsAudioMan` constructor). A route the shared bus
mixer rejects stays audible on the legacy SFX or music path, with the
blocked authored bus stages omitted.

Not emulated: Wwise device enumeration and device-change callbacks, OS device
selection, profiler capture, audio-input source plug-ins, Web Audio rendering
of spatial-audio geometry or diffraction, and Wwise middleware rendering. The
Carbon methods for them stay on their classes with implementation metadata;
geometry data, settings and refcounts still reach an injected backend.

Playback imports the WEM format lazily, only when original WEM bytes need
preparing.

The application's SFX and music sliders are separate category gains
(`CjsAudioBackend.SetSfxVolume`, `CjsMusicEngine.SetMusicVolume`, through
`busMixer.SetCategoryVolume`). Bus Volume actions, Voice/Bus Volume RTPCs and
Bus Volume States never move them.

Owned elsewhere:
- WEM, BNK, Ogg parsing and CPU conversion: `runtime/resource`;
- exact-build acquisition, caches, prefetch, CLI and HTTP routes: tools-core,
  which calls `library-builder` with its own byte source;
- user-gesture timing, credentials, endpoints, whether to build or download
  the document, music-track delivery, and whether jukebox playback mixes with
  or replaces authored music: the application;
- `runtime/core` composes an audio-manager service without taking on audio
  semantics.

## SFX program playback

`CjsSfxEngine` resolves an installed `sfx` program into selections;
`CjsAudioBackend` schedules its actions and owns the voices. The document
shape and the per-kind validation rules live in `library/README.md`.

**Scheduling.** Every delayed action (Stop, Pause, Resume, property setters,
Game Parameter and fixed-delay Switch/State setters) enters one queue on the
AudioContext clock and runs from `RenderAudio()`. Equal times keep authored
order: actions sort by `(time, playing ID, action index, leaf index)`, so
Play then Stop at one time is stoppable and Stop then Play leaves the Play
intact. A delayed setter does not change earlier Play selection; when due it
updates the game object's Switch or the global State and wakes live
Continuous Switch sessions. An action-only program stays alive until its last
queued action runs. Stopping or finishing a playing ID drops its queued
actions.

**Stop, Pause, Resume.** `element` matches a voice whose `matchIds` contain
the target, so a Stop can reach a Sound through an Actor-Mixer; `all` and
`all-except` match every SFX voice in scope. An exception protects any voice
whose `matchIds` contain it. `game-object` scope is limited to the posting
emitter. Pauses stack per voice (and per pending selection): the voice resumes
only after as many Resumes. Pause fades over the transition, then stops the
disposable `AudioBufferSourceNode`; Resume starts a new source at the saved
position one render quantum later. Loops keep their wrapped offset; finite
repeats keep their remaining total time. A selection still loading when paused
stays silent until resumed. With an installed program, the program owns Stop
timing; `eventsStoppedBy` metadata then serves culling and inspection only.

**Voice and Bus properties.** Set/Reset Voice Volume, Voice Pitch and Voice
LPF/HPF store one contribution per target ID on the emitter's generation
(absolute replaces, relative adds to the interpolated value at action time,
Reset returns to 0, with the decoded Wwise curve over the transition). A
voice adds the contributions of every ID in its `matchIds` to authored, State
and RTPC values before the final clamp (gain ±200 dB, pitch ±2400 cents,
filter 0..100). The contributions never replace Play, Stop or crossfade fades,
emitter gain or distance gain. They reach playing voices and later posts, and
outlive the action-only playing ID. Filter All/All-Except act on the target
IDs already stored for that property, excluding exact exception IDs. A Set
Voice LPF/HPF anywhere in the graph gives matching leaves a neutral filter
stage, so a Set before Play still takes effect.

| Scope | Behaviour |
| --- | --- |
| `game-object` | Applies only while the posting emitter's generation is current. |
| `global` Voice Volume / Pitch | Every registered emitter generation. |
| `global` Voice LPF/HPF | Every registered generation, plus a global template copied into emitters registered later (with its running transition). |
| `global` Bus Volume | The global template, every registered generation, and retired generations that still have playing voices. |

`UnregisterGameObj()` retires a generation: its playing voices keep the
retired contributions and finish their transitions, and a later registration
starts neutral except for the global templates. Bus Volume actions apply on a
route gain stage after the voice gain, only for voices whose route contains
the target Bus. Bus-target Voice Volume (`set-bus-voice-volume`) is stored per
game object by Bus ID and applies on the voice gain of voices whose output Bus
is the target.

**Game Parameters.** Set writes the named object or global RTPC; relative adds
to the interpolated current value (object scope falls back to the global value,
then the catalog default); Reset writes the catalog default. A transition
continues after the posting ID completes and a later action rebases from its
current value. `SetRTPCValue()` / `SetGlobalRTPCValue()` first run overdue
queued actions, then cancel the running transition of that scope and name.
During program resolution an immediate Game Parameter action writes an
in-memory overlay, so it affects later Play actions in the same program and
leaves the stores untouched if resolution fails. `bypassTransition` is kept on
the stored transition but not applied.

**State properties.** `SetGlobalState()` changes the logical State at once.
Property offsets move over the directed custom duration for the from/to pair,
else the group default; an interrupted change rebases from the current blend,
and new voices join it. State names and numeric IDs resolve to one canonical
value when the transition catalog names them. An unset group or a State with
no authored case contributes 0.

**Voice limits.** A `voiceLimit` reserves its counter per game object when the
Play resolves, before media loads; a second selection of the same counter on
that object is rejected without loading media. Cancellation, failed loading,
Stop and natural completion release the reservation. A limited selection with
a positive delay throws, so a limit is never reserved early.

**Continuous containers.** Disabled and Delay advance after the whole selected
batch ends (Delay then waits its sampled duration). Trigger Rate arms the next
deadline from the batch's action time; a late `RenderAudio()` issues one
boundary at the current time and the next deadline follows from there, so
missed triggers are never replayed. Crossfade prepares the successor before the
boundary; the fade lasts the sampled duration clamped to half the outgoing
source and to its remaining time, linear for Amplitude and sine/cosine for
Power, and a speculative choice commits only once the successor is heard. A
nested completion barrier waits for every overlapping voice and pending load
before the outer clock advances. Break cancels pending and future selections,
stops looping, and lets playing voices finish their current iteration. Seek
skips voices under Trigger Rate or Crossfade slots.

**Custom RTPC adapter.** An `applyRTPC` callback receives one update for the
emitter's legacy nodes and one per exact route branch. A branch update carries
`busGraphRoute`, `gain` (spatial branch, with its `panner`) or `flatGain`
(flat branch).
