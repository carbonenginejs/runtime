import assert from "node:assert/strict";
import test from "node:test";
import CjsCmfFormat from "../../../../../src/resource/formats/cmf/index.js";
import {
    convertGr2Animation,
    convertGr2Skeleton,
    convertGr2SkeletonsAndAnimations,
    evaluateDecodedCurve,
    isGr2Animation,
    isGr2Skeleton
} from "../../../../../src/resource/formats/cmf/core/gr2Anim.js";

function floats(bytes)
{
    return Array.from(new Float32Array(new Uint8Array(bytes).buffer));
}

function makeGr2SharedAnimation()
{
    return {
        meshes: [],
        skeletons: [ {
            name: "skel",
            bones: [
                { name: "root", parentIndex: -1 },
                { name: "arm", parentIndex: 0, position: [ 0, 2, 0 ] }
            ]
        } ],
        animations: [ {
            name: "wave",
            duration: 1,
            trackGroups: [ {
                name: "group",
                transformTracks: [ {
                    name: "arm",
                    position: { knots: [ 0, 1 ], controls: [ 0, 2, 0, 0, 3, 0 ], dimension: 3, degree: 1 }
                } ]
            } ]
        } ]
    };
}

test("converts a GR2 skeleton with parents, rest pose, and inverse binds", () =>
{
    const skeleton = {
        name: "skel",
        bones: [
            { name: "root", parentIndex: -1, position: [ 1, 0, 0 ] },
            { name: "child", parentIndex: 0, position: [ 0, 1, 0 ] }
        ]
    };
    assert.equal(isGr2Skeleton(skeleton), true);

    const converted = convertGr2Skeleton(skeleton);
    assert.deepEqual(converted.bones, [ "root", "child" ]);
    assert.deepEqual(converted.parents, [ 0xffffffff, 0 ]);
    assert.deepEqual(converted.restTransforms[1], { position: [ 0, 1, 0 ], rotation: [ 0, 0, 0, 1 ], scale: [ 1, 1, 1 ] });

    // child world translation = (1, 1, 0); inverse bind carries its negation
    const invBind = converted.invBindTransforms[1];
    assert.deepEqual(invBind.slice(12, 15), [ -1, -1, 0 ]);
    assert.deepEqual(invBind.slice(0, 3), [ 1, 0, 0 ]);
});

test("accepts Float32 scale decomposition residue but rejects material shear", () =>
{
    const converted = convertGr2Skeleton({
        name: "reflected",
        bones: [ {
            name: "root",
            parentIndex: -1,
            scaleShear: [
                1.6937123537063599, -1.9196272660337854e-7, -0.0000019073486328125,
                -6.167545762991722e-8, 5.271618843078613, -0.00003497683792375028,
                2.9802322387695312e-8, 0.0000018438450979374466, -100.00003051757812
            ]
        } ]
    });
    assert.deepEqual(converted.restTransforms[0].scale, [
        1.6937123537063599,
        5.271618843078613,
        -100.00003051757812
    ]);

    assert.throws(() => convertGr2Skeleton({
        name: "sheared",
        bones: [ {
            name: "root",
            parentIndex: -1,
            scaleShear: [ 1, 0.0001, 0, 0, 1, 0, 0, 0, 1 ]
        } ]
    }), /rest transform contains shear/u);
});

test("uses the same Float32-relative shear test for animation scale curves", () =>
{
    const animation = scaleShear => ({
        duration: 1,
        trackGroups: [ {
            transformTracks: [ {
                name: "root",
                scaleShear: { knots: [ 0 ], controls: scaleShear, dimension: 9, degree: 0 }
            } ]
        } ]
    });
    const converted = convertGr2Animation(animation([
        100, 0.00003, 0,
        0, 2, 0,
        0, 0, -3
    ]));
    assert.deepEqual(floats(converted.curves[0].values), [ 100, 2, -3 ]);

    assert.throws(() => convertGr2Animation(animation([
        1, 0.0001, 0,
        0, 1, 0,
        0, 0, 1
    ])), /scaleShear curve contains shear/u);
});

