import { CjsSchema } from "../../../npm/dist/blue/schema/index.js";
import test from "node:test";
import assert from "node:assert/strict";
import { CjsPaperDollDefinition, CjsPaperDollInstance } from "../../../npm/dist/character/index.js";

/** The smallest foundation the archetype accepts, with the generic head at its content path. */
function Foundation()
{
    const maps = Object.fromEntries([ "head", "body" ].flatMap(region =>
        [ "DiffuseMap", "NormalMap", "SpecularMap" ].map(channel => [ region + "." + channel, `res:/${region}_${channel}.png` ])));
    return {
        id: "archetype", label: "Archetype", head: "head", genericHead: "head/head_generic", body: "body", skeleton: "res:/skeleton.gr2",
        parts: [
            { id: "archetype", textures: maps },
            { id: "head", dependencies: [ { part: "archetype", weight: 1 } ] },
            { id: "head/head_generic", model: "res:/generic.black", textures: { "head.DiffuseMap": "d", "head.NormalMap": "n", "head.SpecularMap": "s", "head.CutMaskMap": "m" } },
            { id: "body", model: "res:/body.black" }
        ]
    };
}

test("the head capture says whether a worn item occludes the generic head, and a body garment re-captures it", () =>
{
    const doll = new CjsPaperDollDefinition();
    doll.archetype.Configure([ Foundation() ], { option: "archetype", strength: 1 });
    doll.outer.Configure([ { id: "robe", path: "outer/vanguardf01", occludes: [ "head", "hair" ], colorAreas: [] } ]);
    const heads = [];
    const noop = () => {};
    const instance = new CjsPaperDollInstance({ error: message => assert.fail(message), foundation: noop, skin: noop, surface: noop, eyes: noop,
        head: state => heads.push(state.headOccluded), body: noop });
    instance.Update(doll);
    assert.deepEqual(heads, [ false ]);

    // The robe is not a head part: selecting it must still re-capture the head, whose occlusion it changes.
    CjsSchema.setValues(doll.outer, { option: "robe" });
    instance.Update(doll);
    assert.deepEqual(heads, [ false, true ]);

    CjsSchema.setValues(doll.outer, { enabled: false });
    instance.Update(doll);
    assert.deepEqual(heads, [ false, true, false ]);
});
