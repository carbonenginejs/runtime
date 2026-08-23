import { test } from "node:test";
import assert from "node:assert/strict";

import { emitJson } from "../../../../../src/resource/formats/gr2/core/json.js";
import { buildCmfFromShared } from "../../../../../src/resource/formats/gr2/core/targets.js";

function typed(rows, members)
{
    Object.defineProperty(rows, "__type", { value: members, configurable: true });
    return rows;
}

function real3(name)
{
    return { name, arrayWidth: 3, type: 10 };
}

function reflectedMesh(annotationSets)
{
    const vertices = typed([
        { Position: [ 0, 0, 0 ], Normal: [ 0, 0, 1 ] },
        { Position: [ 1, 0, 0 ], Normal: [ 0, 0, 1 ] },
        { Position: [ 0, 1, 0 ], Normal: [ 0, 0, 1 ] }
    ], [ real3("Position"), real3("Normal") ]);

    return {
        Name: "Face",
        BoneBindings: [],
        MorphTargets: [],
        PrimaryVertexData: { Vertices: vertices, VertexAnnotationSets: annotationSets },
        PrimaryTopology: { Indices: [], Groups: [] }
    };
}

function emitMesh(annotationSets)
{
    return emitJson({
        FromFileName: "face.gr2",
        Meshes: [ reflectedMesh(annotationSets) ],
        Models: [],
        Animations: []
    }, 7).meshes[0];
}

test("vertex annotation sets emit compact sparse delta targets", () =>
{
    const annotations = typed([
        { Position: [ 0, 0, 2 ], Normal: [ 0, 0.5, 0 ] },
        { Position: [ 1, 0, 0 ], Normal: [ 0.25, 0, 0 ] }
    ], [ real3("Position"), real3("Normal") ]);

    const mesh = emitMesh([
        {
            Name: "BothEyePatchShape9",
            VertexAnnotations: annotations,
            IndicesMapFromVertexToAnnotation: 0,
            VertexAnnotationIndices: [ { Int32: 2 }, { Int32: 0 } ]
        },
        {
            Name: "EmptyShape9",
            VertexAnnotations: typed([], [ real3("Position") ]),
            IndicesMapFromVertexToAnnotation: 0,
            VertexAnnotationIndices: []
        }
    ]);

    assert.equal(mesh.morphTargets.length, 1);
    assert.deepEqual(mesh.morphTargets[0], {
        name: "BothEyePatchShape9",
        dataIsDeltas: true,
        vertex: {
            position: [ 0, 0, 2, 1, 0, 0 ],
            blendIndice: [],
            tangent: [],
            normal: [ 0, 0.5, 0, 0.25, 0, 0 ],
            texcoord0: [],
            texcoord1: [],
            binormal: [],
            blendWeight: []
        },
        vertexIndices: [ 2, 0 ]
    });

    const cmf = buildCmfFromShared({ meshes: [ mesh ] });
    assert.deepEqual(cmf.meshes[0].lods[0].morphTargets[0].vertex.position, [
        1, 0, 0,
        0, 0, 0,
        0, 0, 2
    ]);
    assert.deepEqual(cmf.meshes[0].lods[0].morphTargets[0].vertex.normal, [
        0.25, 0, 0,
        0, 0, 0,
        0, 0.5, 0
    ]);
    assert.equal(cmf.meshes[0].morphTargets.targets[0].maxDisplacement, 2);
});

test("vertex-to-annotation maps are canonicalized to sparse vertex indices", () =>
{
    const annotations = typed([
        { Position: [ 1, 0, 0 ] },
        { Position: [ 2, 0, 0 ] }
    ], [ real3("Position") ]);

    const mesh = emitMesh([ {
        Name: "MappedShape",
        VertexAnnotations: annotations,
        IndicesMapFromVertexToAnnotation: 1,
        VertexAnnotationIndices: [ { Int32: 1 }, { Int32: -1 }, { Int32: 0 } ]
    } ]);

    assert.deepEqual(mesh.morphTargets[0].vertexIndices, [ 0, 2 ]);
    assert.deepEqual(mesh.morphTargets[0].vertex.position, [ 2, 0, 0, 1, 0, 0 ]);
});

test("CMF morph targets canonicalize absolute values and union target channels", () =>
{
    const cmf = buildCmfFromShared({ meshes: [ {
        name: "Mixed",
        vertex: {
            position: [ 0, 0, 0, 1, 0, 0 ],
            normal: [ 0, 0, 1, 0, 0, 1 ]
        },
        indices: [],
        morphTargets: [
            {
                name: "Absolute",
                dataIsDeltas: false,
                vertex: { position: [ 0, 0, 0, 1, 2, 0 ] }
            },
            {
                name: "NormalOnly",
                dataIsDeltas: true,
                vertex: { normal: [ 0, 1, 0, 0, 0.5, 0 ] }
            }
        ]
    } ] });

    const mesh = cmf.meshes[0];
    assert.deepEqual(mesh.morphTargets.decl.map(({ usage, elementCount }) => ({ usage, elementCount })), [
        { usage: "Position", elementCount: 3 },
        { usage: "Normal", elementCount: 3 }
    ]);
    assert.deepEqual(mesh.lods[0].morphTargets[0].vertex, {
        position: [ 0, 0, 0, 0, 2, 0 ],
        normal: [ 0, 0, 0, 0, 0, 0 ]
    });
    assert.deepEqual(mesh.lods[0].morphTargets[1].vertex, {
        position: [ 0, 0, 0, 0, 0, 0 ],
        normal: [ 0, 1, 0, 0, 0.5, 0 ]
    });
    assert.equal(mesh.lods[0].morphTargets[0].vb.size, 48);
    assert.equal(mesh.morphTargets.targets[0].maxDisplacement, 2);
});

test("CMF target vertex counts do not require a position channel", () =>
{
    const cmf = buildCmfFromShared({ meshes: [ {
        name: "Normals",
        vertex: { normal: [ 0, 0, 1, 0, 0, 1 ] },
        indices: [],
        morphTargets: [ {
            name: "NormalOnly",
            dataIsDeltas: true,
            vertex: { normal: [ 0, 1, 0, 0, 0.5, 0 ] }
        } ]
    } ] });

    const target = cmf.meshes[0].lods[0].morphTargets[0];
    assert.equal(target.vb.stride, 12);
    assert.equal(target.vb.size, 24);
    assert.deepEqual(target.vertex.normal, [ 0, 1, 0, 0, 0.5, 0 ]);
});

test("three-component tangent targets retain a three-component declaration", () =>
{
    const cmf = buildCmfFromShared({ meshes: [ {
        name: "Tangents",
        vertex: { position: [ 0, 0, 0, 1, 0, 0 ] },
        indices: [],
        morphTargets: [ {
            name: "TangentOnly",
            dataIsDeltas: true,
            vertex: { tangent: [ 1, 0, 0, 0, 1, 0 ] }
        } ]
    } ] });

    assert.deepEqual(cmf.meshes[0].morphTargets.decl.map(({ usage, elementCount }) => ({ usage, elementCount })), [
        { usage: "Tangent", elementCount: 3 }
    ]);
    assert.equal(cmf.meshes[0].lods[0].morphTargets[0].vb.stride, 12);
});
