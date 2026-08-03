import assert from "node:assert/strict";
import test from "node:test";

import { CjsSfxEngine } from "../npm/dist/index.js";
import {
    evaluateWwiseInterpolation,
} from "../npm/dist/internal/wwiseCurve.js";

function Graph(events, nodes)
{
    return {
        schemaVersion: 2,
        events,
        nodes,
    };
}

test("authored NodeBase properties and randomizers resolve once per post", () =>
{
    const samples = [ 0.75, 0.25, 0.5, 0.1, 0.9 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { fire: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    gainDb: -6,
                    gainDbRanges: [
                        { min: -2, max: 2 },
                    ],
                    pitchCents: 1200,
                    pitchCentsRanges: [
                        { min: -100, max: 100 },
                    ],
                    lowPass: 10,
                    lowPassRanges: [
                        { min: 0, max: 20 },
                    ],
                    highPass: 5,
                    highPassRanges: [
                        { min: -5, max: 5 },
                    ],
                    initialDelayMs: 250,
                    initialDelayRangesMs: [
                        { min: 0, max: 100 },
                    ],
                },
            },
        ),
        random: () => samples.shift(),
    });

    const selection = engine.ResolveEvent("fire")[0];

    assert.equal(selection.gainDb, -5);
    assert.ok(
        Math.abs(selection.playbackRate - 2 ** (1150 / 1200)) < 1e-12,
    );
    assert.equal(engine.EvaluateLowPass(selection), 20);
    assert.equal(engine.EvaluateHighPass(selection), 1);
    assert.equal(selection.delayMs, 340);
    assert.deepEqual(samples, []);
});

test("timed silence resolves as a finite physical selection", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                wait: [ {
                    nodeId: "1",
                    delayMs: 3000,
                } ],
            },
            {
                "1": {
                    type: "parallel",
                    children: [ 2, 3 ],
                },
                "2": {
                    type: "timed-silence",
                    durationMs: 8000,
                    initialDelayMs: 7500,
                    voiceLimit: {
                        counterId: "2",
                        scope: "game-object",
                        maxInstances: 1,
                        behavior: "reject-newest",
                    },
                },
                "3": { type: "silence" },
            },
        ),
    });
    const selection = engine.ResolveProgram("wait", {
        gameObjID: "ship",
    })[0].selections[0];

    assert.equal(selection.silenceDurationMs, 8000);
    assert.equal(selection.delayMs, 10500);
    assert.equal(selection.loop, false);
    assert.deepEqual(selection.matchIds, [ "1", "2" ]);
    assert.deepEqual(selection.voiceLimit, {
        counterId: "2",
        scope: "game-object",
        maxInstances: 1,
        behavior: "reject-newest",
    });
    assert.equal(selection.mediaID, undefined);
});

test("Sound voice-limit policy reaches every resolved physical selection", () =>
{
    const voiceLimit = {
        counterId: "77",
        scope: "game-object",
        maxInstances: 1,
        behavior: "reject-newest",
    };
    const engine = new CjsSfxEngine({
        graph: Graph(
            { capped: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    voiceLimit,
                },
            },
        ),
    });

    assert.deepEqual(
        engine.ResolveEvent("capped")[0].voiceLimit,
        voiceLimit,
    );
});

test("authored relative volume and pitch clamp after hierarchy accumulation", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { fire: [ { nodeId: "1", gainDb: 150, pitchCents: 1800 } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    gainDb: 100,
                    pitchCents: 1200,
                },
            },
        ),
    });

    const selection = engine.ResolveEvent("fire")[0];

    assert.equal(selection.gainDb, 250);
    assert.equal(selection.playbackRate, 4);
    assert.equal(engine.EvaluateGain(selection), 10 ** 10);
});

test("Immediate state properties add to inherited volume and pitch", () =>
{
    let currentState = null;
    const controls = {
        getState: () => currentState,
    };
    const engine = new CjsSfxEngine({
        graph: Graph(
            { fire: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "blend",
                    gainDb: -4,
                    pitchCents: 100,
                    stateProperties: [
                        {
                            group: "combat",
                            cases: {
                                danger: {
                                    gainDb: -6,
                                    pitchCents: 200,
                                },
                            },
                        },
                    ],
                    children: [ { nodeId: "2" } ],
                },
                "2": {
                    type: "sound",
                    mediaId: "100",
                    gainDb: -2,
                    pitchCents: 300,
                    stateProperties: [
                        {
                            group: "combat",
                            cases: {
                                danger: {
                                    gainDb: -3,
                                    pitchCents: 600,
                                },
                            },
                        },
                    ],
                },
            },
        ),
    });
    const selection = engine.ResolveEvent("fire", controls)[0];

    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls) - 10 ** (-6 / 20),
        ) < 1e-12,
        "the initial None state contributes no authored delta",
    );
    assert.ok(
        Math.abs(
            engine.EvaluatePlaybackRate(selection, controls)
                - 2 ** (400 / 1200),
        ) < 1e-12,
    );

    currentState = "DANGER";

    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls) - 10 ** (-15 / 20),
        ) < 1e-12,
        "matching inherited state deltas add to static gain",
    );
    assert.equal(
        engine.EvaluatePlaybackRate(selection, controls),
        2,
        "matching inherited state deltas add to static pitch",
    );

    currentState = "unknown";

    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls) - 10 ** (-6 / 20),
        ) < 1e-12,
    );
    assert.ok(
        Math.abs(
            engine.EvaluatePlaybackRate(selection, controls)
                - 2 ** (400 / 1200),
        ) < 1e-12,
    );
});

test("State-property weights interpolate every supported live property", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { fire: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    stateProperties: [ {
                        group: "combat",
                        cases: {
                            calm: {
                                gainDb: -2,
                                pitchCents: 100,
                                lowPass: 10,
                                highPass: 20,
                            },
                            danger: {
                                gainDb: -10,
                                pitchCents: 900,
                                lowPass: 50,
                                highPass: 60,
                            },
                        },
                    } ],
                },
            },
        ),
    });
    const controls = {
        getState: () => "danger",
        getStatePropertyWeights: (_group, at) => [
            { state: "calm", weight: 1 - at },
            { state: "danger", weight: at },
        ],
    };
    const selection = engine.ResolveEvent("fire", controls)[0];

    assert.ok(Math.abs(
        engine.EvaluateGain(selection, controls, undefined, 0.25)
            - 10 ** (-4 / 20),
    ) < 1e-12);
    assert.ok(Math.abs(
        engine.EvaluatePlaybackRate(selection, controls, undefined, 0.25)
            - 2 ** (300 / 1200),
    ) < 1e-12);
    assert.equal(engine.EvaluateLowPass(selection, controls, 0.25), 20);
    assert.equal(engine.EvaluateHighPass(selection, controls, 0.25), 30);
    assert.equal(
        engine.EvaluateLowPass(selection, { getState: () => "danger" }),
        50,
        "callers without a weight reader retain immediate-State behavior",
    );
});

test("Wwise filters accumulate static, State, and live RTPC values", () =>
{
    let currentState = "danger";
    const values = new Map([
        [ "engine_filter", 0.5 ],
        [ "engine_cut", 1 ],
    ]);
    const controls = {
        getRTPC: name => values.get(name),
        getState: () => currentState,
    };
    const curve = (rtpc, property, to) => ({
        rtpc,
        scope: "object",
        property,
        scaling: 0,
        points: [
            { x: 0, value: 0, interpolation: 4 },
            { x: 1, value: to, interpolation: 4 },
        ],
    });
    const stateProperties = [
        {
            group: "combat",
            cases: {
                danger: {
                    lowPass: 5,
                    highPass: 3,
                },
            },
        },
    ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { engine: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "blend",
                    lowPass: 5,
                    highPass: 1,
                    rtpcCurves: [
                        curve("engine_filter", "lowPass", 50),
                        curve("engine_cut", "highPass", 10),
                    ],
                    stateProperties,
                    children: [ { nodeId: "2" } ],
                },
                "2": {
                    type: "sound",
                    mediaId: "100",
                    lowPass: 10,
                    highPass: 2,
                    rtpcCurves: [
                        curve("engine_filter", "lowPass", 50),
                        curve("engine_cut", "highPass", 10),
                    ],
                    stateProperties,
                },
            },
        ),
    });
    const selection = engine.ResolveEvent("engine", controls)[0];

    assert.equal(engine.EvaluateLowPass(selection, controls), 75);
    assert.equal(engine.EvaluateHighPass(selection, controls), 29);

    values.set("engine_filter", 1);
    values.set("engine_cut", 0);
    currentState = "none";

    assert.equal(
        engine.EvaluateLowPass(selection, controls),
        100,
        "live RTPC changes update and clamp the already-resolved voice",
    );
    assert.equal(engine.EvaluateHighPass(selection, controls), 3);
});

