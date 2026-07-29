import assert from "node:assert/strict";
import test from "node:test";

import { CjsSfxEngine } from "../npm/dist/index.js";

function Graph(events, nodes)
{
    return {
        schemaVersion: 1,
        events,
        nodes,
    };
}

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
