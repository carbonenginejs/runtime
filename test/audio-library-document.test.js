import assert from "node:assert/strict";
import test from "node:test";

import {
    installAudioLibraryDocument,
    normalizeSfxGraph,
    validateAudioLibraryDocument,
} from "../npm/dist/library/index.js";

function CreateDocument()
{
    return {
        schema: "carbonenginejs.audioLibrary",
        schemaVersion: 2,
        metadata: {
            Events: {
                engine_loop: {
                    eventID: 11,
                    eventsStoppedBy: [],
                    is2D: 0,
                    isLoop: 1,
                    isVital: 0,
                    maxRadiusAttenuation: 100,
                    soundbanks: [ "ships.bnk" ],
                },
            },
            SoundBanks: {
                "ships.bnk": {
                    EssentialSoundBank: 0,
                },
            },
            WemFileIDs: {
                "777": {
                    SoundBank: "ships.bnk",
                },
            },
        },
        media: {
            "777": {
                sourceID: "loose:777",
                resPath: "res:/audio/777.wem",
                mediaType: "wem",
            },
        },
        banks: {
            "524:0": {
                sourceID: "524:0",
                bankID: "524",
                languageID: "0",
                resPath: "res:/audio/524.bnk",
            },
        },
        eventMedia: {
            engine_loop: [ "777" ],
        },
        eventMediaLanguage: "",
    };
}

function BusGraphBus(overrides = {})
{
    return {
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
        auxFlags: 21,
        bypassAllEffects: false,
        userAuxSends: [],
        effects: [],
        requiresProcessing: [],
        ...overrides,
    };
}

test("validates and installs one detached immutable audio-library document", () =>
{
    const source = CreateDocument();
    const installed = installAudioLibraryDocument(source);

    assert.equal(validateAudioLibraryDocument(source), true);
    assert.notEqual(installed, source);
    assert.notEqual(installed.metadata, source.metadata);
    assert.equal(Object.isFrozen(installed), true);
    assert.equal(Object.isFrozen(installed.metadata.Events), true);
    assert.throws(() =>
    {
        installed.metadata.Events.engine_loop.isLoop = 0;
    }, TypeError);
});

test("rejects missing media references and non-JSON installed values", () =>
{
    const missing = CreateDocument();

    missing.eventMedia.engine_loop = [ "999" ];

    assert.throws(
        () => validateAudioLibraryDocument(missing),
        /references missing source 999/u,
    );

    const invalid = CreateDocument();

    invalid.metadata.Events.engine_loop.value = Number.NaN;

    assert.throws(
        () => installAudioLibraryDocument(invalid),
        /contains a non-finite number/u,
    );
});

test("rejects the retired v1 document shape", () =>
{
    const legacy = CreateDocument();

    legacy.schemaVersion = 1;

    assert.throws(
        () => validateAudioLibraryDocument(legacy),
        /Unsupported audio-library schema version: 1/u,
    );
});

test("rejects invalid spatial event metadata", () =>
{
    const invalidDimension = CreateDocument();

    invalidDimension.metadata.Events.engine_loop.is2D = true;

    assert.throws(
        () => validateAudioLibraryDocument(invalidDimension),
        /is2D must be 0 or 1/u,
    );

    const invalidRadius = CreateDocument();

    invalidRadius.metadata.Events.engine_loop.maxRadiusAttenuation = -1;

    assert.throws(
        () => validateAudioLibraryDocument(invalidRadius),
        /maxRadiusAttenuation must be a non-negative finite number/u,
    );
});

test("validates, detaches, and freezes property-tagged Bus RTPC catalogs", () =>
{
    const source = CreateDocument();

    source.busRtpcs = {
        schemaVersion: 2,
        buses: {
            "500": [ {
                curveId: 77,
                property: "voice-volume",
                rtpc: "menu_advanced_world_level",
                defaultValue: 0.5,
                scaling: 2,
                points: [
                    { x: 0, value: -1, interpolation: 4 },
                    { x: 1, value: 0.4988127648830414, interpolation: 8 },
                ],
            } ],
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busRtpcs.buses["500"][0].curveId, 77);
    assert.notEqual(installed.busRtpcs, source.busRtpcs);
    assert.equal(Object.isFrozen(installed.busRtpcs.buses["500"]), true);

    for (const mutate of [
        value => { value.schemaVersion = 3; },
        value => { value.buses["0500"] = value.buses["500"]; },
        value => { value.buses["500"][0].property = "volume"; },
        value => { value.buses["500"][0].defaultValue = Number.NaN; },
        value => { value.buses["500"][0].scaling = 0; },
        value => { value.buses["500"][0].points[0].value = -1.1; },
        value => { value.buses["500"][0].points[0].interpolation = 10; },
        value => { value.buses["500"][0].points.reverse(); },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busRtpcs);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }

    const legacy = structuredClone(source);

    legacy.busRtpcs.schemaVersion = 1;
    delete legacy.busRtpcs.buses["500"][0].property;
    assert.equal(validateAudioLibraryDocument(legacy), true);
});

test("validates and freezes the optional Bus Volume State catalog", () =>
{
    const source = CreateDocument();

    source.busStates = {
        schemaVersion: 1,
        property: "bus-volume",
        accumulation: "additive",
        unit: "db",
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
                } ],
            } ],
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busStates.buses["500"][0].syncType, 1);
    assert.notEqual(installed.busStates, source.busStates);
    assert.equal(Object.isFrozen(installed.busStates.buses["500"]), true);

    for (const mutate of [
        value => { value.property = "voice-volume"; },
        value => { value.buses["500"][0].effectiveSyncType = 1; },
        value => { value.buses["500"][0].states[0].gainDb = -201; },
        value => { value.buses["500"][0].states[0].state = "missing"; },
        value => { value.stateTransitions = []; },
        value => { value.stateTransitions[0].group = "other"; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busStates);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }
});

test("validates and freezes multi-property Audio Bus States", () =>
{
    const source = CreateDocument();

    source.busStates = {
        schemaVersion: 2,
        filterBehavior: "additive",
        stateTransitions: [ {
            groupId: "600",
            group: "camera_state",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "601", state: "None" },
                { stateId: "602", state: "active" },
            ],
            transitions: [],
        } ],
        buses: {
            "500": [ {
                groupId: "600",
                group: "camera_state",
                syncType: 0,
                effectiveSyncType: 0,
                states: [ {
                    stateId: "602",
                    state: "active",
                    gainDb: -6,
                    pitchCents: -100,
                    lowPass: -70,
                    highPass: 45,
                } ],
            } ],
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busStates.buses["500"][0].states[0].lowPass, -70);
    assert.equal(Object.isFrozen(installed.busStates.buses["500"]), true);

    for (const mutate of [
        value => { value.filterBehavior = "maximum"; },
        value => { delete value.filterBehavior; },
        value => { value.buses["500"][0].states[0].pitchCents = -2401; },
        value => { value.buses["500"][0].states[0].lowPass = -101; },
        value => { value.buses["500"][0].states[0] = {
            stateId: "602",
            state: "active",
        }; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busStates);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }
});