test("NodeBase RTPC curves add live volume and pitch but capture delay", () =>
{
    const objectValues = new Map([
        [ "delay", 1 ],
        [ "load", 0.5 ],
        [ "speed", 1 ],
    ]);
    const globalValues = new Map([
        [ "load", 0 ],
    ]);
    const controls = {
        getRTPC: name => objectValues.get(name),
        getGlobalRTPC: name => globalValues.get(name),
        getState: () => "danger",
    };
    const curve = (
        rtpc,
        property,
        scaling,
        from,
        to,
    ) => ({
        rtpc,
        scope: "object",
        property,
        scaling,
        points: [
            { x: 0, value: from, interpolation: 4 },
            { x: 1, value: to, interpolation: 4 },
        ],
    });
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                fire: [ { nodeId: "1", delayMs: 100 } ],
            },
            {
                "1": {
                    type: "blend",
                    gainDb: -1,
                    pitchCents: 100,
                    initialDelayMs: 50,
                    rtpcCurves: [
                        curve("load", "volume", 2, 0, -0.5),
                        curve("unset", "volume", 2, -1, -1),
                        curve("speed", "pitch", 0, 0, 600),
                        curve("delay", "initialDelay", 0, 0, -0.2),
                    ],
                    children: [ { nodeId: "2" } ],
                },
                "2": {
                    type: "sound",
                    mediaId: "100",
                    gainDb: -2,
                    pitchCents: 200,
                    rtpcCurves: [
                        curve("load", "volume", 2, 0, -0.5),
                        curve("speed", "pitch", 0, 0, 600),
                        curve("delay", "initialDelay", 0, 0, 0.1),
                    ],
                    stateProperties: [
                        {
                            group: "combat",
                            cases: {
                                danger: { pitchCents: 1100 },
                            },
                        },
                    ],
                },
            },
        ),
    });
    const selection = engine.ResolveEvent("fire", controls)[0];

    assert.equal(
        selection.delayMs,
        100,
        "negative NodeBase delay deltas clamp before Play-action delay",
    );
    assert.equal(
        engine.EvaluatePlaybackRate(selection, controls),
        4,
        "static, State, and inherited RTPC pitch clamp together",
    );
    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls)
                - 10 ** (-3 / 20) * 0.75 * 0.75,
        ) < 1e-12,
        "raw Volume outputs are interpolated before dB scaling",
    );

    objectValues.delete("load");
    objectValues.set("speed", 0);
    objectValues.set("delay", 0);

    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls)
                - 10 ** (-3 / 20),
        ) < 1e-12,
        "an absent object RTPC falls back to its global value",
    );
    assert.ok(
        Math.abs(
            engine.EvaluatePlaybackRate(selection, controls)
                - 2 ** (1400 / 1200),
        ) < 1e-12,
    );
    assert.equal(
        selection.delayMs,
        100,
        "the post-time InitialDelay does not become a live control",
    );
    assert.equal(
        engine.ResolveEvent("fire", controls)[0].delayMs,
        150,
        "the next post captures the current InitialDelay",
    );

    objectValues.delete("delay");
    globalValues.delete("load");

    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls)
                - 10 ** (-3 / 20),
        ) < 1e-12,
        "an unset RTPC without an authored default preserves static gain",
    );
    assert.equal(
        engine.ResolveEvent("fire", controls)[0].delayMs,
        150,
        "an unset RTPC without an authored default adds no delay",
    );
});

test("NodeBase RTPC curves use enriched defaults and clamp raw volume", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                fire: [ { nodeId: "1" } ],
            },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    rtpcCurves: [
                        {
                            rtpc: "load",
                            scope: "object",
                            property: "volume",
                            scaling: 2,
                            defaultValue: 0,
                            points: [
                                {
                                    x: 0,
                                    value: 2,
                                    interpolation: 4,
                                },
                            ],
                        },
                        {
                            rtpc: "speed",
                            scope: "object",
                            property: "pitch",
                            scaling: 0,
                            defaultValue: 0,
                            points: [
                                {
                                    x: 0,
                                    value: 600,
                                    interpolation: 4,
                                },
                            ],
                        },
                    ],
                },
            },
        ),
    });
    const selection = engine.ResolveEvent("fire")[0];

    assert.ok(
        Math.abs(engine.EvaluateGain(selection) - 2) < 1e-12,
        "raw Volume values clamp at one before Wwise dB conversion",
    );
    assert.ok(
        Math.abs(
            engine.EvaluatePlaybackRate(selection) - Math.SQRT2,
        ) < 1e-12,
    );
});

test("authored random containers honor weights and per-object repeat avoidance", () =>
{
    const samples = [ 0.1, 0.1, 0.99 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { fire: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "random",
                    avoidRepeat: 1,
                    children: [
                        { nodeId: "10", weight: 1 },
                        { nodeId: "11", weight: 3 },
                    ],
                },
                "10": { type: "sound", mediaId: "100" },
                "11": { type: "sound", mediaId: "200" },
            },
        ),
        random: () => samples.shift(),
    });

    assert.equal(
        engine.ResolveEvent("fire", { gameObjID: 7 })[0].mediaID,
        "100",
    );
    assert.equal(
        engine.ResolveEvent("fire", { gameObjID: 7 })[0].mediaID,
        "200",
        "the previous child is excluded even when the sample repeats",
    );
    assert.equal(
        engine.ResolveEvent("fire", { gameObjID: 8 })[0].mediaID,
        "200",
        "another game object owns independent history",
    );
});

test("shuffle containers exhaust a pool and global container state is shared", () =>
{
    const graph = Graph(
        {
            shuffle: [ 20 ],
            sequence: [ 30 ],
        },
        {
            1: { type: "sound", mediaId: 101 },
            2: { type: "sound", mediaId: 102 },
            3: { type: "sound", mediaId: 103 },
            20: {
                type: "random",
                mode: "shuffle",
                scope: "global",
                children: [ 1, 2, 3 ],
            },
            30: {
                type: "sequence",
                scope: "global",
                children: [ 1, 2 ],
            },
        },
    );
    const samples = [ 0, 0, 0, 0 ];
    const engine = new CjsSfxEngine({
        graph,
        random: () => samples.shift() ?? 0,
    });

    assert.deepEqual([
        engine.ResolveEvent("shuffle", { gameObjID: 1 })[0].mediaID,
        engine.ResolveEvent("shuffle", { gameObjID: 2 })[0].mediaID,
        engine.ResolveEvent("shuffle", { gameObjID: 3 })[0].mediaID,
        engine.ResolveEvent("shuffle", { gameObjID: 4 })[0].mediaID,
    ], [ "101", "102", "103", "101" ]);

    assert.equal(
        engine.ResolveEvent("sequence", { gameObjID: 1 })[0].mediaID,
        "101",
    );
    assert.equal(
        engine.ResolveEvent("sequence", { gameObjID: 2 })[0].mediaID,
        "102",
    );
});

test("shuffle repeat avoidance delays a child without deleting it from the pool", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { shuffle: [ 20 ] },
            {
                1: { type: "sound", mediaId: 101 },
                2: { type: "sound", mediaId: 102 },
                3: { type: "sound", mediaId: 103 },
                20: {
                    type: "random",
                    mode: "shuffle",
                    avoidRepeat: 1,
                    children: [ 1, 2, 3 ],
                },
            },
        ),
        random: () => 0,
    });
    const selected = [];

    for (let index = 0; index < 6; index++)
    {
        selected.push(
            engine.ResolveEvent("shuffle", { gameObjID: 1 })[0].mediaID,
        );
    }

    assert.deepEqual(selected, [
        "101",
        "102",
        "103",
        "101",
        "102",
        "103",
    ]);
});

