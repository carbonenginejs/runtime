import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsAudioLibrary,
    CjsAudioLibraryBuilder,
} from "../src/audio/index.js";
import { CjsFileIndex } from "../src/fileindex/index.js";

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

test("audio builder accepts browser file indexes and emits deterministic catalogs", () =>
{
    const index = CjsFileIndex.parseResFileIndex(INDEX_TEXT);
    const options = {
        indexEntries: index,
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
    assert.equal(
        JSON.stringify(library.metadata.Events.engine_loop),
        "{\"eventID\":11,\"maxRadiusAttenuation\":250,\"isLoop\":1,\"is2D\":0,\"isVital\":0,\"eventsStoppedBy\":[],\"soundbanks\":[\"ships.bnk\"]}",
    );
    assert.equal(library.media["777"].storagePath, "bb/777_hash.wem");
    assert.equal(library.banks["524:0"].storagePath, "aa/524_hash.bnk");
    assert.equal(
        JSON.stringify(library),
        JSON.stringify(CjsAudioLibraryBuilder.build(options)),
    );
});

test("audio builder accepts Map-backed structural metadata without naming its producer", () =>
{
    const metadata = {
        Events: new Map([
            [
                "engine_loop",
                {
                    eventID: 11,
                    eventsStoppedBy: [ "engine_stop" ],
                    is2D: 0,
                    isLoop: 1,
                    isVital: 0,
                    maxRadiusAttenuation: 250,
                    playbackDuration: {
                        playbackDurationMax: 4,
                        playbackDurationMin: 2,
                        playbackDurationType: "Variable",
                    },
                    soundbanks: [ "ships.bnk" ],
                },
            ],
        ]),
        SoundBanks: new Map([
            [
                "ships.bnk",
                {
                    EssentialSoundBank: 1,
                    name: "ships",
                    parent: {
                        name: "SFX",
                    },
                    path: "\\SoundBanks\\SFX\\ships.bnk",
                    shortId: 524,
                },
            ],
        ]),
        WemFileIDs: new Map([
            [
                "777",
                {
                    IsEssential: 1,
                    SoundBank: "ships.bnk",
                },
            ],
        ]),
    };
    const library = CjsAudioLibraryBuilder.build({
        metadata,
        indexEntries: INDEX_TEXT,
    });

    assert.equal(library.banks["524:0"].shortName, "ships");
    assert.equal(
        library.metadata.Events.engine_loop.playbackDuration.playbackDurationMax,
        4,
    );
    assert.equal(library.metadata.SoundBanks["ships.bnk"].EssentialSoundBank, 1);
    assert.deepEqual(
        CjsAudioLibraryBuilder.createEventMediaTable(metadata, [
            {
                eventMedia: new Map([
                    [ 11, new Set([ 777 ]) ],
                ]),
            },
        ]),
        {
            engine_loop: [ "777" ],
        },
    );
});

test("complete builds inspect every bank through one injected capability", async () =>
{
    const metadata = {
        Events: new Map([
            [
                "weapon_fire",
                {
                    eventID: 100,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 0,
                    isVital: 0,
                    maxRadiusAttenuation: 500,
                    soundbanks: [ "common.bnk" ],
                },
            ],
        ]),
        SoundBanks: new Map([
            [
                "common.bnk",
                {
                    EssentialSoundBank: 1,
                    name: "common",
                    parent: {
                        name: "SFX",
                    },
                    path: "\\SoundBanks\\SFX\\common.bnk",
                    shortId: 200,
                },
            ],
        ]),
        WemFileIDs: new Map([
            [
                "9001",
                {
                    IsEssential: 1,
                    SoundBank: "common.bnk",
                },
            ],
        ]),
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
                            payload: Uint32Bytes(9001),
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
    assert.equal(CjsAudioLibrary.validate(library), true);
});

test("audio library loads validated objects, JSON text, and Fetch responses", async () =>
{
    const document = CjsAudioLibraryBuilder.build({
        indexEntries: INDEX_TEXT,
        soundbanksInfo: SOUNDBANKS_INFO,
    });
    const fromObject = CjsAudioLibrary.from(document);
    const fromText = CjsAudioLibrary.from(JSON.stringify(document));
    const fromBlob = await CjsAudioLibrary.load(
        new Blob([ JSON.stringify(document) ], {
            type: "application/json",
        }),
    );
    const fromFetch = await CjsAudioLibrary.load(
        "https://audio.test/library.json",
        {
            async fetch()
            {
                return {
                    ok: true,
                    url: "https://audio.test/library.json",
                    async json()
                    {
                        return document;
                    },
                };
            },
        },
    );

    assert.equal(fromObject.schemaVersion, 2);
    assert.deepEqual(fromText.GetDocument(), document);
    assert.deepEqual(fromBlob.GetDocument(), document);
    assert.deepEqual(fromFetch.GetDocument(), document);
    assert.throws(
        () => CjsAudioLibrary.from({
            ...document,
            schema: "invalid",
        }),
        /Unsupported audio-library schema/u,
    );
});

test("complete builds honor cancellation before invoking a bank provider", async () =>
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

function Uint32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}
