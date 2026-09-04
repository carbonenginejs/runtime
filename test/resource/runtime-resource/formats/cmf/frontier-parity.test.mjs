import assert from "node:assert/strict";
import test from "node:test";

import {
    compareFrontierCmfToEveGr2,
    countGr2RigidBindingMeshes,
    countGr2VectorTracks,
    isFrontierCmfGr2CameraPair,
    parseFrontierCmfGr2Options,
    sampleFrontierCmfEveGr2Pairs,
    selectFrontierCmfEveGr2Pairs,
    summarizeCmfGraph
} from "../../../../../scripts/resource/frontierCmfGr2Parity.js";

function mesh(name, positions, faces, options = {})
{
    const tangent = options.tangent ?? "packed";
    const decl = tangent === "packed"
        ? [ { usage: "PackedTangent" } ]
        : tangent === "unpacked"
            ? [ { usage: "Normal" }, { usage: "Tangent" }, { usage: "Binormal" } ]
            : tangent === "normal-only" ? [ { usage: "Normal" } ] : [];
    return {
        name,
        topology: "TriangleList",
        decl,
        lods: [ {
            threshold: options.threshold ?? 0xffffffff,
            vb: { size: positions.length / 3 * 12, stride: 12 },
            ib: { size: faces.length * 2, stride: 2 },
            vertex: { position: positions },
            indices: [ { name: "area_0", faces } ],
            areas: [ { elementCount: faces.length / 3 } ],
            morphTargets: []
        } ],
        areas: [ { name: "area_0" } ],
        boneBindings: [],
        morphTargets: { targets: [] }
    };
}

const triangle = [ 0, 0, 0, 1, 0, 0, 0, 1, 0 ];

test("pairing uses only exact CMF-to-GR2 logical stems and identifies cameras", () =>
{
    const pairs = selectFrontierCmfEveGr2Pairs([
        "res:/same/mesh.cmf",
        "res:/frontier-only.cmf",
        "res:/same/unrelated.gr2",
        "res:/animation/cameraanimation/orbit.cmf"
    ], [ "RES:/SAME/MESH.GR2", "res:/same/unrelated.gr2", "res:/animation/cameraanimation/orbit.gr2" ]);
    assert.equal(pairs.length, 2);
    assert.equal(isFrontierCmfGr2CameraPair(pairs[0]), true);
    assert.equal(isFrontierCmfGr2CameraPair(pairs[1]), false);
});

test("options remain build-pinned and limited sampling spans cohorts", () =>
{
    const options = parseFrontierCmfGr2Options([]);
    assert.equal(options.frontierBuild, "3474408");
    assert.equal(options.eveBuild, "3487903");
    assert.throws(() => parseFrontierCmfGr2Options([ "--limit", "-1" ]), /non-negative/u);
    const pairs = [
        { frontierPath: "res:/animation/a.cmf" },
        { frontierPath: "res:/animation/b.cmf" },
        { frontierPath: "res:/graphics/generic/a.cmf" },
        { frontierPath: "res:/dx9/model/turret/a.cmf" }
    ];
    assert.deepEqual(sampleFrontierCmfEveGr2Pairs(pairs, 3).map(value => value.frontierPath), [
        "res:/animation/a.cmf",
        "res:/graphics/generic/a.cmf",
        "res:/dx9/model/turret/a.cmf"
    ]);
});

test("proved LOD names reassemble and vertex remapping preserves payload identity", () =>
{
    const first = mesh("hull", triangle, [ 0, 1, 2 ]);
    const frontier = summarizeCmfGraph({
        meshes: [ {
            ...first,
            lods: [ first.lods[0], { ...first.lods[0], threshold: 160 } ]
        } ],
        skeletons: [], animations: []
    });
    const remapped = [ ...triangle, 1, 1, 0 ];
    const eve = summarizeCmfGraph({
        meshes: [ mesh("hull", remapped, [ 0, 1, 2 ]), mesh("hull LOD 160", remapped, [ 0, 1, 2 ]) ],
        skeletons: [], animations: []
    });
    const result = compareFrontierCmfToEveGr2(frontier, eve);
    assert.equal(result.classification, "normalized-match");
    assert.deepEqual(result.observations, [ "vertex-remap", "lod-container-reassembly" ]);
});