test("authored step sequences advance independently and may terminate", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { burst: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sequence",
                    loop: false,
                    children: [
                        { nodeId: "10" },
                        { nodeId: "11" },
                    ],
                },
                "10": { type: "sound", mediaId: "100" },
                "11": { type: "sound", mediaId: "200" },
            },
        ),
    });

    assert.equal(
        engine.ResolveEvent("burst", { gameObjID: 3 })[0].mediaID,
        "100",
    );
    assert.equal(
        engine.ResolveEvent("burst", { gameObjID: 3 })[0].mediaID,
        "200",
    );
    assert.deepEqual(
        engine.ResolveEvent("burst", { gameObjID: 3 }),
        [],
    );
    assert.equal(
        engine.ResolveEvent("burst", { gameObjID: 4 })[0].mediaID,
        "100",
    );

    engine.ReleaseGameObj(3);
    assert.equal(
        engine.ResolveEvent("burst", { gameObjID: 3 })[0].mediaID,
        "100",
        "a reused game object starts with fresh object-scoped state",
    );
});

test("Continuous Sequence advances whole child batches with authored Delay", () =>
{
    const samples = [ 0.25, 0.5, 0.75, 0 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { ambience: [ 1 ] },
            {
                1: {
                    type: "sequence",
                    children: [ 10, 11 ],
                    continuous: {
                        loopCount: 2,
                        transition: "delay",
                        transitionMs: 100,
                        transitionRangeMs: {
                            min: 0,
                            max: 200,
                        },
                        resetPlaylistEachPlay: true,
                    },
                },
                10: {
                    type: "parallel",
                    children: [ 20, 21 ],
                },
                11: { type: "sound", mediaId: 300 },
                20: { type: "sound", mediaId: 100 },
                21: { type: "sound", mediaId: 200 },
            },
        ),
        random: () => samples.shift(),
    });
    const first = engine.ResolveProgram(
        "ambience",
        { gameObjID: 7 },
    )[0];
    const token = first.continuations[0].token;
    const slot = first.continuations[0].programSlotId;

    assert.deepEqual(
        first.selections.map(value => value.mediaID),
        [ "100", "200" ],
    );
    assert.ok(first.selections.every(value =>
        value.programSlotId === slot));

    const second = engine.ContinueProgram(
        token,
        { gameObjID: 7 },
    )[0];

    assert.equal(second.continuations[0].delayMs, 150);
    assert.deepEqual(
        second.selections.map(value => value.mediaID),
        [ "300" ],
    );
    assert.deepEqual(
        engine.ContinueProgram(token, { gameObjID: 7 })[0]
            .selections.map(value => value.mediaID),
        [ "100", "200" ],
    );
    assert.deepEqual(
        engine.ContinueProgram(token, { gameObjID: 7 })[0]
            .selections.map(value => value.mediaID),
        [ "300" ],
    );
    assert.deepEqual(
        engine.ContinueProgram(token, { gameObjID: 7 }),
        [],
    );
});

test("parallel Continuous children advance as independent sessions", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { hangar: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "parallel",
                    children: [
                        { nodeId: "10" },
                        { nodeId: "20" },
                    ],
                },
                "10": {
                    type: "sequence",
                    children: [
                        { nodeId: "11" },
                        { nodeId: "12" },
                    ],
                    continuous: {
                        loopCount: 0,
                        transition: "delay",
                        transitionMs: 100,
                        resetPlaylistEachPlay: true,
                    },
                },
                "20": {
                    type: "sequence",
                    children: [
                        { nodeId: "21" },
                        { nodeId: "22" },
                    ],
                    continuous: {
                        loopCount: 0,
                        transition: "delay",
                        transitionMs: 200,
                        resetPlaylistEachPlay: true,
                    },
                },
                "11": { type: "sound", mediaId: "101" },
                "12": { type: "sound", mediaId: "102" },
                "21": { type: "sound", mediaId: "201" },
                "22": { type: "sound", mediaId: "202" },
            },
        ),
    });
    const first = engine.ResolveProgram(
        "hangar",
        { gameObjID: 7 },
    )[0];
    const [ firstBranch, secondBranch ] = first.continuations;

    assert.deepEqual(
        first.selections.map(value => value.mediaID),
        [ "101", "201" ],
    );
    assert.notEqual(
        firstBranch.programSlotId,
        secondBranch.programSlotId,
    );
    assert.deepEqual(
        engine.ContinueProgram(
            firstBranch.token,
            { gameObjID: 7 },
        )[0].selections.map(value => value.mediaID),
        [ "102" ],
    );
    assert.deepEqual(
        engine.ContinueProgram(
            secondBranch.token,
            { gameObjID: 7 },
        )[0].selections.map(value => value.mediaID),
        [ "202" ],
    );
});

test("Continuous Trigger Rate samples only intervals with a next child", () =>
{
    const samples = [ 0.25, 0.75 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { rapid: [ 1 ] },
            {
                1: {
                    type: "sequence",
                    children: [ 10, 11 ],
                    continuous: {
                        loopCount: 1,
                        transition: "trigger-rate",
                        transitionMs: 500,
                        transitionRangeMs: {
                            min: -100,
                            max: 100,
                        },
                        resetPlaylistEachPlay: true,
                    },
                },
                10: { type: "sound", mediaId: 100 },
                11: { type: "sound", mediaId: 200 },
            },
        ),
        random: () => samples.shift(),
    });
    const first = engine.ResolveProgram(
        "rapid",
        { gameObjID: 7 },
    )[0];
    const continuation = first.continuations[0];

    assert.equal(first.selections[0].mediaID, "100");
    assert.equal(continuation.advance, "trigger-rate");
    assert.equal(continuation.programBatchId, "0:c0:b0");
    assert.equal(continuation.delayMs, 450);
    assert.equal(continuation.doneAfterBatch, false);

    const second = engine.ContinueProgram(
        continuation.token,
        { gameObjID: 7 },
    )[0];

    assert.equal(second.selections[0].mediaID, "200");
    assert.equal(second.continuations[0].advance, "trigger-rate");
    assert.equal(
        second.continuations[0].programBatchId,
        "0:c0:b1",
    );
    assert.equal(second.continuations[0].delayMs, 0);
    assert.equal(second.continuations[0].doneAfterBatch, true);
    assert.deepEqual(samples, [ 0.75 ]);
    assert.deepEqual(
        engine.ContinueProgram(
            continuation.token,
            { gameObjID: 7 },
        ),
        [],
    );
});

test("Continuous Crossfade samples only overlaps with a successor", () =>
{
    const samples = [ 0.25, 0.75 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { ambience: [ 1 ] },
            {
                1: {
                    type: "sequence",
                    children: [ 10, 11 ],
                    continuous: {
                        loopCount: 1,
                        transition: "crossfade-amplitude",
                        transitionMs: 1000,
                        transitionRangeMs: {
                            min: -200,
                            max: 200,
                        },
                        resetPlaylistEachPlay: true,
                    },
                },
                10: { type: "sound", mediaId: 100 },
                11: { type: "sound", mediaId: 200 },
            },
        ),
        random: () => samples.shift(),
    });
    const first = engine.ResolveProgram(
        "ambience",
        { gameObjID: 7 },
    )[0];
    const continuation = first.continuations[0];

    assert.equal(first.selections[0].mediaID, "100");
    assert.equal(continuation.advance, "crossfade");
    assert.equal(
        continuation.crossfadeMode,
        "crossfade-amplitude",
    );
    assert.equal(continuation.delayMs, 900);
    assert.equal(continuation.doneAfterBatch, false);

    const second = engine.ContinueProgram(
        continuation.token,
        { gameObjID: 7 },
    )[0];

    assert.equal(second.selections[0].mediaID, "200");
    assert.equal(second.continuations[0].advance, "crossfade");
    assert.equal(second.continuations[0].delayMs, 0);
    assert.equal(second.continuations[0].doneAfterBatch, true);
    assert.deepEqual(samples, [ 0.75 ]);
});

test("speculative Crossfade selection commits only at the audible boundary", () =>
{
    const graph = Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "sequence",
                children: [ 10, 11 ],
                continuous: {
                    loopCount: 0,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                    resetPlaylistEachPlay: false,
                },
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
        },
    );
    const rollbackEngine = new CjsSfxEngine({ graph });
    const initial = rollbackEngine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const prepared = rollbackEngine.PrepareProgram(
        initial.continuations[0].token,
        { gameObjID: 9 },
    );

    assert.equal(prepared.program[0].selections[0].mediaID, "200");
    prepared.rollback();
    assert.equal(
        rollbackEngine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "200",
        "cancelled prefetch does not skip an unheard sequence child",
    );

    const commitEngine = new CjsSfxEngine({ graph });
    const committedInitial = commitEngine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const committed = commitEngine.PrepareProgram(
        committedInitial.continuations[0].token,
        { gameObjID: 9 },
    );

    committed.commit();
    assert.equal(
        commitEngine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "100",
        "audible prefetch commits the persistent next position",
    );
});