test("validates and freezes the optional Audio Bus ducking catalog", () =>
{
    const source = CreateDocument();

    source.busDucking = {
        schemaVersion: 1,
        sources: {
            "500": {
                recoveryMs: 1000,
                maxDuckVolumeDb: -18,
                targets: [ {
                    targetBusId: "600",
                    volumeDb: -12,
                    fadeOutMs: 250,
                    fadeInMs: 750,
                    curve: 8,
                    targetProperty: "voice-volume",
                } ],
            },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busDucking.sources["500"].recoveryMs, 1000);
    assert.notEqual(installed.busDucking, source.busDucking);
    assert.equal(
        Object.isFrozen(installed.busDucking.sources["500"].targets),
        true,
    );

    for (const mutate of [
        value => { value.schemaVersion = 2; },
        value => { value.sources["0500"] = value.sources["500"]; },
        value => { value.sources["500"].recoveryMs = -1; },
        value => { value.sources["500"].maxDuckVolumeDb = 1; },
        value => { value.sources["500"].targets[0].volumeDb = -19; },
        value => { value.sources["500"].targets[0].fadeOutMs = 0.5; },
        value => { value.sources["500"].targets[0].curve = 10; },
        value => { value.sources["500"].targets[0].targetProperty = "pitch"; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busDucking);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }
});

test("validates and freezes the optional static Audio Bus effect catalog", () =>
{
    const source = CreateDocument();

    source.busEffects = {
        schemaVersion: 1,
        buses: {
            "500": [ {
                effectId: "900",
                slotIndex: 1,
                type: "parametric-eq",
                bands: [ {
                    index: 1,
                    filterType: "peaking",
                    gainDb: -13,
                    frequencyHz: 120,
                    q: 5,
                } ],
                outputGainDb: 0,
                processLfe: true,
            } ],
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busEffects.buses["500"][0].bands[0].q, 5);
    assert.notEqual(installed.busEffects, source.busEffects);
    assert.equal(Object.isFrozen(installed.busEffects.buses["500"]), true);
    assert.equal(
        Object.isFrozen(installed.busEffects.buses["500"][0].bands),
        true,
    );

    for (const mutate of [
        value => { value.schemaVersion = 2; },
        value => { value.buses["0500"] = value.buses["500"]; },
        value => { value.buses["500"][0].type = "compressor"; },
        value => { value.buses["500"][0].bands[0].filterType = "allpass"; },
        value => { value.buses["500"][0].bands[0].frequencyHz = 0; },
        value => { value.buses["500"][0].processLfe = false; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busEffects);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }
});

test("validates and freezes the portable ordered Audio Bus graph", () =>
{
    const source = CreateDocument();

    source.embeddedMedia = {
        "999": {
            sourceID: "embedded:999:524:0",
            bank: "524:0",
            offset: 12,
            byteLength: 3,
            mediaType: "plugin",
        },
    };
    source.busGraph = {
        schemaVersion: 1,
        effects: {
            "900": {
                type: "effect-share-set",
                pluginId: 0x007f0003,
                pluginType: 3,
                companyId: 0,
                pluginClassId: 0x007f,
                parameterByteLength: 3,
                parametersBase64: "AQID",
                media: [ { index: 0, sourceId: "999" } ],
                controls: {
                    rtpcCount: 0,
                    statePropertyCount: 0,
                    stateGroupCount: 0,
                    propertyValueCount: 0,
                },
            },
        },
        buses: {
            "1": BusGraphBus(),
            "500": BusGraphBus({
                parentBusId: "1",
                auxFlags: 29,
                userAuxSends: [ {
                    slotIndex: 0,
                    targetBusId: "600",
                    gainDb: -20,
                    lowPass: 0,
                    highPass: 0,
                    dynamic: false,
                } ],
                requiresProcessing: [ "aux-sends" ],
            }),
            "600": BusGraphBus({
                type: "auxiliary-bus",
                parentBusId: "1",
                effects: [ {
                    slotIndex: 0,
                    effectId: "900",
                    bypass: false,
                    shareSet: true,
                    rendered: false,
                } ],
                requiresProcessing: [ "auxiliary-bus", "effects" ],
            }),
        },
        routes: [ {
            outputBusId: "500",
            busPathIds: [ "500", "1" ],
            userAuxSends: [],
        } ],
        sfxRoutes: { "100": 0 },
        musicRoutes: {},
    };
    source.sfx = {
        schemaVersion: 2,
        events: {},
        nodes: {
            "100": {
                type: "sound",
                mediaId: "777",
                loop: false,
                outputBusId: "500",
                busPathIds: [ "500", "1" ],
            },
        },
    };
    source.busGraph.buses["1"].properties = [
        { id: 2, rawValue: 2 },
        { id: 1, rawValue: "1" },
    ];
    source.busGraph.buses["1"].channelConfig.raw = "0";
    source.busGraph.buses["1"].requiresProcessing = [ "unsupported-rtpc" ];
    delete source.busGraph.routes[0].userAuxSends;

    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busGraph.buses["500"].userAuxSends[0].gainDb, -20);
    assert.equal(installed.busGraph.effects["900"].media[0].sourceId, "999");
    assert.equal(Object.isFrozen(installed.busGraph.routes), true);
    assert.equal(installed.busGraph.buses["1"].channelConfig.raw, 0);
    assert.deepEqual(installed.busGraph.buses["1"].properties, [
        { id: 1, rawValue: 1 },
        { id: 2, rawValue: 2 },
    ]);
    assert.deepEqual(installed.busGraph.routes[0].userAuxSends, []);
    assert.deepEqual(
        installed.busGraph.buses["1"].requiresProcessing,
        [ "unsupported-rtpc" ],
    );

    const controlCatalogs = [
        {
            reason: "rtpc",
            property: "busRtpcs",
            value: {
                schemaVersion: 1,
                buses: {
                    "1": [ {
                        curveId: 77,
                        rtpc: "volume",
                        defaultValue: 0,
                        scaling: 2,
                        points: [ { x: 0, value: 0, interpolation: 4 } ],
                    } ],
                },
            },
        },
        {
            reason: "state",
            property: "busStates",
            value: {
                schemaVersion: 1,
                property: "bus-volume",
                accumulation: "additive",
                unit: "db",
                stateTransitions: [ {
                    groupId: "10",
                    group: "mode",
                    defaultTransitionMs: 0,
                    states: [ { stateId: "20", state: "on" } ],
                    transitions: [],
                } ],
                buses: {
                    "1": [ {
                        groupId: "10",
                        group: "mode",
                        syncType: 0,
                        effectiveSyncType: 0,
                        states: [ {
                            stateId: "20",
                            state: "on",
                            gainDb: -6,
                        } ],
                    } ],
                },
            },
        },
        {
            reason: "ducking",
            property: "busDucking",
            value: {
                schemaVersion: 1,
                sources: {
                    "1": {
                        recoveryMs: 0,
                        maxDuckVolumeDb: -12,
                        targets: [ {
                            targetBusId: "500",
                            volumeDb: -6,
                            fadeOutMs: 0,
                            fadeInMs: 0,
                            curve: 4,
                            targetProperty: "bus-volume",
                        } ],
                    },
                },
            },
        },
    ];

    for (const { reason, property, value } of controlCatalogs)
    {
        const missingCatalog = structuredClone(source);

        missingCatalog.busGraph.buses["1"].requiresProcessing = [ reason ];
        assert.throws(
            () => validateAudioLibraryDocument(missingCatalog),
            /catalog disagrees/u,
        );

        const missingReason = structuredClone(source);

        missingReason.busGraph.buses["1"].requiresProcessing = [];
        missingReason[property] = value;
        assert.throws(
            () => validateAudioLibraryDocument(missingReason),
            /catalog disagrees/u,
        );

        const aligned = structuredClone(missingReason);

        aligned.busGraph.buses["1"].requiresProcessing = [ reason ];
        assert.equal(validateAudioLibraryDocument(aligned), true);
    }

    const recursiveAux = structuredClone(source);

    recursiveAux.busGraph.buses["600"].parentBusId = "500";
    assert.equal(validateAudioLibraryDocument(recursiveAux), true);

    const boundary = structuredClone(source);

    Object.assign(boundary.busGraph.effects["900"], {
        pluginId: 0xffffffff,
        pluginType: 0x0f,
        companyId: 0x0fff,
        pluginClassId: 0xffff,
    });
    assert.equal(validateAudioLibraryDocument(boundary), true);

    for (const mutate of [
        value => { value.schemaVersion = 2; },
        value => { value.effects["900"].parameterByteLength = 4; },
        value => { value.effects["900"].pluginClassId = 0x0080; },
        value => { value.effects["900"].parametersBase64 = "AB=="; value.effects["900"].parameterByteLength = 1; },
        value => { value.effects["900"].media[0].sourceId = "998"; },
        value => { value.buses["500"].userAuxSends[0].targetBusId = "601"; },
        value => { value.buses["1"].parentBusId = "600"; },
        value => { value.buses["1"].channelConfig.raw = 1; },
        value => { value.buses["1"].positioning.flags = 2; },
        value => { value.buses["1"].hdr.flags = 1; },
        value => { value.buses["1"].busVolumeDb = 0; },
        value => { value.buses["600"].type = "audio-bus"; },
        value => { value.routes[0].busPathIds = [ "500" ]; },
        value => { value.buses["700"] = BusGraphBus(); },
        value => { value.sfxRoutes["100"] = 1; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.busGraph);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }

    const consumerMismatch = structuredClone(source);

    consumerMismatch.sfx.nodes["100"].authoredBusVolumeDb = 1;
    assert.throws(
        () => validateAudioLibraryDocument(consumerMismatch),
        /authoredBusVolumeDb disagrees/u,
    );
});

test("Bus graphs declare every bus that an authored action controls or can amplify", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: { engine_loop: [ { nodeId: "100" } ] },
        programs: {
            engine_loop: [
                {
                    kind: "set-bus-volume",
                    targetId: "500",
                    targetFlags: 1,
                    scope: "global",
                    mode: "element",
                    curve: 4,
                    exceptions: [],
                    valueMode: "absolute",
                    busVolumeDb: -50,
                    busVolumeRangeDb: { min: 0, max: 0 },
                },
                { kind: "play", child: { nodeId: "100" } },
            ],
        },
        nodes: {
            "100": {
                type: "sound",
                mediaId: "777",
                loop: false,
                outputBusId: "500",
                busPathIds: [ "500" ],
            },
        },
    };
    source.busGraph = {
        schemaVersion: 1,
        effects: {},
        buses: { "500": BusGraphBus() },
        routes: [ {
            outputBusId: "500",
            busPathIds: [ "500" ],
            userAuxSends: [],
        } ],
        sfxRoutes: { "100": 0 },
        musicRoutes: {},
    };

    assert.throws(
        () => validateAudioLibraryDocument(source),
        /omits Bus Volume action control for bus 500/u,
    );

    source.busGraph.buses["500"].busVolumeActionControlled = true;
    assert.throws(
        () => validateAudioLibraryDocument(source),
        /omits volume-increase risk for bus 500/u,
    );

    source.busGraph.buses["500"].busVolumeMayIncrease = true;
    const installed = installAudioLibraryDocument(source);

    assert.equal(installed.busGraph.buses["500"].busVolumeMayIncrease, true);
    assert.equal(
        installed.busGraph.buses["500"].busVolumeActionControlled,
        true,
    );

    source.busGraph.buses["500"].busVolumeMayIncrease = "yes";
    assert.throws(
        () => validateAudioLibraryDocument(source),
        /busVolumeMayIncrease must be boolean/u,
    );

    source.busGraph.buses["500"].busVolumeMayIncrease = true;
    source.busGraph.buses["500"].busVolumeActionControlled = "yes";
    assert.throws(
        () => validateAudioLibraryDocument(source),
        /busVolumeActionControlled must be boolean/u,
    );
});

test("validates and installs routed music-track bus metadata", () =>
{
    const source = CreateDocument();

    source.music = {
        schemaVersion: 1,
        banks: [ "music.bnk" ],
        nodes: {
            "100": {
                type: "music-segment",
                bank: "music.bnk",
                children: [ 101 ],
            },
            "101": {
                type: "music-track",
                bank: "music.bnk",
                children: [],
                sources: [ { sourceId: 777 } ],
                outputBusId: "928",
                busPathIds: [ "928", "500", "1" ],
                authoredBusVolumeDb: -9,
                authoredBusMakeUpGainDb: 3,
                authoredOutputBusVolumeDb: 4,
            },
        },
        eventTargets: {},
        eventStops: {},
        switchSetters: {},
    };

    const installed = installAudioLibraryDocument(source);

    assert.equal(
        installed.music.nodes["101"].authoredBusVolumeDb,
        -9,
    );
    assert.equal(
        installed.music.nodes["101"].authoredBusMakeUpGainDb,
        3,
    );
    assert.equal(
        installed.music.nodes["101"].authoredOutputBusVolumeDb,
        4,
    );
    assert.equal(Object.isFrozen(installed.music.nodes["101"].busPathIds), true);

    for (const mutate of [
        node => { node.busPathIds = [ "500", "928" ]; },
        node => { node.busPathIds = [ "928", "928" ]; },
        node => { node.authoredBusVolumeDb = Number.NaN; },
        node => { node.authoredBusMakeUpGainDb = Number.NaN; },
        node => { node.authoredOutputBusVolumeDb = Number.NaN; },
        node => { delete node.outputBusId; },
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.music.nodes["101"]);
        assert.throws(() => validateAudioLibraryDocument(invalid));
    }

    const routedSegment = structuredClone(source);

    routedSegment.music.nodes["100"].outputBusId = "928";
    routedSegment.music.nodes["100"].busPathIds = [ "928" ];
    assert.throws(() => validateAudioLibraryDocument(routedSegment));

    const noncanonicalNode = structuredClone(source);

    noncanonicalNode.music.nodes = {
        "0101": noncanonicalNode.music.nodes["101"],
    };
    assert.throws(
        () => validateAudioLibraryDocument(noncanonicalNode),
        /must use canonical ID 101/u,
    );
});

test("Continuous container scheduling is normalized and validated", () =>
{
    const graph = {
        schemaVersion: 2,
        events: {
            ambience: [ 1 ],
        },
        nodes: {
            1: {
                type: "sequence",
                children: [ 2 ],
                continuous: {
                    loopCount: "4",
                    transition: "delay",
                    transitionMs: "5000",
                    transitionRangeMs: {
                        min: "0",
                        max: "15000",
                    },
                    resetPlaylistEachPlay: false,
                },
            },
            2: {
                type: "sound",
                mediaId: 777,
                loop: false,
            },
        },
    };
    const normalized = normalizeSfxGraph(
        graph,
        { 777: { sourceID: "loose:777" } },
    );

    assert.deepEqual(normalized.nodes["1"].continuous, {
        loopCount: 4,
        transition: "delay",
        transitionMs: 5000,
        transitionRangeMs: {
            min: 0,
            max: 15000,
        },
        resetPlaylistEachPlay: false,
    });

    graph.nodes[1].continuous.transition = "trigger-rate";
    assert.deepEqual(
        normalizeSfxGraph(
            graph,
            { 777: { sourceID: "loose:777" } },
        ).nodes["1"].continuous,
        {
            loopCount: 4,
            transition: "trigger-rate",
            transitionMs: 5000,
            transitionRangeMs: {
                min: 0,
                max: 15000,
            },
            resetPlaylistEachPlay: false,
        },
    );

    graph.nodes[1].continuous.loopCount = 32768;
    assert.throws(
        () => normalizeSfxGraph(
            graph,
            { 777: { sourceID: "loose:777" } },
        ),
        /loopCount must not exceed 32767/u,
    );
    graph.nodes[1].continuous.loopCount = 4;

    graph.nodes[1].continuous.transitionMs = 20;
    graph.nodes[1].continuous.transitionRangeMs = {
        min: 0,
        max: 100,
    };
    assert.throws(
        () => normalizeSfxGraph(
            graph,
            { 777: { sourceID: "loose:777" } },
        ),
        /trigger-rate minimum must be at least 21ms/u,
    );
    graph.nodes[1].continuous.transitionMs = 5000;
    graph.nodes[1].continuous.transitionRangeMs = {
        min: 0,
        max: 15000,
    };

    for (const transition of [
        "crossfade-amplitude",
        "crossfade-power",
    ])
    {
        graph.nodes[1].continuous.transition = transition;
        assert.equal(
            normalizeSfxGraph(
                graph,
                { 777: { sourceID: "loose:777" } },
            ).nodes["1"].continuous.transition,
            transition,
        );
    }

    graph.nodes[1].continuous.transition = "crossfade";
    assert.throws(
        () => normalizeSfxGraph(
            graph,
            { 777: { sourceID: "loose:777" } },
        ),
        /transition must be disabled, crossfade-amplitude, crossfade-power, delay, or trigger-rate/u,
    );

    graph.nodes[1].continuous.transition = "disabled";
    delete graph.nodes[1].continuous.transitionMs;
    delete graph.nodes[1].continuous.transitionRangeMs;
    graph.nodes[1].children = [ 3 ];
    graph.nodes[3] = {
        type: "sequence",
        children: [ 2 ],
        continuous: {
            loopCount: 1,
            transition: "disabled",
        },
    };

    assert.throws(
        () => normalizeSfxGraph(
            graph,
            { 777: { sourceID: "loose:777" } },
        ),
        /cannot contain Continuous container 3/u,
    );
});

test("Continuous Switch transitions are normalized and validated", () =>
{
    const graph = {
        schemaVersion: 2,
        events: {
            engine: [ 1 ],
        },
        nodes: {
            1: {
                type: "switch",
                scope: "switch",
                group: "engine_mode",
                cases: {
                    idle: 2,
                },
                default: 2,
                continuous: {
                    transitions: {
                        2: {
                            fadeOutMs: "500",
                            fadeInMs: "250",
                        },
                    },
                },
            },
            2: {
                type: "sound",
                mediaId: 777,
                loop: true,
            },
        },
    };
    const media = { 777: { sourceID: "loose:777" } };
    const normalized = normalizeSfxGraph(graph, media);

    assert.deepEqual(normalized.nodes["1"].continuous, {
        transitions: {
            "2": {
                fadeOutMs: 500,
                fadeInMs: 250,
            },
        },
    });

    graph.nodes[1].continuous.transitions[2].fadeInMs = -1;
    assert.throws(
        () => normalizeSfxGraph(graph, media),
        /fadeInMs must be a non-negative integer/u,
    );
    graph.nodes[1].continuous.transitions[2].fadeInMs = 250;
    graph.nodes[1].continuous.transitions[3] = {
        fadeOutMs: 0,
        fadeInMs: 0,
    };
    assert.throws(
        () => normalizeSfxGraph(graph, media),
        /references missing node 3/u,
    );

    graph.nodes[3] = {
        type: "sound",
        mediaId: 777,
    };
    assert.throws(
        () => normalizeSfxGraph(graph, media),
        /references unreachable node 3/u,
    );

    const nested = {
        schemaVersion: 2,
        events: {
            wormhole: [ 1 ],
        },
        nodes: {
            1: {
                type: "switch",
                group: "outer",
                cases: {
                    active: 2,
                },
                continuous: {
                    transitions: {
                        2: {
                            fadeOutMs: 500,
                            fadeInMs: 250,
                        },
                    },
                },
            },
            2: {
                type: "switch",
                group: "inner",
                cases: {
                    safe: 3,
                },
                continuous: {
                    transitions: {
                        3: {
                            fadeOutMs: 1000,
                            fadeInMs: 500,
                        },
                    },
                },
            },
            3: {
                type: "sound",
                mediaId: 777,
                loop: true,
            },
        },
    };

    assert.doesNotThrow(() => normalizeSfxGraph(nested, media));

    nested.nodes[2] = {
        type: "sequence",
        children: [ 3 ],
        continuous: {
            loopCount: 1,
            transition: "disabled",
        },
    };
    assert.throws(
        () => normalizeSfxGraph(nested, media),
        /Continuous container 1 cannot contain Continuous container 2/u,
    );
});

test("Crossfade descendants must resolve to exactly one finite voice", () =>
{
    const createGraph = child => ({
        schemaVersion: 2,
        events: {
            ambience: [ 1 ],
        },
        nodes: {
            1: {
                type: "sequence",
                children: [ 2 ],
                continuous: {
                    loopCount: 1,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                    resetPlaylistEachPlay: true,
                },
            },
            2: child,
            3: {
                type: "sound",
                mediaId: 777,
                loop: false,
            },
        },
    });
    const media = { 777: { sourceID: "loose:777" } };

    assert.doesNotThrow(() => normalizeSfxGraph(
        createGraph({
            type: "random",
            children: [ 3 ],
        }),
        media,
    ));

    for (const [ child, message ] of [
        [
            {
                type: "switch",
                group: "mode",
                cases: { active: 3 },
            },
            /node 2 is switch/u,
        ],
        [
            {
                type: "parallel",
                children: [ 3 ],
            },
            /node 2 is parallel/u,
        ],
        [
            {
                type: "blend",
                children: [ 3 ],
            },
            /node 2 is blend/u,
        ],
        [
            {
                type: "silence",
            },
            /node 2 is silence/u,
        ],
        [
            {
                type: "sound",
                mediaId: 777,
                loop: true,
            },
            /requires explicitly finite sound 2/u,
        ],
        [
            {
                type: "sound",
                mediaId: 777,
            },
            /requires explicitly finite sound 2/u,
        ],
        [
            {
                type: "sequence",
                loop: false,
                children: [ 3 ],
            },
            /cannot contain exhaustible sequence 2/u,
        ],
    ])
    {
        assert.throws(
            () => normalizeSfxGraph(createGraph(child), media),
            message,
        );
    }

    const finitePlayCount = createGraph({
        type: "sound",
        mediaId: 777,
        playCount: 2,
    });

    assert.doesNotThrow(() =>
        normalizeSfxGraph(finitePlayCount, media));

    const certainEdge = createGraph({
        type: "random",
        children: [ { nodeId: 3, probability: 100 } ],
    });

    assert.doesNotThrow(() =>
        normalizeSfxGraph(certainEdge, media));

    for (const probability of [ 0, 50, 99.999 ])
    {
        const uncertainEdge = createGraph({
            type: "random",
            children: [ { nodeId: 3, probability } ],
        });

        assert.throws(
            () => normalizeSfxGraph(uncertainEdge, media),
            /requires every child edge to have 100% probability/u,
        );
    }

    const uncertainOuterEdge = createGraph({
        type: "sound",
        mediaId: 777,
        loop: false,
    });

    uncertainOuterEdge.nodes[1].children = [
        { nodeId: 2, probability: 50 },
    ];
    assert.throws(
        () => normalizeSfxGraph(uncertainOuterEdge, media),
        /requires every child edge to have 100% probability/u,
    );
});

test("validates authored SFX nodes, media references, curves, and cycles", () =>
{
    const valid = CreateDocument();

    valid.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ { nodeId: "1" } ],
        },
        programs: {
            engine_loop: [
                { kind: "switch", group: "engine_mode", value: "combat" },
                { kind: "play", child: { nodeId: "1" } },
                {
                    kind: "stop",
                    targetId: "0",
                    targetFlags: 0,
                    scope: "game-object",
                    mode: "all",
                    transitionMs: 500,
                    curve: 6,
                    actionFlags: 6,
                    exceptions: [
                        { targetId: "2", targetFlags: 0 },
                    ],
                },
            ],
        },
        nodes: {
            "1": {
                type: "blend",
                children: [
                    {
                        nodeId: "2",
                        gainCurves: [
                            {
                                rtpc: "speed",
                                scope: "object",
                                points: [
                                    { x: 0, gainDb: -96 },
                                    { x: 1, gainDb: 0 },
                                ],
                            },
                        ],
                    },
                ],
            },
            "2": {
                type: "sound",
                mediaId: "777",
                loop: true,
                spatial: false,
                rtpcCurves: [
                    {
                        rtpc: "speed",
                        scope: "object",
                        property: "volume",
                        scaling: 2,
                        points: [
                            { x: 0, value: -1, interpolation: 5 },
                            { x: 1, value: 0, interpolation: 9 },
                        ],
                    },
                ],
            },
        },
    };

    assert.equal(validateAudioLibraryDocument(valid), true);

    const legacySfx = structuredClone(valid);

    legacySfx.sfx.schemaVersion = 1;
    assert.throws(
        () => validateAudioLibraryDocument(legacySfx),
        /Unsupported audio SFX schema version: 1/u,
    );

    const mismatchedProjection = structuredClone(valid);

    mismatchedProjection.sfx.programs.engine_loop[1].child = {
        nodeId: "2",
    };
    assert.throws(
        () => validateAudioLibraryDocument(mismatchedProjection),
        /roots must equal its ordered Play projection/u,
    );

    const busStop = structuredClone(valid);

    busStop.sfx.programs.engine_loop[2].targetFlags = 1;
    assert.throws(
        () => validateAudioLibraryDocument(busStop),
        /bus targets are unsupported/u,
    );

    const unsupportedStopFlags = structuredClone(valid);

    unsupportedStopFlags.sfx.programs.engine_loop[2].actionFlags = 255;
    assert.throws(
        () => validateAudioLibraryDocument(unsupportedStopFlags),
        /actionFlags must be 6/u,
    );

    const invalidStopAllTarget = structuredClone(valid);

    invalidStopAllTarget.sfx.programs.engine_loop[2].targetId = "2";
    assert.throws(
        () => validateAudioLibraryDocument(invalidStopAllTarget),
        /Stop-All targetId must be zero/u,
    );

    const invalidElementExceptions = structuredClone(valid);

    invalidElementExceptions.sfx.programs.engine_loop[2].mode = "element";
    invalidElementExceptions.sfx.programs.engine_loop[2].targetId = "1";
    assert.throws(
        () => validateAudioLibraryDocument(invalidElementExceptions),
        /element Stops cannot have exceptions/u,
    );

    const invalidProbability = structuredClone(valid);

    invalidProbability.sfx.events.engine_loop[0].probability = 101;
    assert.throws(
        () => validateAudioLibraryDocument(invalidProbability),
        /probability must be between 0 and 100/u,
    );

    const invalidDelayRange = structuredClone(valid);

    invalidDelayRange.sfx.events.engine_loop[0].delayRangeMs = {
        min: 10,
        max: -10,
    };
    assert.throws(
        () => validateAudioLibraryDocument(invalidDelayRange),
        /delayRangeMs max must be at least min/u,
    );

    const invalidSetter = structuredClone(valid);

    invalidSetter.sfx.programs.engine_loop[0].kind = "rtpc";
    assert.throws(
        () => validateAudioLibraryDocument(invalidSetter),
        /kind must be switch or state/u,
    );

    const invalidSpatial = structuredClone(valid);

    invalidSpatial.sfx.nodes["2"].spatial = 0;
    assert.throws(
        () => validateAudioLibraryDocument(invalidSpatial),
        /spatial must be boolean/u,
    );

    const finiteRepeat = structuredClone(valid);

    finiteRepeat.sfx.nodes["2"].loop = false;
    finiteRepeat.sfx.nodes["2"].playCount = 2;
    assert.equal(validateAudioLibraryDocument(finiteRepeat), true);

    const invalidPlayCount = structuredClone(finiteRepeat);

    invalidPlayCount.sfx.nodes["2"].playCount = 0;
    assert.throws(
        () => validateAudioLibraryDocument(invalidPlayCount),
        /playCount must be a positive integer/u,
    );

    const conflictingLoop = structuredClone(finiteRepeat);

    conflictingLoop.sfx.nodes["2"].loop = true;
    assert.throws(
        () => validateAudioLibraryDocument(conflictingLoop),
        /cannot combine loop and playCount/u,
    );

    const missing = structuredClone(valid);

    missing.sfx.nodes["2"].mediaId = "999";
    assert.throws(
        () => validateAudioLibraryDocument(missing),
        /references missing source 999/u,
    );

    const curve = structuredClone(valid);

    curve.sfx.nodes["1"].children[0].gainCurves[0].points.reverse();
    assert.throws(
        () => validateAudioLibraryDocument(curve),
        /points must have non-decreasing x/u,
    );

    const invalidRtpcScaling = structuredClone(valid);

    invalidRtpcScaling.sfx.nodes["2"].rtpcCurves[0].scaling = 0;
    assert.throws(
        () => validateAudioLibraryDocument(invalidRtpcScaling),
        /scaling must be 2 for volume/u,
    );

    const invalidRtpcProperty = structuredClone(valid);

    invalidRtpcProperty.sfx.nodes["2"].rtpcCurves[0].property = "filter";
    assert.throws(
        () => validateAudioLibraryDocument(invalidRtpcProperty),
        /property must be volume, pitch, lowPass, highPass, or initialDelay/u,
    );

    const invalidRtpcOrder = structuredClone(valid);

    invalidRtpcOrder.sfx.nodes["2"].rtpcCurves[0].points.reverse();
    assert.throws(
        () => validateAudioLibraryDocument(invalidRtpcOrder),
        /points must have non-decreasing x/u,
    );

    const invalidRtpcInterpolation = structuredClone(valid);

    invalidRtpcInterpolation
        .sfx.nodes["2"]
        .rtpcCurves[0]
        .points[0]
        .interpolation = 10;
    assert.throws(
        () => validateAudioLibraryDocument(invalidRtpcInterpolation),
        /interpolation must be a Wwise curve value from 0 to 9/u,
    );

    const cycle = structuredClone(valid);

    cycle.sfx.nodes["2"] = {
        type: "parallel",
        children: [ { nodeId: "1" } ],
    };
    assert.throws(
        () => validateAudioLibraryDocument(cycle),
        /contains a cycle/u,
    );

    const mode = structuredClone(valid);

    mode.sfx.nodes["1"] = {
        type: "random",
        mode: "roulette",
        children: [ { nodeId: "2" } ],
    };
    assert.throws(
        () => validateAudioLibraryDocument(mode),
        /mode must be random or shuffle/u,
    );

    const scope = structuredClone(valid);

    scope.sfx.nodes["1"] = {
        type: "sequence",
        scope: "listener",
        children: [ { nodeId: "2" } ],
    };
    assert.throws(
        () => validateAudioLibraryDocument(scope),
        /scope must be object or global/u,
    );

    const duplicateCase = structuredClone(valid);

    duplicateCase.sfx.nodes["1"] = {
        type: "switch",
        group: "size",
        cases: {
            Large: { nodeId: "2" },
            large: { nodeId: "2" },
        },
    };
    assert.throws(
        () => validateAudioLibraryDocument(duplicateCase),
        /has duplicate case large/u,
    );
});

