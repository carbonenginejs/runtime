import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsMemoryResourceSource,
    CjsResMan,
} from "@carbonenginejs/runtime-resource";
import {
    CjsAudioBufferRes,
    CjsAudioRes,
} from "@carbonenginejs/runtime-resource/audio";
import { CjsWemFormat } from "@carbonenginejs/runtime-resource/formats/wem";

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
    const fromObject = await CjsAudioLibrary.from(document);
    const fromText = await CjsAudioLibrary.from(JSON.stringify(document));
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
    await assert.rejects(
        CjsAudioLibrary.from({
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

test("audio registration resolves documents, applies enrichment, and locks on initialize", async () =>
{
    const document = CreateRuntimeLibraryDocument();
    const source = new CjsMemoryResourceSource({
        "aud:/library.json": JSON.stringify(document),
        "res:/audio-enrich": JSON.stringify({
            Events: {
                engine_loop: {
                    eventID: 11,
                    isLoop: 1,
                },
            },
        }),
    });
    const audio = new CjsAudioLibrary({
        source,
    });

    audio.Register({
        libraryResFilePath: "aud:/library.json",
        enrichResPath: "res:/audio-enrich",
    });

    assert.throws(
        () => audio.GetResByID(100),
        error => error.code === "CJS_AUDIO_LIBRARY_NOT_INITIALIZED",
    );

    await audio.Initialize();

    assert.equal(
        audio.GetDocument().metadata.Events.engine_loop.isLoop,
        1,
    );
    assert.throws(
        () => audio.Register({
            defaultLanguage: "de",
        }),
        error => error.code === "CJS_AUDIO_LIBRARY_CONFIGURATION_LOCKED",
    );
    assert.throws(
        () => audio.SetSource(source),
        error => error.code === "CJS_AUDIO_LIBRARY_CONFIGURATION_LOCKED",
    );
});

test("audio registration builds from sound-bank and enrichment resource paths", async () =>
{
    const source = new CjsMemoryResourceSource({
        "res:/sound-bank-info": SOUNDBANKS_INFO,
        "res:/audio-enrich": {
            Events: {
                engine_loop: {
                    isLoop: 1,
                },
            },
        },
    });
    const audio = new CjsAudioLibrary({
        source,
    }).Register({
        soundBankResPath: "res:/sound-bank-info",
        enrichResPath: "res:/audio-enrich",
        indexEntries: INDEX_TEXT,
    });

    await audio.Initialize();

    const document = audio.GetDocument();

    assert.equal(document.metadata.Events.engine_loop.isLoop, 1);
    assert.equal(
        document.media["777"].resPath,
        "res:/audio/media/777.wem",
    );
    assert.equal(
        document.banks["524:0"].resPath,
        "res:/audio/524.bnk",
    );
});

test("audio library resolves loose and embedded files through canonical audio resources", async () =>
{
    const source = new CjsMemoryResourceSource({
        "res:/audio/100.wem": Uint8Array.from([ 10, 11, 12, 13 ]).buffer,
        "res:/audio/20.bnk": Uint8Array.from([
            0, 1, 2, 3,
            20, 21, 22, 23,
            30, 31, 32, 33,
        ]).buffer,
    });
    const library = new CjsAudioLibrary({
        source,
    });

    await library.Initialize(CreateRuntimeLibraryDocument());

    const loose = library.GetResByID(100);
    const embedded = library.GetResByID(200);
    const sibling = library.GetResByID(201);

    assert.ok(loose instanceof CjsAudioRes);
    assert.ok(embedded instanceof CjsAudioRes);
    assert.ok(embedded.GetBackingResource() instanceof CjsAudioBufferRes);
    assert.equal(
        embedded,
        library.GetResByPath("aud:/id/200"),
    );
    assert.equal(
        embedded.GetBackingResource(),
        sibling.GetBackingResource(),
        "embedded files share one physical bank resource",
    );
    assert.equal(
        embedded.GetBackingResource().GetPath(),
        "res:/audio/20.bnk",
    );

    assert.deepEqual(
        [ ...new Uint8Array((await loose.GetBytes()).bytes) ],
        [ 10, 11, 12, 13 ],
    );
    assert.deepEqual(
        [ ...new Uint8Array((await library.GetBytesByID(200)).bytes) ],
        [ 20, 21, 22, 23 ],
    );
    assert.deepEqual(
        [ ...new Uint8Array((await sibling.GetBytes()).bytes) ],
        [ 30, 31, 32, 33 ],
    );
    assert.equal((await embedded.GetBytes()).embedded, true);
    assert.equal((await embedded.GetBytes()).metadata.IsEssential, 1);
});

test("audio child locks participate in their shared backing lifetime", async () =>
{
    const source = new CjsMemoryResourceSource({
        "res:/audio/100.wem": new ArrayBuffer(4),
        "res:/audio/20.bnk": new ArrayBuffer(12),
    });
    const library = new CjsAudioLibrary({
        source,
    });

    await library.Initialize(CreateRuntimeLibraryDocument());

    const first = library.GetResByID(200);
    const second = library.GetResByID(201);
    const backing = first.GetBackingResource();

    assert.equal(first.Lock(), 1);
    assert.equal(second.Lock(), 1);
    assert.equal(
        backing.Lock(),
        3,
        "two child locks were delegated to the shared bank",
    );
    assert.equal(backing.Unlock(), 2);
    assert.equal(first.Unlock(), 0);
    assert.equal(second.Unlock(), 0);
    assert.equal(backing.Lock(), 1);
    assert.equal(backing.Unlock(), 0);
});

test("range-capable sources still materialize ordinary CjsAudioRes handles", async () =>
{
    const bank = Uint8Array.from([
        0, 1, 2, 3,
        20, 21, 22, 23,
        30, 31, 32, 33,
    ]);
    const calls = [];
    const source = {
        async ReadRange(path, options)
        {
            calls.push({
                path,
                options,
            });

            return bank.slice(
                options.offset,
                options.offset + options.byteLength,
            ).buffer;
        },
    };
    const library = new CjsAudioLibrary({
        source,
    });

    await library.Initialize(CreateRuntimeLibraryDocument());

    const resource = library.GetResByID(200);
    const result = await resource.GetBytes();

    assert.ok(resource instanceof CjsAudioRes);
    assert.equal(resource.GetBackingResource().GetPath(), "aud:/id/200");
    assert.deepEqual([ ...new Uint8Array(result.bytes) ], [ 20, 21, 22, 23 ]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, "res:/audio/20.bnk");
    assert.equal(calls[0].options.offset, 4);
    assert.equal(calls[0].options.byteLength, 4);
});

test("audio API options project individual and ranged backing requests", async () =>
{
    const bank = Uint8Array.from([
        0, 1, 2, 3,
        20, 21, 22, 23,
        30, 31, 32, 33,
    ]);
    const individualCalls = [];
    const individualSource = {
        async Read(path, options)
        {
            individualCalls.push({
                path,
                options,
            });

            if (path === "aud:/id/200")
            {
                return bank.slice(4, 8).buffer;
            }

            throw new Error(`Unexpected individual API path: ${path}`);
        },
    };
    const individual = new CjsAudioLibrary({
        source: individualSource,
        audioApiResPath: "aud:/",
        audioApiResPathSupportsIndividualFiles: true,
    });

    await individual.Initialize(CreateRuntimeLibraryDocument());

    const individualResource = individual.GetResByID(200);
    const individualResult = await individualResource.GetBytes();

    assert.equal(
        individualResource.GetBackingResource().GetPath(),
        "aud:/id/200",
    );
    assert.deepEqual(
        [ ...new Uint8Array(individualResult.bytes) ],
        [ 20, 21, 22, 23 ],
    );
    assert.equal(individualCalls.length, 1);

    const rangeCalls = [];
    const rangeSource = {
        async Read(path, options)
        {
            const range = options.headers.get("Range");

            rangeCalls.push({
                path,
                range,
            });

            const match = /^bytes=(\d+)-(\d+)$/u.exec(range);
            const start = Number(match[1]);
            const end = Number(match[2]) + 1;

            return bank.slice(start, end).buffer;
        },
    };
    const ranged = new CjsAudioLibrary({
        source: rangeSource,
        audioApiResPath: "aud:/",
        audioApiResPathSupportsOffset: true,
    });

    await ranged.Initialize(CreateRuntimeLibraryDocument());

    const rangeResource = ranged.GetResByID(200);
    const rangeResult = await rangeResource.GetBytes();

    assert.equal(
        rangeResource.GetBackingResource().GetPath(),
        "aud:/path/res%3a%2faudio%2f20.bnk",
    );
    assert.deepEqual(
        [ ...new Uint8Array(rangeResult.bytes) ],
        [ 20, 21, 22, 23 ],
    );
    assert.deepEqual(rangeCalls, [
        {
            path: "aud:/path/res%3A%2Faudio%2F20.bnk",
            range: "bytes=4-7",
        },
    ]);
});

test("async capabilities compare individual and offset delivery for one known bank member", async () =>
{
    const bank = Uint8Array.from([
        0, 1, 2, 3,
        20, 21, 22, 23,
        30, 31, 32, 33,
    ]);
    const calls = [];
    const source = {
        async Read(path, options = {})
        {
            calls.push({
                path,
                range: options.headers?.get("Range") ?? null,
            });

            if (path === "aud:/id/200")
            {
                return bank.slice(4, 8).buffer;
            }
            if (path === "aud:/path/res%3A%2Faudio%2F20.bnk")
            {
                return bank.slice(4, 8).buffer;
            }

            throw new Error(`Unexpected capability path: ${path}`);
        },
    };
    const library = new CjsAudioLibrary({
        source,
        audioApiResPath: "aud:/",
    });

    await library.Initialize(CreateRuntimeLibraryDocument());

    const capabilities = await library.GetCapabilities({
        bank: "20:0",
    });

    assert.equal(capabilities.verified, true);
    assert.equal(capabilities.consistent, true);
    assert.equal(capabilities.probeMediaID, "200");
    assert.equal(capabilities.probeBank, "20:0");
    assert.equal(
        capabilities.audioApiResPathSupportsIndividualFiles,
        true,
    );
    assert.equal(capabilities.audioApiResPathSupportsOffset, true);
    assert.deepEqual(calls, [
        {
            path: "aud:/id/200",
            range: null,
        },
        {
            path: "aud:/path/res%3A%2Faudio%2F20.bnk",
            range: "bytes=4-7",
        },
    ]);

    const resource = library.GetResByID(200);
    const result = await resource.GetBytes();

    assert.equal(resource.GetBackingResource().GetPath(), "aud:/id/200");
    assert.deepEqual(
        [ ...new Uint8Array(result.bytes) ],
        [ 20, 21, 22, 23 ],
    );
});

test("async capabilities automatically favor the most event-used bank", async () =>
{
    const document = CreateRuntimeLibraryDocument();

    document.banks["30:0"] = {
        sourceID: "30:0",
        bankID: 30,
        languageID: 0,
        resPath: "res:/audio/30.bnk",
        byteLength: 2,
    };
    document.embeddedMedia["300"] = {
        sourceID: "embedded:300:30:0",
        bank: "30:0",
        offset: 0,
        byteLength: 2,
        mediaType: "wem",
    };
    document.metadata.WemFileIDs["300"] = {};
    document.eventMedia = {
        "1": [ "300" ],
        "2": [ "300" ],
        "3": [ "200" ],
    };
    document.eventMediaLanguage = "";

    const calls = [];
    const source = {
        async Read(path, options = {})
        {
            calls.push({
                path,
                range: options.headers?.get("Range") ?? null,
            });
            return Uint8Array.from([ 50, 51 ]).buffer;
        },
    };
    const library = new CjsAudioLibrary({
        source,
        audioApiResPath: "aud:/",
    });

    await library.Initialize(document);

    const capabilities = await library.GetCapabilities();

    assert.equal(capabilities.probeBank, "30:0");
    assert.equal(capabilities.probeMediaID, "300");
    assert.deepEqual(calls, [
        {
            path: "aud:/id/300",
            range: null,
        },
        {
            path: "aud:/path/res%3A%2Faudio%2F30.bnk",
            range: "bytes=0-1",
        },
    ]);
});

test("audio library can adapt an injected CjsResMan and select prepared media", async () =>
{
    const source = new CjsMemoryResourceSource({
        "res:/audio/100.wem": Uint8Array.from([ 1 ]).buffer,
        "res:/audio/20.bnk": new ArrayBuffer(12),
        "res:/audio/prepared/300.ogg": Uint8Array.from([ 3 ]).buffer,
        "res:/audio/media/300.wem": Uint8Array.from([ 4 ]).buffer,
    });
    const resMan = new CjsResMan({
        source,
    });

    resMan.RegisterFormat(CjsWemFormat);
    const document = CreateRuntimeLibraryDocument();

    document.media["300"] = {
        sources: [
            {
                sourceID: "wem:300",
                resPath: "res:/audio/media/300.wem",
                mediaType: "wem",
            },
            {
                sourceID: "prepared:300",
                resPath: "res:/audio/prepared/300.ogg",
                mediaType: "audio/ogg",
                prepared: true,
            },
        ],
    };
    document.metadata.WemFileIDs["300"] = {};

    const library = new CjsAudioLibrary({
        resMan,
    });

    await library.Initialize(document);

    assert.equal(library.GetResMan(), resMan);
    assert.equal(
        library.GetResByID(300).GetAudioInfo().sourceID,
        "prepared:300",
    );
    assert.equal(
        library.GetResByID(300, {
            mediaTypes: [ "audio/x-wem" ],
        }).GetAudioInfo().sourceID,
        "wem:300",
    );
});

function Uint32Bytes(value)
{
    const bytes = new Uint8Array(4);

    new DataView(bytes.buffer).setUint32(0, value, true);
    return bytes;
}

function CreateRuntimeLibraryDocument()
{
    return {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {},
            SoundBanks: {},
            WemFileIDs: {
                "100": {},
                "200": {
                    IsEssential: 1,
                },
                "201": {},
            },
        },
        media: {
            "100": {
                sourceID: "loose:100",
                resPath: "res:/audio/100.wem",
                byteLength: 4,
                mediaType: "wem",
            },
        },
        banks: {
            "20:0": {
                sourceID: "20:0",
                bankID: 20,
                languageID: 0,
                resPath: "res:/audio/20.bnk",
                byteLength: 12,
            },
        },
        embeddedMedia: {
            "200": {
                sourceID: "embedded:200:20:0",
                bank: "20:0",
                offset: 4,
                byteLength: 4,
                mediaType: "wem",
            },
            "201": {
                sourceID: "embedded:201:20:0",
                bank: "20:0",
                offset: 8,
                byteLength: 4,
                mediaType: "wem",
            },
        },
    };
}
