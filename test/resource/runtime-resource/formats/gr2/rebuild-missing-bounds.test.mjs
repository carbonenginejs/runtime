import { test } from "node:test";
import assert from "node:assert/strict";

import { emitJson } from "../../../../../src/resource/formats/gr2/core/json.js";
import { normalizeValues, DEFAULT_VALUES } from "../../../../../src/resource/formats/gr2/core/helpers.js";

/**
 * Granny files carry no mesh-level AABB, and the shared projection emitted
 * zeros for every mesh - harmless while nothing consumed bounds, and a
 * silent kill switch the day ccpwgl's logical LOD made bounds load-bearing
 * (zero bounds measure zero projected pixels, so every gr2-sourced mesh was
 * size-culled). `rebuildMissingBounds` opts into computing real bounds from
 * the position channel, per index group and for the mesh, the way the old
 * ccpwgl gr2_json path always did.
 */

function typed(rows, members)
{
    Object.defineProperty(rows, "__type", { value: members, configurable: true });
    return rows;
}

function reflectedMesh()
{
    const vertices = typed([
        { Position: [ -2, 0, 1 ] },
        { Position: [ 4, 5, -3 ] },
        { Position: [ 0, 1, 7 ] },
        { Position: [ 10, -6, 2 ] },
        { Position: [ 11, -5, 3 ] },
        { Position: [ 12, -4, 4 ] }
    ], [ { name: "Position", arrayWidth: 3, type: 10 } ]);

    return {
        Name: "Bar",
        BoneBindings: [],
        MorphTargets: [],
        PrimaryVertexData: { Vertices: vertices, VertexAnnotationSets: [] },
        PrimaryTopology: {
            Indices: [ 0, 1, 2, 3, 4, 5 ],
            Groups: [
                { MaterialIndex: 0, TriFirst: 0, TriCount: 1 },
                { MaterialIndex: 1, TriFirst: 1, TriCount: 1 }
            ]
        }
    };
}

function emit(options)
{
    return emitJson({
        FromFileName: "bar.gr2",
        Meshes: [ reflectedMesh() ],
        Models: [],
        Animations: []
    }, 7, options).meshes[0];
}

test("bounds stay zeros without the option", () =>
{
    const mesh = emit({});
    assert.deepEqual(mesh.minBounds, [ 0, 0, 0 ]);
    assert.deepEqual(mesh.maxBounds, [ 0, 0, 0 ]);
    assert.equal("minBounds" in mesh.indices[0], false);
});

test("rebuildMissingBounds computes group and mesh bounds from positions", () =>
{
    const mesh = emit({ rebuildMissingBounds: true });

    // Group 0 references vertices 0-2, group 1 references vertices 3-5.
    assert.deepEqual(mesh.indices[0].minBounds, [ -2, 0, -3 ]);
    assert.deepEqual(mesh.indices[0].maxBounds, [ 4, 5, 7 ]);
    assert.deepEqual(mesh.indices[1].minBounds, [ 10, -6, 2 ]);
    assert.deepEqual(mesh.indices[1].maxBounds, [ 12, -4, 4 ]);

    // Mesh bounds are the union of the groups.
    assert.deepEqual(mesh.minBounds, [ -2, -6, -3 ]);
    assert.deepEqual(mesh.maxBounds, [ 12, 5, 7 ]);
});

test("the option is a registered format value defaulting to false", () =>
{
    assert.equal(DEFAULT_VALUES.rebuildMissingBounds, false);
    assert.equal(normalizeValues(DEFAULT_VALUES, { rebuildMissingBounds: true }).rebuildMissingBounds, true);
    assert.throws(() => normalizeValues(DEFAULT_VALUES, { rebuildMissingBounds: "yes" }), /must be true or false/u);
});