test("installation validates and normalizes Voice Pitch actions", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ { nodeId: "1" } ],
        },
        programs: {
            engine_loop: [
                {
                    kind: "set-voice-pitch",
                    targetId: "700",
                    targetFlags: "0",
                    scope: "game-object",
                    mode: "element",
                    valueMode: "relative",
                    pitchCents: "200",
                    pitchRangeCents: { min: "-50", max: "100" },
                    transitionMs: "250",
                    curve: "7",
                },
                { kind: "play", child: { nodeId: "1" } },
                {
                    kind: "reset-voice-pitch",
                    targetId: "700",
                    scope: "game-object",
                    mode: "element",
                    curve: "4",
                },
            ],
        },
        nodes: {
            "1": {
                type: "sound",
                mediaId: "777",
            },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.programs.engine_loop, [
        {
            kind: "set-voice-pitch",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 7,
            transitionMs: 250,
            valueMode: "relative",
            pitchCents: 200,
            pitchRangeCents: { min: -50, max: 100 },
        },
        { kind: "play", child: { nodeId: "1" } },
        {
            kind: "reset-voice-pitch",
            targetId: "700",
            scope: "game-object",
            mode: "element",
            curve: 4,
        },
    ]);

    const invalid = structuredClone(source);

    invalid.sfx.programs.engine_loop[0].pitchRangeCents.max = 2300;
    assert.throws(
        () => validateAudioLibraryDocument(invalid),
        /maximum randomized pitchCents must be between -2400 and 2400 cents/u,
    );
});