test("evaluates decoded curves: step, linear, quadratic, extrapolation", () =>
{
    const out = [ 0, 0, 0 ];

    const linear = { knots: [ 0, 1, 2 ], controls: [ 0, 0, 0, 10, 0, 0, 20, 0, 0 ], dimension: 3, degree: 1 };
    assert.deepEqual(evaluateDecodedCurve(linear, 0.5, out).slice(0, 1), [ 5 ]);
    assert.deepEqual(evaluateDecodedCurve(linear, 1.5, out).slice(0, 1), [ 15 ]);

    const constant = { knots: [ 0 ], controls: [ 7, 8, 9 ], dimension: 3, degree: 2 };
    assert.deepEqual(Array.from(evaluateDecodedCurve(constant, 5, out)), [ 7, 8, 9 ]);

    // quadratic with all-equal controls stays constant everywhere
    const flat = { knots: [ 0, 0.5, 1, 1.5, 2 ], controls: new Array(15).fill(3), dimension: 3, degree: 2 };
    for (const time of [ 0, 0.6, 1.2, 2 ])
    {
        assert.ok(Math.abs(evaluateDecodedCurve(flat, time, out, 2)[0] - 3) < 1e-6);
    }
});

test("converts linear GR2 tracks exactly and skips identity channels", () =>
{
    const animation = {
        name: "anim",
        duration: 2,
        trackGroups: [ {
            name: "group",
            transformTracks: [ {
                name: "boneA",
                position: { knots: [ 0, 1, 2 ], controls: [ 0, 0, 0, 1, 2, 3, 2, 4, 6 ], dimension: 3, degree: 1 },
                orientation: { knots: [ 0 ], controls: [ 0, 0, 0, 1 ], dimension: 4, degree: 0 },
                scaleShear: { knots: [ 0 ], controls: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ], dimension: 9, degree: 0 }
            } ]
        } ]
    };
    assert.equal(isGr2Animation(animation), true);

    const converted = convertGr2Animation(animation);
    assert.equal(converted.duration, 2);
    // identity rotation and unit scale are skipped; position remains
    assert.equal(converted.channels.length, 1);
    assert.equal(converted.channels[0].targetType, "BonePosition");
    assert.equal(converted.channels[0].target, "boneA");

    const curve = converted.curves[0];
    assert.equal(curve.interpolation, "Linear");
    assert.equal(curve.knotCount, 3);
    assert.deepEqual(floats(curve.knots), [ 0, 1, 2 ]);
    assert.deepEqual(floats(curve.values), [ 0, 0, 0, 1, 2, 3, 2, 4, 6 ]);
});

test("resamples quadratic curves within tolerance including discontinuities", () =>
{
    // full-multiplicity middle knot allows a value jump; the adaptive
    // resampler must track the evaluator within tolerance on either side
    const curve = {
        knots: [ 0, 0, 0, 1, 1, 1, 2, 2, 2 ],
        controls: [
            0, 0, 0, 0, 0, 0, 0, 0, 0,
            5, 0, 0, 5, 0, 0, 5, 0, 0,
            9, 0, 0, 9, 0, 0, 9, 0, 0
        ],
        dimension: 3,
        degree: 2
    };
    const animation = {
        name: "steps",
        duration: 2,
        trackGroups: [ { name: "group", transformTracks: [ { name: "hatch", position: curve } ] } ]
    };

    const converted = convertGr2Animation(animation);
    const emitted = converted.curves[0];
    assert.equal(emitted.interpolation, "Linear");
    const knots = floats(emitted.knots);
    const values = floats(emitted.values);
    const sample = (time) =>
    {
        let hi = 0;
        while (hi < knots.length - 1 && knots[hi] < time) hi++;
        const lo = hi === 0 ? 0 : hi - 1;
        const span = knots[hi] - knots[lo];
        const alpha = span > 0 ? (Math.min(Math.max(time, knots[0]), knots[knots.length - 1]) - knots[lo]) / span : 0;
        return values[lo * 3] * (1 - alpha) + values[hi * 3] * alpha;
    };
    const reference = [ 0, 0, 0 ];
    for (const time of [ 0.1, 0.45, 0.72, 1.2, 1.5, 1.9 ])
    {
        evaluateDecodedCurve(curve, time, reference, 2);
        assert.ok(Math.abs(sample(time) - reference[0]) < 2e-3, );
    }
});

