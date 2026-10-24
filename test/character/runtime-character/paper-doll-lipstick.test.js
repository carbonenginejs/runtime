import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDoll } from "../../../npm/dist/character/index.js";

const red = [ Float32Array.of(.57, .17, .27, 1), Float32Array.of(.57, .17, .27, 1), Float32Array.of(.5, .5, .5, 1) ];
const pink = [ Float32Array.of(.8, .4, .5, 1), Float32Array.of(.8, .4, .5, 1), Float32Array.of(.5, .5, .5, 1) ];

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

/** A doll with one lipstick style and two palettes. */
function Doll()
{
    const doll = new CjsPaperDoll();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    doll.lipstick.Configure([ { id: "lipstick_01", colorAreas: [ 1 ], defaultPalette: "red_glossy",
        palettes: [ { path: "red_glossy", label: "Red glossy" }, { path: "pink_matte", label: "Pink matte" } ] } ],
    new Map([ [ "red_glossy", red ], [ "pink_matte", pink ] ]), { option: "" });
    return doll;
}

/** Records head and surface binding calls; the other bindings do nothing. */
function Bindings()
{
    const heads = [], surfaces = [];
    return { heads, surfaces, foundation() {}, skin() {}, body() {}, eyes() {}, head(value) { heads.push(value); }, surface(value) { surfaces.push(value); } };
}

test("a lipstick style reaches the head (diffuse) and surface (specular and gloss) passes", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    doll.Update(bindings);
    bindings.heads.length = bindings.surfaces.length = 0;

    doll.lipstick.option = "lipstick_01";
    doll.Update(bindings);
    assert.equal(bindings.heads.at(-1).lipstick.option, "lipstick_01");
    assert.equal(bindings.surfaces.at(-1).lipstick.option, "lipstick_01");
    assert.equal(bindings.surfaces.at(-1).lipstick.palette, "red_glossy", "the default palette selects the specular colours");
    assert.deepEqual(doll.lipstick.GetControls().map(property => property.key), [ "palette", "customColors", "color1" ]);
});

test("with custom colours on, a palette change still changes the specular", () =>
{
    const doll = Doll();
    const bindings = Bindings();
    doll.lipstick.option = "lipstick_01";
    doll.Update(bindings);
    doll.lipstick.color1 = Float32Array.of(.2, .1, .6, 1);
    doll.Update(bindings);
    bindings.heads.length = bindings.surfaces.length = 0;

    // Choosing a palette turns custom colours off, so pick it and turn them back on.
    doll.lipstick.palette = "pink_matte";
    doll.lipstick.customColors = true;
    doll.Update(bindings);
    assert.equal(bindings.surfaces.at(-1).lipstick.palette, "pink_matte", "the surface pass sees the new palette");
    assert.equal(bindings.heads.length, 0, "the custom diffuse colour is unchanged, so the head is not recomposed");
    assert.deepEqual(Array.from(doll.lipstick.color1).map(v => Number(v.toFixed(2))), [ .2, .1, .6, 1 ], "the custom colour is kept");
});
