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