test("clips quantized quadratic knots beyond the playable duration", () =>
{
    const curve = {
        knots: [ 0, 0.5, 1.005 ],
        controls: [
            0, 0, 0,
            1, 2, 3,
            2, 4, 6
        ],
        dimension: 3,
        degree: 2
    };
    const converted = convertGr2Animation({
        name: "quantized-end",
        duration: 1,
        trackGroups: [ {
            name: "group",
            transformTracks: [ { name: "bone", position: curve } ]
        } ]
    });
    const knots = floats(converted.curves[0].knots);
    const values = floats(converted.curves[0].values);
    assert.equal(knots.at(-1), 1);
    assert.equal(knots.every(knot => knot >= 0 && knot <= 1), true);
    assert.equal(knots.every((knot, index) => index === 0 || knot > knots[index - 1]), true);

    const time = 0.99;
    let hi = 0;
    while (hi < knots.length - 1 && knots[hi] < time) hi++;
    const lo = hi === 0 ? 0 : hi - 1;
    const alpha = (time - knots[lo]) / (knots[hi] - knots[lo]);
    const approximation = values[lo * 3] * (1 - alpha) + values[hi * 3] * alpha;
    const reference = evaluateDecodedCurve(curve, time, [ 0, 0, 0 ], 1)[0];
    assert.ok(Math.abs(approximation - reference) < 2e-3);

    assert.throws(() => convertGr2Animation({
        name: "entirely-after-duration",
        duration: 1,
        trackGroups: [ {
            name: "group",
            transformTracks: [ { name: "bone", position: { ...curve, knots: [ 1.1, 1.5, 2 ] } } ]
        } ]
    }), /keys outside its duration/u);
});

test("preserves quantized linear knots beyond the playable duration", () =>
{
    const duration = Math.fround(1 / 3);
    const converted = convertGr2Animation({
        name: "quantized-linear-end",
        duration,
        trackGroups: [ {
            name: "group",
            transformTracks: [ {
                name: "bone",
                position: {
                    format: 18,
                    degree: 1,
                    oneOverKnotScaleTrunc: 17471,
                    controlScales: [ 1, 2, 3 ],
                    controlOffsets: [ 0, 0, 0 ],
                    knotsControls: [ 0, 255, 0, 255 ]
                }
            } ]
        } ]
    });

    assert.equal(converted.duration, 0.3333333432674408);
    assert.equal(converted.curves[0].interpolation, "Linear");
    assert.deepEqual(floats(converted.curves[0].knots), [ 0, 0.33376961946487427 ]);
    assert.deepEqual(floats(converted.curves[0].values), [ 0, 0, 0, 255, 510, 765 ]);
});

test("deduplicates adaptive knots that collide after Float32 quantization", () =>
{
    const converted = convertGr2Animation({
        name: "close-knots",
        duration: 2,
        trackGroups: [ {
            name: "group",
            transformTracks: [ {
                name: "bone",
                position: {
                    knots: [ 0, 1, 1 + 1e-8, 2 ],
                    controls: [ 0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0 ],
                    dimension: 3,
                    degree: 2
                }
            } ]
        } ]
    });
    const knots = floats(converted.curves[0].knots);
    assert.equal(knots.every((knot, index) => index === 0 || knot > knots[index - 1]), true);
});

