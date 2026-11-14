import test from "node:test";
import assert from "node:assert/strict";
import { CjsCharacterAppearanceResolver, CjsPaperDollDefinition, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

const { decodeUtilityShape, decodeUtilityOcclusion } = CjsCharacterAppearanceResolver;

/** A worn item: its owner, its requests and its occlusions, each decoded and carrying the owner. */
function Item(owner, requests = [], occlusions = [])
{
    return {
        owner,
        requests: requests.map(value => ({ ...decodeUtilityShape(value), owner })),
        occlusions: occlusions.map(value => ({ ...decodeUtilityOcclusion(value), protectedOwner: null, owner }))
    };
}

const none = { suppressed: [], cyclic: [] };

test("a suppressed owner's item is inactive and adds no shapes", () =>
{
    const definition = new CjsPaperDollDefinition();
    const items = [ Item("topOuter", [ "utilityshapes/pinchbootankleshape" ]), Item("feet", [ "utilityshapes/pantstuckshinshape" ]) ];
    const fitting = CjsPaperDollInstance.fitting(definition, items, { suppressed: [ "topOuter" ], cyclic: [ "outer" ] });
    assert.deepEqual(fitting, { weights: { pantstuckshinshape: 1 }, suppressed: [], conflicts: [], inactive: [ "topOuter" ], cyclic: [ "outer" ] });
});

test("an occlusion suppresses a request, and unweighted requests with differing weights are a conflict", () =>
{
    const definition = new CjsPaperDollDefinition();
    const items = [
        Item("bottomOuter", [ "utilityshapes/pinchbootankleshape", "utilityshapes/pantstuckshinshape###0.5" ]),
        Item("feet", [ "utilityshapes/pantstuckshinshape" ], [ "utilityshapes/pinchbootankleshape" ])
    ];
    const fitting = CjsPaperDollInstance.fitting(definition, items, none);
    assert.deepEqual(fitting.weights, {});
    assert.deepEqual(fitting.suppressed, [ "utilityshapes/pinchbootankleshape" ]);
    assert.deepEqual(fitting.conflicts, [ "utilityshapes/pantstuckshinshape" ]);
});

test("a weighted conflict resolves to the paper doll part in the higher layer", () =>
{
    const definition = new CjsPaperDollDefinition();
    assert.ok(definition.GetLayer("outer") > definition.GetLayer("topOuter"), "the jacket layers over the top");
    const items = [ Item("topOuter", [], [ "utilityshapes/pushdrapeshape#0.25" ]), Item("outer", [], [ "utilityshapes/pushdrapeshape#0.0" ]) ];
    assert.deepEqual(CjsPaperDollInstance.fitting(definition, items, none).weights, { pushdrapeshape: 0 });
});

test("a body carrier has no layer: its own setting applies, and a conflict with a part has no rule", () =>
{
    const definition = new CjsPaperDollDefinition();
    assert.deepEqual(CjsPaperDollInstance.fitting(definition, [ Item("carrier", [], [ "utilityshapes/pushdrapeshape#0.25" ]) ], none).weights, { pushdrapeshape: 0.25 });
    const items = [ Item("carrier", [], [ "utilityshapes/pushdrapeshape#0.25" ]), Item("outer", [], [ "utilityshapes/pushdrapeshape#0.0" ]) ];
    assert.throws(() => CjsPaperDollInstance.fitting(definition, items, none), /No paper doll rule for utilityshapes\/pushdrapeshape/);
});
