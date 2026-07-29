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

function uint32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