test("decodes packed keyframes with Granny frame timing", () =>
{
    const animation = {
        name: "packed-keyframes",
        duration: 2,
        trackGroups: [ {
            name: "group",
            transformTracks: [ {
                name: "boneA",
                position: {
                    format: 0,
                    degree: 0,
                    dimension: 3,
                    controls: [ 0, 0, 0, 10, 0, 0, 20, 0, 0, 30, 0, 0 ]
                }
            } ]
        } ]
    };

    const converted = convertGr2Animation(animation);
    assert.equal(converted.curves[0].interpolation, "Step");
    assert.deepEqual(floats(converted.curves[0].knots), [ 0, 0.5, 1, 1.5 ]);
    assert.deepEqual(floats(converted.curves[0].values), [
        0, 0, 0, 10, 0, 0, 20, 0, 0, 30, 0, 0
    ]);

    assert.throws(
        () => convertGr2Animation({ ...animation, duration: 0 }),
        /duration must be positive and finite/u
    );

    animation.trackGroups[0].transformTracks[0].position.controls = [ 0, 1, 2, 3 ];
    assert.throws(
        () => convertGr2Animation(animation),
        /track "boneA" position curve.*not divisible by 3/u
    );
});

test("binds distinct same-name model skeletons by identity and mesh binding", () =>
{
    const first = { name: "Rig", bones: [ { name: "rootA", parentIndex: -1 } ] };
    const second = { name: "Rig", bones: [ { name: "rootB", parentIndex: -1 } ] };
    const input = {
        meshes: [ { name: "a", boneBindings: [ { name: "rootA" } ] }, { name: "b", boneBindings: [ { name: "rootB" } ] } ],
        models: [
            { skeleton: first, meshBindings: [ 0 ] },
            { skeleton: second, meshBindings: [ 1 ] }
        ]
    };
    const snapshot = structuredClone(input);

    const converted = convertGr2SkeletonsAndAnimations(input);
    assert.equal(converted.skeletons.length, 2);
    assert.deepEqual(converted.skeletons.map((skeleton) => skeleton.bones), [ [ "rootA" ], [ "rootB" ] ]);
    assert.deepEqual(converted.meshes.map((mesh) => mesh.skeleton), [ 0, 1 ]);
    assert.deepEqual(input, snapshot);
});

test("shares a model skeleton only when the source object identity is shared", () =>
{
    const shared = { name: "Rig", bones: [ { name: "root", parentIndex: -1 } ] };
    const converted = convertGr2SkeletonsAndAnimations({
        meshes: [ {}, {} ],
        models: [
            { skeleton: shared, meshBindings: [ 0 ] },
            { skeleton: shared, meshBindings: [ 1 ] }
        ]
    });

    assert.equal(converted.skeletons.length, 1);
    assert.deepEqual(converted.meshes.map((mesh) => mesh.skeleton), [ 0, 0 ]);
});

test("ignores model skeleton claims incompatible with the mesh bone palette", () =>
{
    const compatible = { name: "compatible", bones: [ { name: "meshBone", parentIndex: -1 } ] };
    const incompatible = { name: "incompatible", bones: [ { name: "otherBone", parentIndex: -1 } ] };
    const converted = convertGr2SkeletonsAndAnimations({
        meshes: [ { boneBindings: [ { name: "meshBone" } ] } ],
        models: [
            { skeleton: compatible, meshBindings: [ 0 ] },
            { skeleton: incompatible, meshBindings: [ 0 ] }
        ]
    });

    assert.equal(converted.meshes[0].skeleton, 0);
});

test("resolves an unbound skinned mesh from its unique compatible skeleton", () =>
{
    const first = { name: "first", bones: [ { name: "firstBone", parentIndex: -1 } ] };
    const second = { name: "second", bones: [ { name: "trailBone", parentIndex: -1 } ] };
    const converted = convertGr2SkeletonsAndAnimations({
        meshes: [ { boneBindings: [ { name: "trailBone" } ] } ],
        models: [
            { skeleton: first, meshBindings: [] },
            { skeleton: second, meshBindings: [] }
        ]
    });

    assert.equal(converted.meshes[0].skeleton, 1);
});