test("speculative Crossfade sequence commits merge concurrent heard selections", () =>
{
    const graph = Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "sequence",
                children: [ 10, 11, 12 ],
                continuous: {
                    loopCount: 0,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                    resetPlaylistEachPlay: false,
                },
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
            12: { type: "sound", mediaId: 300 },
        },
    );
    const engine = new CjsSfxEngine({ graph });
    const initial = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const token = initial.continuations[0].token;
    const prepared = engine.PrepareProgram(
        token,
        { gameObjID: 9 },
    );
    const concurrent = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];

    assert.equal(prepared.program[0].selections[0].mediaID, "200");
    assert.equal(
        concurrent.selections[0].mediaID,
        "200",
        "cancellable Sequence prefetch does not shift a heard post",
    );
    prepared.commit();
    assert.equal(
        engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "100",
        "the prepared and concurrent heard batches both advance shared state",
    );
});

test("rolled-back Crossfade sequence prefetch cannot repeat a concurrent post", () =>
{
    const graph = Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "sequence",
                children: [ 10, 11, 12 ],
                continuous: {
                    loopCount: 0,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                    resetPlaylistEachPlay: false,
                },
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
            12: { type: "sound", mediaId: 300 },
        },
    );
    const engine = new CjsSfxEngine({ graph });
    const initial = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const prepared = engine.PrepareProgram(
        initial.continuations[0].token,
        { gameObjID: 9 },
    );
    const concurrent = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];

    assert.equal(prepared.program[0].selections[0].mediaID, "200");
    assert.equal(concurrent.selections[0].mediaID, "200");
    prepared.rollback();
    assert.equal(
        engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "300",
    );
});

test("rolled-back nested step-sequence prefetch preserves heard cursor order", () =>
{
    const graph = Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "random",
                children: [ 2 ],
                continuous: {
                    loopCount: 0,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                },
            },
            2: {
                type: "sequence",
                children: [ 10, 11, 12 ],
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
            12: { type: "sound", mediaId: 300 },
        },
    );
    const engine = new CjsSfxEngine({ graph });
    const initial = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const prepared = engine.PrepareProgram(
        initial.continuations[0].token,
        { gameObjID: 9 },
    );
    const concurrent = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];

    assert.equal(prepared.program[0].selections[0].mediaID, "200");
    assert.equal(concurrent.selections[0].mediaID, "200");
    prepared.rollback();
    assert.equal(
        engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "300",
    );
});

test("speculative Crossfade leases its continuation token until settlement", () =>
{
    const graph = Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "sequence",
                children: [ 10, 11, 12 ],
                continuous: {
                    loopCount: 0,
                    transition: "crossfade-amplitude",
                    transitionMs: 500,
                    resetPlaylistEachPlay: false,
                },
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
            12: { type: "sound", mediaId: 300 },
        },
    );
    const engine = new CjsSfxEngine({ graph });
    const initial = engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0];
    const token = initial.continuations[0].token;
    const prepared = engine.PrepareProgram(
        token,
        { gameObjID: 9 },
    );
    assert.equal(prepared.program[0].selections[0].mediaID, "200");
    assert.throws(
        () => engine.ContinueProgram(
            token,
            { gameObjID: 9 },
        ),
        /continuation token is being prepared/u,
    );
    prepared.rollback();
    assert.equal(
        engine.ContinueProgram(
            token,
            { gameObjID: 9 },
        )[0].selections[0].mediaID,
        "200",
    );
});

for (const mode of [ "random", "shuffle" ])
{
    test(`speculative Crossfade ${mode} commit merges current history`, () =>
    {
        const samples = [ 0, 0, 0.999, 0 ];
        const engine = new CjsSfxEngine({
            graph: Graph(
                { ambience: [ 1 ] },
                {
                    1: {
                        type: "random",
                        mode,
                        avoidRepeat: mode === "shuffle" ? 1 : 2,
                        children: [ 10, 11, 12 ],
                        continuous: {
                            loopCount: 0,
                            transition: "crossfade-amplitude",
                            transitionMs: 500,
                        },
                    },
                    10: { type: "sound", mediaId: 100 },
                    11: { type: "sound", mediaId: 200 },
                    12: { type: "sound", mediaId: 300 },
                },
            ),
            random: () => samples.shift() ?? 0,
        });
        const initial = engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0];
        const prepared = engine.PrepareProgram(
            initial.continuations[0].token,
            { gameObjID: 9 },
        );
        const concurrent = engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0];

        assert.equal(initial.selections[0].mediaID, "100");
        assert.equal(prepared.program[0].selections[0].mediaID, "200");
        assert.equal(concurrent.selections[0].mediaID, "300");
        prepared.commit();
        assert.equal(
            engine.ResolveProgram(
                "ambience",
                { gameObjID: 9 },
            )[0].selections[0].mediaID,
            "100",
        );
    });
}

for (const invalidate of [ "Reset", "ReleaseGameObj" ])
{
    test(`speculative Crossfade commit cannot resurrect ${invalidate} state`, () =>
    {
        const graph = Graph(
            { ambience: [ 1 ] },
            {
                1: {
                    type: "sequence",
                    children: [ 10, 11, 12 ],
                    continuous: {
                        loopCount: 0,
                        transition: "crossfade-amplitude",
                        transitionMs: 500,
                        resetPlaylistEachPlay: false,
                    },
                },
                10: { type: "sound", mediaId: 100 },
                11: { type: "sound", mediaId: 200 },
                12: { type: "sound", mediaId: 300 },
            },
        );
        const engine = new CjsSfxEngine({ graph });
        const initial = engine.ResolveProgram(
            "ambience",
            { gameObjID: 9 },
        )[0];
        const prepared = engine.PrepareProgram(
            initial.continuations[0].token,
            { gameObjID: 9 },
        );

        engine[invalidate](...(invalidate === "Reset" ? [] : [ 9 ]));
        assert.throws(
            () => engine.ContinueProgram(
                initial.continuations[0].token,
                { gameObjID: 9 },
            ),
            /continuation token has been invalidated/u,
        );
        prepared.commit();
        assert.equal(
            engine.ResolveProgram(
                "ambience",
                { gameObjID: 9 },
            )[0].selections[0].mediaID,
            "100",
        );
    });
}

test("interrupted Continuous Sequence resumes only when reset is disabled", () =>
{
    const graph = resetPlaylistEachPlay => Graph(
        { ambience: [ 1 ] },
        {
            1: {
                type: "sequence",
                children: [ 10, 11 ],
                continuous: {
                    loopCount: 0,
                    transition: "disabled",
                    resetPlaylistEachPlay,
                },
            },
            10: { type: "sound", mediaId: 100 },
            11: { type: "sound", mediaId: 200 },
        },
    );
    const retained = new CjsSfxEngine({
        graph: graph(false),
    });
    const reset = new CjsSfxEngine({
        graph: graph(true),
    });
    const firstMedia = engine => engine.ResolveProgram(
        "ambience",
        { gameObjID: 9 },
    )[0].selections[0].mediaID;

    assert.equal(firstMedia(retained), "100");
    assert.equal(
        firstMedia(retained),
        "200",
        "a new post resumes after the interrupted active object",
    );
    assert.equal(firstMedia(reset), "100");
    assert.equal(firstMedia(reset), "100");

    retained.ReleaseGameObj(9);
    assert.equal(firstMedia(retained), "100");
});

test("Continuous Random preserves selection scope and exact pass count", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { ambience: [ 1 ] },
            {
                1: {
                    type: "random",
                    scope: "global",
                    mode: "random",
                    avoidRepeat: 1,
                    children: [ 10, 11 ],
                    continuous: {
                        loopCount: 1,
                        transition: "disabled",
                    },
                },
                10: { type: "sound", mediaId: 100 },
                11: { type: "sound", mediaId: 200 },
            },
        ),
        random: () => 0,
    });
    const first = engine.ResolveProgram(
        "ambience",
        { gameObjID: 1 },
    )[0];
    const token = first.continuations[0].token;

    assert.equal(first.selections[0].mediaID, "100");
    assert.equal(
        engine.ContinueProgram(token, { gameObjID: 1 })[0]
            .selections[0].mediaID,
        "200",
    );
    assert.deepEqual(
        engine.ContinueProgram(token, { gameObjID: 1 }),
        [],
    );
});

