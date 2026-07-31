import assert from "node:assert/strict";
import test from "node:test";

import { CjsSfxEngine } from "../npm/dist/index.js";

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
    const samples = [ 0.75, 0.25, 0.5 ];
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
    assert.equal(selection.delayMs, 300);
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
    assert.equal(engine.EvaluateGain(selection, controls), 0.15625);
    speed = 0.5;
    assert.equal(engine.EvaluateGain(selection, controls), 0.5);
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
