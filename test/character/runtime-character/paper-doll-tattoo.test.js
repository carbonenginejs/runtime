import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDoll } from "../../../npm/dist/character/index.js";

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
    const doll = new CjsPaperDoll();
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
    return { heads, foundation() {}, skin() {}, surface() {}, eyes() {}, head(value) { heads.push(value); } };
}

test("tattoo controls offer only the colour slots the selected profile's zone uses", () =>
{
    const doll = Doll();
    assert.deepEqual(doll.tattoo.GetControls().map(property => property.key), [], "no profile, no ink controls");

    doll.tattoo.option = "areaOne";
    assert.deepEqual(doll.tattoo.GetControls().map(property => property.key), [ "palette", "customColors", "color1" ]);

    assert.deepEqual(Array.from(doll.tattoo.color1), Array.from(ink[0]), "the default palette supplies the zone's colour");
    assert.throws(() => doll.tattoo.Configure([ { id: "areaThree", colorAreas: [ 3 ] } ], new Map()), RangeError, "unqualified zone shapes are refused");
});

test("tattoo edits reach the head binding with the captured option and colours", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    doll.Update(bindings);
    bindings.heads.length = 0;

    doll.tattoo.option = "areaOne";
    doll.Update(bindings);
    assert.equal(bindings.heads.length, 1);
    assert.equal(bindings.heads[0].tattoo.option, "areaOne");

    doll.tattoo.color1 = Float32Array.of(.8, 0, 0, 1);
    doll.Update(bindings);
    assert.equal(bindings.heads.length, 2);
    assert.deepEqual(Array.from(bindings.heads[1].tattoo.colors[0]), [ .800000011920929, 0, 0, 1 ]);

    doll.tattoo.enabled = false;
    doll.Update(bindings);
    assert.equal(bindings.heads.at(-1).tattoo.option, "", "a disabled tattoo captures no option");
});

test("a strength-only edit rebuilds the head only while a tattoo is selected", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    doll.Update(bindings);
    bindings.heads.length = 0;

    doll.archetype.strength = .5;
    doll.Update(bindings);
    assert.equal(bindings.heads.length, 0, "without a tattoo a geometry-only edit leaves cosmetic maps alone");

    doll.tattoo.option = "areaOne";
    doll.Update(bindings);
    bindings.heads.length = 0;

    doll.archetype.strength = .75;
    doll.Update(bindings);
    assert.equal(bindings.heads.length, 1, "the tattoo is baked from the morphed face, so it rebakes");
});