test("Continuous Shuffle never repeats the last child across a pool reset", () =>
{
    const samples = [ 0, 0, 0.99, 0 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { ambience: [ 1 ] },
            {
                1: {
                    type: "random",
                    scope: "object",
                    mode: "shuffle",
                    avoidRepeat: 0,
                    children: [ 10, 11 ],
                    continuous: {
                        loopCount: 2,
                        transition: "disabled",
                    },
                },
                10: { type: "sound", mediaId: 100 },
                11: { type: "sound", mediaId: 200 },
            },
        ),
        random: () => samples.shift() ?? 0,
    });
    const first = engine.ResolveProgram(
        "ambience",
        { gameObjID: 1 },
    )[0];
    const token = first.continuations[0].token;
    const selected = [ first.selections[0].mediaID ];

    for (let index = 0; index < 3; index++)
    {
        selected.push(
            engine.ContinueProgram(token, { gameObjID: 1 })[0]
                .selections[0].mediaID,
        );
    }

    assert.deepEqual(selected, [ "100", "200", "100", "200" ]);
    assert.deepEqual(
        engine.ContinueProgram(token, { gameObjID: 1 }),
        [],
    );
});

test("authored finite Sound play counts reach the backend selection", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            { repeated_shot: [ 1 ] },
            {
                1: {
                    type: "sound",
                    mediaId: 100,
                    playCount: 3,
                },
            },
        ),
    });

    assert.deepEqual(
        engine.ResolveEvent("repeated_shot", { gameObjID: 3 }),
        [
            {
                mediaID: "100",
                busRouteNodeId: "1",
                loop: undefined,
                playCount: 3,
                playbackRate: 1,
                gainDb: 0,
                gainCurves: [],
            },
        ],
    );
});

test("SFX selections preserve authored and metadata infinite-loop fallbacks", () =>
{
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                authored_loop: [ 1 ],
                metadata_loop: [ 2 ],
            },
            {
                1: {
                    type: "sound",
                    mediaId: 100,
                    loop: true,
                    spatial: false,
                },
                2: {
                    type: "sound",
                    mediaId: 101,
                },
            },
        ),
    });
    const authored = engine.ResolveEvent(
        "authored_loop",
        { gameObjID: 3 },
    )[0];
    const metadata = engine.ResolveEvent(
        "metadata_loop",
        { gameObjID: 3 },
    )[0];

    assert.equal(authored.loop, true);
    assert.equal(authored.spatial, false);
    assert.equal(Object.hasOwn(authored, "playCount"), false);
    assert.equal(metadata.loop, undefined);
    assert.equal(
        Object.hasOwn(metadata, "spatial"),
        false,
        "unknown leaf routing retains the event-level fallback",
    );
    assert.equal(Object.hasOwn(metadata, "playCount"), false);
});

test("SFX selections retain each Sound leaf's distance curve and source EQ", () =>
{
    const curve = {
        scaling: 2,
        points: [
            { x: 0, value: 0, interpolation: 4 },
            { x: 20000, value: -1, interpolation: 8 },
        ],
    };
    const sourceEffects = [ {
        effectId: "900",
        slotIndex: 0,
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
    } ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            { spatial_event: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    spatial: true,
                    dryVolumeCurve: curve,
                    sourceEffects,
                },
            },
        ),
    });
    const selection = engine.ResolveEvent("spatial_event")[0];

    assert.equal(selection.spatial, true);
    assert.deepEqual(selection.dryVolumeCurve, curve);
    assert.deepEqual(selection.sourceEffects, sourceEffects);
});

test("switch/state selection and parallel RTPC gains resolve without acquisition", () =>
{
    let speed = 50;
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                fire: [ { nodeId: "1" } ],
                ambience: [ { nodeId: "2" } ],
            },
            {
                "1": {
                    type: "switch",
                    group: "ship_size",
                    scope: "switch",
                    cases: {
                        large: { nodeId: "3" },
                    },
                    default: { nodeId: "12" },
                },
                "2": {
                    type: "switch",
                    group: "weather",
                    scope: "state",
                    cases: {
                        storm: { nodeId: "11" },
                    },
                    default: { nodeId: "12" },
                },
                "3": {
                    type: "blend",
                    gainDb: -6,
                    children: [
                        { nodeId: "10" },
                        {
                            nodeId: "11",
                            gainCurves: [
                                {
                                    rtpc: "speed",
                                    scope: "object",
                                    points: [
                                        { x: 0, gainDb: -20 },
                                        { x: 100, gainDb: 0 },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                "10": { type: "sound", mediaId: "100" },
                "11": { type: "sound", mediaId: "200" },
                "12": { type: "sound", mediaId: "300" },
            },
        ),
    });
    const controls = {
        gameObjID: 9,
        getSwitch: () => "LARGE",
        getState: () => "storm",
        getRTPC: () => speed,
        getGlobalRTPC: () => 0,
    };
    const fire = engine.ResolveEvent("fire", controls);

    assert.deepEqual(
        fire.map(selection => selection.mediaID),
        [ "100", "200" ],
    );
    assert.ok(
        Math.abs(engine.EvaluateGain(fire[0], controls) - 10 ** (-6 / 20))
            < 1e-12,
    );
    assert.ok(
        Math.abs(engine.EvaluateGain(fire[1], controls) - 10 ** (-16 / 20))
            < 1e-12,
    );

    speed = 100;
    assert.ok(
        Math.abs(engine.EvaluateGain(fire[1], controls) - 10 ** (-6 / 20))
            < 1e-12,
        "resolved leaves keep live RTPC curves",
    );
    assert.equal(
        engine.ResolveEvent("ambience", controls)[0].mediaID,
        "200",
    );
});

test("Continuous Switch sessions follow nested game-sync decisions", () =>
{
    const values = new Map([
        [ "mode", "idle" ],
        [ "detail", "low" ],
    ]);
    const controls = {
        gameObjID: 7,
        getSwitch: group => values.get(group),
    };
    const engine = new CjsSfxEngine({
        graph: Graph(
            { engine: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "switch",
                    scope: "switch",
                    group: "mode",
                    cases: {
                        idle: { nodeId: "2" },
                        combat: { nodeId: "6" },
                        mute: { nodeId: "5" },
                    },
                    default: { nodeId: "2" },
                    continuous: {
                        transitions: {
                            "2": { fadeOutMs: 100, fadeInMs: 200 },
                            "6": { fadeOutMs: 300, fadeInMs: 500 },
                            "5": { fadeOutMs: 600, fadeInMs: 700 },
                        },
                    },
                },
                "2": {
                    type: "sound",
                    mediaId: "100",
                    loop: true,
                },
                "3": {
                    type: "switch",
                    scope: "switch",
                    group: "detail",
                    cases: {
                        low: { nodeId: "4" },
                        high: { nodeId: "4" },
                    },
                    default: { nodeId: "4" },
                    continuous: {
                        transitions: {
                            "4": { fadeOutMs: 250, fadeInMs: 400 },
                        },
                    },
                },
                "4": {
                    type: "sound",
                    mediaId: "200",
                    loop: true,
                },
                "5": { type: "silence" },
                "6": {
                    type: "sequence",
                    loop: true,
                    children: [ { nodeId: "3" } ],
                },
            },
        ),
    });
    const initial = engine.ResolveProgram("engine", controls);
    const initialPlay = initial.find(operation =>
        operation.kind === "play");
    const token = initialPlay.continuations[0].token;

    assert.equal(initialPlay.selections[0].mediaID, "100");
    assert.equal(initialPlay.continuations[0].advance, "switch");
    assert.deepEqual(initialPlay.continuations[0].switchGroups, [
        { scope: "switch", group: "mode" },
    ]);

    values.set("mode", "combat");
    const combat = engine.ContinueProgram(token, controls)[0];

    assert.equal(combat.selections[0].mediaID, "200");
    assert.equal(combat.selections[0].switchFadeInMs, 500);
    assert.deepEqual(
        combat.selections[0].switchPath.map(value =>
            value.containerId),
        [ "1", "3" ],
        "a Step Sequence preserves the parent switch session",
    );
    assert.equal(combat.continuations[0].changedContainerId, "1");
    assert.deepEqual(combat.continuations[0].switchGroups, [
        { scope: "switch", group: "mode" },
        { scope: "switch", group: "detail" },
    ]);

    values.set("detail", "high");
    const sharedChildRestart = engine.ContinueProgram(token, controls)[0];

    assert.equal(sharedChildRestart.selections[0].mediaID, "200");
    assert.equal(sharedChildRestart.selections[0].switchFadeInMs, 400);
    assert.equal(
        sharedChildRestart.continuations[0].changedContainerId,
        "3",
    );
    assert.deepEqual(engine.ContinueProgram(token, controls), []);

    values.set("mode", "mute");
    const silent = engine.ContinueProgram(token, controls)[0];

    assert.deepEqual(silent.selections, []);
    assert.equal(silent.continuations[0].doneAfterBatch, false);

    values.set("mode", "idle");
    assert.equal(
        engine.ContinueProgram(token, controls)[0].selections[0].mediaID,
        "100",
    );
});

test("Continuous Switch keeps distinct fades for parallel assigned children", () =>
{
    const values = new Map([ [ "mode", "layered" ] ]);
    const controls = {
        gameObjID: 9,
        getSwitch: group => values.get(group),
    };
    const engine = new CjsSfxEngine({
        graph: Graph(
            { layered: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "switch",
                    scope: "switch",
                    group: "mode",
                    cases: {
                        layered: { nodeId: "2" },
                        single: { nodeId: "5" },
                    },
                    default: { nodeId: "5" },
                    continuous: {
                        transitions: {
                            "3": { fadeOutMs: 100, fadeInMs: 200 },
                            "4": { fadeOutMs: 300, fadeInMs: 400 },
                            "5": { fadeOutMs: 500, fadeInMs: 600 },
                        },
                    },
                },
                "2": {
                    type: "parallel",
                    children: [ { nodeId: "3" }, { nodeId: "4" } ],
                },
                "3": { type: "sound", mediaId: "100" },
                "4": { type: "sound", mediaId: "200" },
                "5": { type: "sound", mediaId: "300" },
            },
        ),
    });
    const initial = engine.ResolveProgram("layered", controls)[0];
    const token = initial.continuations[0].token;

    assert.deepEqual(
        initial.selections.map(selection => ({
            mediaID: selection.mediaID,
            childId: selection.switchPath[0].childId,
            fadeOutMs: selection.switchPath[0].fadeOutMs,
            fadeInMs: selection.switchPath[0].fadeInMs,
        })),
        [
            {
                mediaID: "100",
                childId: "3",
                fadeOutMs: 100,
                fadeInMs: 200,
            },
            {
                mediaID: "200",
                childId: "4",
                fadeOutMs: 300,
                fadeInMs: 400,
            },
        ],
    );

    values.set("mode", "single");
    const next = engine.ContinueProgram(token, controls)[0];

    assert.equal(next.selections[0].mediaID, "300");
    assert.equal(next.selections[0].switchFadeInMs, 600);
});