test("installation validates and normalizes Voice LPF and HPF actions", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ { nodeId: "1" } ],
        },
        programs: {
            engine_loop: [
                {
                    kind: "set-voice-low-pass",
                    targetId: "700",
                    targetFlags: "0",
                    scope: "game-object",
                    mode: "element",
                    valueMode: "absolute",
                    lowPass: "-20",
                    lowPassRange: { min: "-10", max: "15" },
                    delayMs: "100",
                    delayRangeMs: { min: "-20", max: "20" },
                    transitionMs: "250",
                    transitionRangeMs: { min: "-50", max: "50" },
                    curve: "7",
                    exceptions: [],
                },
                {
                    kind: "reset-voice-low-pass",
                    targetId: "700",
                    scope: "game-object",
                    mode: "element",
                    curve: "4",
                    exceptions: [],
                },
                {
                    kind: "set-voice-high-pass",
                    targetId: "700",
                    scope: "global",
                    mode: "element",
                    valueMode: "relative",
                    highPass: "20",
                    highPassRange: { min: "-5", max: "10" },
                    curve: "8",
                    exceptions: [],
                },
                {
                    kind: "reset-voice-high-pass",
                    targetId: "0",
                    targetFlags: "0",
                    scope: "game-object",
                    mode: "all-except",
                    curve: "4",
                    exceptions: [ {
                        targetId: "701",
                        targetFlags: "0",
                    } ],
                },
                { kind: "play", child: { nodeId: "1" } },
            ],
        },
        nodes: {
            "1": { type: "sound", mediaId: "777" },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.programs.engine_loop, [
        {
            kind: "set-voice-low-pass",
            targetId: "700",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            curve: 7,
            exceptions: [],
            delayMs: 100,
            delayRangeMs: { min: -20, max: 20 },
            transitionMs: 250,
            transitionRangeMs: { min: -50, max: 50 },
            valueMode: "absolute",
            lowPass: -20,
            lowPassRange: { min: -10, max: 15 },
        },
        {
            kind: "reset-voice-low-pass",
            targetId: "700",
            scope: "game-object",
            mode: "element",
            curve: 4,
            exceptions: [],
        },
        {
            kind: "set-voice-high-pass",
            targetId: "700",
            scope: "global",
            mode: "element",
            curve: 8,
            exceptions: [],
            valueMode: "relative",
            highPass: 20,
            highPassRange: { min: -5, max: 10 },
        },
        {
            kind: "reset-voice-high-pass",
            targetId: "0",
            targetFlags: 0,
            scope: "game-object",
            mode: "all-except",
            curve: 4,
            exceptions: [ { targetId: "701", targetFlags: 0 } ],
        },
        { kind: "play", child: { nodeId: "1" } },
    ]);

    for (const [ mutate, pattern ] of [
        [
            action => { action.targetFlags = 1; },
            /targetFlags must be 0/u,
        ],
        [
            action => { action.lowPass = -101; },
            /lowPass must be between -100 and 100 percent/u,
        ],
        [
            action => { action.highPass = 1; },
            /cannot carry highPass fields/u,
        ],
        [
            action => { action.lowPassRange.min = -90; },
            /minimum randomized lowPass must be between -100 and 100 percent/u,
        ],
        [
            action => { action.exceptions.push({ targetId: "701" }); },
            /exceptions require all-except mode/u,
        ],
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.sfx.programs.engine_loop[0]);
        assert.throws(
            () => validateAudioLibraryDocument(invalid),
            pattern,
        );
    }

    const invalidAllTarget = structuredClone(source);

    invalidAllTarget.sfx.programs.engine_loop[3].targetId = "700";
    assert.throws(
        () => validateAudioLibraryDocument(invalidAllTarget),
        /all-except targetId must be 0/u,
    );

    const duplicateException = structuredClone(source);

    duplicateException.sfx.programs.engine_loop[3].exceptions.push({
        targetId: "701",
        targetFlags: 0,
    });
    assert.throws(
        () => validateAudioLibraryDocument(duplicateException),
        /duplicate exception 701/u,
    );

    const resetWithValue = structuredClone(source);

    resetWithValue.sfx.programs.engine_loop[1].lowPass = 20;
    assert.throws(
        () => validateAudioLibraryDocument(resetWithValue),
        /Reset cannot carry a filter value/u,
    );
});

