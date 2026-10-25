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

/** Bindings recording what the foundation binding receives. */
function Bindings()
{
    const foundations = [];
    const none = () => {};
    return { foundations, bindings: { foundation: value => foundations.push(value), skin: none, surface: none, eyes: none, head: none, body: none } };
}

test("sculpt weights reach the foundation binding as a shape-only edit", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    const { foundations, bindings } = Bindings();
    const instance = new CjsPaperDollInstance(bindings);
    instance.Update(doll);
    assert.deepEqual(foundations.at(-1).sculpt, {});

    doll.archetype.SetSculpt("CheeksUpper_rightShape", 0.4);
    doll.archetype.SetSculpt("thinShape", -1.5);
    assert.equal(doll.archetype.IsDirty(), true);
    assert.equal(doll.archetype.IsFoundationDirty(), false, "a sculpt keeps the foundation's materials");
    instance.Update(doll);
    assert.deepEqual(foundations.at(-1).sculpt, { CheeksUpper_rightShape: Math.fround(0.4), thinShape: -1.5 });

    // Unchanged: nothing rebuilds.
    doll.archetype.SetSculpt("thinShape", -1.5);
    assert.equal(instance.Update(doll), false);

    doll.archetype.SetSculpt("thinShape", 0);
    assert.deepEqual(doll.archetype.GetSculpts(), { CheeksUpper_rightShape: Math.fround(0.4) });
    doll.archetype.ClearSculpts();
    instance.Update(doll);
    assert.deepEqual(foundations.at(-1).sculpt, {});
});

test("a sculpt needs a morph name and a finite weight", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    assert.throws(() => doll.archetype.SetSculpt("", 1), TypeError);
    assert.throws(() => doll.archetype.SetSculpt("Jaw_downShape", Number.NaN), RangeError);
    assert.equal(doll.archetype.GetSculpt("Jaw_downShape"), 0);
});
