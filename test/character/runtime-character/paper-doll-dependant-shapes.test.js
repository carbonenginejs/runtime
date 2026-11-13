import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterAppearanceResolver, CjsCharacterLibraryManager, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

const { decodeUtilityShape, resolveUtilityShapes } = CjsCharacterAppearanceResolver;

/** A dependant as the library hands it out (build 3687575): its two lists as authored, and decoded (`decodeModifiers`). */
function Dependant(path, dependantModifiers = [], occludesModifiers = [], variation = "")
{
    const metadataPath = "res:/graphics/character/male/paperdoll/" + path + "/" + (variation ? variation + "/" : "") + "metadata.yaml";
    return { path, metadataPath, dependantModifiers, occludesModifiers, ...CjsCharacterLibraryManager.decodeModifiers({ dependantModifiers, occludesModifiers }, metadataPath, path) };
}

const standard = Dependant("dependants/boottucking/standard", [],
    [ "utilityshapes/pinchbootankleshape", "utilityshapes/pinchboothighshinshape", "utilityshapes/pinchbootkneeshape", "utilityshapes/pinchbootlowshinshape" ]);
const standardV1 = Dependant("dependants/boottucking/standard", [],
    [ "utilityshapes/pantstucklowshape", "utilityshapes/pantstuckshinshape", "utilityshapes/pantstuckmediumshape", "utilityshapes/pantstuckkneeshape", "utilityshapes/pantstuckhighshape", "utilityshapes/pantstuckxhighshape" ], "v1");

/** The trousers (pantscm01: pinch request, `standard` dependant) and boots worn together, resolved; retained weights by path. */
function Fit(dependant, bootRequest)
{
    const shapes = CjsPaperDollInstance.dependantShapes([ dependant ]);
    const requests = [
        { ...decodeUtilityShape("utilityshapes/pinchbootankleshape"), owner: "bottomOuter" },
        ...shapes.requests.map(value => ({ ...value, owner: "bottomOuter" })),
        { ...decodeUtilityShape(bootRequest), owner: "feet" }
    ];
    return Object.fromEntries(resolveUtilityShapes(requests, shapes.occlusions).map(group => [ group.modifierPath, group.retained.map(value => value.weight) ]));
}

test("boot tucking standard suppresses its own garment's boot pinch, keeping the boots' trouser tuck", () =>
{
    // Civire (bootscm01).
    assert.deepEqual(Fit(standard, "utilityshapes/pantstuckshinshape"),
        { "utilityshapes/pinchbootankleshape": [], "utilityshapes/pantstuckshinshape": [ 1 ] });
    // Amarr (bootsam01).
    assert.deepEqual(Fit(standard, "utilityshapes/pantstuckmediumshape"),
        { "utilityshapes/pinchbootankleshape": [], "utilityshapes/pantstuckmediumshape": [ 1 ] });
});

test("boot tucking standard/v1 runs the other way: the boots' trouser tuck goes, the pinch stays", () =>
{
    assert.deepEqual(Fit(standardV1, "utilityshapes/pantstuckshinshape"),
        { "utilityshapes/pinchbootankleshape": [ 1 ], "utilityshapes/pantstuckshinshape": [] });
});

test("boot-tucking requests carry no owner, and occlusions protect none", () =>
{
    const shin = Dependant("dependants/boottucking/shin", [ "utilityshapes/pantstuckshinshape" ]);
    const shapes = CjsPaperDollInstance.dependantShapes([ shin, standard, Dependant("dependants/drape/loose") ]);
    assert.deepEqual(shapes.requests, [ decodeUtilityShape("utilityshapes/pantstuckshinshape") ]);
    assert.deepEqual(shapes.occlusions.map(value => [ value.modifierPath, value.protectedOwner ]),
        standard.occludesModifiers.map(value => [ value, null ]));
});

test("a dependant's other occludes are its owner's: the vanguard v6 mask occludes the chin, lip and nose piercings", () =>
{
    const mask = Dependant("accessories/masks/mask_big_f", [], [ "accessories/chin", "accessories/lips", "accessories/nose" ]);
    assert.deepEqual(CjsPaperDollInstance.dependantShapes([ mask ]), { requests: [], occlusions: [] });
    const waist = Dependant("dependants/waisttucking/standard", [], [ "dependants/tuck", "utilityshapes/pushhemshape#0.25" ]);
    assert.deepEqual(CjsPaperDollInstance.dependantOccludes([ mask, waist, Dependant("dependants/hood/robeam1", [], [ "hair", "accessories/chin" ]) ]),
        [ "accessories/chin", "accessories/lips", "accessories/nose", "dependants/tuck", "hair" ]);
});

