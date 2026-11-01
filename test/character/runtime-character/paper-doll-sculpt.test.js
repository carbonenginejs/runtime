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

test("sculpt inputs do not perform component validation", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    doll.archetype.SetSculpt("", 1);
    assert.equal(doll.archetype.GetSculpt(""), 1);
    doll.archetype.SetSculpt("Jaw_downShape", Number.NaN);
    assert.equal(Number.isNaN(doll.archetype.GetSculpt("Jaw_downShape")), true);
});

test("a foundation listed by id is prepared through its resolver before it can be selected", async () =>
{
    const doll = new CjsPaperDollDefinition();
    const other = { ...Foundation(), id: "other", label: "Other" };
    other.parts = other.parts.map(part => part.id === "archetype" ? { ...part, id: "other" } : part.id === "head"
        ? { ...part, dependencies: [ { part: "other", weight: 1 } ] } : part);
    const calls = [];
    doll.archetype.Configure([ Foundation(), { id: "other", label: "Other" } ], { option: "archetype", strength: 1,
        resolve: async id => { calls.push(id); return other; } });
    assert.deepEqual(doll.archetype.GetOptions().map(value => value.id), [ "archetype", "other" ]);
    doll.archetype.option = "other";
    assert.throws(() => doll.archetype.Resolve(), /not prepared/);
    doll.archetype.option = "archetype";
    const [ first, second ] = await Promise.all([ doll.archetype.ResolveOption("other"), doll.archetype.ResolveOption("other") ]);
    assert.strictEqual(first, second);
    assert.deepEqual(calls, [ "other" ]);
    doll.archetype.option = "other";
    assert.equal(doll.archetype.Resolve().archetype, "other");
    assert.equal((await doll.archetype.ResolveOption("archetype")).id, "archetype", "a prepared entry resolves without the resolver");
    assert.deepEqual(calls, [ "other" ]);
});
