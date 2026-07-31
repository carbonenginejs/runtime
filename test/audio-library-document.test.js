import assert from "node:assert/strict";
import test from "node:test";

import {
    installAudioLibraryDocument,
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
                    fadeCurve: "8",
                },
            ],
        },
        nodes: {
            "1": {
                type: "sound",
                mediaId: "0777",
                playCount: "2",
                spatial: false,
                gainCurves: [
                    {
                        rtpc: "speed",
                        points: [
                            { x: "0", gainDb: "-20" },
                            { x: "1", gainDb: "0" },
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
            fadeCurve: 8,
        },
    ]);
    assert.equal(installed.sfx.nodes["1"].mediaId, "777");
    assert.equal(installed.sfx.nodes["1"].playCount, 2);
    assert.equal(installed.sfx.nodes["1"].spatial, false);
    assert.deepEqual(installed.sfx.nodes["1"].gainCurves[0].points, [
        { x: 0, gainDb: -20 },
        { x: 1, gainDb: 0 },
    ]);
    assert.deepEqual(installed.sfx.nodes["1"].stateProperties, [
        {
            group: "combat",
            cases: {
                danger: {
                    gainDb: -6,
                    pitchCents: 1200,
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
        /must define gainDb or pitchCents/u,
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