test("installation validates and normalizes Game Parameter actions", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ { nodeId: "1" } ],
        },
        programs: {
            engine_loop: [
                {
                    kind: "set-game-parameter",
                    rtpc: "engine_load",
                    scope: "game-object",
                    bypassTransition: false,
                    valueMode: "relative",
                    gameParameterValue: "2",
                    gameParameterRange: { min: "-1", max: "3" },
                    defaultValue: "0.5",
                    delayMs: "100",
                    delayRangeMs: { min: "-25", max: "25" },
                    transitionMs: "250",
                    transitionRangeMs: { min: "-50", max: "50" },
                    curve: "9",
                },
                { kind: "play", child: { nodeId: "1" } },
                {
                    kind: "reset-game-parameter",
                    rtpc: "engine_load",
                    scope: "global",
                    defaultValue: "0.5",
                },
            ],
        },
        nodes: {
            "1": { type: "sound", mediaId: "777" },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.programs.engine_loop, [
        {
            kind: "set-game-parameter",
            rtpc: "engine_load",
            scope: "game-object",
            curve: 9,
            bypassTransition: false,
            defaultValue: 0.5,
            delayMs: 100,
            delayRangeMs: { min: -25, max: 25 },
            transitionMs: 250,
            transitionRangeMs: { min: -50, max: 50 },
            valueMode: "relative",
            gameParameterValue: 2,
            gameParameterRange: { min: -1, max: 3 },
        },
        { kind: "play", child: { nodeId: "1" } },
        {
            kind: "reset-game-parameter",
            rtpc: "engine_load",
            scope: "global",
            curve: 4,
            bypassTransition: false,
            defaultValue: 0.5,
        },
    ]);

    for (const [ mutate, pattern ] of [
        [
            action => { action.bypassTransition = 1; },
            /bypassTransition must be boolean/u,
        ],
        [
            action => { action.gameParameterRange.max = -2; },
            /gameParameterRange min must not exceed max/u,
        ],
        [
            action => { action.gameParameterValue = Infinity; },
            /gameParameterValue must be a finite number/u,
        ],
        [
            action => { action.probability = 50; },
            /probability is unsupported/u,
        ],
    ])
    {
        const invalid = structuredClone(source);

        mutate(invalid.sfx.programs.engine_loop[0]);
        assert.throws(
            () => validateAudioLibraryDocument(invalid),
            pattern,
        );
    }

    const invalidReset = structuredClone(source);

    invalidReset.sfx.programs.engine_loop[2].gameParameterValue = 0;
    assert.throws(
        () => validateAudioLibraryDocument(invalidReset),
        /Reset cannot carry a game-parameter value/u,
    );
    delete invalidReset.sfx.programs.engine_loop[2].gameParameterValue;
    delete invalidReset.sfx.programs.engine_loop[2].defaultValue;
    assert.throws(
        () => validateAudioLibraryDocument(invalidReset),
        /requires an authored defaultValue/u,
    );

    const invalidSet = structuredClone(source);

    delete invalidSet.sfx.programs.engine_loop[0].defaultValue;
    assert.throws(
        () => validateAudioLibraryDocument(invalidSet),
        /requires an authored defaultValue/u,
    );
});