test("drops a projected GR2 rigid palette while retaining its skeleton relationship", () =>
{
    const skeleton = { name: "Root", bones: [
        { name: "Root", parentIndex: -1 },
        { name: "joint2", parentIndex: 0 }
    ] };
    const converted = convertGr2SkeletonsAndAnimations({
        grannyFileFormatRevision: 7,
        meshes: [ {
            vertex: { position: [ 0, 0, 0 ], blendIndice: [] },
            boneBindings: [ { name: "joint2" } ]
        } ],
        models: [ { skeleton, meshBindings: [ 0 ] } ]
    });

    assert.equal(converted.meshes[0].skeleton, 0);
    assert.deepEqual(converted.meshes[0].boneBindings, []);
    assert.deepEqual(converted.skeletons[0].bones, [ "Root", "joint2" ]);
});

test("does not relax generic shared geometry with bindings but no bone indices", () =>
{
    const mesh = { vertex: { position: [ 0, 0, 0 ] }, boneBindings: [ { name: "root" } ] };
    const converted = convertGr2SkeletonsAndAnimations({ meshes: [ mesh ] });
    assert.equal(converted.meshes[0], mesh);
});

test("rejects bone palettes with zero or multiple compatible skeletons", () =>
{
    const first = { name: "first", bones: [ { name: "sharedBone", parentIndex: -1 } ] };
    const second = { name: "second", bones: [ { name: "sharedBone", parentIndex: -1 } ] };
    assert.throws(() => convertGr2SkeletonsAndAnimations({
        meshes: [ { boneBindings: [ { name: "sharedBone" } ] } ],
        models: [
            { skeleton: first, meshBindings: [] },
            { skeleton: second, meshBindings: [] }
        ]
    }), /no unambiguous compatible skeleton/u);

    assert.throws(() => convertGr2SkeletonsAndAnimations({
        meshes: [ { boneBindings: [ { name: "missingBone" } ] } ],
        models: [ { skeleton: first, meshBindings: [] } ]
    }), /no compatible skeleton/u);
});

test("skips omitted GR2 model meshes and rejects invalid mesh bindings", () =>
{
    const first = { name: "A", bones: [ { name: "a", parentIndex: -1 } ] };
    const second = { name: "B", bones: [ { name: "b", parentIndex: -1 } ] };
    assert.throws(() => convertGr2SkeletonsAndAnimations({
        meshes: [ {} ],
        models: [
            { skeleton: first, meshBindings: [ 0 ] },
            { skeleton: second, meshBindings: [ 0 ] }
        ]
    }), /mesh 0 is bound to skeleton 0 by model 0 and skeleton 1 by model 1/u);

    const omitted = convertGr2SkeletonsAndAnimations({
        meshes: [ { boneBindings: [ { name: "a" } ] } ],
        models: [ { skeleton: first, meshBindings: [ -1, 0, -1 ] } ]
    });
    assert.equal(omitted.meshes[0].skeleton, 0);

    assert.throws(() => convertGr2SkeletonsAndAnimations({
        meshes: [ {} ],
        models: [ { skeleton: first, meshBindings: [ -2 ] } ]
    }), /model 0 mesh binding 0 references mesh -2 outside 0\.\.0/u);
});

test("preserves root skeleton order while appending model-only skeletons", () =>
{
    const rootA = { name: "rootA", bones: [ { name: "a", parentIndex: -1 } ] };
    const rootB = { name: "rootB", bones: [ { name: "b", parentIndex: -1 } ] };
    const appended = { name: "extra", bones: [ { name: "c", parentIndex: -1 } ] };
    const converted = convertGr2SkeletonsAndAnimations({
        skeletons: [ rootA, rootB ],
        meshes: [ {}, {} ],
        models: [
            { skeleton: rootB, meshBindings: [ 0 ] },
            { skeleton: appended, meshBindings: [ 1 ] }
        ]
    });

    assert.deepEqual(converted.skeletons.map((skeleton) => skeleton.name), [ "rootA", "rootB", "extra" ]);
    assert.deepEqual(converted.meshes.map((mesh) => mesh.skeleton), [ 1, 2 ]);
});

