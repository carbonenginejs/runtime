import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsAudioLibraryBuilder,
} from "../npm/dist/library-builder/index.js";

const SOUNDBANKS_INFO = {
    SoundBanksInfo: {
        SoundBanks: [
            {
                Id: "524",
                ShortName: "ships",
                Path: "SoundBanks\\ships.bnk",
                Events: [
                    {
                        Id: "11",
                        Name: "engine_loop",
                    },
                ],
                Media: [
                    {
                        Id: "777",
                        ShortName: "engine.wem",
                    },
                ],
            },
        ],
    },
};

const INDEX_TEXT = [
    "res:/audio/524.bnk,aa/524_hash.bnk,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,1000",
    "res:/audio/media/777.wem,bb/777_hash.wem,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,2000",
    "res:/graphics/example.red,cc/example,cccccccccccccccccccccccccccccccc,10",
].join("\n");

test("optional library builder accepts supplied data and optional enrichment", () =>
{
    const options = {
        indexEntries: CjsAudioLibraryBuilder.parseIndexEntries(INDEX_TEXT),
        soundbanksInfo: SOUNDBANKS_INFO,
        enrichment: {
            Events: {
                engine_loop: {
                    isLoop: 1,
                    maxRadiusAttenuation: 250,
                },
            },
            SoundBanks: {},
            WemFileIDs: {},
            sfx: {
                schemaVersion: 1,
                events: {
                    engine_loop: [ 1 ],
                },
                nodes: {
                    "1": {
                        type: "sound",
                        mediaId: 777,
                        loop: true,
                    },
                },
            },
        },
        sourceTarget: "eve",
        sourceGame: "Eve",
        sourceProvider: "ccp",
        sourceBuild: "3435006",
        generatedAt: "2026-07-26T00:00:00.000Z",
    };
    const library = CjsAudioLibraryBuilder.build(options);

    assert.equal(library.schema, "carbonenginejs.audioLibrary");
    assert.equal(library.schemaVersion, 2);
    assert.equal(library.sourceBuild, "3435006");
    assert.equal(library.metadata.Events.engine_loop.isLoop, 1);
    assert.equal(library.metadata.Events.engine_loop.maxRadiusAttenuation, 250);
    assert.equal(library.media["777"].storagePath, "bb/777_hash.wem");
    assert.equal(library.banks["524:0"].storagePath, "aa/524_hash.bnk");
    assert.deepEqual(library.sfx.events.engine_loop, [
        { nodeId: "1" },
    ]);
    assert.equal(library.sfx.nodes["1"].mediaId, "777");
    assert.equal(
        JSON.stringify(library),
        JSON.stringify(CjsAudioLibraryBuilder.build(options)),
        "identical supplied inputs produce identical documents",
    );
});

test("complete library construction reads banks only through the injected loader", async () =>
{
    const metadata = {
        Events: {
            weapon_fire: {
                eventID: 100,
                eventsStoppedBy: [],
                is2D: 0,
                isLoop: 0,
                isVital: 0,
                maxRadiusAttenuation: 500,
                soundbanks: [ "common.bnk" ],
            },
        },
        SoundBanks: {
            "common.bnk": {
                EssentialSoundBank: 1,
                name: "common",
                path: "\\SoundBanks\\SFX\\common.bnk",
                shortId: 200,
            },
        },
        WemFileIDs: {
            "9001": {
                IsEssential: 1,
                SoundBank: "common.bnk",
            },
        },
    };
    const calls = [];
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        metadata,
        indexEntries: [
            {
                logicalPath: "res:/audio/common.bnk",
                storagePath: "banks/common.bnk",
                byteLength: 4096,
            },
        ],
        sfx: {
            schemaVersion: 1,
            events: {
                weapon_fire: [ 2 ],
            },
            nodes: {
                "2": {
                    type: "sound",
                    mediaId: 9001,
                },
            },
        },
        loadBank(bank, context)
        {
            calls.push({
                bank,
                context,
            });

            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    hirc: [
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 1 ],
                            payload: null,
                        },
                        {
                            type: 3,
                            id: 1,
                            actionType: 0x0403,
                            targetId: 2,
                            payload: null,
                        },
                        {
                            type: 2,
                            id: 2,
                            sourceId: 9001,
                            payload: uint32Bytes(9001),
                        },
                    ],
                    media: [
                        {
                            id: 9001,
                            available: true,
                            absoluteOffset: 32,
                            length: 64,
                            mediaType: "wem",
                        },
                    ],
                },
            };
        },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].context.sourceID, "200:0");
    assert.deepEqual(library.eventMedia, {
        weapon_fire: [ "9001" ],
    });
    assert.deepEqual(library.embeddedMedia["9001"], {
        sourceID: "embedded:9001:200:0",
        bank: "200:0",
        offset: 32,
        byteLength: 64,
        language: "",
        mediaType: "wem",
    });
    assert.equal(library.sfx.nodes["2"].mediaId, "9001");
});

