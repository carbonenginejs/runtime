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
                schemaVersion: 2,
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

test("library builder marks buses that authored actions control or can amplify", () =>
{
    const bus = overrides => ({
        type: "audio-bus",
        channelConfig: {
            raw: 0,
            channelCount: 0,
            configType: 0,
            channelMask: 0,
        },
        properties: [],
        positioning: {
            flags: 0,
            overrideParent: false,
            listenerRelative: false,
            pannerType: 0,
            positionType: 0,
        },
        hdr: {
            flags: 0,
            enabled: false,
            exponentialRelease: false,
        },
        auxFlags: 0,
        bypassAllEffects: false,
        userAuxSends: [],
        effects: [],
        requiresProcessing: [],
        ...overrides,
    });
    const options = {
        indexEntries: CjsAudioLibraryBuilder.parseIndexEntries(INDEX_TEXT),
        soundbanksInfo: SOUNDBANKS_INFO,
        sfx: {
            schemaVersion: 2,
            events: { engine_loop: [ { nodeId: "1" } ] },
            programs: {
                engine_loop: [
                    {
                        kind: "set-bus-volume",
                        targetId: "1",
                        targetFlags: 1,
                        scope: "global",
                        mode: "element",
                        curve: 4,
                        exceptions: [],
                        valueMode: "relative",
                        busVolumeDb: 1,
                        busVolumeRangeDb: { min: -1, max: 2 },
                    },
                    { kind: "play", child: { nodeId: "1" } },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "777",
                    loop: true,
                    outputBusId: "500",
                    busPathIds: [ "500" ],
                },
            },
        },
        busGraph: {
            schemaVersion: 1,
            effects: {},
            buses: { "500": bus({}) },
            routes: [ {
                outputBusId: "500",
                busPathIds: [ "500" ],
                userAuxSends: [],
            } ],
            sfxRoutes: { "1": 0 },
            musicRoutes: {},
        },
    };
    const library = CjsAudioLibraryBuilder.build(options);

    assert.equal(library.busGraph.buses["500"].busVolumeMayIncrease, undefined);
    assert.equal(library.busGraph.buses["1"], undefined);

    options.sfx.programs.engine_loop[0].targetId = "500";
    const amplified = CjsAudioLibraryBuilder.build(options);

    assert.equal(
        amplified.busGraph.buses["500"].busVolumeActionControlled,
        true,
    );
    assert.equal(amplified.busGraph.buses["500"].busVolumeMayIncrease, true);

    options.sfx.programs.engine_loop[0].busVolumeDb = -5;
    options.sfx.programs.engine_loop[0].busVolumeRangeDb = { min: 0, max: 0 };
    const attenuated = CjsAudioLibraryBuilder.build(options);

    assert.equal(
        attenuated.busGraph.buses["500"].busVolumeActionControlled,
        true,
    );
    assert.equal(
        attenuated.busGraph.buses["500"].busVolumeMayIncrease,
        undefined,
    );

    options.sfx.programs.engine_loop[0].valueMode = "absolute";
    options.sfx.programs.engine_loop[0].busVolumeDb = -50;
    options.sfx.programs.engine_loop[0].busVolumeRangeDb = { min: 0, max: 0 };
    const absolute = CjsAudioLibraryBuilder.build(options);

    assert.equal(
        absolute.busGraph.buses["500"].busVolumeMayIncrease,
        true,
        "an absolute negative value can still replace a quieter authored Bus",
    );

    const resetOptions = structuredClone(options);
    const resetAction = resetOptions.sfx.programs.engine_loop[0];

    resetAction.kind = "reset-bus-volume";
    resetAction.targetId = "0";
    resetAction.mode = "all";
    delete resetAction.valueMode;
    delete resetAction.busVolumeDb;
    delete resetAction.busVolumeRangeDb;
    const reset = CjsAudioLibraryBuilder.build(resetOptions);

    assert.equal(
        reset.busGraph.buses["500"].busVolumeActionControlled,
        true,
        "Reset All marks every reachable Bus as action-controlled",
    );
});

test("library construction rejects invalid schema-v2 spatial metadata", () =>
{
    const metadata = {
        Events: {
            invalid: {
                is2D: true,
            },
        },
        SoundBanks: {},
        WemFileIDs: {},
    };

    assert.throws(
        () => CjsAudioLibraryBuilder.build({ metadata }),
        /is2D must be 0 or 1/u,
    );

    metadata.Events.invalid.is2D = 0;
    metadata.Events.invalid.maxRadiusAttenuation = -1;

    assert.throws(
        () => CjsAudioLibraryBuilder.build({ metadata }),
        /maxRadiusAttenuation must be a non-negative finite number/u,
    );
});

test("authored SFX event-media projection follows only typed graph edges", () =>
{
    const eventMedia = CjsAudioLibraryBuilder.createSfxEventMediaTable({
        events: {
            weapon_fire: [
                { nodeId: "10" },
                { nodeId: "20" },
            ],
        },
        nodes: {
            "10": {
                type: "sound",
                mediaId: "9002",
            },
            "20": {
                type: "switch",
                cases: {
                    armor: { nodeId: "30" },
                    shield: { nodeId: "40" },
                },
                default: { nodeId: "10" },
            },
            "30": {
                type: "sound",
                mediaId: "9001",
            },
            "40": {
                type: "parallel",
                children: [
                    { nodeId: "10" },
                    { nodeId: "30" },
                ],
            },
        },
    });

    assert.deepEqual(eventMedia, {
        weapon_fire: [ "9001", "9002" ],
    });
});

test("library enrichment preserves the complete schema-v2 contract", () =>
{
    const library = CjsAudioLibraryBuilder.build({
        metadata: {
            Events: {
                valid: {
                    is2D: 0,
                },
            },
            SoundBanks: {},
            WemFileIDs: {},
        },
    });

    assert.throws(
        () => CjsAudioLibraryBuilder.applyEnrichment(library, {
            Events: {
                valid: {
                    is2D: true,
                },
            },
        }),
        /is2D must be 0 or 1/u,
    );

    assert.throws(
        () => CjsAudioLibraryBuilder.applyEnrichment(library, {
            sfx: {
                schemaVersion: 2,
                events: {
                    missing_metadata: [
                        { nodeId: "1" },
                    ],
                },
                nodes: {
                    "1": {
                        type: "silence",
                    },
                },
            },
        }),
        /SFX event missing_metadata has no metadata event/u,
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
            schemaVersion: 2,
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

    assert.equal(library.sfx.schemaVersion, 2);
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

test("music tracks inherit bus routes and Voice Volume RTPCs without leaking NodeBase", () =>
{
    const segmentID = 4001;
    const trackID = 4101;
    const segment = new TestWriter()
        .u8(0)
        .append(nodeBasePayload({
            overrideBusId: 928,
            properties: [ { id: 0x0d, value: 4 } ],
        }))
        .u32(1).u32(trackID)
        .f64(1000).f64(0).f32(120).u8(4).u8(4)
        .u8(1)
        .u32(0)
        .f64(4000)
        .u32(0)
        .bytes();
    const track = new TestWriter()
        .u8(0)
        .u32(0)
        .u32(0)
        .u32(0)
        .append(nodeBasePayload({
            directParentId: segmentID,
            properties: [ { id: 0x0d, value: -12 } ],
            rtpcs: [ {
                controlId: 700,
                parameterId: 0,
                scaling: 2,
                points: [
                    [ 0, -1, 4 ],
                    [ 1, 0, 4 ],
                ],
            } ],
        }))
        .u8(0)
        .s32(-100)
        .bytes();
    const graph = CjsAudioLibraryBuilder.createMusicGraph({
        inspections: [ {
            source: "synthetic.bnk",
            globalSettings: {
                rtpcParameters: [ { id: 700, defaultValue: 0.25 } ],
                stateGroups: [],
            },
            hirc: [
                { type: 10, id: segmentID, payload: segment },
                { type: 11, id: trackID, payload: track },
            ],
        } ],
        metadata: { Events: {} },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "1",
                    Path: "synthetic.bnk",
                    GameParameters: [ {
                        Id: "700",
                        Name: "music_intensity",
                    } ],
                } ],
            },
        },
        musicBankNames: [ "synthetic.bnk" ],
        buses: new Map([
            [ 928, {
                overrideBusId: 500,
                busVolume: -6,
                makeUpGain: 3,
            } ],
            [ 500, {
                overrideBusId: 0,
                busVolume: -3,
                makeUpGain: 2,
            } ],
        ]),
    });

    assert.equal(graph.nodes[segmentID].nodeBase, undefined);
    assert.equal(graph.nodes[trackID].nodeBase, undefined);
    assert.equal(graph.nodes[trackID].outputBusId, "928");
    assert.deepEqual(graph.nodes[trackID].busPathIds, [ "928", "500" ]);
    assert.equal(graph.nodes[trackID].authoredBusVolumeDb, -9);
    assert.equal(graph.nodes[trackID].authoredBusMakeUpGainDb, 5);
    assert.equal(graph.nodes[trackID].authoredOutputBusVolumeDb, 4);
    assert.deepEqual(graph.nodes[trackID].rtpcCurves, [ {
        rtpc: "music_intensity",
        scope: "global",
        property: "volume",
        scaling: 2,
        defaultValue: 0.25,
        points: [
            { x: 0, value: -1, interpolation: 4 },
            { x: 1, value: 0, interpolation: 4 },
        ],
    } ]);
});

test("music event projection follows typed targets across every bank", () =>
{
    const result = CjsAudioLibraryBuilder.createMusicEventProjection({
        inspections: [
            {
                source: "music.bnk",
                hirc: [],
            },
            {
                source: "dungeons.bnk",
                hirc: [
                    {
                        typeName: "event-action",
                        id: 10,
                        actionType: 0x0403,
                        targetId: 1000,
                    },
                    {
                        typeName: "event-action",
                        id: 11,
                        actionType: 0x0103,
                        targetId: 1000,
                    },
                    {
                        typeName: "event-action",
                        id: 12,
                        actionType: 0x1901,
                        targetId: 66,
                        action: {
                            actionType: 0x1901,
                            actionName: "set-switch",
                            actionFamily: 0x19,
                            targetId: 66,
                            groupId: 55,
                            valueId: 66,
                            delayTimeMs: 200,
                            properties: [ {
                                id: 0x39,
                                value: 200,
                                rawValue: 200,
                            } ],
                            ranges: [],
                        },
                        payload: setterPayload(55, 66),
                    },
                    {
                        typeName: "event-action",
                        id: 13,
                        actionType: 0x1901,
                        targetId: 88,
                        action: {
                            groupId: 77,
                            valueId: 88,
                            delayTimeMs: 100,
                            delayRangeMs: { min: 0, max: 50 },
                            probability: 50,
                        },
                        payload: setterPayload(77, 88),
                    },
                    {
                        typeName: "event",
                        id: 100,
                        actionIds: [ 10 ],
                    },
                    {
                        typeName: "event",
                        id: 101,
                        actionIds: [ 11 ],
                    },
                    {
                        typeName: "event",
                        id: 102,
                        actionIds: [ 12 ],
                    },
                    {
                        typeName: "event",
                        id: 103,
                        actionIds: [ 13 ],
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                dungeon_enter: { eventID: 100 },
                dungeon_leave: { eventID: 101 },
                danger: { eventID: 102 },
                unrelated_switch: { eventID: 103 },
            },
        },
        nodes: {
            "1000": {
                type: "music-switch-container",
                argumentGroups: [
                    { groupId: 55, groupType: 0 },
                ],
            },
        },
    });

    assert.deepEqual(result, {
        eventTargets: {
            dungeon_enter: [ 1000 ],
        },
        eventStops: {
            dungeon_leave: [ 1000 ],
        },
        switchSetters: {
            danger: [
                {
                    kind: "switch",
                    groupId: 55,
                    targetId: 66,
                    delayMs: 200,
                },
            ],
        },
    });
});

test("music setter typed fields must agree with retained raw payloads", () =>
{
    assert.throws(
        () => CjsAudioLibraryBuilder.createMusicEventProjection({
            inspections: [
                {
                    source: "music.bnk",
                    hirc: [
                        {
                            typeName: "event-action",
                            id: 12,
                            actionType: 0x1901,
                            targetId: 0,
                            action: { groupId: 55, valueId: 66 },
                            payload: setterPayload(55, 67),
                        },
                        {
                            typeName: "event",
                            id: 102,
                            actionIds: [ 12 ],
                        },
                    ],
                },
            ],
            metadata: {
                Events: {
                    danger: { eventID: 102 },
                },
            },
            nodes: {
                "1000": {
                    type: "music-switch-container",
                    argumentGroups: [
                        { groupId: 55, groupType: 0 },
                    ],
                },
            },
        }),
        /typed fields disagree with payload/u,
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

test("static Wwise Silence sources lower to exact timed-silence leaves", () =>
{
    const build = ({
        pluginId = 0x00650002,
        durationSeconds = 6.5,
        randomizedPlus = 0,
    } = {}) => CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "effects.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 2,
                        id: 200,
                        pluginId,
                        pluginType: 2,
                        streamType: 0,
                        sourceId: 900,
                        inMemoryMediaSize: 0,
                        payload: soundPayload({
                            pluginId,
                            sourceId: 900,
                            inMemoryMediaSize: 0,
                            properties: [ { id: 34, value: 7.5 } ],
                        }),
                    },
                    {
                        type: 17,
                        id: 900,
                        payload: silenceSourceEffectPayload({
                            pluginId,
                            durationSeconds,
                            randomizedPlus,
                        }),
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
                authored_wait: { eventID: 100 },
            },
        },
        media: {},
    });
    const result = build();

    assert.deepEqual(result.events.authored_wait, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.nodes["200"], {
        type: "timed-silence",
        durationMs: 6500,
        initialDelayMs: 7500,
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);

    const randomized = build({ randomizedPlus: 1 });

    assert.equal(randomized.events.authored_wait, undefined);
    assert.match(
        randomized.diagnostics.omittedEvents[0].reason,
        /not a static positive duration/u,
    );

    const audioInput = build({ pluginId: 0x00c80002 });

    assert.equal(audioInput.events.authored_wait, undefined);
    assert.match(
        audioInput.diagnostics.omittedEvents[0].reason,
        /source plug-in sound 200/u,
    );
});

test("typed Wwise Play action timing survives SFX lowering", () =>
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
                        action: {
                            delayTimeMs: 100,
                            delayRangeMs: { min: -50, max: 100 },
                            transitionTimeMs: 250,
                            transitionRangeMs: { min: -25, max: 50 },
                            probability: 50,
                            fadeCurve: 8,
                        },
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
        {
            nodeId: "200",
            delayMs: 100,
            delayRangeMs: { min: -50, max: 100 },
            probability: 50,
            fadeInMs: 250,
            fadeInRangeMs: { min: -25, max: 50 },
            fadeCurve: 8,
        },
    ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX lowering preserves inherited NodeBase playback properties", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 7,
                        id: 150,
                        payload: actorMixerPayload({
                            properties: [
                                { id: 0, value: -3 },
                                { id: 1, value: 100 },
                                { id: 2, value: 10 },
                                { id: 3, value: 5 },
                                { id: 34, value: 0.1 },
                            ],
                            ranges: [
                                { id: 0, min: -1, max: 1 },
                                { id: 2, min: -2, max: 2 },
                            ],
                            children: [ 200 ],
                        }),
                    },
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            directParentId: 150,
                            properties: [
                                { id: 0, value: -2 },
                                { id: 1, value: 200 },
                                { id: 2, value: 20 },
                                { id: 3, value: 10 },
                                { id: 34, value: 0.2 },
                            ],
                            ranges: [
                                { id: 1, min: -50, max: 50 },
                                { id: 3, min: -3, max: 3 },
                                { id: 34, min: 0, max: 0.05 },
                            ],
                        }),
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

    assert.deepEqual(result.nodes["200"], {
        type: "sound",
        mediaId: "9001",
        matchIds: [ "200", "150" ],
        gainDb: -5,
        gainDbRanges: [
            { min: -1, max: 1 },
        ],
        pitchCents: 300,
        pitchCentsRanges: [
            { min: -50, max: 50 },
        ],
        lowPass: 30,
        lowPassRanges: [
            { min: -2, max: 2 },
        ],
        highPass: 15,
        highPassRanges: [
            { min: -3, max: 3 },
        ],
        initialDelayMs: 300.00000447034836,
        initialDelayRangesMs: [
            { min: 0, max: 50.00000074505806 },
        ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX lowering projects only route-qualified cap-one Sound limits", () =>
{
    const openBus = {
        overrideBusId: 0,
        policy: { maxInstances: 0 },
        rtpcs: [],
        busVolume: null,
        makeUpGain: null,
    };
    const cappedBus = {
        ...openBus,
        policy: { maxInstances: 2 },
    };
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "common.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 7,
                    id: 150,
                    payload: actorMixerPayload({
                        advancedFlags: 0x10,
                        belowThresholdBehavior: 2,
                        children: [ 201 ],
                    }),
                },
                {
                    type: 7,
                    id: 151,
                    payload: actorMixerPayload({
                        directParentId: 206,
                        overrideBusId: 500,
                    }),
                },
                {
                    type: 7,
                    id: 152,
                    payload: actorMixerPayload({
                        overrideBusId: 500,
                        ranges: [ { id: 34, min: 0, max: 0.005 } ],
                        children: [ 207 ],
                    }),
                },
                ...[
                    [ 200, 0, 500, [] ],
                    [ 201, 150, 500, [] ],
                    [ 202, 0, 501, [] ],
                    [ 203, 0, 500, [ { id: 6, min: 0, max: 1 } ] ],
                    [ 204, 0, 500, [] ],
                    [ 205, 0, 500, [] ],
                    [ 206, 151, 500, [] ],
                    [ 207, 152, 500,
                        [ { id: 34, min: 0, max: 0.005 } ] ],
                ].map(([ id, directParentId, overrideBusId, ranges ]) => ({
                    type: 2,
                    id,
                    pluginId: 0x00040001,
                    pluginType: 1,
                    streamType: 0,
                    sourceId: 9001,
                    inMemoryMediaSize: 64,
                    payload: soundPayload({
                        directParentId,
                        overrideBusId,
                        properties: id === 204
                            ? [ { id: 34, value: 0.01 } ]
                            : id === 207
                                ? [ { id: 34, value: -0.007 } ]
                                : [],
                        ranges,
                        advancedFlags: 0x09,
                        maxInstances: 1,
                    }),
                })),
                ...[ 200, 201, 202, 203, 204, 205, 206, 207 ]
                    .map((targetId, index) => ({
                        type: 3,
                        id: 300 + index,
                        actionType: 0x0403,
                        targetId,
                        ...(targetId === 205
                            ? { action: { delayTimeMs: 10 } }
                            : {}),
                        payload: new Uint8Array(),
                    })),
                {
                    type: 4,
                    id: 100,
                    actionIds: [
                        300, 301, 302, 303, 304, 305, 306, 307,
                    ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: { capped_sounds: { eventID: 100 } },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
        buses: new Map([
            [ 500, openBus ],
            [ 501, cappedBus ],
        ]),
    });

    assert.deepEqual(result.nodes["200"].voiceLimit, {
        counterId: "200",
        scope: "game-object",
        maxInstances: 1,
        behavior: "reject-newest",
    });
    assert.equal(result.nodes["201"].voiceLimit, undefined,
        "inherited virtual behavior is not approximated");
    assert.equal(result.nodes["202"].voiceLimit, undefined,
        "an independent bus cap keeps the Sound policy unresolved");
    assert.equal(result.nodes["203"].voiceLimit, undefined,
        "randomized Priority keeps the kill-newest choice unresolved");
    assert.equal(result.nodes["204"].voiceLimit, undefined,
        "positive Initial Delay is admitted later than selection time");
    assert.equal(result.nodes["205"].voiceLimit, undefined,
        "positive Play-action delay is admitted later than selection time");
    assert.equal(result.nodes["206"].voiceLimit, undefined,
        "cyclic NodeBase ancestry cannot qualify an effective policy");
    assert.equal(result.nodes["207"].voiceLimit, undefined,
        "inherited Initial Delay randomizers combine before qualification");
});

test("Sound limit qualification follows priority, bus, and future scheduling", () =>
{
    const openBus = {
        overrideBusId: 0,
        policy: { maxInstances: 0 },
        rtpcs: [],
        busVolume: null,
        makeUpGain: null,
    };
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "common.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 7,
                    id: 150,
                    payload: actorMixerPayload({
                        advancedFlags: 0x10,
                        belowThresholdBehavior: 2,
                        children: [ 151 ],
                    }),
                },
                {
                    type: 7,
                    id: 151,
                    payload: actorMixerPayload({
                        directParentId: 150,
                        advancedFlags: 0x10,
                        belowThresholdBehavior: 0,
                        children: [ 200 ],
                    }),
                },
                ...[
                    {
                        id: 200,
                        directParentId: 151,
                    },
                    {
                        id: 201,
                        rtpcs: [ {
                            controlId: 700,
                            parameterId: 6,
                            scaling: 0,
                            points: [ [ 0, 0, 4 ] ],
                        } ],
                    },
                    {
                        id: 202,
                        stateProperties: [ {
                            propertyId: 6,
                            accumulation: 2,
                            inDb: false,
                        } ],
                        stateGroups: [ {
                            groupId: 600,
                            states: [ {
                                stateId: 601,
                                values: [ {
                                    propertyId: 6,
                                    value: 1,
                                } ],
                            } ],
                        } ],
                    },
                    { id: 203, overrideBusId: 511 },
                    { id: 204, overrideBusId: 520 },
                    { id: 205 },
                    { id: 206 },
                ].map(options => ({
                    type: 2,
                    id: options.id,
                    pluginId: 0x00040001,
                    pluginType: 1,
                    streamType: 0,
                    sourceId: 9001,
                    inMemoryMediaSize: 64,
                    payload: soundPayload({
                        overrideBusId: options.overrideBusId ?? 500,
                        directParentId: options.directParentId ?? 0,
                        rtpcs: options.rtpcs ?? [],
                        stateProperties: options.stateProperties ?? [],
                        stateGroups: options.stateGroups ?? [],
                        advancedFlags: 0x09,
                        maxInstances: 1,
                    }),
                })),
                {
                    type: 5,
                    id: 220,
                    payload: randomSequencePayload({
                        childID: 205,
                        transitionTime: 100,
                        transitionMode: 3,
                        flags: 0x08,
                    }),
                },
                {
                    type: 5,
                    id: 221,
                    payload: randomSequencePayload({
                        childID: 206,
                        transitionTime: 100,
                        transitionMode: 1,
                        flags: 0x08,
                    }),
                },
                ...[ 200, 201, 202, 203, 204, 220, 221 ]
                    .map((targetId, index) => ({
                        type: 3,
                        id: 300 + index,
                        actionType: 0x0403,
                        targetId,
                        payload: new Uint8Array(),
                    })),
                {
                    type: 4,
                    id: 100,
                    actionIds: [ 300, 301, 302, 303, 304, 305, 306 ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: { capped_sounds: { eventID: 100 } },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "1",
                    ShortName: "common",
                    GameParameters: [ { Id: "700", Name: "priority" } ],
                    StateGroups: [ {
                        Id: "600",
                        Name: "priority_state",
                        States: [ { Id: "601", Name: "active" } ],
                    } ],
                } ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
        buses: new Map([
            [ 500, openBus ],
            [ 510, { ...openBus, policy: { maxInstances: 2 } } ],
            [ 511, { ...openBus, overrideBusId: 510 } ],
            [ 520, {
                ...openBus,
                rtpcs: [ { parameterId: 53 } ],
            } ],
        ]),
    });

    assert.deepEqual(result.nodes["200"].voiceLimit, {
        counterId: "200",
        scope: "game-object",
        maxInstances: 1,
        behavior: "reject-newest",
    }, "the nearest virtual override wins over a more distant ancestor");
    assert.equal(result.nodes["201"].voiceLimit, undefined,
        "Priority RTPCs keep reject-newest arbitration unresolved");
    assert.equal(result.nodes["202"].voiceLimit, undefined,
        "Priority State mutations keep reject-newest arbitration unresolved");
    assert.equal(result.nodes["203"].voiceLimit, undefined,
        "an ancestor Audio Bus cap keeps Sound admission unresolved");
    assert.equal(result.nodes["204"].voiceLimit, undefined,
        "a MaxNumInstances RTPC keeps Sound admission unresolved");
    assert.equal(result.nodes["205"].voiceLimit, undefined,
        "Continuous Delay admits the Sound at a future boundary");
    assert.equal(result.nodes["206"].voiceLimit, undefined,
        "Continuous Crossfade prefetches before Sound admission");
});

