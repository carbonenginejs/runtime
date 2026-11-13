// The body carriers are library data with a default (factory/defaults/bodyCarriers.json), and the paper doll applies the
// cut-clip rule from it (CjsPaperDollInstance.cutMaskClipEffects); no carrier list or clip rule lives in a consumer.
import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

test("the library hands out the default body carriers, a host replaces them, and each read is a copy", () =>
{
    const library = new CjsCharacterLibraryManager();
    const carriers = library.GetBodyCarriers();
    assert.deepEqual(carriers, CjsCharacterLibraryManager.bodyCarrierDefaults());
    assert.deepEqual(carriers.parts.map(part => part.path), [ "topinner/torso_nude", "bottominner/legs_nude", "hands/hands_nude", "feet/feet_nude" ]);
    assert.deepEqual(carriers.parts[0].dependants, [ "dependants/sleevesupper", "dependants/sleeveslower" ]);
    assert.deepEqual(carriers.garmentDependants, [ "dependants/sleevesupper", "dependants/sleeveslower", "dependants/collar", "dependants/hood" ]);
    assert.deepEqual(carriers.cutMaskClip, { resource: "CutMaskMap", influence: "CutMaskInfluence", above: 0, clip: "DecalClip" });
    assert.deepEqual(carriers.meshCopy, { share: 0.1, positionScale: 10000 });
    assert.deepEqual(carriers.shells, { draw: false });
    assert.deepEqual(carriers.backingCutout, { parameter: "MaterialCutoutColor", alpha: 0 });
    assert.equal("description" in carriers, false, "the description is the file's, not a setting");

    carriers.parts.length = 0;
    assert.equal(library.GetBodyCarriers().parts.length, 4, "the caller's own copy");
    const own = { parts: [ { path: "topinner/torso_nude", dependants: [] } ], garmentDependants: [], cutMaskClip: { resource: "M", influence: "I", above: 0.5, clip: "C" } };
    library.SetBodyCarriers(own);
    own.parts.length = 0;
    assert.deepEqual(library.GetBodyCarriers().parts, [ { path: "topinner/torso_nude", dependants: [] } ], "set copies too");
    assert.equal(new CjsCharacterLibraryManager().GetBodyCarriers().parts.length, 4, "another library keeps the default");
});

test("the cut mask clips the areas holding the rule's mask whose influence is above the rule's threshold", () =>
{
    // A stand-in for Tr2Effect's two lookups, which return null for a name the effect does not have.
    const Effect = (name, resources, parameters) => ({
        name,
        GetResourceByName: key => resources.includes(key) ? {} : null,
        FindParameterByName: key => key in parameters ? { GetValue: () => parameters[key] } : null
    });
    const effects = [
        Effect("torso", [ "CutMaskMap" ], { CutMaskInfluence: 0.999 }),
        Effect("legs at 0", [ "CutMaskMap" ], { CutMaskInfluence: 0 }),
        Effect("no mask", [], { CutMaskInfluence: 1 }),
        Effect("no influence", [ "CutMaskMap" ], {}),
        Effect("hands", [ "CutMaskMap" ], { CutMaskInfluence: 0.5 })
    ];
    const rule = CjsCharacterLibraryManager.bodyCarrierDefaults().cutMaskClip;
    assert.deepEqual(CjsPaperDollInstance.cutMaskClipEffects(effects, rule).map(effect => effect.name), [ "torso", "hands" ]);
    assert.deepEqual(CjsPaperDollInstance.cutMaskClipEffects(effects, { ...rule, above: 0.6 }).map(effect => effect.name), [ "torso" ], "the threshold is the rule's");
});

