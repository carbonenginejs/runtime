import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

/** The smallest foundation the archetype accepts: a head declaring it, a generic head and a body. */
function Foundation()
{
    const maps = Object.fromEntries([ "head", "body" ].flatMap(region =>
        [ "DiffuseMap", "NormalMap", "SpecularMap" ].map(channel => [ region + "." + channel, `res:/${region}_${channel}.png` ])));
    return {
        id: "archetype", label: "Archetype", head: "head", genericHead: "generic", body: "body", skeleton: "res:/skeleton.gr2",
        parts: [
            { id: "archetype", textures: maps },
            { id: "head", dependencies: [ { part: "archetype", weight: 1 } ] },
            { id: "generic", model: "res:/generic.black", textures: { "head.DiffuseMap": "d", "head.NormalMap": "n", "head.SpecularMap": "s", "head.CutMaskMap": "m" } },
            { id: "body", model: "res:/body.black" }
        ]
    };
}

/** A doll with one t-shirt, selected. */
function Doll()
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    doll.topMiddle.Configure([ { id: "tshirtf01_aurora", path: "topmiddle/tshirtf01", occludes: [], colorAreas: [] } ], new Map(), { option: "tshirtf01_aurora" });
    return doll;
}

/** Bindings recording the body pass's captured tuck state. */
function Bindings()
{
    const calls = { body: [] };
    const record = name => state => { if (name === "body") calls.body.push(state.topMiddle.tuck); };
    return { calls, bindings: { foundation: () => {}, skin: record("skin"), surface: record("surface"), eyes: record("eyes"), head: record("head"), body: record("body") } };
}

test("a top's tuck state is captured into the body pass and rebuilds it when changed", () =>
{
    const doll = Doll();
    const { calls, bindings } = Bindings();
    const instance = new CjsPaperDollInstance(bindings);
    instance.Update(doll);
    assert.deepEqual(calls.body, [ 0 ]);

    doll.topMiddle.tuck = 3;
    assert.equal(instance.Update(doll), true);
    assert.deepEqual(calls.body, [ 0, 3 ]);

    // Unchanged: nothing rebuilds.
    doll.topMiddle.tuck = 3;
    assert.equal(instance.Update(doll), false);

    doll.topMiddle.Reset();
    instance.Update(doll);
    assert.equal(doll.topMiddle.tuck, 0);
    assert.equal(calls.body.at(-1), 0);
});

test("tucking takes only a state index, and is 0 while no top is selected", () =>
{
    const doll = Doll();
    assert.throws(() => { doll.topMiddle.tuck = -1; }, RangeError);
    assert.throws(() => { doll.topMiddle.tuck = 1.5; }, RangeError);
    doll.topMiddle.tuck = 2;
    doll.topMiddle.enabled = false;
    assert.equal(doll.topMiddle.Capture().tuck, 0);
});
