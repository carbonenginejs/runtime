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