test("normalizes packed quaternion curves and keeps adjacent controls in one hemisphere", () =>
{
    const converted = convertGr2Animation({
        name: "continuous-rotation",
        duration: 2,
        trackGroups: [ {
            name: "model",
            transformTracks: [ {
                name: "boneA",
                orientation: {
                    format: 1,
                    degree: 1,
                    knots: [ 0, 1, 2 ],
                    controls: [
                        0, 0, 0, 2,
                        0, 0, 0, -3,
                        0, -Math.SQRT2, 0, -Math.SQRT2
                    ]
                }
            } ]
        } ]
    });

    const values = floats(converted.curves[0].values);
    assert.deepEqual(values, [
        0, 0, 0, 1,
        0, 0, 0, 1,
        0, Math.fround(Math.SQRT1_2), 0, Math.fround(Math.SQRT1_2)
    ]);
    for (let i = 0; i < values.length; i += 4)
    {
        assert.ok(Math.abs(Math.hypot(...values.slice(i, i + 4)) - 1) < 1e-6);
        if (i)
        {
            const previous = values.slice(i - 4, i);
            const current = values.slice(i, i + 4);
            assert.ok(previous.reduce((dot, value, index) => dot + value * current[index], 0) >= 0);
        }
    }

    assert.throws(() => convertGr2Animation({
        duration: 1,
        trackGroups: [ {
            transformTracks: [ {
                name: "boneA",
                orientation: { format: 5, degree: 0, controls: [ 0, 0, 0, 0 ] }
            } ]
        } ]
    }), /zero quaternion/u);
});

test("maps scalar root vector tracks to CMF morph animation channels", () =>
{
    const converted = convertGr2Animation({
        name: "face",
        duration: 2,
        trackGroups: [ {
            name: "root",
            transformTracks: [],
            vectorTracks: [ {
                name: "Smile",
                dimension: 1,
                valueCurve: { format: 0, degree: 0, dimension: 1, controls: [ 0, 0.25, 0.75, 1 ] }
            }, {
                name: "Blink",
                dimension: 1,
                valueCurve: { format: 3, degree: 0, controls: [ 0.375 ] }
            } ]
        }, {
            name: "Root",
            vectorTracks: [ {
                name: "WrongCase",
                dimension: 1,
                valueCurve: { format: 3, degree: 0, controls: [ 1 ] }
            } ]
        } ]
    });

    assert.deepEqual(converted.channels, [
        { target: "Smile", targetType: "MorphTarget", curveIndex: 0 },
        { target: "Blink", targetType: "MorphTarget", curveIndex: 1 },
        { target: "WrongCase", targetType: "MorphTarget", curveIndex: 2 }
    ]);
    assert.deepEqual(floats(converted.curves[0].knots), [ 0, 0.5, 1, 1.5 ]);
    assert.deepEqual(floats(converted.curves[0].values), [ 0, 0.25, 0.75, 1 ]);
    assert.deepEqual(floats(converted.curves[1].values), [ 0.375 ]);
    assert.deepEqual(floats(converted.curves[2].values), [ 1 ]);

    assert.throws(() => convertGr2Animation({
        duration: 1,
        trackGroups: [ {
            vectorTracks: [ {
                name: "NotScalar",
                dimension: 3,
                valueCurve: { format: 4, degree: 0, controls: [ 1, 2, 3 ] }
            } ]
        } ]
    }), /unsupported dimension 3/u);
});

