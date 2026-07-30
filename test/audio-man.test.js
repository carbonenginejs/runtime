import assert from "node:assert/strict";
import test from "node:test";

import { CjsAudioMan } from "../npm/dist/index.js";

function CreateDocument({ direct = null, embedded = null } = {})
{
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {},
            SoundBanks: {},
            WemFileIDs: {},
        },
        media: direct ? { "777": direct } : {},
        banks: {},
    };

    if (embedded)
    {
        library.banks["524:0"] = {
            sourceID: "524:0",
            bankID: "524",
            languageID: "0",
            resPath: "res:/audio/524.bnk",
            byteLength: 12,
        };
        library.embeddedMedia = {
            "777": {
                sourceID: "embedded:777:524:0",
                bank: "524:0",
                offset: 4,
                byteLength: 4,
                mediaType: "ogg",
            },
        };
    }

    return library;
}

function FakeParam(value = 0)
{
    return {
        value,
        linearRampToValueAtTime() {},
    };
}

function FakeContext(log)
{
    return {
        currentTime: 0,
        destination: {},
        listener: {
            positionX: FakeParam(),
            positionY: FakeParam(),
            positionZ: FakeParam(),
            forwardX: FakeParam(),
            forwardY: FakeParam(),
            forwardZ: FakeParam(),
            upX: FakeParam(),
            upY: FakeParam(),
            upZ: FakeParam(),
        },
        createGain()
        {
            return {
                gain: FakeParam(1),
                connect() {},
                disconnect() {},
            };
        },
        createPanner()
        {
            return {
                positionX: FakeParam(),
                positionY: FakeParam(),
                positionZ: FakeParam(),
                connect() {},
                disconnect() {},
            };
        },
        decodeAudioData(bytes)
        {
            const decoded = {
                byteLength: bytes.byteLength,
                sampleRate: 48000,
                getChannelData()
                {
                    return new Float32Array(0);
                },
            };

            log.push([ "decode", new Uint8Array(bytes) ]);
            return Promise.resolve(decoded);
        },
        createBuffer(channels, sampleCount, sampleRate)
        {
            const data = Array.from(
                { length: channels },
                () => new Float32Array(sampleCount),
            );

            return {
                channels,
                sampleCount,
                sampleRate,
                copyToChannel(values, channel)
                {
                    data[channel].set(values);
                },
                getChannelData(channel)
                {
                    return data[channel];
                },
            };
        },
    };
}

function PlaybackContext(log)
{
    const context = FakeContext(log);
    const createGain = context.createGain.bind(context);

    context.gains = [];
    context.createGain = () =>
    {
        const gain = createGain();
        const connect = gain.connect.bind(gain);

        gain.connectedTo = null;
        gain.connect = target =>
        {
            gain.connectedTo = target;
            return connect(target);
        };
        context.gains.push(gain);
        return gain;
    };
    context.sources = [];
    context.createBufferSource = () =>
    {
        const source = {
            buffer: null,
            loop: false,
            playbackRate: FakeParam(1),
            onended: null,
            started: false,
            connect() {},
            disconnect() {},
            start()
            {
                source.started = true;
            },
            stop()
            {
                source.onended?.();
            },
        };

        context.sources.push(source);
        return source;
    };
    return context;
}

test("CjsAudioMan installs one immutable document and reads individual media", async () =>
{
    const log = [];
    const reads = [];
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "prepared:777",
            resPath: "res:/audio/777.ogg",
            mediaType: "ogg",
            byteLength: 4,
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read(source, context)
            {
                reads.push([ source, context ]);
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(Object.isFrozen(man.library), true);
    assert.equal(man.Enable(), true);

    const first = man.LoadMedia(777);
    const second = man.LoadMedia("777");

    assert.equal(await first, await second, "concurrent decodes are deduplicated");
    assert.equal(reads.length, 1);
    assert.equal(reads[0][1].kind, "media");
    assert.deepEqual([ ...log[0][1] ], [ 1, 2, 3, 4 ]);
    assert.equal(man.ReleaseMedia(777), 1);
    man.Dispose();
});

test("CjsAudioMan owns and realizes the fixed Carbon listener", () =>
{
    const log = [];
    const context = PlaybackContext(log);
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => context,
    });

    assert.equal(man.manager.GetListener(), man.listener);
    assert.equal(man.Enable(), true);
    assert.equal(man.manager.GetListener(), man.listener);
    assert.deepEqual(
        [
            context.listener.positionX.value,
            context.listener.positionY.value,
            context.listener.positionZ.value,
        ],
        [ 0, 0, 0 ],
    );
    man.Dispose();
});