test("installation canonicalizes authored SFX identifiers and curve numbers", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [
                {
                    nodeId: "01",
                    delayMs: "100",
                    delayRangeMs: { min: "-50", max: "50" },
                    probability: "75",
                    fadeInMs: "250",
                    fadeInRangeMs: { min: "-25", max: "25" },
                    fadeCurve: "9",
                },
            ],
        },
        nodes: {
            "1": {
                type: "sound",
                mediaId: "0777",
                playCount: "2",
                spatial: false,
                lowPass: "20",
                lowPassRanges: [
                    { min: "-2", max: "2" },
                ],
                highPass: "10",
                highPassRanges: [
                    { min: "-1", max: "1" },
                ],
                gainCurves: [
                    {
                        rtpc: "speed",
                        points: [
                            { x: "0", gainDb: "-20" },
                            { x: "1", gainDb: "0" },
                        ],
                    },
                ],
                rtpcCurves: [
                    {
                        rtpc: " load ",
                        property: " pitch ",
                        scaling: "0",
                        points: [
                            {
                                x: "0",
                                value: "-1200",
                                interpolation: "5",
                            },
                            {
                                x: "1",
                                value: "1200",
                                interpolation: "9",
                            },
                        ],
                    },
                ],
                stateProperties: [
                    {
                        group: "combat",
                        cases: {
                            danger: {
                                gainDb: "-6",
                                pitchCents: "1200",
                                lowPass: "30",
                                highPass: "15",
                            },
                        },
                    },
                ],
            },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.events.engine_loop, [
        {
            nodeId: "1",
            delayMs: 100,
            delayRangeMs: { min: -50, max: 50 },
            probability: 75,
            fadeInMs: 250,
            fadeInRangeMs: { min: -25, max: 25 },
            fadeCurve: 9,
        },
    ]);
    assert.equal(installed.sfx.nodes["1"].mediaId, "777");
    assert.equal(installed.sfx.nodes["1"].playCount, 2);
    assert.equal(installed.sfx.nodes["1"].spatial, false);
    assert.equal(installed.sfx.nodes["1"].lowPass, 20);
    assert.deepEqual(installed.sfx.nodes["1"].lowPassRanges, [
        { min: -2, max: 2 },
    ]);
    assert.equal(installed.sfx.nodes["1"].highPass, 10);
    assert.deepEqual(installed.sfx.nodes["1"].highPassRanges, [
        { min: -1, max: 1 },
    ]);
    assert.deepEqual(installed.sfx.nodes["1"].gainCurves[0].points, [
        { x: 0, gainDb: -20 },
        { x: 1, gainDb: 0 },
    ]);
    assert.deepEqual(installed.sfx.nodes["1"].rtpcCurves, [
        {
            rtpc: "load",
            scope: "object",
            property: "pitch",
            scaling: 0,
            points: [
                { x: 0, value: -1200, interpolation: 5 },
                { x: 1, value: 1200, interpolation: 9 },
            ],
        },
    ]);
    assert.deepEqual(installed.sfx.nodes["1"].stateProperties, [
        {
            group: "combat",
            cases: {
                danger: {
                    gainDb: -6,
                    pitchCents: 1200,
                    lowPass: 30,
                    highPass: 15,
                },
            },
        },
    ]);

    const linear = structuredClone(source);

    linear.sfx.nodes["1"].gainCurves[0].points = [
        { x: "0", gain: "0", interpolation: 5 },
        { x: "1", gain: "1", interpolation: 9 },
    ];
    assert.deepEqual(
        installAudioLibraryDocument(linear)
            .sfx.nodes["1"].gainCurves[0].points,
        [
            { x: 0, gain: 0, interpolation: 5 },
            { x: 1, gain: 1, interpolation: 9 },
        ],
    );

    const invalidFade = structuredClone(source);

    invalidFade.sfx.events.engine_loop[0].fadeCurve = 10;
    assert.throws(
        () => validateAudioLibraryDocument(invalidFade),
        /fadeCurve must be a Wwise curve value from 0 to 9/u,
    );

    const invalid = structuredClone(source);

    invalid.sfx.nodes["1"].mediaId = true;
    assert.throws(
        () => installAudioLibraryDocument(invalid),
        /must be an unsigned 32-bit integer greater than zero/u,
    );

    const emptyStateCase = structuredClone(source);

    emptyStateCase.sfx.nodes["1"].stateProperties[0].cases.danger = {};
    assert.throws(
        () => installAudioLibraryDocument(emptyStateCase),
        /must define gainDb, pitchCents, lowPass, or highPass/u,
    );

    const duplicateStateCase = structuredClone(source);

    duplicateStateCase.sfx.nodes["1"].stateProperties[0].cases.Danger = {
        gainDb: -3,
    };
    assert.throws(
        () => installAudioLibraryDocument(duplicateStateCase),
        /has duplicate case Danger/u,
    );
});

