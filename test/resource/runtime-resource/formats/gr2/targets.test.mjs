import assert from "node:assert/strict";
import test from "node:test";

import { reassembleGr2Lods } from "../../../../../src/resource/formats/gr2/core/targets.js";

test("reassembles exact Granny LOD siblings and remaps model bindings", () =>
{
    const base = { name: "Hull", vertex: { position: [ 0, 0, 0 ] } };
    const low = { name: "Hull LOD 80", vertex: { position: [ 1, 0, 0 ] } };
    const middle = { name: "Hull LOD 160", vertex: { position: [ 2, 0, 0 ] } };
    const result = reassembleGr2Lods({
        meshes: [ low, { name: "Other" }, base, middle ],
        models: [ { meshBindings: [ 2, 0, 3, 1 ] } ]
    });

    assert.deepEqual(result.meshes.map(mesh => mesh.name), [ "Other", "Hull" ]);
    assert.deepEqual(result.meshes[1].lods.map(lod => [ lod.name, lod.threshold ]), [
        [ "Hull", 0xffffffff ],
        [ "Hull LOD 160", 160 ],
        [ "Hull LOD 80", 80 ]
    ]);
    assert.deepEqual(result.models[0].meshBindings, [ 1, 0 ]);
});

test("does not infer LODs without one unique exact unsuffixed base", () =>
{
    const noBase = { name: "Loose LOD 20" };
    const duplicateA = { name: "Hull" };
    const duplicateB = { name: "Hull" };
    const sibling = { name: "Hull LOD 20" };
    const result = reassembleGr2Lods({ meshes: [ noBase, duplicateA, duplicateB, sibling ] });

    assert.deepEqual(result.meshes, [ noBase, duplicateA, duplicateB, sibling ]);
});

test("does not discard ambiguous duplicate LOD thresholds", () =>
{
    const meshes = [ { name: "Hull" }, { name: "Hull LOD 20" }, { name: "Hull LOD 20" } ];
    assert.deepEqual(reassembleGr2Lods({ meshes }).meshes, meshes);
});

test("does not infer LODs from lowdetail resource-style names", () =>
{
    const mesh = { name: "Hull_lowdetail" };
    assert.deepEqual(reassembleGr2Lods({ meshes: [ mesh ] }).meshes, [ mesh ]);
});
