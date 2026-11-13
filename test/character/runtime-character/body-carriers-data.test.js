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