test("SFX State transition catalogs preserve IDs, names, and directed overrides", () =>
{
    const normalized = normalizeSfxGraph({
        schemaVersion: 2,
        events: {},
        nodes: {},
        stateTransitions: [
            {
                groupId: 20,
                defaultTransitionMs: 4000,
                transitions: [],
            },
            {
                groupId: "10",
                group: "combat",
                defaultTransitionMs: 1000,
                states: [
                    { stateId: "12", state: "danger" },
                    { stateId: "11", state: "calm" },
                ],
                transitions: [
                    {
                        fromId: "12",
                        from: "danger",
                        toId: "11",
                        to: "calm",
                        transitionMs: 5000,
                    },
                    {
                        fromId: 0,
                        toId: 12,
                        to: "danger",
                        transitionMs: 250,
                    },
                ],
            },
        ],
    });

    assert.deepEqual(normalized.stateTransitions, [
        {
            groupId: "10",
            group: "combat",
            defaultTransitionMs: 1000,
            states: [
                { stateId: "11", state: "calm" },
                { stateId: "12", state: "danger" },
            ],
            transitions: [
                {
                    fromId: "0",
                    toId: "12",
                    to: "danger",
                    transitionMs: 250,
                },
                {
                    fromId: "12",
                    from: "danger",
                    toId: "11",
                    to: "calm",
                    transitionMs: 5000,
                },
            ],
        },
        {
            groupId: "20",
            defaultTransitionMs: 4000,
            transitions: [],
        },
    ]);

    const duplicate = structuredClone(normalized);

    duplicate.stateTransitions.push({
        groupId: "10",
        defaultTransitionMs: 0,
        transitions: [],
    });
    assert.throws(
        () => normalizeSfxGraph(duplicate),
        /duplicate groupId 10/u,
    );

    const conflictingId = structuredClone(normalized);

    conflictingId.stateTransitions[0].transitions[1].from = "not_danger";
    assert.throws(
        () => normalizeSfxGraph(conflictingId),
        /stateId 12 conflicts between/u,
    );

    const conflictingName = structuredClone(normalized);

    conflictingName.stateTransitions[0].states.push({
        stateId: "13",
        state: "calm",
    });
    assert.throws(
        () => normalizeSfxGraph(conflictingName),
        /state calm conflicts between stateId 11 and 13/u,
    );

    const oversizedDuration = structuredClone(normalized);

    oversizedDuration.stateTransitions[0].defaultTransitionMs = 0x100000000;
    assert.throws(
        () => normalizeSfxGraph(oversizedDuration),
        /must be an unsigned 32-bit integer/u,
    );

    const numericGroupAlias = structuredClone(normalized);

    numericGroupAlias.stateTransitions[0].group = "20";
    assert.throws(
        () => normalizeSfxGraph(numericGroupAlias),
        /group alias 20 conflicts between 10 and 20/u,
    );

    const numericStateAlias = structuredClone(normalized);

    numericStateAlias.stateTransitions[0].states[1].state = "11";
    assert.throws(
        () => normalizeSfxGraph(numericStateAlias),
        /state alias 11 conflicts between 11 and 12/u,
    );

    assert.throws(
        () => normalizeSfxGraph({
            schemaVersion: 2,
            events: {},
            nodes: {},
            stateTransitions: [ {
                groupId: "10",
                defaultTransitionMs: 0,
                states: [ { stateId: "12", state: "11" } ],
                transitions: [ {
                    fromId: "11",
                    toId: "12",
                    to: "11",
                    transitionMs: 0,
                } ],
            } ],
        }),
        /state alias 11 conflicts between 12 and 11/u,
    );
});