test("canonical triangle fingerprints allow cyclic starts but preserve winding", () =>
{
    const base = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 0, 1, 2 ]) ], skeletons: [], animations: [] });
    const cyclic = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 1, 2, 0 ]) ], skeletons: [], animations: [] });
    const reversed = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 0, 2, 1 ]) ], skeletons: [], animations: [] });
    assert.equal(compareFrontierCmfToEveGr2(base, cyclic).classification, "normalized-match");
    assert.equal(compareFrontierCmfToEveGr2(base, reversed).classification, "different");
    assert.deepEqual(compareFrontierCmfToEveGr2(base, reversed).differences, [ "geometry-payload" ]);
});

test("only packed-to-split tangent changes are observations", () =>
{
    const packed = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 0, 1, 2 ]) ], skeletons: [], animations: [] });
    const unpacked = summarizeCmfGraph({
        meshes: [ mesh("hull", triangle, [ 0, 1, 2 ], { tangent: "unpacked" }) ], skeletons: [], animations: []
    });
    const normalOnly = summarizeCmfGraph({
        meshes: [ mesh("hull", triangle, [ 0, 1, 2 ], { tangent: "normal-only" }) ], skeletons: [], animations: []
    });
    assert.deepEqual(compareFrontierCmfToEveGr2(packed, unpacked).observations, [ "packed-split-tangent-layout" ]);
    assert.equal(compareFrontierCmfToEveGr2(packed, normalOnly).differences.includes("tangent-frame"), true);
});

test("same counts without mesh identity are different", () =>
{
    const left = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 0, 1, 2 ]) ], skeletons: [], animations: [] });
    const right = summarizeCmfGraph({ meshes: [ mesh("other", triangle, [ 0, 1, 2 ]) ], skeletons: [], animations: [] });
    const result = compareFrontierCmfToEveGr2(left, right);
    assert.equal(result.classification, "different");
    assert.equal(result.differences.includes("geometry-groups"), true);
});

test("skeleton comparison treats opposite quaternion signs as the same rotation", () =>
{
    const graph = rotation => summarizeCmfGraph({
        meshes: [],
        skeletons: [ {
            name: "rig",
            bones: [ "root" ],
            parents: [ -1 ],
            restTransforms: [ {
                position: [ 0, 0, 0 ],
                rotation,
                scale: [ 1, 1, 1 ]
            } ]
        } ],
        animations: []
    });
    const result = compareFrontierCmfToEveGr2(
        graph([ 0.5, -0.5, 0.5, -0.5 ]),
        graph([ -0.5, 0.5, -0.5, 0.5 ])
    );
    assert.equal(result.classification, "normalized-match");
});

test("GR2-specific metadata counts remain explicit observations", () =>
{
    const graph = summarizeCmfGraph({ meshes: [ mesh("hull", triangle, [ 0, 1, 2 ]) ], skeletons: [], animations: [] });
    const result = compareFrontierCmfToEveGr2(graph, graph, {
        gr2VectorTracks: 13,
        gr2RigidBindingMeshes: 2
    });
    assert.equal(result.classification, "normalized-match");
    assert.deepEqual(result.observations, [ "implicit-rigid-bindings", "gr2-vector-metadata" ]);
});

test("raw GR2 counters distinguish vectors and rigid palettes", () =>
{
    const vertices = [];
    Object.defineProperty(vertices, "__type", { value: [ { name: "Position" } ] });
    assert.equal(countGr2VectorTracks({ fileInfo: { Animations: [ {
        TrackGroups: [ { VectorTracks: [ {}, {} ] }, { VectorTracks: [ {} ] } ]
    } ] } }), 3);
    assert.equal(countGr2RigidBindingMeshes({ fileInfo: { Meshes: [ {
        BoneBindings: [ {} ], PrimaryVertexData: { Vertices: vertices }
    } ] } }), 1);
});
