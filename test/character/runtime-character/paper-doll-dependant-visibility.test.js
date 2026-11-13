import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

// A top's drape and a bottom's waist tuck as their female metadata states them (build 3687575).
const drape = { path: "dependants/drape/standard" }, sleeves = { path: "dependants/sleevesupper/tshirt_02" };
// pantsmilf01 resolves to its own occludes plus its waist tuck's (`dependantOccludes`); armorsuitcf01 states the drape itself.
const pantsResolved = [ "bottominner", "dependants/drape" ], pantsOwn = [ "bottominner" ], armorOwn = [ "dependants/drape" ];

test("a dependant another worn garment occludes adds no shapes", () =>
{
    assert.deepEqual(CjsPaperDollInstance.shownDependants([ drape, sleeves ], [ pantsResolved ]), [ sleeves ]);
    assert.deepEqual(CjsPaperDollInstance.shownDependants([ drape, sleeves ], [ pantsOwn ]), [ drape, sleeves ]);
    assert.deepEqual(CjsPaperDollInstance.shownDependants([ drape ], []), [ drape ]);
});

test("only a garment's own occlusion removes a dependant's mesh", () =>
{
    // The waist tuck's occlusion reaches the pants' resolved occludes, not their own: the drape mesh stays.
    assert.equal(CjsPaperDollInstance.dependantMeshShown(drape.path, [ pantsOwn ]), true);
    assert.equal(CjsPaperDollInstance.dependantMeshShown(drape.path, [ pantsOwn, armorOwn ]), false);
});