test("every dependant's utility shapes apply as authored; a request naming no utility shape throws, with its kind, entry and file", () =>
{
    // Drape: a request for the garment, and weighted occlusions that set their morphs.
    const shapes = CjsPaperDollInstance.dependantShapes([ Dependant("dependants/drape/outer", [ "utilityshapes/pinchhipsshape" ]),
        Dependant("dependants/drape/standard", [], [ "utilityshapes/pushdrapeshape#0.25", "utilityshapes/pushhemshape#0.25" ]) ]);
    assert.deepEqual(shapes.requests.map(value => value.modifierPath), [ "utilityshapes/pinchhipsshape" ]);
    assert.deepEqual(shapes.occlusions.map(value => [ value.targetName, value.weight, value.protectedOwner ]), [ [ "pushdrapeshape", .25, null ], [ "pushhemshape", .25, null ] ]);
    // The library throws while decoding, before the paper doll sees the record.
    const missing = (make, pattern) => assert.throws(() => CjsPaperDollInstance.dependantShapes([ standard, make() ]), pattern);
    missing(() => Dependant("dependants/waisttucking/standard", [], [ "utilityshapes/pushhemshape#0.25#1" ]),
        /^Error: No paper doll rule for the dependants\/waisttucking occludesModifiers entry utilityshapes\/pushhemshape#0\.25#1 in res:\/graphics\/character\/male\/paperdoll\/dependants\/waisttucking\/standard\/metadata\.yaml$/u);
    missing(() => Dependant("dependants/torso/torso_nude", [ "dependants/ragdoll/ragdollhair" ]), /dependants\/torso dependantModifiers entry dependants\/ragdoll\/ragdollhair/u);
});

test("a weighted occlusion sets its morph while worn, over every request; two weights for one morph throw", () =>
{
    const request = (owner, value) => ({ ...decodeUtilityShape(value), owner });
    const setting = (owner, value) => ({ ...CjsCharacterAppearanceResolver.decodeUtilityOcclusion(value), protectedOwner: null, owner });
    const groups = resolveUtilityShapes([ request("topMiddle", "utilityshapes/pinchrighthipsshape"), request("bottomOuter", "utilityshapes/pushhemmidshape###0.35") ],
        [ setting("topMiddle", "utilityshapes/PinchRightHipsShape#2.0"), setting("bottomOuter", "utilityshapes/pushjackethighshape#-0.25") ]);
    assert.deepEqual(groups.map(group => [ group.modifierPath, group.suppressed.length, group.retained.map(value => [ value.targetName, value.weight, value.owner ]) ]), [
        [ "utilityshapes/pinchrighthipsshape", 1, [ [ "PinchRightHipsShape", 2, "topMiddle" ] ] ],
        [ "utilityshapes/pushhemmidshape", 0, [ [ "pushhemmidshape", .35, "bottomOuter" ] ] ],
        // Set though nothing requests it.
        [ "utilityshapes/pushjackethighshape", 0, [ [ "pushjackethighshape", -0.25, "bottomOuter" ] ] ]
    ]);
    assert.throws(() => resolveUtilityShapes([], [ setting("a", "utilityshapes/pinchhipsshape#0.01"), setting("b", "utilityshapes/pinchhipsshape#2.0") ]),
        /^Error: No paper doll rule for utilityshapes\/pinchhipsshape set to 0\.01 and 2 at once$/u);
});

test("a worn item's own utility shapes decode, weighted occlusions included", () =>
{
    const item = (dependantModifiers, occludesModifiers) => ({ metadataPath: "res:/graphics/character/female/paperdoll/topmiddle/x/metadata.yaml", dependantModifiers, occludesModifiers });
    const shapes = CjsPaperDollInstance.itemShapes(item([ "utilityshapes/pushhemmidshape###0.35", "dependants/drape/standard" ], [ "utilityshapes/tucktopshape", "dependants/tuck", "hair" ]));
    assert.deepEqual(shapes.requests, [ decodeUtilityShape("utilityshapes/pushhemmidshape###0.35") ]);
    assert.deepEqual(shapes.occlusions.map(value => value.modifierPath), [ "utilityshapes/tucktopshape" ]);
    assert.deepEqual(CjsPaperDollInstance.itemShapes(item([], [ "utilityshapes/pinchrighthipsshape#2.0" ])).occlusions,
        [ { modifierPath: "utilityshapes/pinchrighthipsshape", targetName: "pinchrighthipsshape", weight: 2 } ]);
    assert.throws(() => CjsPaperDollInstance.itemShapes(item([], [ "utilityshapes/pinchrighthipsshape#2.0#1" ])),
        /^Error: No paper doll rule for the occludesModifiers entry utilityshapes\/pinchrighthipsshape#2\.0#1 in res:\/graphics\/character\/female\/paperdoll\/topmiddle\/x\/metadata\.yaml$/u);
});