test("event setters update controls before resolving the same post", () =>
{
    const switches = new Map();
    const states = new Map();
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {
                select_large: [ { nodeId: "1" } ],
            },
            programs: {
                select_large: [
                    {
                        kind: "switch",
                        group: "ship_size",
                        value: "large",
                    },
                    {
                        kind: "play",
                        child: { nodeId: "1" },
                    },
                ],
                set_storm: [
                    {
                        kind: "state",
                        group: "weather",
                        value: "storm",
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "switch",
                    group: "ship_size",
                    cases: {
                        large: { nodeId: "2" },
                    },
                    default: { nodeId: "3" },
                },
                "2": { type: "sound", mediaId: "100" },
                "3": { type: "sound", mediaId: "200" },
            },
        },
    });
    const controls = {
        getSwitch: group => switches.get(group),
        getState: group => states.get(group),
        setSwitch: (group, value) => switches.set(group, value),
        setState: (group, value) => states.set(group, value),
    };

    assert.equal(engine.HandlesEvent("set_storm"), true);
    assert.deepEqual(engine.ResolveEvent("set_storm", controls), []);
    assert.equal(states.get("weather"), "storm");
    assert.equal(
        engine.ResolveEvent("select_large", controls)[0].mediaID,
        "100",
    );
    assert.equal(switches.get("ship_size"), "large");
});

test("event programs preserve authored Play and setter interleaving", () =>
{
    const switches = new Map();
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {
                interleaved: [
                    { nodeId: "1" },
                    { nodeId: "1" },
                ],
            },
            programs: {
                interleaved: [
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "switch",
                        group: "ship_size",
                        value: "large",
                    },
                    { kind: "play", child: { nodeId: "1" } },
                ],
            },
            nodes: {
                "1": {
                    type: "switch",
                    group: "ship_size",
                    cases: {
                        large: { nodeId: "2" },
                    },
                    default: { nodeId: "3" },
                },
                "2": { type: "sound", mediaId: "100" },
                "3": { type: "sound", mediaId: "200" },
            },
        },
    });
    const controls = {
        getSwitch: group => switches.get(group),
        setSwitch: (group, value) => switches.set(group, value),
    };

    assert.deepEqual(
        engine.ResolveEvent("interleaved", controls)
            .map(selection => selection.mediaID),
        [ "200", "100" ],
    );
});

test("event programs preserve Stop order, hierarchy matches, and sampled timing", () =>
{
    const samples = [ 0.25, 0.75 ];
    const engine = new CjsSfxEngine({
        random: () => samples.shift() ?? 0,
        graph: {
            schemaVersion: 2,
            events: {
                staged_stop: [ { nodeId: "1" } ],
            },
            programs: {
                staged_stop: [
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "stop",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        delayMs: 100,
                        delayRangeMs: { min: -20, max: 20 },
                        transitionMs: 200,
                        transitionRangeMs: { min: -100, max: 100 },
                        curve: 6,
                        actionFlags: 6,
                        exceptions: [],
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    matchIds: [ "1", "700" ],
                },
            },
        },
    });

    const program = engine.ResolveProgram("staged_stop");

    assert.deepEqual(
        program.map(action => action.kind),
        [ "play", "stop" ],
    );
    assert.deepEqual(program[0].selections[0].matchIds, [ "1", "700" ]);
    assert.equal(program[0].selections[0].actionIndex, 0);
    assert.deepEqual(program[1], {
        kind: "stop",
        actionIndex: 1,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 90,
        transitionMs: 250,
        curve: 6,
        actionFlags: 6,
        exceptions: [],
    });
});

test("event programs preserve stacked Pause and Resume transport actions", () =>
{
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {},
            programs: {
                voice_pause: [
                    {
                        kind: "pause",
                        targetId: "735447374",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        curve: 4,
                        actionFlags: 7,
                        exceptions: [],
                    },
                ],
                voice_resume: [
                    {
                        kind: "resume",
                        targetId: "735447374",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        curve: 4,
                        actionFlags: 6,
                        exceptions: [],
                    },
                ],
            },
            nodes: {},
        },
    });

    assert.deepEqual(engine.ResolveProgram("voice_pause"), [
        {
            kind: "pause",
            actionIndex: 0,
            targetId: "735447374",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            actionFlags: 7,
            exceptions: [],
        },
    ]);
    assert.deepEqual(engine.ResolveProgram("voice_resume"), [
        {
            kind: "resume",
            actionIndex: 0,
            targetId: "735447374",
            targetFlags: 0,
            scope: "game-object",
            mode: "element",
            delayMs: 0,
            transitionMs: 0,
            curve: 4,
            actionFlags: 6,
            exceptions: [],
        },
    ]);
});

test("event programs preserve Set and Reset Voice Volume operations", () =>
{
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {
                staged_volume: [ { nodeId: "1" } ],
            },
            programs: {
                staged_volume: [
                    {
                        kind: "set-voice-volume",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        valueMode: "absolute",
                        volumeDb: -12,
                        transitionMs: 250,
                        curve: 7,
                    },
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "set-voice-volume",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        valueMode: "relative",
                        volumeDb: 3,
                        delayMs: 100,
                        curve: 4,
                    },
                    {
                        kind: "reset-voice-volume",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        curve: 4,
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    matchIds: [ "1", "700" ],
                },
            },
        },
    });

    const program = engine.ResolveProgram("staged_volume");

    assert.deepEqual(
        program.map(action => action.kind),
        [
            "set-voice-volume",
            "play",
            "set-voice-volume",
            "reset-voice-volume",
        ],
    );
    assert.deepEqual(program[0], {
        kind: "set-voice-volume",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 250,
        curve: 7,
        valueMode: "absolute",
        volumeDb: -12,
    });
    assert.equal(program[2].delayMs, 100);
    assert.equal(program[2].valueMode, "relative");
    assert.equal(program[2].volumeDb, 3);
    assert.equal(program[3].volumeDb, undefined);
    assert.ok(
        Math.abs(engine.EvaluateGain(
            program[1].selections[0],
            { getVoiceVolumeDb: () => -6 },
        ) - 10 ** (-6 / 20)) < 1e-12,
    );
    assert.ok(
        Math.abs(engine.EvaluateGain(
            program[1].selections[0],
            { getVoiceVolumeDb: () => -6 },
            3,
        ) - 10 ** (3 / 20)) < 1e-12,
    );
});