test("complete construction honors cancellation before reading a bank", async () =>
{
    const controller = new AbortController();
    let called = false;

    controller.abort(new Error("cancelled"));

    await assert.rejects(
        CjsAudioLibraryBuilder.buildFromBanks({
            metadata: {
                Events: {},
                SoundBanks: {
                    "common.bnk": {
                        name: "common",
                        path: "\\SoundBanks\\SFX\\common.bnk",
                        shortId: 200,
                    },
                },
                WemFileIDs: {},
            },
            indexEntries: [
                {
                    logicalPath: "res:/audio/common.bnk",
                    storagePath: "banks/common.bnk",
                    byteLength: 4096,
                },
            ],
            signal: controller.signal,
            loadBank()
            {
                called = true;
                return null;
            },
        }),
        /cancelled/u,
    );
    assert.equal(called, false);
});

test("music:true is deferred until inspected banks are available", async () =>
{
    await assert.rejects(
        CjsAudioLibraryBuilder.buildFromBanks({
            music: true,
            metadata: {
                Events: {},
                SoundBanks: {},
                WemFileIDs: {},
            },
            indexEntries: [],
            loadBank()
            {
                throw new Error("must not read");
            },
        }),
        /Audio music construction requires indexed banks/u,
    );
});

test("music:false leaves complete construction without a music graph", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        music: false,
        metadata: {
            Events: {},
            SoundBanks: {},
            WemFileIDs: {},
        },
        indexEntries: [],
        loadBank()
        {
            throw new Error("must not read");
        },
    });

    assert.equal(library.music, undefined);
});

test("typed runtime-resource SFX nodes lower into the portable builder graph", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 100,
                },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.events, {
        weapon_fire: [
            { nodeId: "200" },
        ],
    });
    assert.deepEqual(result.nodes, {
        "200": {
            type: "sound",
            mediaId: "9001",
        },
    });
    assert.equal(result.diagnostics.parser.failed.length, 0);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("Step containers ignore Continuous-only transition and reset policies", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 5,
                        id: 201,
                        payload: randomSequencePayload({
                            childID: 200,
                            transitionMode: 3,
                            flags: 0x02,
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 201,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 100,
                },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.events.weapon_fire, [
        { nodeId: "201" },
    ]);
    assert.deepEqual(result.nodes["201"], {
        type: "random",
        scope: "object",
        children: [
            { nodeId: "200" },
        ],
        mode: "random",
        avoidRepeat: 0,
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("trackless non-continuous Layer containers lower to parallel playback", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 202,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9002,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 9,
                        id: 201,
                        payload: layerPayload([ 200, 202 ]),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 201,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 100,
                },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
            "9002": {
                resPath: "res:/audio/9002.wem",
            },
        },
    });

    assert.deepEqual(result.nodes["201"], {
        type: "parallel",
        children: [
            { nodeId: "200" },
            { nodeId: "202" },
        ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("complete construction preserves the bank version for typed SFX lowering", async () =>
{
    let diagnostics = null;
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {
                weapon_fire: {
                    eventID: 100,
                    soundbanks: [ "common.bnk" ],
                },
            },
            SoundBanks: {
                "common.bnk": {
                    name: "common",
                    path: "\\SoundBanks\\SFX\\common.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {
                "9001": {
                    IsEssential: 0,
                    SoundBank: "common.bnk",
                },
            },
        },
        indexEntries: [
            {
                logicalPath: "res:/audio/common.bnk",
                storagePath: "banks/common.bnk",
                byteLength: 4096,
            },
        ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    hirc: [
                        {
                            type: 2,
                            id: 200,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 3,
                            id: 300,
                            actionType: 0x0403,
                            targetId: 200,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 300 ],
                            payload: new Uint8Array(),
                        },
                    ],
                    media: [
                        {
                            id: 9001,
                            available: true,
                            absoluteOffset: 32,
                            length: 64,
                            mediaType: "wem"
                        }
                    ],
                },
            };
        },
        onSfxDiagnostics(value)
        {
            diagnostics = value;
        },
    });

    assert.deepEqual(library.sfx.events, {
        weapon_fire: [
            { nodeId: "200" },
        ],
    });
    assert.deepEqual(diagnostics.parser.unsupportedVersions, []);
    assert.deepEqual(diagnostics.omittedEvents, []);
});

