import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterAppearanceResolver } from "../../../npm/dist/character/index.js";

test("decodes utility shapes and applies occlusion and weight conflicts without a library", () =>
{
    const decode = CjsCharacterAppearanceResolver.decodeUtilityShape;
    assert.deepEqual(decode("utilityshapes/LooseChestShape"),
        { modifierPath: "utilityshapes/loosechestshape", targetName: "LooseChestShape", weight: 1, explicitWeight: false });
    assert.equal(decode("utilityshapes/pinchtuckshape###0.30").weight, 0.3);
    assert.equal(decode("utilityshapes/pinchtuckshape###0.30", 0.5).weight, 0.5);
    // outer/jacketmilf01 authors a trailing `#` with no weight: the unweighted request.
    assert.deepEqual(decode("utilityshapes/pinchrightouterlowerhipsshape#"),
        { modifierPath: "utilityshapes/pinchrightouterlowerhipsshape", targetName: "pinchrightouterlowerhipsshape", weight: 1, explicitWeight: false });
    assert.equal(decode("utilityshapes/pinch#shape"), null);
    assert.equal(decode("utilityshapes/pinchtuckshape###x"), null);
    assert.equal(decode("dependants/drape/standard"), null);
    assert.deepEqual(CjsCharacterAppearanceResolver.decodeUtilityOcclusion("utilityshapes/TuckTopShape"), { modifierPath: "utilityshapes/tucktopshape", targetName: "TuckTopShape", weight: null });
    assert.deepEqual(CjsCharacterAppearanceResolver.decodeUtilityOcclusion("utilityshapes/pushJacketHighShape#-0.25"), { modifierPath: "utilityshapes/pushjackethighshape", targetName: "pushJacketHighShape", weight: -0.25 });
    assert.equal(CjsCharacterAppearanceResolver.decodeUtilityOcclusion("utilityshapes/tucktopshape#wat"), null);
    assert.equal(CjsCharacterAppearanceResolver.decodeUtilityOcclusion("utilityshapes/tucktopshape###0.5"), null);

    const request = (owner, value) => ({ ...decode(value), owner });
    const groups = CjsCharacterAppearanceResolver.resolveUtilityShapes([
        request("top", "utilityshapes/pinchtuckshape"),
        request("jacket", "utilityshapes/pinchclevageshape###0.3"),
        request("jacket", "utilityshapes/pinchclevageshape###0.85"),
        request("top", "utilityshapes/loosechestshape")
    ], [ { modifierPath: "utilityshapes/pinchtuckshape", protectedOwner: null } ]);
    assert.deepEqual(groups.map(value => [ value.modifierPath, value.suppressed.length, value.retained.length, value.conflict ]), [
        [ "utilityshapes/pinchtuckshape", 1, 0, false ],
        [ "utilityshapes/pinchclevageshape", 0, 2, true ],
        [ "utilityshapes/loosechestshape", 0, 1, false ]
    ]);
    const protectedGroups = CjsCharacterAppearanceResolver.resolveUtilityShapes([ request("top", "utilityshapes/pinchtuckshape") ],
        [ { modifierPath: "utilityshapes/pinchtuckshape", protectedOwner: "top" } ]);
    assert.equal(protectedGroups[0].retained.length, 1);
});

test("suppression runs from the roots and leaves cycles active", () =>
{
    const edge = owner => ({ owner, rules: new Set([ "test" ]) });
    const chain = CjsCharacterAppearanceResolver.resolveSuppressions([ "A", "B", "C" ],
        new Map([ [ "B", [ edge("A") ] ], [ "C", [ edge("B") ] ] ]));
    assert.deepEqual(chain.cyclic, []);
    assert.deepEqual([ ...chain.applied.keys() ], [ "B" ]);

    const cycle = CjsCharacterAppearanceResolver.resolveSuppressions([ "A", "B", "C" ],
        new Map([ [ "A", [ edge("B") ] ], [ "B", [ edge("A") ] ], [ "C", [ edge("A") ] ] ]));
    assert.deepEqual(cycle.cyclic, [ "A", "B" ]);
    assert.deepEqual([ ...cycle.applied.keys() ], [ "C" ]);
});
