import assert from "node:assert/strict";
import test from "node:test";
import CjsCmfFormat from "../../../../../src/resource/formats/cmf/index.js";
import { buildGr2Animations, buildGr2Models } from "../../../../../src/resource/formats/cmf/core/gr2Compat.js";

function floatBytes(values)
{
    return Array.from(new Uint8Array(new Float32Array(values).buffer));
}

function makeCmf()
{
    return {
        version: 1,
        meshes: [ {
            name: "body",
            skeleton: 0,
            boneBindings: [ { name: "root", bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] } } ],
            morphTargets: { targets: [] },
            bounds: { min: [ 0, 0, 0 ], max: [ 1, 1, 1 ] },
            vertex: {},
            indices: [],
            lods: []
        } ],
        skeletons: [ {
            name: "Rig",
            bones: [ "root", "child" ],
            parents: [ 0xffffffff, 0 ],
            restTransforms: [
                { position: [ 0, 0, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] },
                { position: [ 0, 2, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 2, 3, 4 ] }
            ]
        } ],
        animations: [ {
            name: "move",
            duration: 1,
            channels: [
                { target: "child", targetType: "BonePosition", curveIndex: 0 },
                { target: "child", targetType: "BoneScale", curveIndex: 1 },
                { target: "Smile", targetType: "MorphTarget", curveIndex: 2 }
            ],
            curves: [
                {
                    valueDimension: 3,
                    interpolation: "Linear",
                    knotType: "Float32",
                    valueType: "Float32",
                    knotCount: 2,
                    knots: floatBytes([ 0, 1 ]),
                    values: floatBytes([ 0, 2, 0, 1, 3, 0 ])
                },
                {
                    valueDimension: 3,
                    interpolation: "Step",
                    knotType: "Float32",
                    valueType: "Float32",
                    knotCount: 1,
                    knots: floatBytes([ 0 ]),
                    values: floatBytes([ 2, 3, 4 ])
                },
                {
                    valueDimension: 1,
                    interpolation: "Linear",
                    knotType: "Float32",
                    valueType: "Float32",
                    knotCount: 2,
                    knots: floatBytes([ 0, 1 ]),
                    values: floatBytes([ 0, 1 ])
                }
            ]
        } ]
    };
}

test("builds GR2 models with CMF rest transforms and mesh bindings", () =>
{
    const models = buildGr2Models(makeCmf());
    assert.equal(models.length, 1);
    assert.equal(models[0].name, "Rig");
    assert.deepEqual(models[0].meshBindings, [ 0 ]);
    assert.deepEqual(models[0].skeleton.bones[1], {
        name: "child",
        parentIndex: 0,
        transformFlags: 7,
        position: [ 0, 2, 0 ],
        orientation: [ 0, 0, 0, 1 ],
        scaleShear: [ 2, 0, 0, 0, 3, 0, 0, 0, 4 ]
    });
});

test("builds GR2 transform and vector tracks from CMF animation curves", () =>
{
    const animation = buildGr2Animations(makeCmf())[0];
    assert.equal(animation.trackGroups.length, 2);
    const boneGroup = animation.trackGroups[0];
    assert.equal(boneGroup.name, "Rig");
    assert.equal(boneGroup.transformTracks[0].name, "child");
    assert.deepEqual(boneGroup.transformTracks[0].position, {
        format: 1,
        degree: 1,
        knots: [ 0, 1 ],
        controls: [ 0, 2, 0, 1, 3, 0 ]
    });
    assert.deepEqual(boneGroup.transformTracks[0].scaleShear.controls, [
        2, 0, 0, 0, 3, 0, 0, 0, 4
    ]);

    const morphGroup = animation.trackGroups[1];
    assert.equal(morphGroup.name, "root");
    assert.deepEqual(morphGroup.vectorTracks[0], {
        name: "Smile",
        dimension: 1,
        valueCurve: { format: 1, degree: 1, knots: [ 0, 1 ], controls: [ 0, 1 ] }
    });
});

test("normalizes and hemisphere-stabilizes CMF rotation curves for GR2", () =>
{
    const cmf = makeCmf();
    cmf.animations[0].channels = [ {
        target: "child",
        targetType: "BoneRotation",
        curveIndex: 0
    } ];
    cmf.animations[0].curves = [ {
        valueDimension: 4,
        interpolation: "Linear",
        knotType: "Float32",
        valueType: "Float32",
        knotCount: 2,
        knots: floatBytes([ 0, 1 ]),
        values: floatBytes([ 0, 0, 0, 2, 0, 0, 0, -3 ])
    } ];

    const controls = buildGr2Animations(cmf)[0].trackGroups[0].transformTracks[0].orientation.controls;
    assert.deepEqual(controls, [ 0, 0, 0, 1, 0, 0, 0, 1 ]);
});

test("rejects malformed CMF animation channels at the GR2 boundary", () =>
{
    const cmf = makeCmf();
    cmf.animations[0].channels[0].targetType = "Unknown";
    assert.throws(() => buildGr2Animations(cmf), /unsupported animation target type/u);

    cmf.animations[0].channels[0].targetType = "BonePosition";
    cmf.animations[0].channels[0].curveIndex = 99;
    assert.throws(() => buildGr2Animations(cmf), /references a missing curve/u);
});

test("hydrates the complete CMF to GR2 compatibility graph", () =>
{
    class Node
    {
        SetValues(values)
        {
            Object.assign(this, values);
            return this;
        }
    }
    const classes = Object.fromEntries([
        "Root", "Mesh", "BoneBinding", "IndexGroup", "MorphTarget", "Model", "Skeleton", "Bone",
        "Animation", "TrackGroup", "TransformTrack", "VectorTrack", "Curve"
    ].map((name) => [ name, class extends Node {} ]));

    const result = CjsCmfFormat.load(makeCmf(), { emit: "gr2", classes });
    assert.ok(result instanceof classes.Root);
    assert.ok(result.models[0] instanceof classes.Model);
    assert.ok(result.models[0].skeleton instanceof classes.Skeleton);
    assert.ok(result.models[0].skeleton.bones[0] instanceof classes.Bone);
    assert.ok(result.animations[0].trackGroups[0] instanceof classes.TrackGroup);
    assert.ok(result.animations[0].trackGroups[0].transformTracks[0] instanceof classes.TransformTrack);
    assert.ok(result.animations[0].trackGroups[1].vectorTracks[0] instanceof classes.VectorTrack);
    assert.ok(result.animations[0].trackGroups[1].vectorTracks[0].valueCurve instanceof classes.Curve);
});
