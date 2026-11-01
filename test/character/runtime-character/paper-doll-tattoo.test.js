import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

/** One instance per bindings object, so repeated updates keep their applied state. */
const instances = new WeakMap();
function Update(definition, bindings)
{
    if (!instances.has(bindings)) instances.set(bindings, new CjsPaperDollInstance(bindings));
    return instances.get(bindings).Update(definition);
}

const ink = [ Float32Array.of(.1, .1, .1, 1), Float32Array.of(.2, .2, .2, 1), Float32Array.of(.3, .3, .3, 1) ];

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

/** A doll with two head tattoo profiles, both zoned to colour area 1. */
function Doll()
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    doll.tattoo.Configure([
        { id: "areaOne", colorAreas: [ 1 ], defaultPalette: "ink", palettes: [ { path: "ink", label: "Ink" } ] },
        { id: "areaOneAgain", colorAreas: [ 1 ], defaultPalette: "ink", palettes: [ { path: "ink", label: "Ink" } ] }
    ], new Map([ [ "ink", ink ] ]), { option: "" });
    return doll;
}

/** Records every head binding call; the other bindings do nothing. */
function Bindings()
{
    const heads = [];
    return { heads, foundation() {}, skin() {}, body() {}, surface() {}, eyes() {}, head(value) { heads.push(value); } };
}

test("tattoo controls offer only the colour slots the selected profile's zone uses", () =>
{
    const doll = Doll();
    assert.deepEqual(doll.tattoo.GetControls().map(property => property.key), [], "no profile, no ink controls");

    CjsSchema.setValues(doll.tattoo, { option: "areaOne" });
    assert.deepEqual(doll.tattoo.GetControls().map(property => property.key), [ "palette", "customColors", "color1" ]);

    CjsSchema.setValues(doll.tattoo, { color1: Float32Array.from(ink[0]) });
    assert.deepEqual(Array.from(doll.tattoo.Capture().colors[0]), Array.from(ink[0]));
    doll.tattoo.Configure([ { id: "areaThree", colorAreas: [ 3 ] } ], new Map(), { option: "areaThree" });
    assert.deepEqual(doll.tattoo.GetColorAreas(), [3]);
});

test("tattoo edits reach the head binding with the captured option and colours", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    Update(doll, bindings);
    bindings.heads.length = 0;

    CjsSchema.setValues(doll.tattoo, { option: "areaOne" });
    Update(doll, bindings);
    assert.equal(bindings.heads.length, 1);
    assert.equal(bindings.heads[0].tattoo.option, "areaOne");

    CjsSchema.setValues(doll.tattoo, { color1: Float32Array.of(.8, 0, 0, 1) });
    Update(doll, bindings);
    assert.equal(bindings.heads.length, 2);
    assert.deepEqual(Array.from(bindings.heads[1].tattoo.colors[0]), [ .800000011920929, 0, 0, 1 ]);

    CjsSchema.setValues(doll.tattoo, { enabled: false });
    Update(doll, bindings);
    assert.equal(bindings.heads.at(-1).tattoo.option, "", "a disabled tattoo captures no option");
});

test("a strength-only edit rebuilds the head only while a tattoo is selected", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    Update(doll, bindings);
    bindings.heads.length = 0;

    CjsSchema.setValues(doll.archetype, { strength: .5 });
    Update(doll, bindings);
    assert.equal(bindings.heads.length, 0, "without a tattoo a geometry-only edit leaves cosmetic maps alone");

    CjsSchema.setValues(doll.tattoo, { option: "areaOne" });
    Update(doll, bindings);
    bindings.heads.length = 0;

    CjsSchema.setValues(doll.archetype, { strength: .75 });
    Update(doll, bindings);
    assert.equal(bindings.heads.length, 1, "the tattoo is baked from the morphed face, so it rebakes");
});
