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
    const head = [ "tattoo", "eyebrows", "freckles", "blush", "eyeshadow", "eyeliner", "lipstick", "augmentations", "scars" ];
    assert.deepEqual(doll.GetLayerOrder(PaperDollPass.HEAD), head);
    assert.deepEqual(doll.GetLayerOrder(PaperDollPass.SURFACE), [ "aging", "scarring", "lipstick", "augmentations", "bodyAugmentation", "armLeft", "armRight", "scars", "bottomUnderwear", "topUnderwear" ]);

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
    assert.deepEqual(bindings.heads.at(-1).order, [ "blush", "tattoo", "eyebrows", "freckles", "eyeshadow", "eyeliner", "lipstick", "augmentations", "scars" ]);
    assert.equal(bindings.surfaces.length, 0, "blush feeds only the head pass");

    doll.ResetLayers();
    doll.Update(bindings);
    assert.equal(doll.GetLayer("blush"), PaperDollLayer.BLUSH);
    assert.deepEqual(bindings.heads.at(-1).order, [ "tattoo", "eyebrows", "freckles", "blush", "eyeshadow", "eyeliner", "lipstick", "augmentations", "scars" ]);
    assert.throws(() => doll.SetLayer("blush", NaN), RangeError);
});

test("an active occluder draws after the parts it occludes, matched by category or path", () =>
{
    const doll = Doll();
    doll.topUnderwear.Configure([ { id: "bikini", path: "topunderwear/bikini", colorAreas: [] } ], new Map(), { option: "bikini" });
    doll.armLeft.Configure([ { id: "arm", path: "makeup/armleft/cyborgarm_l", colorAreas: [] } ], new Map(), { option: "arm" });
    doll.bodyAugmentation.Configure([ { id: "suit", path: "makeup/bodyaugmentations/suit", colorAreas: [],
        occludes: [ "topunderwear", "makeup/armleft/cyborgarm_l" ] } ], new Map(), { option: "suit" });

    const order = doll.GetLayerOrder(PaperDollPass.BODY);
    assert.ok(order.indexOf("bodyAugmentation") > order.indexOf("topUnderwear"), "over the top underwear, by category");
    assert.ok(order.indexOf("bodyAugmentation") > order.indexOf("armLeft"), "over the arm, by path");

    doll.bodyAugmentation.enabled = false;
    const plain = doll.GetLayerOrder(PaperDollPass.BODY);
    assert.ok(plain.indexOf("bodyAugmentation") < plain.indexOf("topUnderwear"), "off, it keeps its rank");

    doll.bodyAugmentation.enabled = true;
    doll.topUnderwear.enabled = false;
    const bra = doll.GetLayerOrder(PaperDollPass.BODY);
    assert.ok(bra.indexOf("bodyAugmentation") > bra.indexOf("armLeft"), "still over the arm it occludes");
});

test("the captured occlusion targets name geometry the doll does not collect", () =>
{
    const doll = Doll();
    doll.augmentations.Configure([ { id: "paint", path: "makeup/augmentations/face_paint_f01", colorAreas: [], occludes: [ "accessories/browbase" ] },
        { id: "plain", path: "makeup/augmentations/face_paint_f01", colorAreas: [], occludes: [] } ], new Map(), { option: "paint" });
    assert.deepEqual(doll.GetOccluded(), [ "accessories/browbase" ]);
    assert.ok(CjsPaperDoll.occludes(doll.GetOccluded(), "accessories/browbase/browbase_01"));
    assert.ok(!CjsPaperDoll.occludes(doll.GetOccluded(), "accessories/browbaseextra"));

    doll.augmentations.option = "plain";
    assert.deepEqual(doll.GetOccluded(), []);
    doll.augmentations.option = "paint";
    doll.augmentations.enabled = false;
    assert.deepEqual(doll.GetOccluded(), []);
});