test("complete construction language-selects localized SFX HIRC before lowering", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        language: "en-us",
        metadata: {
            Events: {
                voice_play: {
                    eventID: 100,
                    soundbanks: [ "voice.bnk" ],
                },
            },
            SoundBanks: {
                "English(US)/Voice.bnk": {
                    name: "Voice",
                    path: "\\SoundBanks\\English(US)\\Voice.bnk",
                    shortId: 200,
                },
                "French(France)/Voice.bnk": {
                    name: "Voice",
                    path: "\\SoundBanks\\French(France)\\Voice.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {
                "9001": {
                    IsEssential: 0,
                    SoundBank: "voice.bnk",
                },
                "9002": {
                    IsEssential: 0,
                    SoundBank: "voice.bnk",
                },
            },
        },
        indexEntries: [
            {
                logicalPath: "res:/audio/english(us)/voice.bnk",
                storagePath: "banks/voice-en.bnk",
                byteLength: 4096,
            },
            {
                logicalPath: "res:/audio/french(france)/voice.bnk",
                storagePath: "banks/voice-fr.bnk",
                byteLength: 4096,
            },
        ],
        loadBank(bank)
        {
            const mediaID = bank.language === "en-us" ? 9001 : 9002;

            return {
                inspection: {
                    bankId: 200,
                    languageId: bank.languageID,
                    bankVersion: 150,
                    hirc: [
                        {
                            type: 2,
                            id: 200,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: mediaID,
                            inMemoryMediaSize: 64,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 3,
                            id: 300,
                            actionType: 0x0403,
                            targetId: 200,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 300 ],
                            payload: new Uint8Array(),
                        },
                    ],
                    media: [
                        {
                            id: mediaID,
                            available: true,
                            absoluteOffset: 32,
                            length: 64,
                            mediaType: "wem",
                        },
                    ],
                },
            };
        },
    });

    assert.equal(library.sfx.nodes["200"].mediaId, "9001");
    assert.deepEqual(library.eventMedia.voice_play, [ "9001" ]);
});

function uint32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}

function randomSequencePayload({
    childID,
    transitionMode = 0,
    flags = 0,
})
{
    const bytes = new Uint8Array(42);
    const view = new DataView(bytes.buffer);
    let offset = 0;
    const u8 = (value) =>
    {
        view.setUint8(offset, value);
        offset += 1;
    };
    const u16 = (value) =>
    {
        view.setUint16(offset, value, true);
        offset += 2;
    };
    const u32 = (value) =>
    {
        view.setUint32(offset, value, true);
        offset += 4;
    };
    const s32 = (value) =>
    {
        view.setInt32(offset, value, true);
        offset += 4;
    };
    const f32 = (value) =>
    {
        view.setFloat32(offset, value, true);
        offset += 4;
    };

    u16(1);
    u16(0);
    u16(0);
    f32(0);
    f32(0);
    f32(0);
    u16(0);
    u8(transitionMode);
    u8(0);
    u8(0);
    u8(flags);
    u32(1);
    u32(childID);
    u16(1);
    u32(childID);
    s32(1);

    return bytes;
}

function layerPayload(children)
{
    const bytes = new Uint8Array(9 + children.length * 4);
    const view = new DataView(bytes.buffer);

    view.setUint32(0, children.length, true);
    for (let index = 0; index < children.length; index++)
    {
        view.setUint32(4 + index * 4, children[index], true);
    }
    view.setUint32(4 + children.length * 4, 0, true);
    view.setUint8(8 + children.length * 4, 0);
    return bytes;
}