test("CjsAudioMan lazily owns Carbon's fixed music-player singleton", () =>
{
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => PlaybackContext([]),
    });
    const first = man.GetMusicPlayer();

    assert.equal(first.ID, 3);
    assert.equal(first.name, "Music");
    assert.equal(man.musicPlayer, first);
    assert.equal(man.manager.GetAudioEmitter(3), first);
    assert.equal(man.ReleaseEmitter(first), true);
    assert.notEqual(man.GetMusicPlayer(), first);
    man.Dispose();
});

test("CjsAudioMan owns default and disabled-state bank intent", () =>
{
    const man = new CjsAudioMan(CreateDocument(), {
        createContext: () => PlaybackContext([]),
        defaultSoundBanks: [ "base.bnk" ],
    });

    man.LoadSoundBank("queued.bnk");
    assert.deepEqual(man.banksWaitingToLoad, [ "queued.bnk" ]);
    assert.equal(man.Enable([ "scene.bnk" ]), true);
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "base.bnk",
        "queued.bnk",
        "scene.bnk",
    ]);

    man.AddAndLoadDefaultSoundBank("always.bnk");
    assert.equal(man.UnloadSoundBank("always.bnk"), false);
    assert.deepEqual(man.SwapSoundBanks([ "next.bnk" ]), {
        loaded: [ "next.bnk" ],
        unloaded: [ "queued.bnk", "scene.bnk" ],
    });
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "always.bnk",
        "base.bnk",
        "next.bnk",
    ]);

    man.Disable();
    assert.equal(man.GetState(), 1);
    assert.equal(man.UnloadSoundBank("next.bnk"), true);
    man.LoadSoundBank("later.bnk");
    assert.equal(man.Enable(), true);
    assert.deepEqual(man.GetLoadedSoundBanks().sort(), [
        "Init.bnk",
        "always.bnk",
        "base.bnk",
        "later.bnk",
    ]);
    assert.equal(man.SetGlobalRTPC("volume", 0.5), true);
    assert.equal(man.SetState("music", "danger"), true);

    assert.equal(man.RemoveAndUnloadDefaultSoundBank("always.bnk"), true);
    assert.deepEqual(man.defaultSoundBanks, [ "base.bnk" ]);
    man.StopAllPlayingSounds();
    man.Dispose();
});

test("whole delivery reads a complete original bank and slices locally", async () =>
{
    const log = [];
    const reads = [];
    const man = new CjsAudioMan(CreateDocument({ embedded: true }), {
        createContext: () => FakeContext(log),
        delivery: "whole",
        mediaProvider: {
            Read(source, context)
            {
                reads.push([ source, context ]);
                return new Uint8Array([
                    0, 0, 0, 0,
                    5, 6, 7, 8,
                    0, 0, 0, 0,
                ]);
            },
        },
    });

    assert.equal(man.Enable(), true);
    assert.equal(man.ResolveMedia(777).route, "whole");
    await man.LoadMedia(777);
    assert.equal(reads[0][1].kind, "bank");
    assert.deepEqual([ ...log[0][1] ], [ 5, 6, 7, 8 ]);
    man.Dispose();
});

test("range delivery reads the original bank member with its indexed offset", async () =>
{
    const log = [];
    const ranges = [];
    const man = new CjsAudioMan(CreateDocument({ embedded: true }), {
        createContext: () => FakeContext(log),
        delivery: "range",
        mediaProvider: {
            ReadRange(source, context)
            {
                ranges.push([ source, context ]);
                return {
                    bytes: new Uint8Array([ 9, 10, 11, 12 ]),
                    complete: false,
                };
            },
        },
    });

    assert.equal(man.Enable(), true);
    assert.equal(man.ResolveMedia(777).route, "range");
    await man.LoadMedia(777);
    assert.equal(ranges[0][1].offset, 4);
    assert.equal(ranges[0][1].byteLength, 4);
    assert.deepEqual([ ...log[0][1] ], [ 9, 10, 11, 12 ]);
    man.Dispose();
});

