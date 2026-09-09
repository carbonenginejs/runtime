# Play audio in a browser

Status: Experimental  
Scope: `@carbonenginejs/runtime/audio`
Audience: Browser application authors  
Summary: Installs a complete document and attaches a caller-owned browser provider.

## Example

This example supplies fetched bytes and their media type. A provider may also
return an `AudioBuffer` directly, prepared Ogg/WAV bytes, original WEM bytes, a
complete BNK, or an exact BNK range.

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

The example's opt-ins admit only qualified browser approximations, not general
Wwise DSP. Rejected shared-bus processing normally leaves the voice audible on
its legacy route. See the [policy table](../reference/api.md#effect-policies)
and [compatibility ledger](../reference/carbon-compatibility.md#compatibility-ledger)
before enabling a policy.

## Provider routes

Implement `Read` for individual files or whole banks, or `ReadRange` for exact
embedded-media windows. The provider owns URLs, credentials, fetch policy, and
cancellation; the audio layer owns selection, validation, preparation,
decoding, and caches. Follow the [provider and cancellation contract](../reference/api.md#delivery)
when forwarding abort signals: one stopped event must not cancel another's read.

For authored random, sequence, switch, layered, or RTPC-controlled behavior,
include the optional `sfx` program described in
[Authored SFX programs](sfx.md). Its sound leaves still use these same
provider routes.

## Spatial attenuation

Use `SetAttenuationScalingFactor()` to change playback range, but note that
Carbon's culling radius scales differently. The exact curve, culling quirk,
missing-curve fallback, and unrendered spatial features are documented under
[adaptations](../reference/carbon-compatibility.md#adaptations).

For host-computed blockage, register the emitter before calling
`SetEmitterLineOfSightBlockage(emitterID, value)`. No ray casting is performed.
The [manager API](../reference/api.md#caller-supplied-obstruction-and-occlusion)
describes fading and backend delivery; audible filtering requires the explicit
`wwiseObstructionOcclusion` opt-in.

For named soundtrack playback independent of authored Wwise music events,
pass an optional neutral catalog, loader, and availability probe as described
in [Optional jukebox](jukebox.md).

## Cleanup

Release emitters with `ReleaseEmitter()` and the owner with `Dispose()`.
For cache release without caller cancellation, use the methods listed in
[Delivery](../reference/api.md#delivery).

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Authored SFX programs](sfx.md)
- [Optional jukebox](jukebox.md)
- [API reference](../reference/api.md)
