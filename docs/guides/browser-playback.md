# Play audio in a browser

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Browser application authors  
Summary: Installs a complete document and attaches a caller-owned browser provider.

## Example

This example supplies an `AudioBuffer` directly. A real provider may return
prepared Ogg/WAV bytes, original WEM bytes, a complete BNK, or an exact BNK
range.

```js
import {
    CjsAudioMan
} from "@carbonenginejs/runtime-audio";

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

if (!audio.Enable([ "ui.bnk" ]))
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

## Provider routes

An embedded media record can be delivered in two ways:

- `Read(bankRecord)` returns the complete original BNK and the manager slices
  `offset..offset+byteLength` locally; or
- `ReadRange(bankRecord, { offset, byteLength })` returns exactly that window.

Individual source records always use `Read(sourceRecord)`. The provider owns
URLs, credentials, fetch policy, and cancellation. Runtime-audio owns media
choice, validation, preparation, decoding, and caches.

## Cleanup

Use `ReleaseMedia()` for one retained media identity, `ClearMedia()` for all
decoded buffers, `ClearSourceData()` for retained whole-bank bytes,
`ReleaseEmitter()` for one graph object, and `Dispose()` for the complete
owner.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Audio manager contract](../concepts/audio-manager.md)
- [API reference](../reference/api.md)