test("event programs preserve Bus Volume forms and bus routing", () =>
{
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {
                staged_bus: [ { nodeId: "1" } ],
            },
            programs: {
                staged_bus: [
                    {
                        kind: "set-bus-volume",
                        targetId: "928",
                        targetFlags: 1,
                        scope: "global",
                        mode: "element",
                        valueMode: "absolute",
                        busVolumeDb: -12,
                        busVolumeRangeDb: { min: 0, max: 0 },
                        transitionMs: 250,
                        curve: 7,
                        exceptions: [],
                    },
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "reset-bus-volume",
                        targetId: "0",
                        targetFlags: 1,
                        scope: "global",
                        mode: "all-except",
                        curve: 4,
                        exceptions: [ {
                            targetId: "929",
                            targetFlags: 1,
                        } ],
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    outputBusId: "928",
                    busPathIds: [ "928" ],
                    authoredBusVolumeDb: -100,
                    authoredBusMakeUpGainDb: 3,
                    authoredOutputBusVolumeDb: 2,
                },
            },
        },
    });

    const program = engine.ResolveProgram("staged_bus");

    assert.deepEqual(program.map(action => action.kind), [
        "set-bus-volume",
        "play",
        "reset-bus-volume",
    ]);
    assert.deepEqual(program[0], {
        kind: "set-bus-volume",
        actionIndex: 0,
        targetId: "928",
        targetFlags: 1,
        scope: "global",
        mode: "element",
        delayMs: 0,
        transitionMs: 250,
        curve: 7,
        exceptions: [],
        valueMode: "absolute",
        busVolumeDb: -12,
    });
    assert.deepEqual(
        program[1].selections[0].busPathIds,
        [ "928" ],
    );
    assert.equal(program[1].selections[0].authoredBusVolumeDb, -100);
    assert.equal(program[1].selections[0].authoredBusMakeUpGainDb, 3);
    assert.equal(program[1].selections[0].authoredOutputBusVolumeDb, 2);
    assert.equal(program[1].selections[0].gainDb, 0);
    assert.deepEqual(program[2].exceptions, [ {
        targetId: "929",
        targetFlags: 1,
    } ]);
});

test("event programs preserve Set and Reset Voice Pitch operations", () =>
{
    const engine = new CjsSfxEngine({
        random: () => 0.75,
        graph: {
            schemaVersion: 2,
            events: {
                staged_pitch: [ { nodeId: "1" } ],
            },
            programs: {
                staged_pitch: [
                    {
                        kind: "set-voice-pitch",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        valueMode: "absolute",
                        pitchCents: 200,
                        pitchRangeCents: { min: -100, max: 100 },
                        transitionMs: 250,
                        curve: 7,
                    },
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "set-voice-pitch",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        valueMode: "relative",
                        pitchCents: -50,
                        delayMs: 100,
                        curve: 4,
                    },
                    {
                        kind: "reset-voice-pitch",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        curve: 4,
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    matchIds: [ "1", "700" ],
                },
            },
        },
    });

    const program = engine.ResolveProgram("staged_pitch");

    assert.deepEqual(
        program.map(action => action.kind),
        [
            "set-voice-pitch",
            "play",
            "set-voice-pitch",
            "reset-voice-pitch",
        ],
    );
    assert.deepEqual(program[0], {
        kind: "set-voice-pitch",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 250,
        curve: 7,
        valueMode: "absolute",
        pitchCents: 250,
    });
    assert.equal(program[2].delayMs, 100);
    assert.equal(program[2].valueMode, "relative");
    assert.equal(program[2].pitchCents, -50);
    assert.equal(program[3].pitchCents, undefined);
    assert.equal(
        engine.EvaluatePlaybackRate(
            program[1].selections[0],
            { getVoicePitchCents: () => 1200 },
        ),
        2,
    );
    assert.equal(
        engine.EvaluatePlaybackRate(
            program[1].selections[0],
            { getVoicePitchCents: () => 1200 },
            -1200,
        ),
        0.5,
    );

    const clampedEngine = new CjsSfxEngine({
        graph: Graph(
            { clamped: [ { nodeId: "1" } ] },
            {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    matchIds: [ "1", "700" ],
                    pitchCents: 2400,
                },
            },
        ),
    });
    const clamped = clampedEngine.ResolveEvent("clamped")[0];

    assert.equal(clamped.playbackRate, 4);
    assert.equal(
        clampedEngine.EvaluatePlaybackRate(
            clamped,
            { getVoicePitchCents: () => 2400 },
        ),
        4,
        "NodeBase and Voice Pitch contributions clamp after accumulation",
    );
});

test("event programs preserve Voice LPF and HPF operations", () =>
{
    const engine = new CjsSfxEngine({
        random: () => 0.75,
        graph: {
            schemaVersion: 2,
            events: {
                staged_filters: [ { nodeId: "1" } ],
            },
            programs: {
                staged_filters: [
                    {
                        kind: "set-voice-low-pass",
                        targetId: "700",
                        targetFlags: 0,
                        scope: "game-object",
                        mode: "element",
                        valueMode: "absolute",
                        lowPass: 20,
                        lowPassRange: { min: -10, max: 10 },
                        transitionMs: 250,
                        curve: 7,
                        exceptions: [],
                    },
                    { kind: "play", child: { nodeId: "1" } },
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
                        scope: "game-object",
                        mode: "element",
                        valueMode: "relative",
                        highPass: -20,
                        delayMs: 100,
                        curve: 4,
                        exceptions: [],
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
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    matchIds: [ "1", "700" ],
                },
            },
        },
    });

    const program = engine.ResolveProgram("staged_filters");

    assert.deepEqual(
        program.map(action => action.kind),
        [
            "set-voice-low-pass",
            "play",
            "reset-voice-low-pass",
            "set-voice-high-pass",
            "reset-voice-high-pass",
        ],
    );
    assert.deepEqual(program[0], {
        kind: "set-voice-low-pass",
        actionIndex: 0,
        targetId: "700",
        targetFlags: 0,
        scope: "game-object",
        mode: "element",
        delayMs: 0,
        transitionMs: 250,
        curve: 7,
        exceptions: [],
        valueMode: "absolute",
        lowPass: 25,
    });
    assert.equal(program[2].mode, "all-except");
    assert.deepEqual(program[2].exceptions, [ {
        targetId: "701",
        targetFlags: 0,
    } ]);
    assert.equal(program[3].delayMs, 100);
    assert.equal(program[3].valueMode, "relative");
    assert.equal(program[3].highPass, -20);
    assert.equal(program[4].mode, "all");
    assert.equal(program[1].selections[0].lowPass, 0);
    assert.equal(program[1].selections[0].highPass, 0);
    assert.equal(
        engine.EvaluateLowPass(
            program[1].selections[0],
            { getVoiceLowPass: () => 30 },
        ),
        30,
    );
    assert.equal(
        engine.EvaluateHighPass(
            program[1].selections[0],
            { getVoiceHighPass: () => 30 },
        ),
        30,
    );
});

