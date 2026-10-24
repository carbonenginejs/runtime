import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDoll, PaperDollLayer, PaperDollPass } from "../../../npm/dist/character/index.js";

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

function Doll()
{
    const doll = new CjsPaperDoll();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    return doll;
}

/** Records the head and surface binding calls; the other bindings do nothing. */
function Bindings()
{
    const heads = [], surfaces = [];
    return { heads, surfaces, foundation() {}, skin() {}, body() {}, eyes() {}, head(value) { heads.push(value); }, surface(value) { surfaces.push(value); } };
}

test("every collected part declares the passes it feeds", () =>
{
    const doll = Doll();
    for (const name of CjsPaperDoll.parts) assert.notEqual(doll[name].constructor.passes, 0, name);
});

test("the head pass composes its parts in bake order and hands that order to the binding", () =>
{
    const doll = Doll();
    const head = [ "tattoo", "eyebrows", "freckles", "blush", "lipstick", "scars" ];
    assert.deepEqual(doll.GetLayerOrder(PaperDollPass.HEAD), head);
    assert.deepEqual(doll.GetLayerOrder(PaperDollPass.SURFACE), [ "aging", "scarring", "lipstick", "scars", "bottomUnderwear", "topUnderwear" ]);

    const bindings = Bindings();
    doll.Update(bindings);
    assert.deepEqual(bindings.heads.at(-1).order, head);
});

test("a layer override reorders and rebuilds only the passes the part feeds, and resets to the class rank", () =>
{
    const doll = Doll();
    doll.aging.Configure([ { id: "aging_01", colorAreas: [] } ], new Map(), { option: "aging_01" });
    const bindings = Bindings();
    doll.Update(bindings);
    assert.equal(bindings.surfaces.length, 1, "a selected ageing option builds the surface pass");
    bindings.heads.length = bindings.surfaces.length = 0;

    doll.SetLayer("blush", PaperDollLayer.TATTOO - 1);
    assert.equal(doll.Update(bindings), true);
    assert.deepEqual(bindings.heads.at(-1).order, [ "blush", "tattoo", "eyebrows", "freckles", "lipstick", "scars" ]);
    assert.equal(bindings.surfaces.length, 0, "blush feeds only the head pass");

    doll.ResetLayers();
    doll.Update(bindings);
    assert.equal(doll.GetLayer("blush"), PaperDollLayer.BLUSH);
    assert.deepEqual(bindings.heads.at(-1).order, [ "tattoo", "eyebrows", "freckles", "blush", "lipstick", "scars" ]);
    assert.throws(() => doll.SetLayer("blush", NaN), RangeError);
});
