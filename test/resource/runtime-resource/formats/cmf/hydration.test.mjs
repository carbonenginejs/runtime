import assert from "node:assert/strict";
import test from "node:test";

import { hydrateCmf } from "../../../../../src/resource/formats/cmf/core/utils/hydration.js";

function nodeClass(type)
{
    return class
    {
        SetValues(values, options)
        {
            this.nodeType = type;
            this.setValuesCalls = (this.setValuesCalls ?? 0) + 1;
            this.hydrationOptions = options;
            Object.assign(this, values);
            return this;
        }
    };
}

test("hydrates the complete native CMF graph through one shared implementation", () =>
{
    const classKeys = [
        "Root", "Section", "Metadata", "MetadataEntry", "Mesh", "IndexGroup",
        "VertexElement", "MeshLod", "MeshArea", "LodMeshArea", "BoneBinding",
        "MorphTargets", "MorphTarget", "LodMorphTarget", "AudioOcclusionMesh",
        "Skeleton", "BoneMask", "BoneWeight", "Animation", "AnimationChannel",
        "AnimationCurve"
    ];
    const classes = Object.fromEntries(classKeys.map((key) => [ key, nodeClass(key) ]));
    const graph = {
        version: 1,
        sections: [ { type: "Data" } ],
        metadata: { entries: [ { key: "source", value: "fixture" } ] },
        meshes: [ {
            name: "mesh",
            decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
            lods: [ {
                areas: [ { firstElement: 0, elementCount: 1 } ],
                morphTargets: [ { vertex: { position: [ 0, 0, 0 ] } } ],
                vertex: { position: [ 0, 0, 0 ] },
                indices: [ { name: "area", bytesPerIndex: 2, faces: [ 0, 0, 0 ] } ]
            } ],
            areas: [ { name: "area" } ],
            boneBindings: [ { name: "root" } ],
            morphTargets: {
                decl: [ { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 } ],
                targets: [ { name: "Smile" } ]
            },
            audioOcclusionMesh: { vertices: [], indices: [], bounds: { min: [ 0, 0, 0 ], max: [ 0, 0, 0 ] } },
            vertex: { position: [ 0, 0, 0 ] },
            indices: [ { name: "area", bytesPerIndex: 2, faces: [ 0, 0, 0 ] } ]
        } ],
        skeletons: [ {
            bones: [ "root" ],
            boneMasks: [ { name: "mask", weights: [ { index: 0, weight: 1 } ] } ]
        } ],
        animations: [ {
            channels: [ { target: "root", targetType: "BonePosition", curveIndex: 0 } ],
            curves: [ { valueDimension: 3, knotCount: 1 } ]
        } ]
    };

    const result = hydrateCmf(graph, classes, { source: "test.cmf" });

    assert.equal(result.nodeType, "Root");
    assert.equal(result.sections[0].nodeType, "Section");
    assert.equal(result.metadata.entries[0].nodeType, "MetadataEntry");
    assert.equal(result.meshes[0].decl[0].nodeType, "VertexElement");
    assert.equal(result.meshes[0].lods[0].areas[0].nodeType, "LodMeshArea");
    assert.equal(result.meshes[0].lods[0].morphTargets[0].nodeType, "LodMorphTarget");
    assert.equal(result.meshes[0].indices[0].nodeType, "IndexGroup");
    assert.equal(result.meshes[0].indices, result.meshes[0].lods[0].indices);
    assert.equal(result.meshes[0].vertex, result.meshes[0].lods[0].vertex);
    assert.equal(result.meshes[0].morphTargets.targets[0].nodeType, "MorphTarget");
    assert.equal(result.skeletons[0].boneMasks[0].weights[0].nodeType, "BoneWeight");
    assert.equal(result.animations[0].channels[0].nodeType, "AnimationChannel");
    assert.equal(result.animations[0].curves[0].nodeType, "AnimationCurve");

    for (const instance of [
        result,
        result.sections[0],
        result.meshes[0],
        result.meshes[0].indices[0],
        result.skeletons[0].boneMasks[0].weights[0],
        result.animations[0].curves[0]
    ])
    {
        assert.equal(instance.setValuesCalls, 1);
        assert.deepEqual(instance.hydrationOptions, {
            source: "test.cmf",
            skipUpdate: true,
            skipEvents: true
        });
    }
});

test("preserves the caller-specific CMF hydration error label", () =>
{
    assert.throws(
        () => hydrateCmf(
            { meshes: [], skeletons: [], animations: [] },
            { Root: class {} },
            {},
            "CjsFixtureFormat CMF"
        ),
        /CjsFixtureFormat CMF class population requires classes to implement SetValues/u
    );
});