test("root conversion keeps only vector tracks resolving to real morph targets", () =>
{
    const converted = convertGr2SkeletonsAndAnimations({
        meshes: [ { morphTargets: [ { name: "Smile" } ] } ],
        animations: [ {
            name: "face",
            duration: 1,
            trackGroups: [ {
                transformTracks: [ {
                    name: "root",
                    position: { knots: [ 0 ], controls: [ 1, 2, 3 ], dimension: 3, degree: 0 }
                } ],
                vectorTracks: [ {
                    name: "Smile",
                    dimension: 1,
                    valueCurve: { knots: [ 0 ], controls: [ 0.5 ], dimension: 1, degree: 0 }
                }, {
                    name: "bindInverseScaleX",
                    dimension: 1,
                    valueCurve: { knots: [ 0 ], controls: [ 1 ], dimension: 1, degree: 0 }
                } ]
            } ]
        } ]
    });

    assert.deepEqual(converted.animations[0].channels.map(channel => [
        channel.targetType,
        channel.target
    ]), [
        [ "BonePosition", "root" ],
        [ "MorphTarget", "Smile" ]
    ]);
});

test("projected GR2 root conversion preserves authored identity transform components", () =>
{
    const converted = convertGr2SkeletonsAndAnimations({
        grannyFileFormatRevision: 7,
        animations: [ {
            name: "idle",
            duration: 1,
            trackGroups: [ { transformTracks: [ {
                name: "root",
                position: { knots: [ 0 ], controls: [ 0, 0, 0 ], dimension: 3, degree: 0 },
                orientation: { knots: [ 0 ], controls: [ 0, 0, 0, 1 ], dimension: 4, degree: 0 },
                scaleShear: {
                    knots: [ 0 ],
                    controls: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ],
                    dimension: 9,
                    degree: 0
                }
            } ] } ]
        } ]
    });

    assert.deepEqual(converted.animations[0].channels.map(channel => channel.targetType), [
        "BonePosition",
        "BoneRotation",
        "BoneScale"
    ]);
});

test("rejects GR2 animations that cannot form a valid CMF animation", () =>
{
    assert.throws(() => convertGr2Animation({
        name: "zero",
        duration: 0,
        trackGroups: []
    }), /duration must be positive and finite/u);

    assert.throws(() => convertGr2Animation({
        name: "identity-only",
        duration: 1,
        trackGroups: [ {
            transformTracks: [ {
                name: "root",
                orientation: { knots: [ 0 ], controls: [ 0, 0, 0, 1 ], dimension: 4, degree: 0 },
                scaleShear: { knots: [ 0 ], controls: [ 1, 0, 0, 0, 1, 0, 0, 0, 1 ], dimension: 9, degree: 0 }
            } ]
        } ]
    }), /contains no non-identity channels/u);
});

test("writeShared converts GR2 skeletons and animations end to end", () =>
{
    const shared = makeGr2SharedAnimation();

    const bytes = CjsCmfFormat.writeShared(shared);
    const back = CjsCmfFormat.read(bytes, { emit: "raw" });

    assert.equal(back.skeletons.length, 1);
    assert.deepEqual(back.skeletons[0].bones, [ "root", "arm" ]);
    assert.deepEqual(back.skeletons[0].parents, [ 0xffffffff, 0 ]);
    assert.equal(back.animations.length, 1);
    assert.equal(back.animations[0].name, "wave");
    assert.equal(back.animations[0].duration, 1);
    assert.equal(back.animations[0].channels.length, 1);
    assert.equal(back.animations[0].channels[0].target, "arm");
    assert.equal(back.animations[0].channels[0].targetType, "BonePosition");
    const curve = back.animations[0].curves[0];
    assert.equal(curve.knotCount, 2);
    assert.deepEqual(floats(curve.values), [ 0, 2, 0, 0, 3, 0 ]);
});

test("loadShared uses the same GR2 skeleton and animation conversion", () =>
{
    const graph = CjsCmfFormat.loadShared(makeGr2SharedAnimation());

    assert.deepEqual(graph.skeletons[0].bones, [ "root", "arm" ]);
    assert.deepEqual(graph.skeletons[0].parents, [ 0xffffffff, 0 ]);
    assert.equal(graph.animations[0].name, "wave");
    assert.equal(graph.animations[0].channels[0].target, "arm");
    assert.equal(graph.animations[0].channels[0].targetType, "BonePosition");
    assert.deepEqual(floats(graph.animations[0].curves[0].values), [ 0, 2, 0, 0, 3, 0 ]);
});
