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
    defaultSoundBanks: [ "ui.bnk" ],
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