test("a carrier is shown unless a worn item fills or occludes it; a garment's body piece only while one names it", () =>
{
    const legs = { part: "bottominner/legs_nude", category: "bottominner", path: "bottominner/legs_nude", garment: false };
    const collar = { part: "dependants/collar/standard", category: "dependants/collar", path: "dependants/collar/standard", garment: true };
    const sleeves = { part: "dependants/sleevesupper/standard", category: "dependants/sleevesupper", path: "dependants/sleevesupper/standard", garment: false };
    const item = (category, occludes = [], dependants = []) => ({ category, occludes, dependants });
    assert.equal(CjsPaperDollInstance.carrierShown(legs, []), true);
    assert.equal(CjsPaperDollInstance.carrierShown(legs, [ item("bottominner") ]), false, "a worn item fills its category");
    assert.equal(CjsPaperDollInstance.carrierShown(legs, [ item("bottomouter", [ "bottominner" ]) ]), false, "occluded by category");
    assert.equal(CjsPaperDollInstance.carrierShown(sleeves, [ item("outer", [ "dependants/sleevesupper" ]) ]), false, "occluded by a parent path");
    assert.equal(CjsPaperDollInstance.carrierShown(sleeves, [ item("outer", [ "dependants/sleeves" ]) ]), true, "a prefix that is not a folder occludes nothing");
    assert.equal(CjsPaperDollInstance.carrierShown(collar, []), false, "a garment's piece needs a worn item that names it");
    assert.equal(CjsPaperDollInstance.carrierShown(collar, [ item("topouter", [], [ "dependants/collar/Standard" ]) ]), true, "named, in any case");
    assert.equal(CjsPaperDollInstance.carrierShown(collar, [ item("topouter", [], [ "dependants/collar/standard" ]), item("outer", [ "dependants/collar" ]) ]), false, "named but occluded");
});

test("carrier meshes: shells by the clip rule, backing cutouts cleared, and which meshes draw", () =>
{
    const carriers = CjsCharacterLibraryManager.bodyCarrierDefaults();
    // A stand-in effect: one parameter object per name, as Tr2Effect.FindParameterByName returns.
    const area = (influence, cutout) =>
    {
        const parameters = {};
        if (influence !== undefined) parameters.CutMaskInfluence = { GetValue: () => influence };
        if (cutout !== undefined) parameters.MaterialCutoutColor = { value: cutout, SetValue(value) { this.value = Float32Array.from(value); } };
        return { effect: { FindParameterByName: name => parameters[name] ?? null } };
    };
    const mesh = (opaque, decal, transparent) => ({ opaqueAreas: opaque, decalAreas: decal, transparentAreas: transparent });
    const shell = mesh([], [], [ area(0.999), area(0.5) ]);
    const partly = mesh([], [], [ area(0.999), area(0) ]);
    const solid = mesh([ area(0.999) ], [], [ area(0.999) ]);
    assert.deepEqual(CjsPaperDollInstance.carrierShells([ shell, partly, solid ], carriers.cutMaskClip), [ shell ]);

    const backing = area(undefined, [ 0.2, 0.3, 0.4, 0.7 ]), clean = area(undefined, [ 0.2, 0.3, 0.4, 0 ]);
    CjsPaperDollInstance.clearBackingCutout([ mesh([ backing ], [ clean ], []) ], carriers.backingCutout);
    const cutout = backing.effect.FindParameterByName("MaterialCutoutColor").value;
    assert.deepEqual(Array.from(cutout, value => Math.round(value * 100) / 100), [ 0.2, 0.3, 0.4, 0 ], "colour kept, weight the rule's");

    const facts = { shown: true, garment: false, replaced: false, shell: false, copyShares: [] };
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn(facts, carriers), true);
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, shown: false }, carriers), false);
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, replaced: true }, carriers), false);
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, shell: true }, carriers), false, "shells do not draw");
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, shell: true }, { ...carriers, shells: { draw: true } }), true, "unless the data says so");
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, copyShares: [ 0.209 ] }, carriers), false, "a bottom's LegsShape copies it");
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, copyShares: [ 0 ] }, carriers), true, "a robe's cloth TorsoShape does not");
    assert.equal(CjsPaperDollInstance.carrierMeshDrawn({ ...facts, garment: true, copyShares: [ 1 ] }, carriers), true, "a garment's piece draws whole");
});