test("original PCM wem files are prepared into AudioBuffer channel data", async () =>
{
    const log = [];
    const man = new CjsAudioMan(CreateDocument({
        direct: {
            sourceID: "original:777",
            resPath: "res:/audio/777.wem",
            mediaType: "audio/x-wem",
        },
    }), {
        createContext: () => FakeContext(log),
        mediaProvider: {
            Read()
            {
                return {
                    bytes: CreatePcmWem(),
                    mediaType: "application/octet-stream",
                };
            },
        },
    });

    assert.equal(man.Enable(), true);

    const buffer = await man.LoadMedia(777);
    const samples = buffer.getChannelData(0);

    assert.equal(buffer.sampleRate, 48000);
    assert.equal(samples.length, 2);
    assert.equal(samples[0], -1);
    assert.ok(samples[1] > 0.99);
    assert.equal(
        log.some(value => Array.isArray(value) && value[0] === "decode"),
        false,
        "runtime-resource decoded PCM without browser encoded-media decode",
    );
    man.Dispose();
});

test("CjsAudioMan resolves authored switch and blend nodes before media delivery", async () =>
{
    const log = [];
    const reads = [];
    const context = PlaybackContext(log);
    const library = {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 42,
                    eventsStoppedBy: [],
                    is2D: 1,
                    isLoop: 0,
                    isVital: 1,
                    maxRadiusAttenuation: 0,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {},
        },
        media: {
            "777": {
                sourceID: "prepared:777",
                resPath: "res:/audio/777.ogg",
                mediaType: "ogg",
            },
            "778": {
                sourceID: "prepared:778",
                resPath: "res:/audio/778.ogg",
                mediaType: "ogg",
            },
        },
        banks: {},
        sfx: {
            schemaVersion: 1,
            events: {
                weapon_fire: [ { nodeId: "1" } ],
            },
            nodes: {
                "1": {
                    type: "switch",
                    group: "ship_size",
                    scope: "switch",
                    cases: {
                        large: { nodeId: "2" },
                    },
                    default: { nodeId: "10" },
                },
                "2": {
                    type: "blend",
                    children: [
                        { nodeId: "10" },
                        { nodeId: "11" },
                    ],
                },
                "10": {
                    type: "sound",
                    mediaId: "777",
                },
                "11": {
                    type: "sound",
                    mediaId: "778",
                },
            },
        },
    };
    const man = new CjsAudioMan(library, {
        createContext: () => context,
        mediaProvider: {
            Read(source)
            {
                reads.push(source.sourceID);
                return new Uint8Array([ 1, 2, 3, 4 ]);
            },
        },
    });

    assert.equal(man.Enable([ "ships.bnk" ]), true);

    const emitter = man.CreateEmitter();

    emitter.SetPosition([ 0, 0, 1 ], [ 0, 1, 0 ], [ 0, 0, 0 ]);
    emitter.Wake();
    assert.equal(emitter.SetSwitch("ship_size", "large"), true);
    assert.ok(emitter.SendEvent("weapon_fire") > 0);

    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));

    assert.deepEqual(reads.sort(), [ "prepared:777", "prepared:778" ]);
    assert.equal(context.sources.length, 2);
    assert.equal(context.sources.every(source => source.started), true);
    assert.equal(
        context.gains[4].connectedTo,
        context.gains[5],
        "authored 2D metadata bypasses the emitter panner",
    );
    assert.equal(context.gains[6].connectedTo, context.gains[5]);
    assert.equal(context.gains[5].connectedTo, context.gains[1]);
    man.Dispose();
});

function CreatePcmWem()
{
    const bytes = new Uint8Array(48);
    const view = new DataView(bytes.buffer);

    bytes.set([ 0x52, 0x49, 0x46, 0x46 ], 0);
    view.setUint32(4, 40, true);
    bytes.set([ 0x57, 0x41, 0x56, 0x45 ], 8);
    bytes.set([ 0x66, 0x6d, 0x74, 0x20 ], 12);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 48000, true);
    view.setUint32(28, 96000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    bytes.set([ 0x64, 0x61, 0x74, 0x61 ], 36);
    view.setUint32(40, 4, true);
    view.setInt16(44, -32768, true);
    view.setInt16(46, 32767, true);
    return bytes;
}
