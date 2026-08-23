# Play audio in a browser

Status: Experimental  
Scope: `@carbonenginejs/runtime/audio`
Audience: Browser application authors  
Summary: Installs a complete document and attaches a caller-owned browser provider.

## Example

This example supplies an `AudioBuffer` directly. A real provider may return
prepared Ogg/WAV bytes, original WEM bytes, a complete BNK, or an exact BNK
range.

```js
import {
    CjsAudioMan
} from "@carbonenginejs/runtime/audio";

const document = {
    schema: "carbonenginejs.audioLibrary",
    schemaVersion: 2,
    metadata: {
        Events: {
            ui_click: {
                eventID: 1,
                maxRadiusAttenuation: 0,
                isLoop: 0,
                is2D: 1,
                isVital: 0,
                eventsStoppedBy: [],
                soundbanks: [ "ui.bnk" ]
            }
        },
        SoundBanks: {
            "ui.bnk": { EssentialSoundBank: 0 }
        },
        WemFileIDs: {}
    },
    media: {
        10: {
            sourceID: "prepared:10",
            url: "/audio/ui-click.wav",
            mediaType: "wav"
        }
    },
    banks: {
        "1:0": {
            sourceID: "1:0",
            bankID: 1,
            languageID: 0,
            url: "/audio/ui.bnk"
        }
    },
    embeddedMedia: {},
    eventMedia: {
        ui_click: [ 10 ]
    },
    eventMediaLanguage: ""
};

let context;

const audio = new CjsAudioMan(document, {
    createContext: () => context = new AudioContext(),
    defaultSoundBanks: [ "ui.bnk" ],
    // Optional dynamics, modulation, distortion, reverb, and blockage approximations.
    wwiseDynamics: "approximate-web-audio",
    wwiseDistortion: "approximate-web-audio",
    wwiseModulation: "approximate-web-audio",
    wwiseReverb: "approximate-web-audio",
    wwiseRoomVerb: "approximate-web-audio",
    wwiseObstructionOcclusion: "approximate-web-audio",
    // Optional omission policies; both defaults are "strict".
    wwiseMeterFeedback: "omit-telemetry",
    wwiseVoiceLimits: "ignore",
    mediaProvider: {
        async Read(source)
        {
            const response = await fetch(source.url);

            if (!response.ok)
            {
                throw new Error(`Audio unavailable: ${response.status}`);
            }
            return {
                bytes: await response.arrayBuffer(),
                mediaType: source.mediaType
            };
        }
    }
});

if (!audio.Enable())
{
    throw new Error("Audio context creation failed");
}

await context.resume();

const emitter = audio.CreateEmitter({
    name: "ui",
    position: [ 0, 0, 0 ]
});

emitter.ForceCullingStateChange();
emitter.SendEvent("ui_click");
audio.Process(performance.now());

audio.ReleaseEmitter(emitter);
audio.Dispose();
```

Unsupported shared-bus processing does not normally suppress the decoded
voice. With the default strict policy, playback uses the legacy SFX/music route
and omits the blocked bus stages. Opting into approximate dynamics or
modulation replaces that omission only for the corresponding qualified static
subset; it does not enable
Convolution Reverb, Meter feedback, dynamic plug-in controls, or general Aux
routing.

## Provider routes

An embedded media record can be delivered in two ways:

- `Read(bankRecord)` returns the complete original BNK and the manager slices
  `offset..offset+byteLength` locally; or
- `ReadRange(bankRecord, { offset, byteLength })` returns exactly that window.

Individual source records always use `Read(sourceRecord)`. The provider owns
URLs, credentials, fetch policy, and cancellation. Runtime-audio owns media
choice, validation, preparation, decoding, and caches.

Both provider routes receive an `AbortSignal`. Runtime-audio deduplicates
concurrent media and complete-bank reads without sharing caller
cancellation: one stopped event releases only its own lease, and the
provider signal aborts when no active event still needs the pending read.
An authored `break` keeps a pending one-shot acquisition alive so it can
finish naturally; `stop`, emitter release, `StopAllPlayingSounds()`, and
disposal cancel pending SFX work.

For authored random, sequence, switch, layered, or RTPC-controlled behavior,
include the optional `sfx` program described in
[Authored SFX programs](sfx.md). Its sound leaves still use these same
provider routes.

## Spatial attenuation

Builder-produced spatial Sound leaves may carry a Wwise `dryVolumeCurve`.
The browser keeps Web Audio's HRTF panning but disables `PannerNode` distance
rolloff, then evaluates each leaf's authored curve from the raw distance
between listener and emitter. `SetAttenuationScalingFactor()` changes its
range: `0.5` evaluates the curve at twice the physical distance, while `2`
evaluates it at half the physical distance.

Emitter culling remains Carbon-compatible and is a separate calculation:
its effective radius is `authoredRadius * sqrt(scalingFactor)`. It therefore
does not exactly match Wwise's linear playback-range scaling for factors other
than `1`; a factor above `1` can cull a voice before its scaled playback curve
ends.

Older or hand-authored graphs without a retained curve stay audible through
the historical `distanceScale` inverse-gain fallback. This also covers a Wwise
`Use Project` attenuation curve whose project default is unavailable in the
portable document. It is deliberately a compatibility fallback, not a claim
of Wwise equivalence. Simultaneous movement and an active Voice Volume, State,
or RTPC gain transition are smoothly rescheduled on their shared Web Audio
gain parameter; their continuously varying product is approximate. Cone,
distance-filter and spread/focus curves, diffraction, and transmission are not
currently rendered.

Carbon's newer line-of-sight subsystem does not ray cast either: the host
supplies a normalized blockage value per emitter and `AudManager` fades the
result before handing it to Wwise. Runtime-audio now preserves that manager
API and fade lifecycle. Call `SetEmitterLineOfSightBlockage(emitterID, value)`
after registering the emitter; `GetEmitterOcclusion()` observes the live
mid-fade value. An injected backend may accept
`SetObjectObstructionAndOcclusion(emitterID, 4, obstruction, occlusion)`.
The built-in backend acknowledges the state but allocates no DSP by default.
Opt into `wwiseObstructionOcclusion: "approximate-web-audio"` to apply the
same smooth low-pass and attenuation stage to legacy, flat, and qualified
routes for that emitter. The browser combines obstruction and occlusion as
`1 - (1 - obstruction) * (1 - occlusion)`, moves the cutoff logarithmically
from the lower of 20 kHz or the context Nyquist frequency to 600 Hz, and
attenuates from 0 to -18 dB. Carbon supplies only the normalized values and
delegates their sound to Wwise, so this curve is an explicit CarbonEngineJS
approximation rather than an authored Wwise law.

For named soundtrack playback independent of authored Wwise music events,
pass an optional neutral catalog, loader, and availability probe as described
in [Optional jukebox](jukebox.md).

## Cleanup

Use `ReleaseMedia()` for one retained media identity, `ClearMedia()` for all
decoded buffers, `ClearSourceData()` for retained whole-bank bytes,
`ReleaseEmitter()` for one graph object, and `Dispose()` for the complete
owner. The three cache-release methods prevent future reuse but do not cancel
active callers; callers cancel their own `LoadMedia()` lease with a signal.
`Dispose()`, library replacement, and provider replacement invalidate all
leases and abort pending provider work. Effective provider, delivery, and
language changes also clear the built-in music engine's retained media cache.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Audio manager contract](../concepts/audio-manager.md)
- [Authored SFX programs](sfx.md)
- [Optional jukebox](jukebox.md)
- [API reference](../reference/api.md)