test("installation projects authored sound loop overrides into event lifecycle metadata", () =>
{
    const looping = CreateDocument();

    looping.metadata.Events.engine_loop.isLoop = 0;
    looping.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ 1 ],
        },
        nodes: {
            1: {
                type: "sound",
                mediaId: 777,
                loop: true,
            },
        },
    };
    assert.equal(
        installAudioLibraryDocument(looping)
            .metadata.Events.engine_loop.isLoop,
        1,
    );

    const oneShot = structuredClone(looping);

    oneShot.metadata.Events.engine_loop.isLoop = 1;
    oneShot.sfx.nodes["1"].loop = false;
    assert.equal(
        installAudioLibraryDocument(oneShot)
            .metadata.Events.engine_loop.isLoop,
        0,
    );

    const finiteRepeat = structuredClone(looping);

    finiteRepeat.metadata.Events.engine_loop.isLoop = 1;
    delete finiteRepeat.sfx.nodes["1"].loop;
    finiteRepeat.sfx.nodes["1"].playCount = 2;
    assert.equal(
        installAudioLibraryDocument(finiteRepeat)
            .metadata.Events.engine_loop.isLoop,
        0,
        "a finite play count overrides stale event-level loop metadata",
    );
});

test("accepts authored events shared by SFX and music graphs", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 2,
        events: {
            engine_loop: [ 1 ],
        },
        nodes: {
            1: {
                type: "sound",
                mediaId: 777,
            },
        },
    };
    source.music = {
        schemaVersion: 1,
        banks: [ "ships.bnk" ],
        nodes: {
            10: {
                type: "music-segment",
                bank: "ships.bnk",
                children: [],
            },
        },
        eventTargets: {
            engine_loop: [ 10 ],
        },
        eventStops: {},
        switchSetters: {},
    };

    let installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.events.engine_loop, [
        { nodeId: "1" },
    ]);
    assert.deepEqual(installed.music.eventTargets.engine_loop, [ 10 ]);

    source.sfx.events = {};
    source.sfx.nodes = {};
    source.sfx.programs = {
        engine_loop: [
            { kind: "state", group: "weather", value: "storm" },
        ],
    };

    installed = installAudioLibraryDocument(source);

    assert.equal(
        installed.sfx.programs.engine_loop[0].kind,
        "state",
    );
    assert.deepEqual(installed.music.eventTargets.engine_loop, [ 10 ]);

    source.music.eventTargets = {};
    source.sfx.programs.missing_event =
        source.sfx.programs.engine_loop;
    delete source.sfx.programs.engine_loop;

    assert.throws(
        () => installAudioLibraryDocument(source),
        /SFX event missing_event has no metadata event/u,
    );
});
