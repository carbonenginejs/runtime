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
        schemaVersion: 1,
        events: {
            engine_loop: [ { nodeId: "1" } ],
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
        /points must have increasing x/u,
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
        schemaVersion: 1,
        events: {
            engine_loop: [ { nodeId: "01" } ],
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
            },
        },
    };

    const installed = installAudioLibraryDocument(source);

    assert.deepEqual(installed.sfx.events.engine_loop, [
        { nodeId: "1" },
    ]);
    assert.equal(installed.sfx.nodes["1"].mediaId, "777");
    assert.equal(installed.sfx.nodes["1"].playCount, 2);
    assert.equal(installed.sfx.nodes["1"].spatial, false);
    assert.deepEqual(installed.sfx.nodes["1"].gainCurves[0].points, [
        { x: 0, gainDb: -20 },
        { x: 1, gainDb: 0 },
    ]);

    const invalid = structuredClone(source);

    invalid.sfx.nodes["1"].mediaId = true;
    assert.throws(
        () => installAudioLibraryDocument(invalid),
        /must be an unsigned 32-bit integer greater than zero/u,
    );
});

test("installation projects authored sound loop overrides into event lifecycle metadata", () =>
{
    const looping = CreateDocument();

    looping.metadata.Events.engine_loop.isLoop = 0;
    looping.sfx = {
        schemaVersion: 1,
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

test("rejects events silently claimed by both SFX and music graphs", () =>
{
    const source = CreateDocument();

    source.sfx = {
        schemaVersion: 1,
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

    assert.throws(
        () => installAudioLibraryDocument(source),
        /cannot be owned by both SFX and music graphs/u,
    );
});
