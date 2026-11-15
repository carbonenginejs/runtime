import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsPaperDollDefinition, CjsPaperDollInstance, PaperDollLayer, PaperDollTarget } from "../../../npm/dist/character/index.js";
import { installBlueServices } from "../../../npm/dist/blue/blue.js";

// The paper doll asks the installed library for its rules (the exclusive part groups).
installBlueServices({ characterLibrary: new CjsCharacterLibraryManager() }, false);

/** One instance per bindings object, so repeated updates keep their applied state. */
const instances = new WeakMap();
function Update(definition, bindings)
{
    if (!instances.has(bindings)) instances.set(bindings, new CjsPaperDollInstance().Initialize({ error: message => assert.fail(message), ...bindings }));
    return instances.get(bindings).Update(definition);
}

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
    const doll = new CjsPaperDollDefinition();
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
    for (const name of CjsPaperDollDefinition.parts) assert.notEqual(doll[name].constructor.targets, 0, name);
});

test("the head pass composes its parts in bake order and hands that order to the binding", () =>
{
    const doll = Doll();
    const head = [ "tattoo", "eyebrows", "freckles", "blush", "eyeshadow", "eyeliner", "lipstick", "augmentations", "hair", "beard", "scars", "glasses", "earsLow", "earsHigh", "ears", "nose", "lips", "chin", "brow", "mask" ];
    assert.deepEqual(doll.GetLayerOrder(PaperDollTarget.HEAD), head);
    assert.deepEqual(doll.GetLayerOrder(PaperDollTarget.SURFACE), [ "aging", "scarring", "lipstick", "augmentations", "hair", "bodyAugmentation", "beard", "armLeft", "armRight", "scars", "bottomUnderwear", "topUnderwear", "bottomMiddle", "topMiddle", "bottomOuter", "feet", "topOuter", "outer" ]);

    const bindings = Bindings();
    Update(doll, bindings);
    assert.deepEqual(bindings.heads.at(-1).order, head);
});

test("a layer override reorders and rebuilds only the passes the part feeds, and resets to the class rank", () =>
{
    const doll = Doll();
    doll.aging.Configure([ { id: "aging_01", colorAreas: [] } ], { option: "aging_01" });
    const bindings = Bindings();
    Update(doll, bindings);
    assert.equal(bindings.surfaces.length, 1, "a selected ageing option builds the surface pass");
    bindings.heads.length = bindings.surfaces.length = 0;

    doll.SetLayer("blush", PaperDollLayer.TATTOO - 1);
    assert.equal(Update(doll, bindings), true);
    assert.deepEqual(bindings.heads.at(-1).order, [ "blush", "tattoo", "eyebrows", "freckles", "eyeshadow", "eyeliner", "lipstick", "augmentations", "hair", "beard", "scars", "glasses", "earsLow", "earsHigh", "ears", "nose", "lips", "chin", "brow", "mask" ]);
    assert.equal(bindings.surfaces.length, 0, "blush feeds only the head pass");

    doll.ResetLayers();
    Update(doll, bindings);
    assert.equal(doll.GetLayer("blush"), PaperDollLayer.BLUSH);
    assert.deepEqual(bindings.heads.at(-1).order, [ "tattoo", "eyebrows", "freckles", "blush", "eyeshadow", "eyeliner", "lipstick", "augmentations", "hair", "beard", "scars", "glasses", "earsLow", "earsHigh", "ears", "nose", "lips", "chin", "brow", "mask" ]);
    assert.throws(() => doll.SetLayer("blush", NaN), RangeError);
});

test("occlusion does not reorder: an occluder keeps its rank (the occluded part is dropped by the walk instead)", () =>
{
    const doll = Doll();
    doll.topUnderwear.Configure([ { id: "bikini", path: "topunderwear/bikini", colorAreas: [] } ], { option: "bikini" });
    doll.bodyAugmentation.Configure([ { id: "suit", path: "makeup/bodyaugmentations/suit", colorAreas: [],
        occludes: [ "topunderwear" ] } ], { option: "suit" });
    const order = doll.GetLayerOrder(PaperDollTarget.BODY);
    assert.ok(order.indexOf("bodyAugmentation") < order.indexOf("topUnderwear"), "its own rank, before the top underwear");
});

test("the captured occlusion targets name geometry the doll does not collect", () =>
{
    const doll = Doll();
    doll.augmentations.Configure([ { id: "paint", path: "makeup/augmentations/face_paint_f01", colorAreas: [], occludes: [ "accessories/browbase" ] },
        { id: "plain", path: "makeup/augmentations/face_paint_f01", colorAreas: [], occludes: [] } ], { option: "paint" });
    assert.deepEqual(doll.GetOccluded(), [ "accessories/browbase" ]);
    assert.ok(CjsPaperDollDefinition.occludes(doll.GetOccluded(), "accessories/browbase/browbase_01"));
    assert.ok(!CjsPaperDollDefinition.occludes(doll.GetOccluded(), "accessories/browbaseextra"));

    CjsSchema.setValues(doll.augmentations, { option: "plain" });
    assert.deepEqual(doll.GetOccluded(), []);
    CjsSchema.setValues(doll.augmentations, { option: "paint" });
    CjsSchema.setValues(doll.augmentations, { enabled: false });
    assert.deepEqual(doll.GetOccluded(), []);
});