test("Game Parameter programs sample once and overlay capture-time RTPCs in order", () =>
{
    const delayCurve = {
        rtpc: "engine_load",
        scope: "object",
        property: "initialDelay",
        scaling: 0,
        defaultValue: 0,
        points: [
            { x: 0, value: 0, interpolation: 4 },
            { x: 2, value: 2, interpolation: 4 },
        ],
    };
    const engine = new CjsSfxEngine({
        random: () => 0.75,
        graph: {
            schemaVersion: 2,
            events: {
                staged_rtpc: [
                    { nodeId: "1" },
                    { nodeId: "1" },
                ],
                play_then_set: [ { nodeId: "1" } ],
            },
            programs: {
                staged_rtpc: [
                    {
                        kind: "set-game-parameter",
                        rtpc: "engine_load",
                        scope: "game-object",
                        valueMode: "absolute",
                        gameParameterValue: 1,
                        gameParameterRange: { min: -0.5, max: 0.5 },
                        defaultValue: 0,
                        curve: 4,
                        bypassTransition: false,
                    },
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "reset-game-parameter",
                        rtpc: "engine_load",
                        scope: "game-object",
                        defaultValue: 0.25,
                        curve: 4,
                        bypassTransition: false,
                    },
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "set-game-parameter",
                        rtpc: "engine_load",
                        scope: "game-object",
                        valueMode: "relative",
                        gameParameterValue: 2,
                        defaultValue: 0,
                        delayMs: 100,
                        curve: 9,
                        bypassTransition: true,
                    },
                ],
                play_then_set: [
                    { kind: "play", child: { nodeId: "1" } },
                    {
                        kind: "set-game-parameter",
                        rtpc: "engine_load",
                        scope: "game-object",
                        valueMode: "absolute",
                        gameParameterValue: 2,
                        defaultValue: 0,
                        curve: 4,
                        bypassTransition: false,
                    },
                ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    rtpcCurves: [ delayCurve ],
                },
            },
        },
    });
    const controls = {
        getRTPC: () => 0,
        getGlobalRTPC: () => 0,
    };
    const program = engine.ResolveProgram("staged_rtpc", controls);

    assert.deepEqual(program.map(action => action.kind), [
        "set-game-parameter",
        "play",
        "reset-game-parameter",
        "play",
        "set-game-parameter",
    ]);
    assert.equal(program[0].actionIndex, 0);
    assert.equal(program[0].gameParameterValue, 1.25);
    assert.equal(program[1].selections[0].delayMs, 1250);
    assert.equal(program[2].defaultValue, 0.25);
    assert.equal(program[3].selections[0].delayMs, 250);
    assert.equal(program[4].delayMs, 100);
    assert.equal(program[4].gameParameterValue, 2);
    assert.equal(program[4].bypassTransition, true);
    assert.equal(
        engine.ResolveProgram("play_then_set", controls)[0]
            .selections[0].delayMs,
        undefined,
        "a later setter cannot change an earlier Play capture",
    );
});

test("Play actions preserve probability, randomized delay, and fade-in", () =>
{
    const samples = [ 0.49, 0.5, 0, 0.5 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                impact: [
                    {
                        nodeId: "1",
                        probability: 50,
                        delayMs: 100,
                        delayRangeMs: { min: -50, max: 100 },
                        fadeInMs: 200,
                        fadeInRangeMs: { min: -50, max: 50 },
                        fadeCurve: 8,
                    },
                    {
                        nodeId: "2",
                        probability: 50,
                    },
                ],
                nested_delay: [
                    {
                        nodeId: "3",
                        delayMs: 100,
                    },
                ],
            },
            {
                "1": { type: "sound", mediaId: "100" },
                "2": { type: "sound", mediaId: "200" },
                "3": {
                    type: "parallel",
                    children: [
                        {
                            nodeId: "4",
                            delayMs: 50,
                        },
                    ],
                },
                "4": { type: "sound", mediaId: "400" },
            },
        ),
        random: () => samples.shift(),
    });

    assert.deepEqual(
        engine.ResolveEvent("impact"),
        [
            {
                mediaID: "100",
                busRouteNodeId: "1",
                loop: undefined,
                playbackRate: 1,
                gainDb: 0,
                gainCurves: [],
                delayMs: 125,
                fadeInMs: 150,
                fadeCurve: 8,
            },
        ],
        "one probability sample gates the action before its randomizers",
    );
    assert.equal(
        engine.ResolveEvent("nested_delay")[0].delayMs,
        150,
        "nested Play-Event delays remain independent and additive",
    );
});

test("nested Play-Event probability gates remain independent", () =>
{
    const samples = [ 0.49, 0.49, 0.49, 0.5 ];
    const engine = new CjsSfxEngine({
        graph: Graph(
            {
                gated: [
                    {
                        nodeId: "1",
                        probability: 50,
                        delayMs: 100,
                    },
                ],
            },
            {
                "1": {
                    type: "parallel",
                    children: [
                        {
                            nodeId: "2",
                            probability: 50,
                            delayMs: 50,
                        },
                    ],
                },
                "2": { type: "sound", mediaId: "200" },
            },
        ),
        random: () => samples.shift(),
    });

    assert.equal(
        engine.ResolveEvent("gated")[0].delayMs,
        150,
        "the outer and inner actions both pass and keep their own delays",
    );
    assert.deepEqual(
        engine.ResolveEvent("gated"),
        [],
        "the inner gate can fail after the outer gate passes",
    );
});

test("the shared evaluator preserves all serialized Wwise curve shapes", () =>
{
    const samples = [
        [ 0.125, [
            0.330078125,
            0.19508979487054273,
            0.1796875,
            0.1913414921145057,
            0.125,
            0.03842660007326251,
            0.0703125,
            0.019218284911775796,
            0.001953125,
            0,
        ] ],
        [ 0.25, [
            0.578125,
            0.38268299601977035,
            0.34375,
            0.3535536829902906,
            0.25,
            0.14612561627268617,
            0.15625,
            0.07611748897285031,
            0.015625,
            0,
        ] ],
        [ 0.5, [
            0.875,
            0.7071073855961416,
            0.625,
            0.49999969340418016,
            0.5,
            0.49968240150961296,
            0.375,
            0.29288993716220835,
            0.125,
            0,
        ] ],
        [ 0.75, [
            0.984375,
            0.92387896523379,
            0.84375,
            0.6464463170097093,
            0.75,
            0.8541442549249096,
            0.65625,
            0.617322424851289,
            0.421875,
            0,
        ] ],
        [ 0.875, [
            0.998046875,
            0.9807853836374286,
            0.9296875,
            0.8086585078854943,
            0.875,
            0.9614813722659183,
            0.8203125,
            0.8049054866862037,
            0.669921875,
            0,
        ] ],
    ];

    for (const [ progress, expected ] of samples)
    {
        for (let curve = 0; curve < expected.length; curve++)
        {
            assert.ok(
                Math.abs(
                    evaluateWwiseInterpolation(curve, progress)
                        - expected[curve],
                ) < 1e-12,
                `curve ${curve} matches Wwise at ${progress}`,
            );
        }
    }
    for (let curve = 0; curve < 10; curve++)
    {
        assert.equal(evaluateWwiseInterpolation(curve, 0), 0);
        assert.equal(evaluateWwiseInterpolation(curve, 1), 1);
    }
    assert.equal(evaluateWwiseInterpolation(4, -Infinity), 0);
    assert.equal(evaluateWwiseInterpolation(4, Infinity), 1);
    assert.equal(evaluateWwiseInterpolation(4, Number.NaN), 0);
    assert.equal(evaluateWwiseInterpolation(99, 0.25), 0.25);
});

test("linear-gain curves preserve Wwise shapes and duplicate-x steps", () =>
{
    let speed = 0;
    const engine = new CjsSfxEngine({
        graph: {
            schemaVersion: 2,
            events: {
                engine: [ { nodeId: "1" } ],
            },
            nodes: {
                "1": {
                    type: "sound",
                    mediaId: "100",
                    gainCurves: [
                        {
                            rtpc: "speed",
                            points: [
                                { x: 0, gain: 0, interpolation: 5 },
                                { x: 1, gain: 1, interpolation: 9 },
                                { x: 2, gain: 1, interpolation: 5 },
                                { x: 2, gain: 0, interpolation: 9 },
                            ],
                        },
                    ],
                },
            },
        },
    });
    const controls = {
        getRTPC: () => speed,
    };
    const selection = engine.ResolveEvent("engine", controls)[0];

    speed = 0.25;
    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls)
                - 0.14612561627268617,
        ) < 1e-12,
    );
    speed = 0.5;
    assert.ok(
        Math.abs(
            engine.EvaluateGain(selection, controls)
                - 0.49968240150961296,
        ) < 1e-12,
    );
    speed = 1.5;
    assert.equal(
        engine.EvaluateGain(selection, controls),
        1,
        "constant interpolation retains the left gain",
    );
    speed = 2;
    assert.equal(
        engine.EvaluateGain(selection, controls),
        0,
        "the last duplicate-x point owns the discontinuity",
    );
});