test("SFX lowering projects only wholly supported Immediate state properties", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 7,
                        id: 150,
                        payload: actorMixerPayload({
                            stateProperties: [
                                { propertyId: 0, accumulation: 2 },
                            ],
                            stateGroups: [
                                {
                                    groupId: 600,
                                    states: [
                                        {
                                            stateId: 601,
                                            values: [
                                                {
                                                    propertyId: 0,
                                                    value: -6,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                            children: [ 200 ],
                        }),
                    },
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            directParentId: 150,
                            stateProperties: [
                                { propertyId: 1, accumulation: 2 },
                            ],
                            stateGroups: [
                                {
                                    groupId: 600,
                                    states: [
                                        {
                                            stateId: 601,
                                            values: [
                                                {
                                                    propertyId: 1,
                                                    value: 1200,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 201,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9002,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            stateProperties: [
                                { propertyId: 2, accumulation: 6 },
                            ],
                            stateGroups: [
                                {
                                    groupId: 600,
                                    states: [
                                        {
                                            stateId: 601,
                                            values: [
                                                {
                                                    propertyId: 2,
                                                    value: 4,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 201,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 202,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9003,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            stateProperties: [
                                { propertyId: 0, accumulation: 2 },
                                { propertyId: 5, accumulation: 2 },
                            ],
                            stateGroups: [
                                {
                                    groupId: 600,
                                    states: [
                                        {
                                            stateId: 601,
                                            values: [
                                                {
                                                    propertyId: 0,
                                                    value: -6,
                                                },
                                                {
                                                    propertyId: 5,
                                                    value: -12,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0403,
                        targetId: 202,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                weapon_fire: { eventID: 100 },
                filtered_fire: { eventID: 101 },
                unsupported_state_fire: { eventID: 102 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        StateGroups: [
                            {
                                Id: "600",
                                Name: "combat",
                                States: [
                                    { Id: "601", Name: "danger" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
            "9003": { resPath: "res:/audio/9003.wem" },
        },
    });

    assert.deepEqual(result.nodes["200"].stateProperties, [
        {
            group: "combat",
            cases: {
                danger: { gainDb: -6 },
            },
        },
        {
            group: "combat",
            cases: {
                danger: { pitchCents: 1200 },
            },
        },
    ]);
    assert.deepEqual(result.nodes["201"].stateProperties, [
        {
            group: "combat",
            cases: {
                danger: { lowPass: 4 },
            },
        },
    ]);
    assert.deepEqual(result.events.filtered_fire, [
        { nodeId: "201" },
    ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
    assert.deepEqual(result.events.unsupported_state_fire, [
        { nodeId: "202" },
    ]);
    assert.deepEqual(result.nodes["202"], {
        type: "sound",
        mediaId: "9003",
    });
});

test("SFX lowering preserves exact NodeBase RTPC accumulation modes", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 7,
                        id: 150,
                        payload: actorMixerPayload({
                            rtpcs: [
                                {
                                    controlId: 700,
                                    parameterId: 0,
                                    scaling: 2,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, -0.5, 4 ],
                                    ],
                                },
                                {
                                    controlId: 701,
                                    parameterId: 1,
                                    scaling: 0,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, 600, 4 ],
                                    ],
                                },
                            ],
                            children: [ 200 ],
                        }),
                    },
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            directParentId: 150,
                            rtpcs: [
                                {
                                    controlId: 701,
                                    parameterId: 1,
                                    scaling: 0,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, 600, 4 ],
                                    ],
                                },
                                {
                                    controlId: 702,
                                    parameterId: 34,
                                    accumulation: 2,
                                    scaling: 0,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, 0.25, 4 ],
                                    ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 201,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9002,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            rtpcs: [
                                {
                                    controlId: 700,
                                    parameterId: 0,
                                    scaling: 2,
                                    points: [ [ 0, 0, 4 ] ],
                                },
                                {
                                    controlId: 700,
                                    parameterId: 2,
                                    accumulation: 6,
                                    scaling: 0,
                                    points: [ [ 0, 1, 4 ] ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 201,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 202,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9003,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            rtpcs: [
                                {
                                    controlId: 700,
                                    parameterId: 0,
                                    scaling: 0,
                                    points: [ [ 0, 0, 4 ] ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0403,
                        targetId: 202,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 203,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9004,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            rtpcs: [
                                {
                                    controlId: 700,
                                    parameterId: 5,
                                    scaling: 0,
                                    points: [ [ 0, 0, 4 ] ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x0403,
                        targetId: 203,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 2,
                        id: 204,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9005,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({
                            rtpcs: [
                                {
                                    controlId: 700,
                                    controlType: 1,
                                    parameterId: 0,
                                    scaling: 2,
                                    points: [ [ 0, 0, 4 ] ],
                                },
                            ],
                        }),
                    },
                    {
                        type: 3,
                        id: 304,
                        actionType: 0x0403,
                        targetId: 204,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 103,
                        actionIds: [ 303 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 104,
                        actionIds: [ 304 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                engine_play: { eventID: 100 },
                filtered_play: { eventID: 101 },
                invalid_play: { eventID: 102 },
                unsupported_property_play: { eventID: 103 },
                unsupported_control_play: { eventID: 104 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        GameParameters: [
                            { Id: "700", Name: "engine_load" },
                            { Id: "701", Name: "engine_speed" },
                        ],
                    },
                ],
            },
        },
        enrichment: {
            gameParameters: {
                700: { defaultValue: 0.25 },
                701: { defaultValue: 0.5 },
                702: {
                    name: "impact_delay",
                    defaultValue: 0.75,
                },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
            "9003": { resPath: "res:/audio/9003.wem" },
            "9004": { resPath: "res:/audio/9004.wem" },
            "9005": { resPath: "res:/audio/9005.wem" },
        },
    });

    assert.deepEqual(result.nodes["200"].rtpcCurves, [
        {
            rtpc: "engine_load",
            scope: "object",
            property: "volume",
            scaling: 2,
            defaultValue: 0.25,
            points: [
                { x: 0, value: 0, interpolation: 4 },
                { x: 1, value: -0.5, interpolation: 4 },
            ],
        },
        {
            rtpc: "engine_speed",
            scope: "object",
            property: "pitch",
            scaling: 0,
            defaultValue: 0.5,
            points: [
                { x: 0, value: 0, interpolation: 4 },
                { x: 1, value: 600, interpolation: 4 },
            ],
        },
        {
            rtpc: "engine_speed",
            scope: "object",
            property: "pitch",
            scaling: 0,
            defaultValue: 0.5,
            points: [
                { x: 0, value: 0, interpolation: 4 },
                { x: 1, value: 600, interpolation: 4 },
            ],
        },
        {
            rtpc: "impact_delay",
            scope: "object",
            property: "initialDelay",
            scaling: 0,
            defaultValue: 0.75,
            points: [
                { x: 0, value: 0, interpolation: 4 },
                { x: 1, value: 0.25, interpolation: 4 },
            ],
        },
    ]);
    assert.deepEqual(result.nodes["201"].rtpcCurves, [
        {
            rtpc: "engine_load",
            scope: "object",
            property: "volume",
            scaling: 2,
            defaultValue: 0.25,
            points: [
                { x: 0, value: 0, interpolation: 4 },
            ],
        },
        {
            rtpc: "engine_load",
            scope: "object",
            property: "lowPass",
            scaling: 0,
            defaultValue: 0.25,
            points: [
                { x: 0, value: 1, interpolation: 4 },
            ],
        },
    ]);
    assert.deepEqual(result.events.filtered_play, [
        { nodeId: "201" },
    ]);
    assert.equal(result.events.invalid_play, undefined);
    assert.deepEqual(result.events.unsupported_property_play, [
        { nodeId: "203" },
    ]);
    assert.deepEqual(result.events.unsupported_control_play, [
        { nodeId: "204" },
    ]);
    assert.equal(result.nodes["202"], undefined);
    assert.deepEqual(result.nodes["203"], {
        type: "sound",
        mediaId: "9004",
    });
    assert.deepEqual(result.nodes["204"], {
        type: "sound",
        mediaId: "9005",
    });
    assert.deepEqual(result.diagnostics.omittedEvents, [
        {
            id: 102,
            name: "invalid_play",
            reason: "unsupported volume RTPC scaling 0",
        },
    ]);
});

test("typed Wwise infinite Sound loops survive SFX lowering", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            loopCount: 0,
                        }),
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
                ambience_play: {
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

    assert.deepEqual(result.diagnostics.parser.nodeBaseFailed, []);
    assert.deepEqual(result.nodes["200"], {
        type: "sound",
        mediaId: "9001",
        loop: true,
    });
});

test("typed Wwise finite Sound play counts survive SFX lowering", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            loopCount: 2,
                        }),
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
                repeated_shot: {
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

    assert.deepEqual(result.diagnostics.parser.nodeBaseFailed, []);
    assert.deepEqual(result.nodes["200"], {
        type: "sound",
        mediaId: "9001",
        loop: false,
        playCount: 2,
    });
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

test("SFX node cycles are diagnosed instead of recursing", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "common.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 5,
                    id: 201,
                    payload: randomSequencePayload({ childID: 202 }),
                },
                {
                    type: 5,
                    id: 202,
                    payload: randomSequencePayload({ childID: 201 }),
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
        } ],
        metadata: {
            Events: { cyclic_play: { eventID: 100 } },
        },
        media: {},
    });

    assert.deepEqual(result.events, {});
    assert.deepEqual(result.nodes, {});
    assert.match(
        result.diagnostics.omittedEvents[0].reason,
        /cycle at node (201|202)/u,
    );
});

test("SFX node lowering reuses shared DAG summaries and output nodes", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
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
                    id: 203,
                    payload: randomSequencePayload({
                        childID: 200,
                        flags: 0x08,
                    }),
                },
                {
                    type: 5,
                    id: 201,
                    payload: randomSequencePayload({ childID: 203 }),
                },
                {
                    type: 5,
                    id: 202,
                    payload: randomSequencePayload({ childID: 203 }),
                },
                {
                    type: 3,
                    id: 300,
                    actionType: 0x0403,
                    targetId: 201,
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 301,
                    actionType: 0x0403,
                    targetId: 202,
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 100,
                    actionIds: [ 300, 301 ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: { shared_play: { eventID: 100 } },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(result.events.shared_play, [
        { nodeId: "201" },
        { nodeId: "202" },
    ]);
    assert.equal(result.nodes["201"].children[0].nodeId, "203");
    assert.equal(result.nodes["202"].children[0].nodeId, "203");
    assert.deepEqual(Object.keys(result.nodes), [ "200", "201", "202", "203" ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX node lowering preserves descending synthetic allocation order", () =>
{
    const sound = (id, sourceId) => ({
        type: 2,
        id,
        pluginId: 0x00040001,
        pluginType: 1,
        streamType: 0,
        sourceId,
        inMemoryMediaSize: 64,
        payload: new Uint8Array(),
    });
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "common.bnk",
            bankVersion: 150,
            hirc: [
                sound(200, 9001),
                sound(202, 9002),
                {
                    type: 6,
                    id: 201,
                    payload: switchPayload({
                        children: [ 200, 202 ],
                        assignments: [ {
                            valueId: 501,
                            childIds: [ 200, 202 ],
                        } ],
                        defaultValueId: 502,
                        parameters: [],
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
        } ],
        metadata: {
            Events: { switched_play: { eventID: 100 } },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "1",
                    ShortName: "common",
                    SwitchGroups: [ {
                        Id: "500",
                        Name: "variant",
                        Switches: [
                            { Id: "501", Name: "shared" },
                            { Id: "502", Name: "missing" },
                        ],
                    } ],
                } ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    assert.deepEqual(result.nodes["4294967295"], {
        type: "parallel",
        children: [ { nodeId: "200" }, { nodeId: "202" } ],
    });
    assert.deepEqual(result.nodes["4294967294"], { type: "silence" });
    assert.deepEqual(result.nodes["201"].cases.shared, {
        nodeId: "4294967295",
    });
    assert.deepEqual(result.nodes["201"].default, {
        nodeId: "4294967294",
    });
});

test("Continuous Random and Sequence containers preserve supported scheduling", () =>
{
    const build = payload => CjsAudioLibraryBuilder.createSfxGraph({
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
                        payload,
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
                ambience_play: {
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
    const random = build(randomSequencePayload({
        childID: 200,
        loopCount: 0,
        transitionTime: 5000,
        transitionTimeModMin: 0,
        transitionTimeModMax: 15000,
        transitionMode: 3,
        flags: 0x18,
    }));

    assert.deepEqual(random.nodes["201"], {
        type: "random",
        scope: "object",
        children: [ { nodeId: "200" } ],
        mode: "random",
        avoidRepeat: 0,
        continuous: {
            loopCount: 0,
            transition: "delay",
            transitionMs: 5000,
            transitionRangeMs: {
                min: 0,
                max: 15000,
            },
        },
    });
    assert.deepEqual(random.diagnostics.omittedEvents, []);

    const sequence = build(randomSequencePayload({
        childID: 200,
        loopCount: 4,
        containerMode: 1,
        flags: 0x0a,
    }));

    assert.deepEqual(sequence.nodes["201"], {
        type: "sequence",
        scope: "object",
        children: [ { nodeId: "200" } ],
        continuous: {
            loopCount: 4,
            transition: "disabled",
            resetPlaylistEachPlay: true,
        },
    });

    const triggerRate = build(randomSequencePayload({
        childID: 200,
        loopCount: 0,
        transitionTime: 3000,
        transitionTimeModMin: -1500,
        transitionTimeModMax: 2000,
        transitionMode: 5,
        flags: 0x1a,
    }));

    assert.deepEqual(triggerRate.nodes["201"], {
        type: "random",
        scope: "object",
        children: [ { nodeId: "200" } ],
        mode: "random",
        avoidRepeat: 0,
        continuous: {
            loopCount: 0,
            transition: "trigger-rate",
            transitionMs: 3000,
            transitionRangeMs: {
                min: -1500,
                max: 2000,
            },
        },
    });
    assert.deepEqual(triggerRate.diagnostics.omittedEvents, []);

    for (const [ transitionMode, transition ] of [
        [ 1, "crossfade-amplitude" ],
        [ 2, "crossfade-power" ],
    ])
    {
        const crossfade = build(randomSequencePayload({
            childID: 200,
            transitionTime: 1000,
            transitionTimeModMin: -100,
            transitionTimeModMax: 250,
            transitionMode,
            flags: 0x08,
        }));

        assert.deepEqual(crossfade.nodes["201"].continuous, {
            loopCount: 1,
            transition,
            transitionMs: 1000,
            transitionRangeMs: {
                min: -100,
                max: 250,
            },
        });
        assert.equal(
            crossfade.nodes["200"].loop,
            false,
            "Crossfade qualification serializes its finite leaf guarantee",
        );
        assert.deepEqual(crossfade.diagnostics.omittedEvents, []);
    }

    const oversized = build(randomSequencePayload({
        childID: 200,
        loopCount: 32768,
        flags: 0x08,
    }));

    assert.equal(oversized.events.ambience_play, undefined);
    assert.match(
        oversized.diagnostics.omittedEvents[0].reason,
        /continuous loop count exceeds 32767/u,
    );
});

test("transitively nested Continuous containers are omitted per event", () =>
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
                        id: 203,
                        payload: randomSequencePayload({
                            childID: 200,
                            flags: 0x08,
                        }),
                    },
                    {
                        type: 5,
                        id: 202,
                        payload: randomSequencePayload({
                            childID: 203,
                            flags: 0,
                        }),
                    },
                    {
                        type: 5,
                        id: 201,
                        payload: randomSequencePayload({
                            childID: 202,
                            flags: 0x08,
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
                nested_play: { eventID: 100 },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.equal(result.events.nested_play, undefined);
    assert.equal(result.programs.nested_play, undefined);
    assert.match(
        result.diagnostics.omittedEvents[0].reason,
        /nested continuous container 201/u,
    );
});

test("one-pass Trigger Rate bursts under an infinite Delay are retained", () =>
{
    const build = ({ innerNodeBase = null } = {}) =>
        CjsAudioLibraryBuilder.createSfxGraph({
            inspections: [
                {
                    source: "common.bnk",
                    bankVersion: 150,
                    hirc: [
                        ...[ 200, 201, 202 ].map((id, index) => ({
                            type: 2,
                            id,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001 + index,
                            inMemoryMediaSize: 64,
                            payload: new Uint8Array(),
                        })),
                        {
                            type: 5,
                            id: 210,
                            payload: randomSequencePayload({
                                nodeBase: innerNodeBase,
                                childIDs: [ 200, 201, 202 ],
                                loopCount: 1,
                                transitionTime: 2000,
                                transitionMode: 5,
                                containerMode: 1,
                                flags: 0x1a,
                            }),
                        },
                        {
                            type: 5,
                            id: 220,
                            payload: randomSequencePayload({
                                childID: 210,
                                loopCount: 0,
                                transitionTime: 60000,
                                transitionMode: 3,
                                containerMode: 1,
                                flags: 0x0a,
                            }),
                        },
                        {
                            type: 3,
                            id: 300,
                            actionType: 0x0403,
                            targetId: 220,
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
                    warning_play: { eventID: 100 },
                },
            },
            media: {
                "9001": { resPath: "res:/audio/9001.wem" },
                "9002": { resPath: "res:/audio/9002.wem" },
                "9003": { resPath: "res:/audio/9003.wem" },
            },
        });
    const result = build();

    assert.deepEqual(result.events.warning_play, [ { nodeId: "220" } ]);
    assert.deepEqual(result.nodes["220"].continuous, {
        loopCount: 0,
        transition: "delay",
        transitionMs: 60000,
        resetPlaylistEachPlay: true,
    });
    assert.deepEqual(result.nodes["210"].continuous, {
        loopCount: 1,
        transition: "trigger-rate",
        transitionMs: 2000,
        resetPlaylistEachPlay: true,
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);

    const modified = build({
        innerNodeBase: nodeBasePayload({
            properties: [ { id: 34, value: 5 } ],
        }),
    });

    assert.equal(modified.events.warning_play, undefined);
    assert.match(
        modified.diagnostics.omittedEvents[0].reason,
        /nested continuous container 220/u,
    );
});

test("one-pass amplitude Crossfades under a Random Delay are retained narrowly", () =>
{
    const build = ({ dynamicInner = false } = {}) =>
        CjsAudioLibraryBuilder.createSfxGraph({
            inspections: [ {
                source: "stations.bnk",
                bankVersion: 150,
                hirc: [
                    ...[ 200, 201 ].map((id, index) => ({
                        type: 2,
                        id,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001 + index,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    })),
                    {
                        type: 5,
                        id: 230,
                        payload: randomSequencePayload({
                            childID: 200,
                            containerMode: 0,
                            flags: 0x10,
                        }),
                    },
                    {
                        type: 5,
                        id: 240,
                        payload: randomSequencePayload({
                            nodeBase: nodeBasePayload({
                                properties: [ { id: 34, value: 2 } ],
                            }),
                            childID: 201,
                            containerMode: 0,
                            flags: 0x10,
                        }),
                    },
                    {
                        type: 5,
                        id: 210,
                        payload: randomSequencePayload({
                            nodeBase: nodeBasePayload({
                                properties: [
                                    { id: 0, value: -1 },
                                    { id: 34, value: 2 },
                                ],
                                ranges: dynamicInner
                                    ? [ { id: 0, min: -1, max: 1 } ]
                                    : [],
                            }),
                            childIDs: [ 230, 240 ],
                            loopCount: 1,
                            transitionTime: 2000,
                            transitionTimeModMax: 20000,
                            transitionMode: 1,
                            containerMode: 1,
                            flags: 0x18,
                        }),
                    },
                    {
                        type: 5,
                        id: 220,
                        payload: randomSequencePayload({
                            childID: 210,
                            loopCount: 0,
                            transitionTime: 15000,
                            transitionTimeModMax: 30000,
                            transitionMode: 3,
                            containerMode: 0,
                            flags: 0x1a,
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 220,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                ],
            } ],
            metadata: {
                Events: { incidentals_play: { eventID: 100 } },
            },
            media: {
                "9001": { resPath: "res:/audio/9001.wem" },
                "9002": { resPath: "res:/audio/9002.wem" },
            },
        });
    const result = build();

    assert.deepEqual(result.events.incidentals_play, [ { nodeId: "220" } ]);
    assert.equal(result.nodes["210"].gainDb, -1);
    assert.equal(result.nodes["210"].initialDelayMs, 2000);
    assert.deepEqual(result.nodes["210"].continuous, {
        loopCount: 1,
        transition: "crossfade-amplitude",
        transitionMs: 2000,
        transitionRangeMs: { min: 0, max: 20000 },
        resetPlaylistEachPlay: false,
    });

    const dynamic = build({ dynamicInner: true });

    assert.equal(dynamic.events.incidentals_play, undefined);
    assert.match(
        dynamic.diagnostics.omittedEvents[0].reason,
        /nested continuous container 220/u,
    );
});

test("Continuous Random parents absorb all-infinite child clocks", () =>
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
                        sourceId: 9200,
                        inMemoryMediaSize: 64,
                        sourceBits: 0,
                        payload: soundPayload({
                            sourceId: 9200,
                            loopCount: 0,
                        }),
                    },
                    {
                        type: 2,
                        id: 201,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9201,
                        inMemoryMediaSize: 64,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 5,
                        id: 203,
                        payload: randomSequencePayload({
                            childID: 201,
                            loopCount: 0,
                            flags: 0x08,
                        }),
                    },
                    {
                        type: 5,
                        id: 204,
                        payload: randomSequencePayload({
                            childIDs: [ 200, 203 ],
                            loopCount: 0,
                            transitionMode: 0,
                            avoidRepeatCount: 1,
                            flags: 0x08,
                        }),
                    },
                    {
                        type: 5,
                        id: 205,
                        payload: randomSequencePayload({
                            childIDs: [ 203, 201 ],
                            loopCount: 0,
                            transitionMode: 0,
                            flags: 0x08,
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 204,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 205,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                trapped_random_play: { eventID: 100 },
                mixed_random_play: { eventID: 101 },
            },
        },
        media: {
            "9200": { resPath: "res:/audio/9200.wem" },
            "9201": { resPath: "res:/audio/9201.wem" },
        },
    });

    assert.equal(result.nodes["204"].continuous, undefined);
    assert.equal(result.nodes["204"].scope, "object");
    assert.equal(result.nodes["204"].avoidRepeat, 1);
    assert.equal(result.nodes["200"].loop, true);
    assert.equal(result.nodes["203"].continuous.loopCount, 0);
    assert.deepEqual(result.events.trapped_random_play, [
        { nodeId: "204" },
    ]);
    assert.equal(result.events.mixed_random_play, undefined);
    assert.deepEqual(result.diagnostics.omittedEvents, [
        {
            id: 101,
            name: "mixed_random_play",
            reason: "nested continuous container 205",
        },
    ]);
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

test("zero-record Continuous Layers lower to parallel playback", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "hangar.bnk",
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
                        payload: layerPayload([ 200, 202 ], true),
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
                hangar_play: { eventID: 100 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
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

test("zero-association Continuous Layer records lower to parallel playback", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "boosters.bnk",
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
                        payload: trackedLayerPayload({
                            children: [ 200, 202 ],
                            controlId: 3779431979,
                            continuousValidation: true,
                            associations: [],
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
                ship_engine_on: { eventID: 100 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    assert.deepEqual(result.diagnostics.omittedEvents, []);
    assert.deepEqual(result.nodes["201"], {
        type: "parallel",
        children: [
            { nodeId: "200" },
            { nodeId: "202" },
        ],
    });
});

test("associated Continuous Layers remain fail-closed", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "hangar.bnk",
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
                        type: 9,
                        id: 201,
                        payload: trackedLayerPayload({
                            children: [ 200 ],
                            controlId: 800,
                            continuousValidation: true,
                            associations: [
                                {
                                    childId: 200,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, 1, 4 ],
                                    ],
                                },
                            ],
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
                hangar_play: { eventID: 100 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "hangar",
                        GameParameters: [
                            { Id: "800", Name: "hangar_intensity" },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.equal(result.events.hangar_play, undefined);
    assert.equal(result.programs.hangar_play, undefined);
    assert.match(
        result.diagnostics.omittedEvents[0].reason,
        /continuous layer 201/u,
    );
});

test("associated Continuous Layers pre-start only proven infinite children", () =>
{
    const build = (rtpcs = []) => CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "boosters.bnk",
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
                        id: 202,
                        payload: randomSequencePayload({
                            childID: 200,
                            loopCount: 0,
                            transitionTime: 1000,
                            transitionMode: 3,
                            flags: 0x18,
                        }),
                    },
                    {
                        type: 9,
                        id: 201,
                        payload: trackedLayerPayload({
                            children: [ 202 ],
                            controlId: 800,
                            continuousValidation: true,
                            rtpcs,
                            associations: [
                                {
                                    childId: 202,
                                    points: [
                                        [ 0, 0, 5 ],
                                        [ 0.25, 1, 9 ],
                                        [ 1, 1, 5 ],
                                    ],
                                },
                            ],
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
                ship_engine_on: { eventID: 100 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "boosters",
                        GameParameters: [
                            { Id: "800", Name: "ship_thrust" },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });
    const result = build();

    assert.deepEqual(result.diagnostics.omittedEvents, []);
    assert.equal(result.nodes["202"].continuous.loopCount, 0);
    assert.deepEqual(result.nodes["201"], {
        type: "blend",
        children: [
            {
                nodeId: "202",
                gainCurves: [
                    {
                        rtpc: "ship_thrust",
                        scope: "object",
                        points: [
                            { x: 0, gain: 0, interpolation: 5 },
                            { x: 0.25, gain: 1, interpolation: 9 },
                            { x: 1, gain: 1, interpolation: 5 },
                        ],
                    },
                ],
            },
        ],
    });

    const delayed = build([
        {
            controlId: 800,
            parameterId: 34,
            scaling: 0,
            points: [
                [ 0, 0, 4 ],
                [ 1, 100, 4 ],
            ],
        },
    ]);

    assert.equal(delayed.events.ship_engine_on, undefined);
    assert.match(
        delayed.diagnostics.omittedEvents[0].reason,
        /continuous layer InitialDelay RTPC/u,
    );
});

test("Continuous Crossfade fails closed when a child reaches a Layer", () =>
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
                        payload: soundPayload({ sourceId: 9001 }),
                    },
                    {
                        type: 2,
                        id: 203,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9002,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({ sourceId: 9002 }),
                    },
                    {
                        type: 2,
                        id: 204,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9003,
                        inMemoryMediaSize: 64,
                        payload: soundPayload({ loopCount: 0 }),
                    },
                    {
                        type: 9,
                        id: 201,
                        payload: layerPayload([ 200 ]),
                    },
                    {
                        type: 5,
                        id: 202,
                        payload: randomSequencePayload({
                            childID: 201,
                            loopCount: 0,
                            transitionTime: 7000,
                            transitionMode: 1,
                            avoidRepeatCount: 1,
                            flags: 0x1a,
                        }),
                    },
                    {
                        type: 5,
                        id: 205,
                        payload: randomSequencePayload({
                            childID: 201,
                            loopCount: 0,
                            transitionTime: 6000,
                            transitionMode: 1,
                            avoidRepeatCount: 1,
                            flags: 0x1a,
                        }),
                    },
                    {
                        type: 5,
                        id: 206,
                        payload: randomSequencePayload({
                            childID: 201,
                            loopCount: 0,
                            transitionTime: 7000,
                            transitionMode: 1,
                            flags: 0x1a,
                        }),
                    },
                    {
                        type: 5,
                        id: 207,
                        payload: randomSequencePayload({
                            childID: 201,
                            loopCount: 0,
                            transitionTime: 7000,
                            transitionMode: 1,
                            avoidRepeatCount: 1,
                            flags: 0x0a,
                        }),
                    },
                    {
                        type: 5,
                        id: 208,
                        payload: randomSequencePayload({
                            childIDs: [ 201, 200 ],
                            loopCount: 0,
                            transitionTime: 7000,
                            transitionMode: 1,
                            avoidRepeatCount: 1,
                            flags: 0x1a,
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 202,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0403,
                        targetId: 203,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x0403,
                        targetId: 204,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 304,
                        actionType: 0x0403,
                        targetId: 205,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 305,
                        actionType: 0x0403,
                        targetId: 206,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 306,
                        actionType: 0x0403,
                        targetId: 207,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 307,
                        actionType: 0x0403,
                        targetId: 208,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 300, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 103,
                        actionIds: [ 300, 303 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 104,
                        actionIds: [ 304, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 105,
                        actionIds: [ 305, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 106,
                        actionIds: [ 306, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 107,
                        actionIds: [ 307, 302 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                ambience_play: {
                    eventID: 100,
                },
                ordinary_play: {
                    eventID: 101,
                },
                shield_drain_play: {
                    eventID: 102,
                },
                looping_sibling_play: {
                    eventID: 103,
                },
                transition_variant_play: {
                    eventID: 104,
                },
                avoid_repeat_variant_play: {
                    eventID: 105,
                },
                local_variant_play: {
                    eventID: 106,
                },
                multiple_branch_variant_play: {
                    eventID: 107,
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
            "9003": {
                resPath: "res:/audio/9003.wem",
            },
        },
    });

    assert.equal(result.events.ambience_play, undefined);
    assert.match(
        result.diagnostics.omittedEvents[0].reason,
        /crossfade container 202 reaches layer 201/u,
    );
    assert.deepEqual(result.events.ordinary_play, [
        { nodeId: "200" },
    ]);
    assert.equal(
        result.nodes["200"].loop,
        undefined,
        "a rejected Crossfade cannot mark a shared ordinary sound finite",
    );
    assert.deepEqual(
        result.diagnostics.omittedEvents.map(entry => entry.name),
        [
            "ambience_play",
            "looping_sibling_play",
            "transition_variant_play",
            "avoid_repeat_variant_play",
            "local_variant_play",
            "multiple_branch_variant_play",
        ],
        JSON.stringify(result.diagnostics.omittedEvents),
    );
    assert.deepEqual(result.events.shield_drain_play, [
        { nodeId: "203" },
    ]);
    assert.deepEqual(result.programs.shield_drain_play, [
        { kind: "play", child: { nodeId: "203" } },
    ]);
    assert.deepEqual(result.diagnostics.approximatedEvents, [
        {
            id: 102,
            name: "shield_drain_play",
            reason: "retained independent Play actions while omitting an unsupported Crossfade-to-Layer action",
            actions: [ { actionId: 300, targetId: 202 } ],
        },
    ]);
});

test("non-continuous Step switches ignore dormant default Stop policies", () =>
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
                        type: 6,
                        id: 201,
                        payload: switchPayload({
                            children: [ 200, 202 ],
                            assignments: [
                                { valueId: 501, childIds: [ 200 ] },
                                { valueId: 502, childIds: [ 202 ] },
                            ],
                            parameters: [
                                { childId: 200, onSwitchMode: 1 },
                                { childId: 202, onSwitchMode: 1 },
                            ],
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
                weapon_impact: { eventID: 100 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "impact_type",
                                Switches: [
                                    { Id: "501", Name: "armor" },
                                    { Id: "502", Name: "shield" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    assert.deepEqual(result.nodes["201"], {
        type: "switch",
        scope: "switch",
        group: "impact_type",
        cases: {
            armor: { nodeId: "200" },
            shield: { nodeId: "202" },
        },
        default: { nodeId: "200" },
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("bounded stripped empty Switch Containers preserve their silent branch", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "modules.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 6,
                    id: 201,
                    payload: switchPayload({
                        groupId: 0,
                        defaultValueId: 0,
                        children: [],
                        assignments: [],
                        parameters: [ {
                            childId: 999,
                            onSwitchMode: 1,
                        } ],
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
        } ],
        metadata: {
            Events: {
                jump_effect: { eventID: 100 },
            },
        },
    });

    assert.deepEqual(
        result.diagnostics.omittedEvents,
        [],
        JSON.stringify(result.diagnostics.omittedEvents),
    );
    assert.deepEqual(result.nodes["201"], { type: "silence" });
    assert.deepEqual(result.programs.jump_effect, [
        { kind: "play", child: { nodeId: "201" } },
    ]);
});

test("Continuous Switches preserve supported child transitions", () =>
{
    const build = (payload) => CjsAudioLibraryBuilder.createSfxGraph({
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
                    { type: 6, id: 201, payload },
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
                weapon_impact: { eventID: 100 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "impact_type",
                                Switches: [
                                    { Id: "501", Name: "armor" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    const continuous = build(switchPayload({
        continuousValidation: true,
        children: [ 200 ],
        assignments: [
            { valueId: 501, childIds: [ 200 ] },
        ],
        parameters: [
            {
                childId: 200,
                onSwitchMode: 1,
                fadeOutMs: 250,
                fadeInMs: 500,
            },
        ],
    }));

    assert.deepEqual(continuous.nodes["201"], {
        type: "switch",
        scope: "switch",
        group: "impact_type",
        cases: {
            armor: { nodeId: "200" },
        },
        default: { nodeId: "200" },
        continuous: {
            transitions: {
                "200": {
                    fadeOutMs: 250,
                    fadeInMs: 500,
                },
            },
        },
    });
    assert.deepEqual(continuous.diagnostics.omittedEvents, []);

    const parallel = build(switchPayload({
        continuousValidation: true,
        children: [ 200, 202 ],
        assignments: [
            { valueId: 501, childIds: [ 200, 202 ] },
        ],
        parameters: [
            {
                childId: 200,
                onSwitchMode: 1,
                fadeOutMs: 100,
                fadeInMs: 200,
            },
            {
                childId: 202,
                onSwitchMode: 1,
                fadeOutMs: 300,
                fadeInMs: 400,
            },
        ],
    }));

    assert.deepEqual(parallel.nodes["201"].continuous.transitions, {
        "200": { fadeOutMs: 100, fadeInMs: 200 },
        "202": { fadeOutMs: 300, fadeInMs: 400 },
    });
    assert.deepEqual(parallel.diagnostics.omittedEvents, []);
    assert.equal(
        build(switchPayload({
            continuousValidation: true,
            children: [ 200 ],
            assignments: [
                { valueId: 501, childIds: [ 200 ] },
            ],
            parameters: [
                { childId: 200, onSwitchMode: 0 },
            ],
        })).diagnostics.omittedEvents[0].reason,
        "unsupported continuous switch 201",
    );
    assert.equal(
        build(switchPayload({
            children: [ 200 ],
            assignments: [
                { valueId: 501, childIds: [ 200 ] },
            ],
            parameters: [
                { childId: 200, onSwitchMode: 1, fadeOutMs: 250 },
            ],
        })).diagnostics.omittedEvents[0].reason,
        "transitioned switch 201",
    );
});

test("non-continuous Layer crossfades lower to live linear-gain curves", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "interface.bnk",
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
                        payload: trackedLayerPayload({
                            children: [ 200, 202 ],
                            controlId: 800,
                            rtpcs: [
                                {
                                    controlId: 801,
                                    parameterId: 1,
                                    scaling: 0,
                                    points: [
                                        [ 0, 0, 4 ],
                                        [ 1, 600, 4 ],
                                    ],
                                },
                                {
                                    controlId: 802,
                                    parameterId: 2,
                                    accumulation: 6,
                                    scaling: 0,
                                    points: [
                                        [ 0, 100, 4 ],
                                        [ 1, 0, 4 ],
                                    ],
                                },
                            ],
                            associations: [
                                {
                                    childId: 200,
                                    points: [
                                        [ 0, 1, 9 ],
                                        [ 1, 1, 5 ],
                                        [ 1, 0, 9 ],
                                    ],
                                },
                                {
                                    childId: 202,
                                    points: [
                                        [ 0, 0, 5 ],
                                        [ 1, 1, 9 ],
                                    ],
                                },
                            ],
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
                engine_blend: { eventID: 100 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "interface",
                        GameParameters: [
                            { Id: "800", Name: "engine_speed" },
                            { Id: "801", Name: "engine_pitch" },
                            { Id: "802", Name: "engine_filter" },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    assert.deepEqual(result.nodes["201"], {
        type: "blend",
        children: [
            {
                nodeId: "200",
                gainCurves: [
                    {
                        rtpc: "engine_speed",
                        scope: "object",
                        points: [
                            { x: 0, gain: 1, interpolation: 9 },
                            { x: 1, gain: 1, interpolation: 5 },
                            { x: 1, gain: 0, interpolation: 9 },
                        ],
                    },
                ],
                rtpcCurves: [
                    {
                        rtpc: "engine_pitch",
                        scope: "object",
                        property: "pitch",
                        scaling: 0,
                        points: [
                            { x: 0, value: 0, interpolation: 4 },
                            { x: 1, value: 600, interpolation: 4 },
                        ],
                    },
                    {
                        rtpc: "engine_filter",
                        scope: "object",
                        property: "lowPass",
                        scaling: 0,
                        points: [
                            { x: 0, value: 100, interpolation: 4 },
                            { x: 1, value: 0, interpolation: 4 },
                        ],
                    },
                ],
            },
            {
                nodeId: "202",
                gainCurves: [
                    {
                        rtpc: "engine_speed",
                        scope: "object",
                        points: [
                            { x: 0, gain: 0, interpolation: 5 },
                            { x: 1, gain: 1, interpolation: 9 },
                        ],
                    },
                ],
                rtpcCurves: [
                    {
                        rtpc: "engine_pitch",
                        scope: "object",
                        property: "pitch",
                        scaling: 0,
                        points: [
                            { x: 0, value: 0, interpolation: 4 },
                            { x: 1, value: 600, interpolation: 4 },
                        ],
                    },
                    {
                        rtpc: "engine_filter",
                        scope: "object",
                        property: "lowPass",
                        scaling: 0,
                        points: [
                            { x: 0, value: 100, interpolation: 4 },
                            { x: 1, value: 0, interpolation: 4 },
                        ],
                    },
                ],
            },
        ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Play-Event actions inline the referenced event program", () =>
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
                        type: 3,
                        id: 301,
                        actionType: 0x2103,
                        targetId: 101,
                        action: {
                            delayTimeMs: 500,
                            delayRangeMs: { min: 0, max: 450 },
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                chained_play: { eventID: 100 },
                direct_play: { eventID: 101 },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.events, {
        chained_play: [
            {
                nodeId: "4294967295",
                delayMs: 500,
                delayRangeMs: { min: 0, max: 450 },
            },
        ],
        direct_play: [ { nodeId: "200" } ],
    });
    assert.deepEqual(result.nodes["4294967295"], {
        type: "parallel",
        children: [ { nodeId: "200" } ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("fixed-delay setters lower while scheduled Play-Event setters fail closed", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x2103,
                        targetId: 101,
                        action: {
                            delayTimeMs: 60000,
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x1901,
                        targetId: 0,
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x1901,
                        targetId: 501,
                        action: {
                            actionType: 0x1901,
                            actionName: "set-switch",
                            actionFamily: 0x19,
                            targetId: 501,
                            groupId: 500,
                            valueId: 501,
                            delayTimeMs: 10000,
                            properties: [ {
                                id: 0x39,
                                value: 10000,
                                rawValue: 10000,
                            } ],
                            ranges: [],
                        },
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                delayed_select: { eventID: 100 },
                select_large: { eventID: 101 },
                delayed_direct: { eventID: 102 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "ship_size",
                                Switches: [
                                    { Id: "501", Name: "large" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    });

    assert.deepEqual(result.programs, {
        delayed_direct: [
            {
                kind: "switch",
                group: "ship_size",
                value: "large",
                delayMs: 10000,
            },
        ],
        select_large: [
            { kind: "switch", group: "ship_size", value: "large" },
        ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, [
        {
            id: 100,
            name: "delayed_select",
            reason: "scheduled Play-Event 300 targets non-play actions",
        },
    ]);
});

test("non-exact setter scheduling remains fail closed", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x1901,
                        targetId: 0,
                        action: {
                            delayTimeMs: 1000,
                            delayRangeMs: { min: 0, max: 500 },
                            properties: [ { id: 0x39 } ],
                            ranges: [ { id: 0x39 } ],
                        },
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x1204,
                        targetId: 0,
                        action: {
                            transitionTimeMs: 1000,
                            properties: [ { id: 0x3a } ],
                            ranges: [],
                        },
                        payload: setterPayload(600, 601),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x1901,
                        targetId: 501,
                        action: {
                            actionType: 0x1901,
                            actionName: "set-switch",
                            actionFamily: 0x19,
                            targetId: 501,
                            groupId: 500,
                            valueId: 501,
                            properties: [ {
                                id: 0x39,
                                value: 1000,
                                rawValue: 1000,
                            } ],
                            ranges: [],
                        },
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x1901,
                        targetId: 501,
                        action: {
                            actionType: 0x1901,
                            actionName: "set-switch",
                            actionFamily: 0x19,
                            targetId: 501,
                            groupId: 500,
                            valueId: 501,
                            delayTimeMs: 1000,
                            properties: [ {
                                id: 0x39,
                                value: 900,
                                rawValue: 900,
                            } ],
                            ranges: [],
                        },
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 103,
                        actionIds: [ 303 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                randomized_switch: { eventID: 100 },
                transitioning_state: { eventID: 101 },
                incomplete_switch: { eventID: 102 },
                mismatched_switch: { eventID: 103 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "ship_size",
                                Switches: [
                                    { Id: "501", Name: "large" },
                                ],
                            },
                        ],
                        StateGroups: [
                            {
                                Id: "600",
                                Name: "weather",
                                States: [
                                    { Id: "601", Name: "storm" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
    });

    assert.deepEqual(result.programs, {});
    assert.deepEqual(result.diagnostics.omittedEvents, [
        {
            id: 100,
            name: "randomized_switch",
            reason: "unsupported scheduled setter action 300",
        },
        {
            id: 101,
            name: "transitioning_state",
            reason: "unsupported scheduled setter action 301",
        },
        {
            id: 102,
            name: "incomplete_switch",
            reason: "incomplete scheduled setter action 302",
        },
        {
            id: 103,
            name: "mismatched_switch",
            reason: "invalid scheduled setter action 303",
        },
    ]);
});

test("SFX SetSwitch and SetState actions lower to named event setters", () =>
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
                        actionType: 0x1901,
                        targetId: 0,
                        action: { groupId: 500, valueId: 501 },
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x1204,
                        targetId: 0,
                        action: { groupId: 600, valueId: 601 },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x1901,
                        targetId: 0,
                        payload: setterPayload(500, 501),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 303 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                select_large: { eventID: 100 },
                set_storm: { eventID: 101 },
                music_select_large: { eventID: 102 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "1",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "ship_size",
                                Switches: [
                                    { Id: "501", Name: "large" },
                                ],
                            },
                        ],
                        StateGroups: [
                            {
                                Id: "600",
                                Name: "weather",
                                States: [
                                    { Id: "601", Name: "storm" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.events, {
        select_large: [ { nodeId: "200" } ],
    });
    assert.deepEqual(result.programs, {
        select_large: [
            { kind: "switch", group: "ship_size", value: "large" },
            { kind: "play", child: { nodeId: "200" } },
        ],
        set_storm: [
            { kind: "state", group: "weather", value: "storm" },
        ],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("complete construction installs a setter-only SFX graph", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {
                select_large: {
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
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "200",
                        ShortName: "common",
                        SwitchGroups: [
                            {
                                Id: "500",
                                Name: "ship_size",
                                Switches: [
                                    { Id: "501", Name: "large" },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        indexEntries: [
            {
                logicalPath: "res:/audio/common.bnk",
                storagePath: "banks/common.bnk",
                byteLength: 128,
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
                            type: 3,
                            id: 300,
                            actionType: 0x1901,
                            targetId: 0,
                            payload: setterPayload(500, 501),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 300 ],
                            payload: new Uint8Array(),
                        },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.sfx.events, {});
    assert.deepEqual(library.sfx.programs, {
        select_large: [
            { kind: "switch", group: "ship_size", value: "large" },
        ],
    });
    assert.deepEqual(library.metadata.Events.select_large, {
        eventID: 100,
        soundbanks: [ "common.bnk" ],
    });
});

test("complete construction carries STMG defaults into Game Parameter actions", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {
                set_timer: {
                    eventID: 100,
                    soundbanks: [ "init.bnk" ],
                },
            },
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "200",
                    ShortName: "init",
                    GameParameters: [ {
                        Id: "800",
                        Name: "ship_Warp_Timer",
                    } ],
                    StateGroups: [ {
                        Id: "600",
                        Name: "ship_state",
                        States: [
                            { Id: "601", Name: "idle" },
                            { Id: "602", Name: "warp" },
                            { Id: "603", Name: "docked" },
                            { Id: "699", Name: "None" },
                        ],
                    } ],
                } ],
            },
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 128,
        } ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    globalSettings: {
                        filterBehavior: 1,
                        stateGroups: [ {
                            id: 600,
                            defaultTransitionTimeMs: 2000,
                            transitions: [
                                {
                                    fromId: 601,
                                    toId: 602,
                                    transitionTimeMs: 7000,
                                },
                                {
                                    fromId: 999,
                                    toId: 601,
                                    transitionTimeMs: 500,
                                },
                            ],
                        } ],
                        switchGroups: [],
                        rtpcParameters: [ {
                            id: 800,
                            defaultValue: 0.05,
                            rampType: 0,
                            rampUp: 0,
                            rampDown: 0,
                            builtInParameter: 0,
                        } ],
                        acousticTextures: [],
                    },
                    hirc: [
                        {
                            type: 3,
                            id: 300,
                            actionType: 0x1302,
                            targetId: 800,
                            action: {
                                actionName: "set-game-parameter",
                                actionMode: "element",
                                actionScope: "global",
                                targetId: 800,
                                targetFlags: 0,
                                targetIsBus: false,
                                properties: [],
                                ranges: [],
                                fadeCurve: 4,
                                bypassTransition: false,
                                exceptions: [],
                                valueMode: "absolute",
                                gameParameterValue: 1,
                                gameParameterRange: { min: 0, max: 0 },
                            },
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 300 ],
                            payload: new Uint8Array(),
                        },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.sfx.programs.set_timer, [ {
        kind: "set-game-parameter",
        rtpc: "ship_Warp_Timer",
        scope: "global",
        curve: 4,
        bypassTransition: false,
        defaultValue: 0.05,
        valueMode: "absolute",
        gameParameterValue: 1,
        gameParameterRange: { min: 0, max: 0 },
    } ]);
    assert.deepEqual(library.sfx.stateTransitions, [ {
        groupId: "600",
        group: "ship_state",
        defaultTransitionMs: 2000,
        states: [
            { stateId: "601", state: "idle" },
            { stateId: "602", state: "warp" },
            { stateId: "603", state: "docked" },
            { stateId: "699", state: "None" },
        ],
        transitions: [
            {
                fromId: "601",
                from: "idle",
                toId: "602",
                to: "warp",
                transitionMs: 7000,
            },
            {
                fromId: "999",
                toId: "601",
                to: "idle",
                transitionMs: 500,
            },
        ],
    } ]);
});

test("complete construction keeps Bus Voice and Bus Volume RTPCs distinct", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "200",
                    ShortName: "init",
                    GameParameters: [ {
                        Id: "800",
                        Name: "menu_advanced_world_level",
                    } ],
                } ],
            },
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 256,
        } ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    globalSettings: {
                        filterBehavior: 1,
                        stateGroups: [],
                        switchGroups: [],
                        rtpcParameters: [ {
                            id: 800,
                            defaultValue: 0.5,
                            rampType: 0,
                            rampUp: 0,
                            rampDown: 0,
                            builtInParameter: 0,
                        } ],
                        acousticTextures: [],
                    },
                    hirc: [
                        {
                            type: 2,
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({ overrideBusId: 500 }),
                        },
                        {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                            rtpcs: [
                                {
                                    controlId: 800,
                                    controlType: 0,
                                    accumulation: 2,
                                    parameterId: 4,
                                    curveId: 77,
                                    scaling: 2,
                                    points: [
                                        [ 0, -1, 4 ],
                                        [ 1, 0.4988127648830414, 8 ],
                                    ],
                                },
                                {
                                    controlId: 800,
                                    controlType: 0,
                                    accumulation: 2,
                                    parameterId: 0,
                                    curveId: 78,
                                    scaling: 2,
                                    points: [
                                        [ 0, -1, 4 ],
                                        [ 1, 0, 4 ],
                                    ],
                                },
                            ],
                            }),
                        },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.busRtpcs, {
        schemaVersion: 2,
        buses: {
            "500": [
                {
                    curveId: 77,
                    property: "bus-volume",
                    rtpc: "menu_advanced_world_level",
                    defaultValue: 0.5,
                    scaling: 2,
                    points: [
                        { x: 0, value: -1, interpolation: 4 },
                        {
                            x: 1,
                            value: 0.4988127648830414,
                            interpolation: 8,
                        },
                    ],
                },
                {
                    curveId: 78,
                    property: "voice-volume",
                    rtpc: "menu_advanced_world_level",
                    defaultValue: 0.5,
                    scaling: 2,
                    points: [
                        { x: 0, value: -1, interpolation: 4 },
                        { x: 1, value: 0, interpolation: 4 },
                    ],
                },
            ],
        },
    });
    assert.deepEqual(
        library.busGraph.buses["500"].requiresProcessing,
        [ "rtpc" ],
    );
});

test("complete construction projects typed Audio Bus ducking once per source", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 256,
        } ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    globalSettings: {
                        filterBehavior: 1,
                        stateGroups: [],
                        switchGroups: [],
                        rtpcParameters: [],
                        acousticTextures: [],
                    },
                    hirc: [
                        {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                                recoveryTime: 1500,
                                maxDuckVolume: -18,
                                ducks: [
                                    {
                                        busId: 600,
                                        volume: -12,
                                        fadeOutTime: 250,
                                        fadeInTime: 750,
                                        curve: 8,
                                        targetPropertyId: 0,
                                    },
                                    {
                                        busId: 700,
                                        volume: -6,
                                        fadeOutTime: 100,
                                        fadeInTime: 200,
                                        curve: 4,
                                        targetPropertyId: 4,
                                    },
                                ],
                            }),
                        },
                        { type: 8, id: 600, payload: busPayload() },
                        { type: 8, id: 700, payload: busPayload() },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.busDucking, {
        schemaVersion: 1,
        sources: {
            "500": {
                recoveryMs: 1500,
                maxDuckVolumeDb: -18,
                targets: [
                    {
                        targetBusId: "600",
                        volumeDb: -12,
                        fadeOutMs: 250,
                        fadeInMs: 750,
                        curve: 8,
                        targetProperty: "voice-volume",
                    },
                    {
                        targetBusId: "700",
                        volumeDb: -6,
                        fadeOutMs: 100,
                        fadeInMs: 200,
                        curve: 4,
                        targetProperty: "bus-volume",
                    },
                ],
            },
        },
    });
});

test("SFX construction projects complete static Sound-local Parametric EQ", async () =>
{
    const bands = [
        { filterTypeId: 3, gainDb: -24, frequencyHz: 240, q: 8, enabled: true },
        { filterTypeId: 4, gainDb: 0, frequencyHz: 120, q: 1, enabled: false },
        { filterTypeId: 5, gainDb: 0, frequencyHz: 12000, q: 1, enabled: false },
    ];
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
                    path: "\\SoundBanks\\common.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        indexEntries: [ {
            logicalPath: "res:/audio/common.bnk",
            storagePath: "banks/common.bnk",
            byteLength: 256,
        } ],
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
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({
                                overrideEffects: true,
                                effects: [ {
                                    slotIndex: 1,
                                    effectId: 900,
                                    flags: 2,
                                } ],
                            }),
                        },
                        {
                            type: 3,
                            id: 400,
                            actionType: 0x0403,
                            targetId: 300,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 400 ],
                            payload: new Uint8Array(),
                        },
                        {
                            type: 16,
                            id: 900,
                            payload: parametricEqEffectPayload({ bands }),
                        },
                    ],
                    media: [ {
                        id: 9001,
                        available: true,
                        absoluteOffset: 32,
                        length: 64,
                        mediaType: "wem",
                    } ],
                },
            };
        },
    });

    assert.deepEqual(library.sfx.nodes["300"].sourceEffects, [ {
        effectId: "900",
        slotIndex: 1,
        type: "parametric-eq",
        bands: [ {
            index: 0,
            filterType: "notch",
            gainDb: -24,
            frequencyHz: 240,
            q: 8,
        } ],
        outputGainDb: 0,
        processLfe: true,
    } ]);
});

test("SFX construction inherits a complete static Wwise Delay override", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {
                station_incidental: {
                    eventID: 100,
                    soundbanks: [ "stations.bnk" ],
                },
            },
            SoundBanks: {
                "stations.bnk": {
                    name: "stations",
                    path: "\\SoundBanks\\stations.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        indexEntries: [ {
            logicalPath: "res:/audio/stations.bnk",
            storagePath: "banks/stations.bnk",
            byteLength: 256,
        } ],
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
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({
                                directParentId: 310,
                                sourceId: 9001,
                            }),
                        },
                        {
                            type: 2,
                            id: 301,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9002,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({
                                directParentId: 310,
                                sourceId: 9002,
                                overrideEffects: true,
                            }),
                        },
                        {
                            type: 7,
                            id: 310,
                            payload: actorMixerPayload({
                                children: [ 300, 301 ],
                                effects: [ {
                                    slotIndex: 0,
                                    effectId: 920,
                                    flags: 2,
                                } ],
                                overrideEffects: true,
                            }),
                        },
                        {
                            type: 3,
                            id: 400,
                            actionType: 0x0403,
                            targetId: 300,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 3,
                            id: 401,
                            actionType: 0x0403,
                            targetId: 301,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 100,
                            actionIds: [ 400, 401 ],
                            payload: new Uint8Array(),
                        },
                        {
                            type: 16,
                            id: 920,
                            payload: wwiseDelayEffectPayload({
                                delayTimeSeconds: 0.28,
                                feedbackPercent: 32,
                                wetDryMixPercent: 30.5,
                            }),
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
                        {
                            id: 9002,
                            available: true,
                            absoluteOffset: 96,
                            length: 64,
                            mediaType: "wem",
                        },
                    ],
                },
            };
        },
    });

    assert.deepEqual(library.sfx.nodes["300"].sourceEffects, [ {
        effectId: "920",
        slotIndex: 0,
        type: "delay",
        delayTimeSeconds: Math.fround(0.28),
        feedbackPercent: 32,
        wetDryMixPercent: 30.5,
        outputGainDb: 0,
        feedbackEnabled: true,
        processLfe: true,
    } ]);
    assert.equal(
        library.sfx.nodes["301"].sourceEffects,
        undefined,
        "the child's explicit empty override clears its parent's Delay",
    );
});

test("complete construction projects routed static Wwise Parametric EQ", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 256,
        } ],
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
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({ overrideBusId: 500 }),
                        },
                        {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                                effects: [ {
                                    slotIndex: 1,
                                    effectId: 900,
                                    flags: 2,
                                } ],
                            }),
                        },
                        {
                            type: 16,
                            id: 900,
                            payload: parametricEqEffectPayload({
                                bands: [
                                    {
                                        filterTypeId: 4,
                                        gainDb: 0,
                                        frequencyHz: 120,
                                        q: 1,
                                        enabled: false,
                                    },
                                    {
                                        filterTypeId: 6,
                                        gainDb: -13,
                                        frequencyHz: 120,
                                        q: 5,
                                        enabled: true,
                                    },
                                    {
                                        filterTypeId: 5,
                                        gainDb: 0,
                                        frequencyHz: 12000,
                                        q: 1,
                                        enabled: true,
                                    },
                                ],
                                outputGainDb: -3,
                                processLfe: true,
                            }),
                        },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.busEffects, {
        schemaVersion: 1,
        buses: {
            "500": [ {
                effectId: "900",
                slotIndex: 1,
                type: "parametric-eq",
                bands: [
                    {
                        index: 1,
                        filterType: "peaking",
                        gainDb: -13,
                        frequencyHz: 120,
                        q: 5,
                    },
                    {
                        index: 2,
                        filterType: "highshelf",
                        gainDb: 0,
                        frequencyHz: 12000,
                        q: 1,
                    },
                ],
                outputGainDb: -3,
                processLfe: true,
            } ],
        },
    });
    assert.deepEqual(library.busGraph.routes, [ {
        outputBusId: "500",
        busPathIds: [ "500" ],
        userAuxSends: [],
    } ]);
    assert.equal(library.busGraph.sfxRoutes["300"], 0);
    assert.equal(library.busGraph.buses["500"].effects[0].effectId, "900");
    assert.equal(
        library.busGraph.effects["900"].parametersBase64.length,
        76,
    );
    assert.deepEqual(
        library.busGraph.buses["500"].requiresProcessing,
        [ "effects" ],
    );
});

test("routed Parametric EQ qualification rejects unsupported static forms", async () =>
{
    const bands = [
        {
            filterTypeId: 4,
            gainDb: 0,
            frequencyHz: 120,
            q: 1,
            enabled: false,
        },
        {
            filterTypeId: 6,
            gainDb: -13,
            frequencyHz: 120,
            q: 5,
            enabled: true,
        },
        {
            filterTypeId: 5,
            gainDb: 0,
            frequencyHz: 12000,
            q: 1,
            enabled: true,
        },
    ];
    const customLibrary = await BuildRoutedEffectLibrary({
        effectType: 17,
        effectFlags: 0,
    });

    assert.equal(customLibrary.busEffects.buses["500"][0].effectId, "900");

    await assert.rejects(
        BuildRoutedEffectLibrary({
            effectPayload: parametricEqEffectPayload({
                bands,
                processLfe: false,
            }),
        }),
        /independent LFE routing/,
    );
    await assert.rejects(
        BuildRoutedEffectLibrary({
            effectPayload: parametricEqEffectPayload({
                bands: bands.map((band, index) => index === 1
                    ? { ...band, enabledRaw: 2 }
                    : band),
            }),
        }),
        /invalid band 1/,
    );
    await assert.rejects(
        BuildRoutedEffectLibrary({ effectFlags: 0 }),
        /mismatched ShareSet flag/,
    );
    await assert.rejects(
        BuildRoutedEffectLibrary({
            effectPayload: parametricEqEffectPayload({
                bands,
                propertyValues: [ { propertyId: 1, value: 2 } ],
            }),
        }),
        /is not static/,
    );

    const blocked = await BuildRoutedEffectLibrary({
        unsupportedEffectFlags: 0,
    });
    const bypassed = await BuildRoutedEffectLibrary({
        unsupportedEffectFlags: 1,
    });

    assert.equal(
        blocked.busEffects,
        undefined,
        "an active unsupported slot blocks distributed EQ on the whole route",
    );
    assert.equal(
        bypassed.busEffects.buses["500"][0].effectId,
        "900",
        "a bypassed unsupported slot is not an audible ordering barrier",
    );
});

test("portable Bus graph resolves NodeBase inheritance and authored bus sends", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "200",
                    ShortName: "init",
                    GameParameters: [
                        { Id: "800", Name: "bus_volume" },
                        { Id: "801", Name: "voice_limit" },
                    ],
                } ],
            },
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 512,
        } ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    globalSettings: {
                        filterBehavior: 1,
                        stateGroups: [],
                        switchGroups: [],
                        rtpcParameters: [ {
                            id: 800,
                            defaultValue: 0,
                            rampType: 0,
                            rampUp: 0,
                            rampDown: 0,
                            builtInParameter: 0,
                        } ],
                        acousticTextures: [],
                    },
                    hirc: [
                        {
                            type: 2,
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({
                                overrideBusId: 500,
                                directParentId: 400,
                                properties: [ { id: 0x08, value: -12 } ],
                                auxIds: [ 999 ],
                                overrideUserAux: false,
                            }),
                        },
                        {
                            type: 2,
                            id: 301,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({
                                overrideBusId: 500,
                                directParentId: 401,
                            }),
                        },
                        {
                            type: 7,
                            id: 400,
                            payload: actorMixerPayload({
                                properties: [ { id: 0x08, value: -6 } ],
                                auxIds: [ 600 ],
                                overrideUserAux: false,
                                stateProperties: [ {
                                    propertyId: 0x27,
                                    accumulation: 0,
                                } ],
                                children: [ 300 ],
                            }),
                        },
                        {
                            type: 7,
                            id: 401,
                            payload: actorMixerPayload({
                                properties: [ { id: 0x08, value: -6 } ],
                                auxIds: [ 600 ],
                                overrideUserAux: false,
                                stateProperties: [ {
                                    propertyId: 0x08,
                                    accumulation: 0,
                                } ],
                                children: [ 301 ],
                            }),
                        },
                        {
                            type: 8,
                            id: 1,
                            payload: busPayload({
                                reflectionsAuxBusId: 800,
                            }),
                        },
                        {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                                parentId: 1,
                                properties: [ { id: 0x08, value: -20 } ],
                                auxIds: [ 700 ],
                                overrideUserAux: true,
                                rtpcs: [ {
                                    controlId: 800,
                                    controlType: 0,
                                    accumulation: 2,
                                    parameterId: 4,
                                    curveId: 76,
                                    scaling: 2,
                                    points: [ [ 0, 0, 4 ] ],
                                }, {
                                    controlId: 801,
                                    controlType: 0,
                                    accumulation: 1,
                                    parameterId: 53,
                                    curveId: 77,
                                    scaling: 0,
                                    points: [ [ 0, 1, 4 ], [ 100, 280, 4 ] ],
                                }, {
                                    controlId: 800,
                                    controlType: 0,
                                    accumulation: 2,
                                    parameterId: 5,
                                    curveId: 78,
                                    scaling: 2,
                                    points: [ [ 0, 0, 4 ] ],
                                } ],
                            }),
                        },
                        {
                            type: 18,
                            id: 600,
                            payload: busPayload({ parentId: 1 }),
                        },
                        {
                            type: 18,
                            id: 700,
                            payload: busPayload({ parentId: 1 }),
                        },
                        {
                            type: 18,
                            id: 800,
                            payload: busPayload({ parentId: 1 }),
                        },
                    ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.busGraph.routes, [ {
        outputBusId: "500",
        busPathIds: [ "500", "1" ],
        userAuxSends: [ {
            slotIndex: 0,
            targetBusId: "600",
            gainDb: -6,
            lowPass: 0,
            highPass: 0,
            dynamic: false,
        } ],
    }, {
        outputBusId: "500",
        busPathIds: [ "500", "1" ],
        userAuxSends: [ {
            slotIndex: 0,
            targetBusId: "600",
            gainDb: -6,
            lowPass: 0,
            highPass: 0,
            dynamic: true,
        } ],
    } ]);
    assert.equal(library.busGraph.sfxRoutes["300"], 0);
    assert.equal(library.busGraph.sfxRoutes["301"], 1);
    assert.deepEqual(library.busGraph.buses["500"].userAuxSends, [ {
        slotIndex: 0,
        targetBusId: "700",
        gainDb: -20,
        lowPass: 0,
        highPass: 0,
        dynamic: false,
    } ]);
    assert.deepEqual(
        library.busGraph.buses["500"].requiresProcessing,
        [ "aux-sends", "rtpc", "unsupported-rtpc", "voice-limits" ],
    );
    assert.deepEqual(
        library.busRtpcs.buses["500"].map(curve => curve.property),
        [ "bus-volume" ],
    );
    assert.deepEqual(library.busGraph.buses["1"].reflectionsAuxSend, {
        targetBusId: "800",
        gainDb: 0,
        dynamic: false,
    });
    assert.deepEqual(Object.keys(library.busGraph.buses), [
        "1",
        "500",
        "600",
        "700",
        "800",
    ]);
});

test("complete construction projects multi-property effective-Immediate Bus States", async () =>
{
    const library = await CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "200",
                    ShortName: "init",
                    StateGroups: [ {
                        Id: "600",
                        Name: "video_overlay",
                        States: [
                            { Id: "601", Name: "off" },
                            { Id: "602", Name: "on" },
                        ],
                    } ],
                } ],
            },
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 256,
        } ],
        loadBank()
        {
            return {
                inspection: {
                    bankId: 200,
                    languageId: 0,
                    bankVersion: 150,
                    globalSettings: {
                        filterBehavior: 0,
                        stateGroups: [ {
                            id: 600,
                            defaultTransitionTimeMs: 1000,
                            transitions: [ {
                                fromId: 601,
                                toId: 602,
                                transitionTimeMs: 5000,
                            } ],
                        } ],
                        switchGroups: [],
                        rtpcParameters: [],
                        acousticTextures: [],
                    },
                    hirc: [ {
                        type: 8,
                        id: 500,
                        payload: busPayload({
                            stateProperties: [
                                {
                                    propertyId: 1,
                                    accumulation: 2,
                                    inDb: false,
                                },
                                {
                                    propertyId: 2,
                                    accumulation: 6,
                                    inDb: false,
                                },
                                {
                                    propertyId: 3,
                                    accumulation: 6,
                                    inDb: false,
                                },
                                {
                                    propertyId: 4,
                                    accumulation: 2,
                                    inDb: true,
                                },
                            ],
                            stateGroups: [ {
                                groupId: 600,
                                syncType: 1,
                                states: [ {
                                    stateId: 602,
                                    values: [
                                        { propertyId: 1, value: -100 },
                                        { propertyId: 2, value: -70 },
                                        { propertyId: 3, value: 45 },
                                        { propertyId: 4, value: -96 },
                                    ],
                                } ],
                            } ],
                        }),
                    } ],
                    media: [],
                },
            };
        },
    });

    assert.deepEqual(library.busStates, {
        schemaVersion: 2,
        filterBehavior: "additive",
        stateTransitions: [ {
            groupId: "600",
            group: "video_overlay",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "601", state: "off" },
                { stateId: "602", state: "on" },
            ],
            transitions: [ {
                fromId: "601",
                from: "off",
                toId: "602",
                to: "on",
                transitionMs: 5000,
            } ],
        } ],
        buses: {
            "500": [ {
                groupId: "600",
                group: "video_overlay",
                syncType: 1,
                effectiveSyncType: 0,
                states: [ {
                    stateId: "602",
                    state: "on",
                    gainDb: -96,
                    pitchCents: -100,
                    lowPass: -70,
                    highPass: 45,
                } ],
            } ],
        },
    });
});

test("non-Immediate Bus States fail closed when music shares the bus", async () =>
{
    const segmentID = 4001;
    const trackID = 4101;
    const segment = new TestWriter()
        .u8(0)
        .append(nodeBasePayload({ overrideBusId: 500 }))
        .u32(1).u32(trackID)
        .f64(1000).f64(0).f32(120).u8(4).u8(4)
        .u8(1)
        .u32(0)
        .f64(4000)
        .u32(0)
        .bytes();
    const track = new TestWriter()
        .u8(0)
        .u32(0)
        .u32(0)
        .u32(0)
        .append(nodeBasePayload({ directParentId: segmentID }))
        .u8(0)
        .s32(-100)
        .bytes();
    const metadata = {
        Events: {},
        SoundBanks: Object.fromEntries([
            [ "init.bnk", 200 ],
            [ "music.bnk", 201 ],
            [ "music_essential.bnk", 202 ],
        ].map(([ name, shortId ]) => [ name, {
            name: name.slice(0, -4),
            path: `\\SoundBanks\\${name}`,
            shortId,
        } ])),
        WemFileIDs: {},
    };
    const indexEntries = Object.keys(metadata.SoundBanks).map((name, index) => ({
        logicalPath: `res:/audio/${name}`,
        storagePath: `banks/${name}`,
        byteLength: 256 + index,
    }));

    await assert.rejects(CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        music: true,
        metadata,
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "200",
                        ShortName: "init",
                        StateGroups: [ {
                            Id: "600",
                            Name: "video_overlay",
                            States: [
                                { Id: "601", Name: "off" },
                                { Id: "602", Name: "on" },
                            ],
                        } ],
                    },
                    { Id: "201", ShortName: "music" },
                    { Id: "202", ShortName: "music_essential" },
                ],
            },
        },
        indexEntries,
        loadBank(bank)
        {
            const source = bank.resPath.split("/").at(-1);

            if (source === "init.bnk")
            {
                return {
                    inspection: {
                        bankId: 200,
                        languageId: 0,
                        bankVersion: 150,
                        globalSettings: {
                            filterBehavior: 1,
                            stateGroups: [ {
                                id: 600,
                                defaultTransitionTimeMs: 1000,
                                transitions: [],
                            } ],
                            switchGroups: [],
                            rtpcParameters: [],
                            acousticTextures: [],
                        },
                        hirc: [ {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                                stateProperties: [ {
                                    propertyId: 4,
                                    accumulation: 2,
                                    inDb: true,
                                } ],
                                stateGroups: [ {
                                    groupId: 600,
                                    syncType: 1,
                                    states: [ {
                                        stateId: 602,
                                        values: [ {
                                            propertyId: 4,
                                            value: -96,
                                        } ],
                                    } ],
                                } ],
                            }),
                        } ],
                        media: [],
                    },
                };
            }
            return {
                inspection: {
                    bankId: source === "music.bnk" ? 201 : 202,
                    languageId: 0,
                    bankVersion: 150,
                    hirc: source === "music.bnk"
                        ? [
                            { type: 10, id: segmentID, payload: segment },
                            { type: 11, id: trackID, payload: track },
                        ]
                        : [],
                    media: [],
                },
            };
        },
    }), /unsupported music-synchronized Audio Bus state group 600/u);
});

test("SFX State catalogs fail closed on malformed or conflicting names", () =>
{
    const inspection = {
        source: "init.bnk",
        bankVersion: 150,
        globalSettings: {
            stateGroups: [ {
                id: 600,
                defaultTransitionTimeMs: 1000,
                transitions: [ {
                    fromId: 601,
                    toId: 602,
                    transitionTimeMs: 250,
                } ],
            } ],
            rtpcParameters: [],
        },
        hirc: [],
    };
    const request = soundbanksInfo => ({
        inspections: [ inspection ],
        metadata: { Events: {} },
        soundbanksInfo: {
            SoundBanksInfo: { SoundBanks: soundbanksInfo },
        },
    });
    const bank = (name, first = "idle") => ({
        Id: "1",
        ShortName: "init",
        StateGroups: [ {
            Id: "600",
            Name: name,
            States: [
                { Id: "601", Name: first },
                { Id: "602", Name: "warp" },
            ],
        } ],
    });

    assert.throws(
        () => CjsAudioLibraryBuilder.createSfxGraph(
            request([ bank("alpha"), bank("beta") ]),
        ),
        /name conflicts between alpha and beta/u,
    );
    assert.throws(
        () => CjsAudioLibraryBuilder.createSfxGraph(
            request([ bank("ship_state"), bank("ship_state", "calm") ]),
        ),
        /value 601 name conflicts between idle and calm/u,
    );
    assert.throws(
        () => CjsAudioLibraryBuilder.createSfxGraph({
            ...request([ bank("ship_state") ]),
            inspections: [ {
                ...inspection,
                globalSettings: { rtpcParameters: [] },
            } ],
        }),
        /must contain stateGroups and rtpcParameters/u,
    );

    const unnamed = CjsAudioLibraryBuilder.createSfxGraph(
        request([ bank(" ", " ") ]),
    );

    assert.deepEqual(unnamed.stateTransitions, [ {
        groupId: "600",
        defaultTransitionMs: 1000,
        states: [ { stateId: "602", state: "warp" } ],
        transitions: [ {
            fromId: "601",
            toId: "602",
            to: "warp",
            transitionMs: 250,
        } ],
    } ]);
});

test("SFX Play-Event cycles are diagnosed instead of recursing", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                hirc: [
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x2103,
                        targetId: 101,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x2103,
                        targetId: 100,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                cycle_a: { eventID: 100 },
                cycle_b: { eventID: 101 },
            },
        },
        media: {},
    });

    assert.deepEqual(result.events, {});
    assert.equal(result.diagnostics.omittedEvents.length, 2);
    assert.ok(result.diagnostics.omittedEvents.every(entry =>
        entry.reason.startsWith("Play-Event cycle at event ")));
});

test("SFX Stop actions project event relationships through hierarchy-only parents", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0103,
                        targetId: 700,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            delayTimeMs: 250,
                            delayRangeMs: { min: -50, max: 100 },
                            transitionTimeMs: 500,
                            transitionRangeMs: { min: -100, max: 200 },
                            fadeCurve: 6,
                            actionFlags: 6,
                            exceptions: [],
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                ambience_play: { eventID: 100 },
                ambience_stop: { eventID: 101 },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.events, {
        ambience_play: [ { nodeId: "200" } ],
    });
    assert.deepEqual(result.nodes["200"].matchIds, [ "200", "700" ]);
    assert.deepEqual(result.programs.ambience_stop, [
        {
            kind: "stop",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 6,
            actionFlags: 6,
            exceptions: [],
            delayMs: 250,
            delayRangeMs: { min: -50, max: 100 },
            transitionMs: 500,
            transitionRangeMs: { min: -100, max: 200 },
        },
    ]);
    assert.deepEqual(result.metadataProjection.Events.ambience_play, {
        eventsStoppedBy: [ "ambience_stop" ],
    });
    assert.deepEqual(result.diagnostics.stopRelationships, {
        projected: [
            {
                stopped: "ambience_play",
                stopping: "ambience_stop",
            },
        ],
        unresolved: [],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Pause and Resume actions lower as typed ordered programs", () =>
{
    const control = (id, actionType, actionName, actionFlags) => ({
        type: 3,
        id,
        actionType,
        targetId: 200,
        action: {
            actionName,
            actionMode: "element",
            actionScope: "game-object",
            targetId: 200,
            targetFlags: 0,
            targetIsBus: false,
            fadeCurve: 4,
            actionFlags,
            exceptions: [],
        },
        payload: new Uint8Array(),
    });
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "voice.bnk",
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
                        sourceBits: 0,
                        payload: soundPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    control(301, 0x0203, "pause", 7),
                    control(302, 0x0303, "resume", 6),
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 302 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                voice_play: { eventID: 100 },
                voice_pause: { eventID: 101 },
                voice_resume: { eventID: 102 },
            },
        },
        media: {
            "9001": {
                resPath: "res:/audio/9001.wem",
            },
        },
    });

    assert.deepEqual(result.programs.voice_pause, [
        {
            kind: "pause",
            targetId: "200",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 4,
            actionFlags: 7,
            exceptions: [],
        },
    ]);
    assert.deepEqual(result.programs.voice_resume, [
        {
            kind: "resume",
            targetId: "200",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 4,
            actionFlags: 6,
            exceptions: [],
        },
    ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Voice Volume actions lower into ordered portable programs", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0a03,
                        targetId: 700,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            delayTimeMs: 100,
                            transitionTimeMs: 250,
                            fadeCurve: 7,
                            valueMode: "relative",
                            volumeDb: -3,
                            volumeRangeDb: { min: -3, max: 1 },
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0b03,
                        targetId: 700,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x0a03,
                        targetId: 999,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 999,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                            valueMode: "absolute",
                            volumeDb: -12,
                            volumeRangeDb: { min: 0, max: 0 },
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 303, 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                staged_volume: { eventID: 100 },
                stale_volume_target: { eventID: 101 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(result.events.staged_volume, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.programs.staged_volume, [
        {
            kind: "set-voice-volume",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 7,
            valueMode: "relative",
            volumeDb: -3,
            volumeRangeDb: { min: -3, max: 1 },
            delayMs: 100,
            transitionMs: 250,
        },
        { kind: "play", child: { nodeId: "200" } },
        {
            kind: "reset-voice-volume",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 4,
        },
    ]);
    assert.deepEqual(result.events.stale_volume_target, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.programs.stale_volume_target, [
        { kind: "play", child: { nodeId: "200" } },
    ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Bus-target Voice Volume preserves the bounded output-Bus form", () =>
{
    const action = (id, volumeDb, overrides = {}) => ({
        type: 3,
        id,
        actionType: 0x0a03,
        targetId: overrides.targetId ?? 928,
        action: {
            actionName: "set-voice-volume",
            actionType: 0x0a03,
            actionMode: "element",
            actionScope: overrides.actionScope ?? "game-object",
            targetId: overrides.targetId ?? 928,
            targetFlags: 1,
            targetIsBus: true,
            fadeCurve: 4,
            valueMode: overrides.valueMode ?? "absolute",
            volumeDb,
            volumeRangeDb: { min: 0, max: 0 },
            exceptions: [],
            ...(overrides.delayTimeMs === undefined
                ? {}
                : { delayTimeMs: overrides.delayTimeMs }),
            ...(overrides.transitionTimeMs === undefined
                ? {}
                : { transitionTimeMs: overrides.transitionTimeMs }),
        },
        payload: new Uint8Array(),
    });
    const begin = action(300, -30);
    const climax = action(301, 0, {
        delayTimeMs: 6000,
        transitionTimeMs: 2000,
    });
    const global = action(302, -6, { actionScope: "global" });
    const relative = action(303, -3, { valueMode: "relative" });
    const ancestor = action(304, -9, { targetId: 1 });
    const play = {
        type: 3,
        id: 399,
        actionType: 0x0403,
        targetId: 200,
        payload: new Uint8Array(),
    };
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
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
                    sourceBits: 0,
                    payload: soundPayload({ directParentId: 700 }),
                },
                {
                    type: 7,
                    id: 700,
                    payload: actorMixerPayload({ overrideBusId: 928 }),
                },
                begin,
                climax,
                global,
                relative,
                ancestor,
                play,
                {
                    type: 4,
                    id: 100,
                    actionIds: [ begin.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 101,
                    actionIds: [ play.id, climax.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 102,
                    actionIds: [ global.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 103,
                    actionIds: [ relative.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 104,
                    actionIds: [ ancestor.id ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: {
                cinematic_begin: { eventID: 100 },
                cinematic_climax: { eventID: 101 },
                invalid_global: { eventID: 102 },
                invalid_relative: { eventID: 103 },
                invalid_ancestor: { eventID: 104 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
        buses: new Map([
            [ 928, {
                type: "audio-bus",
                overrideBusId: 1,
                busVolume: null,
            } ],
            [ 1, {
                type: "audio-bus",
                overrideBusId: 0,
                busVolume: null,
            } ],
        ]),
    });

    assert.deepEqual(result.programs.cinematic_begin, [ {
        kind: "set-bus-voice-volume",
        targetId: "928",
        targetFlags: 1,
        scope: "game-object",
        mode: "element",
        curve: 4,
        valueMode: "absolute",
        volumeDb: -30,
        volumeRangeDb: { min: 0, max: 0 },
    } ]);
    assert.deepEqual(result.programs.cinematic_climax, [
        { kind: "play", child: { nodeId: "200" } },
        {
            kind: "set-bus-voice-volume",
            targetId: "928",
            targetFlags: 1,
            scope: "game-object",
            mode: "element",
            curve: 4,
            valueMode: "absolute",
            volumeDb: 0,
            volumeRangeDb: { min: 0, max: 0 },
            delayMs: 6000,
            transitionMs: 2000,
        },
    ]);
    assert.equal(result.programs.invalid_global, undefined);
    assert.equal(result.programs.invalid_relative, undefined);
    assert.equal(result.programs.invalid_ancestor, undefined);
    assert.deepEqual(
        result.diagnostics.omittedEvents.map(value => value.name).sort(),
        [ "invalid_ancestor", "invalid_global", "invalid_relative" ],
    );
});

test("SFX Bus Volume preserves every valid v150 form and output routing", () =>
{
    let nextActionId = 300;
    const busAction = ({
        actionType,
        name,
        targetId,
        scope,
        mode,
        valueMode,
        busVolumeDb,
        exceptions = [],
    }) => ({
        type: 3,
        id: nextActionId++,
        actionType,
        targetId,
        action: {
            actionName: name,
            actionType,
            actionMode: mode,
            actionScope: scope,
            targetId,
            targetFlags: 1,
            targetIsBus: true,
            fadeCurve: 4,
            exceptions,
            ...(valueMode === undefined
                ? {}
                : {
                    valueMode,
                    busVolumeDb,
                    busVolumeRangeDb: { min: 0, max: 0 },
                }),
        },
        payload: new Uint8Array(),
    });
    const actions = [
        busAction({
            actionType: 0x0c02,
            name: "set-bus-volume",
            targetId: 928,
            scope: "global",
            mode: "element",
            valueMode: "absolute",
            busVolumeDb: -15,
        }),
        busAction({
            actionType: 0x0c03,
            name: "set-bus-volume",
            targetId: 928,
            scope: "game-object",
            mode: "element",
            valueMode: "relative",
            busVolumeDb: 3,
        }),
        busAction({
            actionType: 0x0d02,
            name: "reset-bus-volume",
            targetId: 928,
            scope: "global",
            mode: "element",
        }),
        busAction({
            actionType: 0x0d03,
            name: "reset-bus-volume",
            targetId: 928,
            scope: "game-object",
            mode: "element",
        }),
        busAction({
            actionType: 0x0d04,
            name: "reset-bus-volume",
            targetId: 0,
            scope: "global",
            mode: "all",
        }),
        busAction({
            actionType: 0x0d08,
            name: "reset-bus-volume",
            targetId: 0,
            scope: "global",
            mode: "all-except",
            exceptions: [ {
                targetId: 929,
                targetFlags: 1,
                targetIsBus: true,
            } ],
        }),
    ];
    const play = {
        type: 3,
        id: 399,
        actionType: 0x0403,
        targetId: 200,
        payload: new Uint8Array(),
    };
    const musicBus = busAction({
        actionType: 0x0c02,
        name: "set-bus-volume",
        targetId: 399,
        scope: "global",
        mode: "element",
        valueMode: "absolute",
        busVolumeDb: -96.3,
    });
    const invalidObjectAll = busAction({
        actionType: 0x0d05,
        name: "reset-bus-volume",
        targetId: 0,
        scope: "game-object",
        mode: "all",
    });
    const invalidObjectAllExcept = busAction({
        actionType: 0x0d09,
        name: "reset-bus-volume",
        targetId: 0,
        scope: "game-object",
        mode: "all-except",
        exceptions: [ {
            targetId: 929,
            targetFlags: 1,
            targetIsBus: true,
        } ],
    });
    const musicPlay = {
        type: 3,
        id: 398,
        actionType: 0x0403,
        targetId: 800,
        payload: new Uint8Array(),
    };
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
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
                    sourceBits: 0,
                    payload: soundPayload({
                        directParentId: 700,
                        properties: [ { id: 0x0d, value: -12 } ],
                    }),
                },
                {
                    type: 7,
                    id: 700,
                    payload: actorMixerPayload({
                        overrideBusId: 928,
                        properties: [ { id: 0x0d, value: 4 } ],
                    }),
                },
                ...actions,
                play,
                {
                    type: 12,
                    id: 800,
                    payload: new Uint8Array(),
                },
                musicBus,
                invalidObjectAll,
                invalidObjectAllExcept,
                musicPlay,
                {
                    type: 4,
                    id: 100,
                    actionIds: [ ...actions.map(value => value.id), 399 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 101,
                    actionIds: [ musicPlay.id, musicBus.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 102,
                    actionIds: [ invalidObjectAll.id ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 103,
                    actionIds: [ invalidObjectAllExcept.id ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: {
                bus_forms: { eventID: 100 },
                music_future_duck: { eventID: 101 },
                invalid_bus_all: { eventID: 102 },
                invalid_bus_all_except: { eventID: 103 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
        buses: new Map([
            [ 928, {
                overrideBusId: 500,
                busVolume: -6,
                makeUpGain: 3,
            } ],
            [ 500, { overrideBusId: 1, busVolume: null } ],
            [ 1, { overrideBusId: 0, busVolume: -3 } ],
        ]),
    });

    assert.equal(result.nodes["200"].outputBusId, "928");
    assert.deepEqual(
        result.nodes["200"].busPathIds,
        [ "928", "500", "1" ],
    );
    assert.equal(result.nodes["200"].authoredBusVolumeDb, -9);
    assert.equal(result.nodes["200"].authoredBusMakeUpGainDb, 3);
    assert.equal(result.nodes["200"].authoredOutputBusVolumeDb, 4);
    assert.deepEqual(
        result.programs.bus_forms.map(action => action.kind),
        [
            "set-bus-volume",
            "set-bus-volume",
            "reset-bus-volume",
            "reset-bus-volume",
            "reset-bus-volume",
            "reset-bus-volume",
            "play",
        ],
    );
    assert.deepEqual(result.programs.bus_forms[0], {
        kind: "set-bus-volume",
        targetId: "928",
        targetFlags: 1,
        scope: "global",
        mode: "element",
        curve: 4,
        exceptions: [],
        valueMode: "absolute",
        busVolumeDb: -15,
        busVolumeRangeDb: { min: 0, max: 0 },
    });
    assert.deepEqual(result.programs.bus_forms[5].exceptions, [ {
        targetId: "929",
        targetFlags: 1,
    } ]);
    assert.equal(result.events.music_future_duck, undefined);
    assert.deepEqual(result.programs.music_future_duck, [ {
        kind: "set-bus-volume",
        targetId: "399",
        targetFlags: 1,
        scope: "global",
        mode: "element",
        curve: 4,
        exceptions: [],
        valueMode: "absolute",
        busVolumeDb: -96.3,
        busVolumeRangeDb: { min: 0, max: 0 },
    } ]);
    assert.deepEqual(
        result.diagnostics.omittedEvents.map(value => value.reason),
        [
            `unsupported Bus Volume alias ${invalidObjectAll.id}`,
            `unsupported Bus Volume alias ${invalidObjectAllExcept.id}`,
        ],
    );
});

test("SFX Voice Pitch actions lower into ordered portable programs", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0803,
                        targetId: 700,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            delayTimeMs: 100,
                            transitionTimeMs: 250,
                            fadeCurve: 7,
                            valueMode: "relative",
                            pitchCents: 240,
                            pitchRangeCents: { min: -20, max: 30 },
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0903,
                        targetId: 700,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x0803,
                        targetId: 999,
                        action: {
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 999,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                            valueMode: "absolute",
                            pitchCents: -1200,
                            pitchRangeCents: { min: 0, max: 0 },
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 303, 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                staged_pitch: { eventID: 100 },
                stale_pitch_target: { eventID: 101 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(result.events.staged_pitch, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.programs.staged_pitch, [
        {
            kind: "set-voice-pitch",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 7,
            valueMode: "relative",
            pitchCents: 240,
            pitchRangeCents: { min: -20, max: 30 },
            delayMs: 100,
            transitionMs: 250,
        },
        { kind: "play", child: { nodeId: "200" } },
        {
            kind: "reset-voice-pitch",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 4,
        },
    ]);
    assert.deepEqual(result.events.stale_pitch_target, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.programs.stale_pitch_target, [
        { kind: "play", child: { nodeId: "200" } },
    ]);
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Voice LPF and HPF actions lower every reset mode", () =>
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0e03,
                        targetId: 700,
                        action: {
                            actionName: "set-voice-low-pass",
                            actionMode: "element",
                            actionScope: "game-object",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            delayTimeMs: 100,
                            delayRangeMs: { min: -20, max: 20 },
                            transitionTimeMs: 250,
                            transitionRangeMs: { min: -50, max: 50 },
                            fadeCurve: 7,
                            valueMode: "relative",
                            lowPass: 30,
                            lowPassRange: { min: -5, max: 10 },
                            exceptions: [],
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x0f08,
                        targetId: 0,
                        action: {
                            actionName: "reset-voice-low-pass",
                            actionMode: "all-except",
                            actionScope: "global",
                            targetId: 0,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                            exceptions: [ {
                                targetId: 701,
                                targetFlags: 0,
                                targetIsBus: false,
                            } ],
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x2002,
                        targetId: 700,
                        action: {
                            actionName: "set-voice-high-pass",
                            actionMode: "element",
                            actionScope: "global",
                            targetId: 700,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 9,
                            valueMode: "absolute",
                            highPass: 60,
                            highPassRange: { min: 0, max: 0 },
                            exceptions: [],
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 304,
                        actionType: 0x3005,
                        targetId: 0,
                        action: {
                            actionName: "reset-voice-high-pass",
                            actionMode: "all",
                            actionScope: "game-object",
                            targetId: 0,
                            targetFlags: 0,
                            targetIsBus: false,
                            fadeCurve: 4,
                            exceptions: [],
                        },
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301, 302, 303, 304 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                staged_filters: { eventID: 100 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(result.events.staged_filters, [
        { nodeId: "200" },
    ]);
    assert.deepEqual(result.programs.staged_filters, [
        {
            kind: "set-voice-low-pass",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 7,
            exceptions: [],
            valueMode: "relative",
            lowPass: 30,
            lowPassRange: { min: -5, max: 10 },
            delayMs: 100,
            delayRangeMs: { min: -20, max: 20 },
            transitionMs: 250,
            transitionRangeMs: { min: -50, max: 50 },
        },
        { kind: "play", child: { nodeId: "200" } },
        {
            kind: "reset-voice-low-pass",
            targetId: "0",
            targetFlags: 0,
            scope: "global",
            mode: "all-except",
            curve: 4,
            exceptions: [ {
                targetId: "701",
                targetFlags: 0,
            } ],
        },
        {
            kind: "set-voice-high-pass",
            targetId: "700",
            targetFlags: 0,
            scope: "global",
            mode: "element",
            curve: 9,
            exceptions: [],
            valueMode: "absolute",
            highPass: 60,
            highPassRange: { min: 0, max: 0 },
        },
        {
            kind: "reset-voice-high-pass",
            targetId: "0",
            targetFlags: 0,
            scope: "game-object",
            mode: "all",
            curve: 4,
            exceptions: [],
        },
    ]);
});

test("EVE v150 element Voice LPF and HPF aliases lower exactly", () =>
{
    const typed = ({
        name,
        valueMode,
        lowPass,
        highPass,
    }) => ({
        actionName: name,
        actionMode: "element",
        actionScope: "game-object",
        targetId: 700,
        targetFlags: 0,
        targetIsBus: false,
        fadeCurve: 4,
        exceptions: [],
        ...(valueMode === undefined
            ? {}
            : {
                valueMode,
                ...(lowPass === undefined
                    ? {
                        highPass,
                        highPassRange: { min: 0, max: 0 },
                    }
                    : {
                        lowPass,
                        lowPassRange: { min: 0, max: 0 },
                    }),
            }),
    });
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
                        sourceBits: 0,
                        payload: soundPayload({ directParentId: 700 }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0e03,
                        targetId: 700,
                        action: typed({
                            name: "set-voice-low-pass",
                            valueMode: "absolute",
                            lowPass: 80,
                        }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0f03,
                        targetId: 700,
                        action: typed({
                            name: "reset-voice-low-pass",
                        }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x2003,
                        targetId: 700,
                        action: typed({
                            name: "set-voice-high-pass",
                            valueMode: "relative",
                            highPass: 20,
                        }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x3003,
                        targetId: 700,
                        action: typed({
                            name: "reset-voice-high-pass",
                        }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 304,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301, 302, 303, 304 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                eve_element_filters: { eventID: 100 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(
        result.programs.eve_element_filters.map(action => action.kind),
        [
            "set-voice-low-pass",
            "reset-voice-low-pass",
            "set-voice-high-pass",
            "reset-voice-high-pass",
            "play",
        ],
    );
    assert.deepEqual(result.programs.eve_element_filters[0], {
        kind: "set-voice-low-pass",
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        curve: 4,
        exceptions: [],
        valueMode: "absolute",
        lowPass: 80,
        lowPassRange: { min: 0, max: 0 },
    });
    assert.deepEqual(result.programs.eve_element_filters[1], {
        kind: "reset-voice-low-pass",
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        curve: 4,
        exceptions: [],
    });
    assert.deepEqual(result.programs.eve_element_filters[2], {
        kind: "set-voice-high-pass",
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        curve: 4,
        exceptions: [],
        valueMode: "relative",
        highPass: 20,
        highPassRange: { min: 0, max: 0 },
    });
    assert.deepEqual(result.programs.eve_element_filters[3], {
        kind: "reset-voice-high-pass",
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        curve: 4,
        exceptions: [],
    });
    assert.deepEqual(result.diagnostics.omittedEvents, []);
});

test("SFX Voice Filter lowering rejects contradictory typed records", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [ {
            source: "common.bnk",
            bankVersion: 150,
            hirc: [
                {
                    type: 3,
                    id: 300,
                    actionType: 0x0e03,
                    targetId: 700,
                    action: {
                        actionName: "set-voice-low-pass",
                        actionMode: "element",
                        actionScope: "global",
                        targetId: 700,
                        targetFlags: 0,
                        targetIsBus: false,
                        fadeCurve: 4,
                        valueMode: "absolute",
                        lowPass: 20,
                        lowPassRange: { min: 0, max: 0 },
                        exceptions: [],
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 301,
                    actionType: 0x0f05,
                    targetId: 0,
                    action: {
                        actionName: "reset-voice-low-pass",
                        actionMode: "all",
                        actionScope: "game-object",
                        targetId: 0,
                        targetFlags: 0,
                        targetIsBus: false,
                        fadeCurve: 4,
                        lowPass: 20,
                        exceptions: [],
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 302,
                    actionType: 0x0f08,
                    targetId: 0,
                    action: {
                        actionName: "reset-voice-low-pass",
                        actionMode: "all-except",
                        actionScope: "global",
                        targetId: 0,
                        targetFlags: 0,
                        targetIsBus: false,
                        fadeCurve: 4,
                        exceptions: { targetId: 701 },
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 303,
                    actionType: 0x2003,
                    targetId: 700,
                    action: {
                        actionName: "set-voice-high-pass",
                        actionMode: "element",
                        actionScope: "game-object",
                        targetId: 700,
                        targetFlags: 0,
                        targetIsBus: false,
                        fadeCurve: 4,
                        valueMode: "relative",
                        highPass: 20,
                        highPassRange: { min: 0, max: 0 },
                        probability: 50,
                        exceptions: [],
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 304,
                    actionType: 0x3005,
                    targetId: 0,
                    action: {
                        actionName: "reset-voice-high-pass",
                        actionMode: "all",
                        actionScope: "game-object",
                        targetId: "not-an-id",
                        targetFlags: 0,
                        targetIsBus: false,
                        fadeCurve: 4,
                        exceptions: [],
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 305,
                    actionType: 0x0e03,
                    targetId: 700,
                    action: {
                        actionName: "set-voice-low-pass",
                        actionMode: "element",
                        actionScope: "game-object",
                        targetId: 700,
                        targetFlags: 0,
                        targetIsBus: false,
                        properties: [ { id: 0x3b } ],
                        ranges: [],
                        fadeCurve: 4,
                        valueMode: "relative",
                        lowPass: 20,
                        lowPassRange: { min: 0, max: 0 },
                        exceptions: [],
                    },
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 100,
                    actionIds: [ 300 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 101,
                    actionIds: [ 301 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 102,
                    actionIds: [ 302 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 103,
                    actionIds: [ 303 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 104,
                    actionIds: [ 304 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 105,
                    actionIds: [ 305 ],
                    payload: new Uint8Array(),
                },
            ],
        } ],
        metadata: {
            Events: {
                mismatched_scope: { eventID: 100 },
                reset_with_value: { eventID: 101 },
                invalid_exceptions: { eventID: 102 },
                probabilistic_filter: { eventID: 103 },
                invalid_all_target: { eventID: 104 },
                invalid_property_bundle: { eventID: 105 },
            },
        },
        media: {},
    });

    assert.equal(result.programs.mismatched_scope, undefined);
    assert.equal(result.programs.reset_with_value, undefined);
    assert.equal(result.programs.invalid_exceptions, undefined);
    assert.equal(result.programs.probabilistic_filter, undefined);
    assert.equal(result.programs.invalid_all_target, undefined);
    assert.equal(result.programs.invalid_property_bundle, undefined);
    assert.deepEqual(
        result.diagnostics.omittedEvents.map(value => value.reason),
        [
            "Voice Filter scope/mode mismatch 300",
            "Voice Filter Reset carries a value 301",
            "invalid Voice Filter exceptions 302",
            "probabilistic Voice Filter action 303",
            "Voice Filter action 304 targetId must be uint32",
            "invalid Voice Filter properties 305",
        ],
    );
});

test("SFX Game Parameter actions lower into ordered and action-only programs", () =>
{
    const typed = ({
        name = "set-game-parameter",
        scope = "game-object",
        targetId = 800,
        transitionTimeMs,
        valueMode = "absolute",
        value = 12,
    } = {}) => ({
        actionName: name,
        actionMode: "element",
        actionScope: scope,
        targetId,
        targetFlags: 0,
        targetIsBus: false,
        properties: transitionTimeMs === undefined
            ? []
            : [ { id: 0x3a } ],
        ranges: [],
        ...(transitionTimeMs === undefined ? {} : { transitionTimeMs }),
        fadeCurve: 4,
        bypassTransition: false,
        exceptions: [],
        ...(name === "reset-game-parameter"
            ? {}
            : {
                valueMode,
                gameParameterValue: value,
                gameParameterRange: { min: 0, max: 0 },
            }),
    });
    const request = {
        inspections: [
            {
                source: "common.bnk",
                bankVersion: 150,
                globalSettings: {
                    stateGroups: [],
                    rtpcParameters: [ {
                        id: 800,
                        defaultValue: 0,
                        rampType: 0,
                        rampUp: 0,
                        rampDown: 0,
                        builtInParameter: 0,
                    } ],
                },
                hirc: [
                    {
                        type: 2,
                        id: 200,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9001,
                        inMemoryMediaSize: 64,
                        sourceBits: 0,
                        payload: soundPayload(),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x1303,
                        targetId: 800,
                        action: typed({ transitionTimeMs: 12000 }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 302,
                        actionType: 0x1403,
                        targetId: 800,
                        action: typed({ name: "reset-game-parameter" }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 303,
                        actionType: 0x1302,
                        targetId: 800,
                        action: typed({
                            scope: "global",
                            value: 100,
                            transitionTimeMs: 100,
                        }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 304,
                        actionType: 0x1303,
                        targetId: 999,
                        action: typed({ targetId: 999 }),
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 100,
                        actionIds: [ 300, 301, 302 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 303 ],
                        payload: new Uint8Array(),
                    },
                    {
                        type: 4,
                        id: 102,
                        actionIds: [ 304 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                warp: { eventID: 100 },
                set_mwd: { eventID: 101 },
                unnamed_parameter: { eventID: 102 },
            },
        },
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [ {
                    Id: "1",
                    ShortName: "common",
                    GameParameters: [
                        { Id: "800", Name: "ship_Warp_Timer" },
                    ],
                } ],
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    };
    const result = CjsAudioLibraryBuilder.createSfxGraph(request);

    assert.deepEqual(result.events.warp, [ { nodeId: "200" } ]);
    assert.deepEqual(result.programs.warp, [
        {
            kind: "set-game-parameter",
            rtpc: "ship_Warp_Timer",
            scope: "game-object",
            curve: 4,
            bypassTransition: false,
            defaultValue: 0,
            valueMode: "absolute",
            gameParameterValue: 12,
            gameParameterRange: { min: 0, max: 0 },
            transitionMs: 12000,
        },
        { kind: "play", child: { nodeId: "200" } },
        {
            kind: "reset-game-parameter",
            rtpc: "ship_Warp_Timer",
            scope: "game-object",
            curve: 4,
            bypassTransition: false,
            defaultValue: 0,
        },
    ]);
    assert.equal(result.events.set_mwd, undefined);
    assert.deepEqual(result.programs.set_mwd, [ {
        kind: "set-game-parameter",
        rtpc: "ship_Warp_Timer",
        scope: "global",
        curve: 4,
        bypassTransition: false,
        defaultValue: 0,
        valueMode: "absolute",
        gameParameterValue: 100,
        gameParameterRange: { min: 0, max: 0 },
        transitionMs: 100,
    } ]);
    assert.match(
        result.diagnostics.omittedEvents.find(entry =>
            entry.name === "unnamed_parameter").reason,
        /unnamed game parameter 999/u,
    );

    assert.throws(
        () => CjsAudioLibraryBuilder.createSfxGraph({
            ...request,
            enrichment: {
                gameParameters: {
                    800: { defaultValue: 1 },
                },
            },
        }),
        /defaultValue conflicts with 0/u,
    );
});

test("SFX spatial projection resolves inherited and mixed playable leaves", () =>
{
    const inspections = [
        {
            source: "effects.bnk",
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
                    sourceBits: 0,
                    payload: soundPayload({
                        directParentId: 700,
                    }),
                },
                {
                    type: 2,
                    id: 201,
                    pluginId: 0x00040001,
                    pluginType: 1,
                    streamType: 0,
                    sourceId: 9002,
                    inMemoryMediaSize: 64,
                    sourceBits: 0,
                    payload: soundPayload({
                        positioningFlags: 0x01,
                    }),
                },
                {
                    type: 2,
                    id: 203,
                    pluginId: 0x00040001,
                    pluginType: 1,
                    streamType: 0,
                    sourceId: 9003,
                    inMemoryMediaSize: 64,
                    sourceBits: 0,
                    payload: soundPayload({
                        positioningFlags: 0x03,
                        spatialFlags: 0x01,
                        attenuationId: 0,
                    }),
                },
                {
                    type: 7,
                    id: 700,
                    payload: actorMixerPayload({
                        positioningFlags: 0x03,
                        spatialFlags: 0x09,
                        attenuationId: 800,
                        children: [ 200 ],
                    }),
                },
                {
                    type: 14,
                    id: 800,
                    payload: attenuationPayload(500),
                },
                {
                    type: 9,
                    id: 202,
                    payload: concatBytes(
                        nodeBasePayload(),
                        layerPayload([ 200, 201 ]),
                    ),
                },
                {
                    type: 3,
                    id: 300,
                    actionType: 0x0403,
                    targetId: 200,
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 301,
                    actionType: 0x0403,
                    targetId: 201,
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 302,
                    actionType: 0x0403,
                    targetId: 202,
                    payload: new Uint8Array(),
                },
                {
                    type: 3,
                    id: 303,
                    actionType: 0x0403,
                    targetId: 203,
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 100,
                    actionIds: [ 300 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 101,
                    actionIds: [ 301 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 102,
                    actionIds: [ 302 ],
                    payload: new Uint8Array(),
                },
                {
                    type: 4,
                    id: 103,
                    actionIds: [ 303 ],
                    payload: new Uint8Array(),
                },
            ],
        },
    ];
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections,
        metadata: {
            Events: {
                inherited_3d: { eventID: 100 },
                local_2d: { eventID: 101 },
                mixed: { eventID: 102 },
                listener_relative_with_zero_attenuation: { eventID: 103 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
            "9003": { resPath: "res:/audio/9003.wem" },
        },
    });

    assert.deepEqual(result.metadataProjection.Events, {
        inherited_3d: {
            is2D: 0,
            maxRadiusAttenuation: 500,
        },
        listener_relative_with_zero_attenuation: { is2D: 1 },
        local_2d: { is2D: 1 },
        mixed: {
            is2D: 0,
            maxRadiusAttenuation: 500,
        },
    });
    assert.equal(
        result.nodes["200"].spatial,
        true,
        "the inherited 3D leaf retains its own panner route",
    );
    assert.deepEqual(
        result.nodes["200"].dryVolumeCurve,
        {
            scaling: 2,
            points: [
                { x: 0, value: 0, interpolation: 4 },
                { x: 500, value: -1, interpolation: 4 },
            ],
        },
        "the inherited positioning owner retains its raw Wwise dry-volume curve",
    );
    assert.equal(
        result.nodes["201"].spatial,
        false,
        "the local 2D leaf bypasses the panner inside a mixed event",
    );
    assert.equal(result.nodes["203"].spatial, false);
    assert.deepEqual(result.diagnostics.spatial.omitted, []);
});

test("SFX spatial projection omits unresolved parent cycles", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "effects.bnk",
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 7,
                        id: 700,
                        payload: actorMixerPayload({
                            directParentId: 701,
                        }),
                    },
                    {
                        type: 7,
                        id: 701,
                        payload: actorMixerPayload({
                            directParentId: 700,
                        }),
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
                cyclic: { eventID: 100 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
        },
    });

    assert.deepEqual(result.metadataProjection.Events, {});
    assert.equal(
        Object.hasOwn(result.nodes["200"], "spatial"),
        false,
        "unknown leaf positioning retains the event metadata fallback",
    );
    assert.equal(result.diagnostics.spatial.omitted.length, 1);
    assert.match(
        result.diagnostics.spatial.omitted[0].reasons[0],
        /positioning parent cycle/u,
    );
});

test("SFX spatial projection fails open for missing inherited parents", () =>
{
    const result = CjsAudioLibraryBuilder.createSfxGraph({
        inspections: [
            {
                source: "effects.bnk",
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
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 700,
                        }),
                    },
                    {
                        type: 2,
                        id: 201,
                        pluginId: 0x00040001,
                        pluginType: 1,
                        streamType: 0,
                        sourceId: 9002,
                        inMemoryMediaSize: 64,
                        sourceBits: 0,
                        payload: soundPayload({
                            directParentId: 701,
                            positioningFlags: 0x01,
                        }),
                    },
                    {
                        type: 3,
                        id: 300,
                        actionType: 0x0403,
                        targetId: 200,
                        payload: new Uint8Array(),
                    },
                    {
                        type: 3,
                        id: 301,
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
                    {
                        type: 4,
                        id: 101,
                        actionIds: [ 301 ],
                        payload: new Uint8Array(),
                    },
                ],
            },
        ],
        metadata: {
            Events: {
                unresolved: { eventID: 100 },
                local_override: { eventID: 101 },
            },
        },
        media: {
            "9001": { resPath: "res:/audio/9001.wem" },
            "9002": { resPath: "res:/audio/9002.wem" },
        },
    });

    assert.deepEqual(result.metadataProjection.Events, {
        local_override: { is2D: 1 },
    });
    assert.deepEqual(result.diagnostics.spatial.projected, [
        {
            name: "local_override",
            leafIds: [ 201 ],
            is2D: 1,
        },
    ]);
    assert.deepEqual(result.diagnostics.spatial.omitted, [
        {
            name: "unresolved",
            leafIds: [ 200 ],
            reasons: [ "missing NodeBase 700" ],
        },
    ]);
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
                weapon_stop: {
                    eventID: 101,
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
                            sourceBits: 0,
                            payload: soundPayload({
                                positioningFlags: 0x01,
                            }),
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
                        {
                            type: 3,
                            id: 301,
                            actionType: 0x0103,
                            targetId: 200,
                            payload: new Uint8Array(),
                        },
                        {
                            type: 4,
                            id: 101,
                            actionIds: [ 301 ],
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
    assert.deepEqual(diagnostics.spatial.projected, [
        {
            name: "weapon_fire",
            leafIds: [ 200 ],
            is2D: 1,
        },
    ]);
    assert.equal(library.metadata.Events.weapon_fire.is2D, 1);
    assert.deepEqual(
        library.metadata.Events.weapon_fire.eventsStoppedBy,
        [ "weapon_stop" ],
    );
});

test("bank spatial projection preserves caller metadata precedence", async () =>
{
    const bankDerived = await BuildSpatialPrecedenceLibrary();
    const callerMetadata = await BuildSpatialPrecedenceLibrary({
        metadata: {
            Events: {
                weapon_fire: {
                    is2D: 0,
                },
            },
        },
    });
    const callerEnrichment = await BuildSpatialPrecedenceLibrary({
        metadata: {
            Events: {
                weapon_fire: {
                    is2D: 0,
                },
            },
        },
        enrichment: {
            Events: {
                weapon_fire: {
                    is2D: 1,
                },
            },
        },
    });

    assert.equal(bankDerived.metadata.Events.weapon_fire.is2D, 1);
    assert.equal(callerMetadata.metadata.Events.weapon_fire.is2D, 0);
    assert.equal(callerEnrichment.metadata.Events.weapon_fire.is2D, 1);
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
    nodeBase = null,
    childID,
    childIDs,
    loopCount = 1,
    loopModMin = 0,
    loopModMax = 0,
    transitionTime = 0,
    transitionTimeModMin = 0,
    transitionTimeModMax = 0,
    transitionMode = 0,
    avoidRepeatCount = 0,
    randomMode = 0,
    containerMode = 0,
    flags = 0,
})
{
    const children = childIDs ?? [ childID ];
    const bytes = new Uint8Array(30 + children.length * 12);
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

    u16(loopCount);
    u16(loopModMin);
    u16(loopModMax);
    f32(transitionTime);
    f32(transitionTimeModMin);
    f32(transitionTimeModMax);
    u16(avoidRepeatCount);
    u8(transitionMode);
    u8(randomMode);
    u8(containerMode);
    u8(flags);
    u32(children.length);
    for (const id of children)
    {
        u32(id);
    }
    u16(children.length);
    for (const id of children)
    {
        u32(id);
        s32(1);
    }

    return nodeBase ? concatBytes(nodeBase, bytes) : bytes;
}

function switchPayload({
    groupType = 0,
    groupId = 500,
    defaultValueId = 501,
    continuousValidation = false,
    children,
    assignments,
    parameters,
})
{
    const writer = new TestWriter()
        .u8(0xaa).u8(0x55).u8(0x33)
        .u8(groupType)
        .u32(groupId)
        .u32(defaultValueId)
        .u8(continuousValidation ? 1 : 0)
        .u32(children.length);

    for (const childId of children)
    {
        writer.u32(childId);
    }
    writer.u32(assignments.length);
    for (const assignment of assignments)
    {
        writer
            .u32(assignment.valueId)
            .u32(assignment.childIds.length);
        for (const childId of assignment.childIds)
        {
            writer.u32(childId);
        }
    }
    writer.u32(parameters.length);
    for (const parameter of parameters)
    {
        const flags1 = (parameter.firstOnly ? 1 : 0)
            | (parameter.continuePlayback ? 2 : 0);

        writer
            .u32(parameter.childId)
            .u8(flags1)
            .u8(parameter.onSwitchMode ?? 0)
            .s32(parameter.fadeOutMs ?? 0)
            .s32(parameter.fadeInMs ?? 0);
    }
    return writer.bytes();
}

function layerPayload(children, continuousValidation = false)
{
    const bytes = new Uint8Array(9 + children.length * 4);
    const view = new DataView(bytes.buffer);

    view.setUint32(0, children.length, true);
    for (let index = 0; index < children.length; index++)
    {
        view.setUint32(4 + index * 4, children[index], true);
    }
    view.setUint32(4 + children.length * 4, 0, true);
    view.setUint8(
        8 + children.length * 4,
        continuousValidation ? 1 : 0,
    );
    return bytes;
}

function trackedLayerPayload({
    children,
    controlId,
    associations,
    rtpcs = [],
    continuousValidation = false,
})
{
    const writer = new TestWriter()
        .u32(children.length);

    for (const child of children)
    {
        writer.u32(child);
    }

    writer
        .u32(1)
        .u32(700)
        .u16(rtpcs.length);

    for (let index = 0; index < rtpcs.length; index++)
    {
        const rtpc = rtpcs[index];

        writer
            .u32(rtpc.controlId)
            .u8(rtpc.controlType ?? 0)
            .u8(rtpc.accumulation ?? 2)
            .variable(rtpc.parameterId)
            .u32(rtpc.curveId ?? index + 1)
            .u8(rtpc.scaling)
            .u16(rtpc.points.length);

        for (const [ from, to, interpolation ] of rtpc.points)
        {
            writer
                .f32(from)
                .f32(to)
                .u32(interpolation);
        }
    }

    writer
        .u32(controlId)
        .u8(0)
        .u32(associations.length);

    for (const association of associations)
    {
        writer
            .u32(association.childId)
            .u32(association.points.length);

        for (const [ from, to, interpolation ] of association.points)
        {
            writer
                .f32(from)
                .f32(to)
                .u32(interpolation);
        }
    }

    return writer.u8(continuousValidation ? 1 : 0).bytes();
}

function setterPayload(groupID, valueID)
{
    return new TestWriter()
        .u32(groupID)
        .u32(valueID)
        .bytes();
}

function attenuationPayload(maximumDistance)
{
    const writer = new TestWriter()
        .u8(1)
        .u8(0);

    for (let index = 0; index < 19; index++)
    {
        writer.u8(index === 0 ? 0 : -2);
    }

    return writer
        .u8(1)
        .u8(2)
        .u16(2)
        .f32(0)
        .f32(0)
        .u32(4)
        .f32(maximumDistance)
        .f32(-1)
        .u32(4)
        .u16(0)
        .bytes();
}

function soundPayload({
    pluginId = 0x00040001,
    sourceId = 9001,
    inMemoryMediaSize = 64,
    sourceParameterBlock = null,
    overrideBusId = 0,
    directParentId = 0,
    positioningFlags = 0,
    spatialFlags = 0,
    attenuationId = null,
    loopCount = null,
    properties = [],
    ranges = [],
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
    auxIds = [],
    overrideUserAux = false,
    overrideReflectionsAux = false,
    reflectionsAuxBusId = 0,
    priorityFlags = 0,
    advancedFlags = 0,
    virtualQueueBehavior = 0,
    maxInstances = 0,
    belowThresholdBehavior = 0,
    hdrFlags = 0,
    effects = [],
    overrideEffects = false,
    bypassAllEffects = false,
} = {})
{
    const writer = new TestWriter()
        .u32(pluginId)
        .u8(0)
        .u32(sourceId)
        .u32(inMemoryMediaSize)
        .u8(0);

    if ((pluginId & 0x0f) === 2)
    {
        const parameters = sourceParameterBlock ?? new Uint8Array();

        writer.u32(parameters.byteLength).append(parameters);
    }

    return writer.append(nodeBasePayload({
            overrideBusId,
            directParentId,
            positioningFlags,
            spatialFlags,
            attenuationId,
            loopCount,
            properties,
            ranges,
            rtpcs,
            stateProperties,
            stateGroups,
            auxIds,
            overrideUserAux,
            overrideReflectionsAux,
            reflectionsAuxBusId,
            priorityFlags,
            advancedFlags,
            virtualQueueBehavior,
            maxInstances,
            belowThresholdBehavior,
            hdrFlags,
            effects,
            overrideEffects,
            bypassAllEffects,
        }))
        .bytes();
}

function silenceSourceEffectPayload({
    durationSeconds,
    randomizedMinus = 0,
    randomizedPlus = 0,
    pluginId = 0x00650002,
} = {})
{
    const parameterBlock = new TestWriter()
        .f32(durationSeconds)
        .f32(randomizedMinus)
        .f32(randomizedPlus)
        .bytes();

    return new TestWriter()
        .u32(pluginId)
        .u32(parameterBlock.byteLength)
        .append(parameterBlock)
        .u8(0)
        .u16(0)
        .u8(0)
        .u8(0)
        .u16(0)
        .bytes();
}

function parametricEqEffectPayload({
    bands,
    outputGainDb = 0,
    processLfe = true,
    propertyValues = [],
    pluginId = 0x00690003,
} = {})
{
    const parameters = new TestWriter();

    for (const band of bands)
    {
        parameters
            .u32(band.filterTypeId)
            .f32(band.gainDb)
            .f32(band.frequencyHz)
            .f32(band.q)
            .u8(band.enabledRaw ?? (band.enabled ? 1 : 0));
    }
    parameters.f32(outputGainDb).u8(processLfe ? 1 : 0);
    const parameterBlock = parameters.bytes();
    const writer = new TestWriter()
        .u32(pluginId)
        .u32(parameterBlock.byteLength)
        .append(parameterBlock)
        .u8(0)
        .u16(0)
        .u8(0)
        .u8(0)
        .u16(propertyValues.length);

    for (const property of propertyValues)
    {
        writer
            .variable(property.propertyId)
            .u8(property.accumulation ?? 0)
            .f32(property.value);
    }
    return writer.bytes();
}

function wwiseDelayEffectPayload({
    delayTimeSeconds,
    feedbackPercent,
    wetDryMixPercent,
    outputGainDb = 0,
    feedbackEnabled = true,
    processLfe = true,
} = {})
{
    const parameterBlock = new TestWriter()
        .f32(delayTimeSeconds)
        .f32(feedbackPercent)
        .f32(wetDryMixPercent)
        .f32(outputGainDb)
        .u8(feedbackEnabled ? 1 : 0)
        .u8(processLfe ? 1 : 0)
        .bytes();

    return new TestWriter()
        .u32(0x006a0003)
        .u32(parameterBlock.byteLength)
        .append(parameterBlock)
        .u8(0)
        .u16(0)
        .u8(0)
        .u8(0)
        .u16(0)
        .bytes();
}

function BuildRoutedEffectLibrary({
    effectType = 16,
    effectFlags = 2,
    effectPayload = null,
    unsupportedEffectFlags = null,
} = {})
{
    const defaultBands = [
        { filterTypeId: 4, gainDb: 0, frequencyHz: 120, q: 1, enabled: false },
        { filterTypeId: 6, gainDb: -13, frequencyHz: 120, q: 5, enabled: true },
        { filterTypeId: 5, gainDb: 0, frequencyHz: 12000, q: 1, enabled: true },
    ];

    return CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        metadata: {
            Events: {},
            SoundBanks: {
                "init.bnk": {
                    name: "init",
                    path: "\\SoundBanks\\init.bnk",
                    shortId: 200,
                },
            },
            WemFileIDs: {},
        },
        indexEntries: [ {
            logicalPath: "res:/audio/init.bnk",
            storagePath: "banks/init.bnk",
            byteLength: 256,
        } ],
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
                            id: 300,
                            pluginId: 0x00040001,
                            pluginType: 1,
                            streamType: 0,
                            sourceId: 9001,
                            inMemoryMediaSize: 64,
                            payload: soundPayload({ overrideBusId: 500 }),
                        },
                        {
                            type: 8,
                            id: 500,
                            payload: busPayload({
                                effects: [
                                    ...(unsupportedEffectFlags === null
                                        ? []
                                        : [ {
                                            slotIndex: 0,
                                            effectId: 901,
                                            flags: unsupportedEffectFlags,
                                        } ]),
                                    {
                                        slotIndex: 1,
                                        effectId: 900,
                                        flags: effectFlags,
                                    },
                                ],
                            }),
                        },
                        ...(unsupportedEffectFlags === null
                            ? []
                            : [ {
                                type: 17,
                                id: 901,
                                payload: parametricEqEffectPayload({
                                    bands: defaultBands,
                                    pluginId: 0x006c0003,
                                }),
                            } ]),
                        {
                            type: effectType,
                            id: 900,
                            payload: effectPayload ?? parametricEqEffectPayload({
                                bands: defaultBands,
                            }),
                        },
                    ],
                    media: [],
                },
            };
        },
    });
}

function BuildSpatialPrecedenceLibrary(overrides = {})
{
    return CjsAudioLibraryBuilder.buildFromBanks({
        includeSfx: true,
        soundbanksInfo: {
            SoundBanksInfo: {
                SoundBanks: [
                    {
                        Id: "200",
                        ShortName: "common",
                        Path: "SoundBanks\\common.bnk",
                        Events: [
                            {
                                Id: "100",
                                Name: "weapon_fire",
                            },
                        ],
                        Media: [
                            {
                                Id: "9001",
                                ShortName: "weapon.wem",
                            },
                        ],
                    },
                ],
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
                            sourceBits: 0,
                            payload: soundPayload({
                                positioningFlags: 0x01,
                            }),
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
                            mediaType: "wem",
                        },
                    ],
                },
            };
        },
        ...overrides,
    });
}

function actorMixerPayload({
    overrideBusId = 0,
    directParentId = 0,
    positioningFlags = 0,
    spatialFlags = 0,
    attenuationId = null,
    properties = [],
    ranges = [],
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
    children = [],
    auxIds = [],
    overrideUserAux = false,
    overrideReflectionsAux = false,
    reflectionsAuxBusId = 0,
    priorityFlags = 0,
    advancedFlags = 0,
    virtualQueueBehavior = 0,
    maxInstances = 0,
    belowThresholdBehavior = 0,
    hdrFlags = 0,
    effects = [],
    overrideEffects = false,
    bypassAllEffects = false,
} = {})
{
    const writer = new TestWriter()
        .append(nodeBasePayload({
            overrideBusId,
            directParentId,
            positioningFlags,
            spatialFlags,
            attenuationId,
            properties,
            ranges,
            rtpcs,
            stateProperties,
            stateGroups,
            auxIds,
            overrideUserAux,
            overrideReflectionsAux,
            reflectionsAuxBusId,
            priorityFlags,
            advancedFlags,
            virtualQueueBehavior,
            maxInstances,
            belowThresholdBehavior,
            hdrFlags,
            effects,
            overrideEffects,
            bypassAllEffects,
        }))
        .u32(children.length);

    for (const child of children)
    {
        writer.u32(child);
    }

    return writer.bytes();
}

function busPayload({
    parentId = 0,
    recoveryTime = 0,
    maxDuckVolume = 0,
    ducks = [],
    effects = [],
    bypassAllEffects = false,
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
    properties = [],
    auxIds = [],
    overrideUserAux = false,
    overrideReflectionsAux = false,
    reflectionsAuxBusId = 0,
} = {})
{
    const writer = new TestWriter().u32(parentId);

    if (parentId === 0) writer.u32(0);

    writer.u8(properties.length);
    for (const property of properties) writer.u8(property.id);
    for (const property of properties) writer.f32(property.value);

    const auxFlags = (overrideUserAux ? 0x04 : 0)
        | (auxIds.length ? 0x08 : 0)
        | (overrideReflectionsAux ? 0x10 : 0);

    writer
        .u8(0)
        .u8(auxFlags);
    if (auxIds.length)
    {
        for (let index = 0; index < 4; index++) writer.u32(auxIds[index] ?? 0);
    }
    writer
        .u32(reflectionsAuxBusId)
        .u8(0).u16(0).u32(0).u8(0)
        .u32(recoveryTime).f32(maxDuckVolume).u32(ducks.length);

    for (const duck of ducks)
    {
        writer
            .u32(duck.busId)
            .f32(duck.volume)
            .u32(duck.fadeOutTime)
            .u32(duck.fadeInTime)
            .u8(duck.curve)
            .u8(duck.targetPropertyId);
    }

    writer.u8(effects.length);
    if (effects.length)
    {
        writer.u8(bypassAllEffects ? 1 : 0);
        for (const effect of effects)
        {
            writer
                .u8(effect.slotIndex)
                .u32(effect.effectId)
                .u8(effect.flags ?? 0);
        }
    }
    writer.u8(0).u16(rtpcs.length);

    for (const rtpc of rtpcs)
    {
        writer
            .u32(rtpc.controlId)
            .u8(rtpc.controlType)
            .u8(rtpc.accumulation)
            .variable(rtpc.parameterId)
            .u32(rtpc.curveId)
            .u8(rtpc.scaling)
            .u16(rtpc.points.length);

        for (const [ from, to, interpolation ] of rtpc.points)
        {
            writer.f32(from).f32(to).u32(interpolation);
        }
    }

    writer.variable(stateProperties.length);
    for (const property of stateProperties)
    {
        writer
            .variable(property.propertyId)
            .u8(property.accumulation)
            .u8(property.inDb ? 1 : 0);
    }
    writer.variable(stateGroups.length);
    for (const group of stateGroups)
    {
        writer
            .u32(group.groupId)
            .u8(group.syncType)
            .variable(group.states.length);
        for (const state of group.states)
        {
            writer.u32(state.stateId).u16(state.values.length);
            for (const value of state.values) writer.u16(value.propertyId);
            for (const value of state.values) writer.f32(value.value);
        }
    }
    return writer.bytes();
}

function concatBytes(...values)
{
    const writer = new TestWriter();

    for (const value of values)
    {
        writer.append(value);
    }

    return writer.bytes();
}

function nodeBasePayload({
    overrideBusId = 0,
    directParentId = 0,
    positioningFlags = 0,
    spatialFlags = 0,
    attenuationId = null,
    loopCount = null,
    properties: propertyValues = [],
    ranges = [],
    rtpcs = [],
    stateProperties = [],
    stateGroups = [],
    auxIds = [],
    overrideUserAux = false,
    overrideReflectionsAux = false,
    reflectionsAuxBusId = 0,
    priorityFlags = 0,
    advancedFlags = 0,
    virtualQueueBehavior = 0,
    maxInstances = 0,
    belowThresholdBehavior = 0,
    hdrFlags = 0,
    effects = [],
    overrideEffects = false,
    bypassAllEffects = false,
} = {})
{
    const writer = new TestWriter()
        .u8(overrideEffects ? 1 : 0)
        .u8(effects.length);

    if (effects.length)
    {
        writer.u8(bypassAllEffects ? 1 : 0);
        for (const effect of effects)
        {
            writer
                .u8(effect.slotIndex)
                .u32(effect.effectId)
                .u8(effect.flags ?? 0);
        }
    }
    writer
        .u8(0).u8(0)
        .u32(overrideBusId)
        .u32(directParentId)
        .u8(priorityFlags);

    const properties = propertyValues.map(property => ({
        ...property,
        float: true,
    }));

    if (loopCount !== null)
    {
        properties.push({
            id: 0x54,
            value: loopCount,
            float: false,
        });
    }
    if (attenuationId !== null)
    {
        properties.push({
            id: 0x55,
            value: attenuationId,
            float: false,
        });
    }

    writer.u8(properties.length);
    for (const property of properties)
    {
        writer.u8(property.id);
    }
    for (const property of properties)
    {
        if (property.float)
        {
            writer.f32(property.value);
        }
        else
        {
            writer.u32(property.value);
        }
    }

    writer.u8(ranges.length);
    for (const range of ranges)
    {
        writer.u8(range.id);
    }
    for (const range of ranges)
    {
        writer.f32(range.min).f32(range.max);
    }

    writer.u8(positioningFlags);

    if ((positioningFlags & 0x03) === 0x03)
    {
        writer.u8(spatialFlags);
    }

    const auxFlags = (overrideUserAux ? 0x04 : 0)
        | (auxIds.length ? 0x08 : 0)
        | (overrideReflectionsAux ? 0x10 : 0);

    writer.u8(auxFlags);
    if (auxIds.length)
    {
        for (let index = 0; index < 4; index++) writer.u32(auxIds[index] ?? 0);
    }
    writer
        .u32(reflectionsAuxBusId)
        .u8(advancedFlags)
        .u8(virtualQueueBehavior)
        .u16(maxInstances)
        .u8(belowThresholdBehavior)
        .u8(hdrFlags)
        .u8(stateProperties.length);

    for (const property of stateProperties)
    {
        writer
            .u8(property.propertyId)
            .u8(property.accumulation)
            .u8(property.inDb ? 1 : 0);
    }

    writer.u8(stateGroups.length);
    for (const group of stateGroups)
    {
        writer
            .u32(group.groupId)
            .u8(group.syncType ?? 0)
            .u8(group.states.length);

        for (const state of group.states)
        {
            writer
                .u32(state.stateId)
                .u16(state.values.length);
            for (const value of state.values)
            {
                writer.u16(value.propertyId);
            }
            for (const value of state.values)
            {
                writer.f32(value.value);
            }
        }
    }

    writer.u16(rtpcs.length);
    for (let index = 0; index < rtpcs.length; index++)
    {
        const rtpc = rtpcs[index];

        writer
            .u32(rtpc.controlId)
            .u8(rtpc.controlType ?? 0)
            .u8(rtpc.accumulation ?? 2)
            .variable(rtpc.parameterId)
            .u32(rtpc.curveId ?? index + 1)
            .u8(rtpc.scaling)
            .u16(rtpc.points.length);

        for (const [ from, to, interpolation ] of rtpc.points)
        {
            writer
                .f32(from)
                .f32(to)
                .u32(interpolation);
        }
    }

    return writer.bytes();
}

class TestWriter
{
    constructor()
    {
        this.values = [];
    }

    u8(value)
    {
        this.values.push(value & 0xff);
        return this;
    }

    u16(value)
    {
        return this.#number(2, view => view.setUint16(0, value, true));
    }

    u32(value)
    {
        return this.#number(4, view => view.setUint32(0, value, true));
    }

    s32(value)
    {
        return this.#number(4, view => view.setInt32(0, value, true));
    }

    f32(value)
    {
        return this.#number(4, view => view.setFloat32(0, value, true));
    }

    f64(value)
    {
        return this.#number(8, view => view.setFloat64(0, value, true));
    }

    variable(value)
    {
        const groups = [ value & 0x7f ];
        let remaining = Math.floor(value / 128);

        while (remaining)
        {
            groups.unshift((remaining & 0x7f) | 0x80);
            remaining = Math.floor(remaining / 128);
        }
        this.values.push(...groups);
        return this;
    }

    append(bytes)
    {
        this.values.push(...bytes);
        return this;
    }

    bytes()
    {
        return Uint8Array.from(this.values);
    }

    #number(size, write)
    {
        const bytes = new Uint8Array(size);

        write(new DataView(bytes.buffer));
        return this.append(bytes);
    }
}
