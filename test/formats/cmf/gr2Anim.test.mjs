import assert from "node:assert/strict";
import test from "node:test";
import CjsCmfFormat from "../../../src/formats/cmf/index.js";
import {
    convertGr2Animation,
    convertGr2Skeleton,
    evaluateDecodedCurve,
    isGr2Animation,
    isGr2Skeleton
} from "../../../src/formats/cmf/core/gr2Anim.js";

function floats(bytes)
{
    return Array.from(new Float32Array(new Uint8Array(bytes).buffer));
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

test("rejects undecoded packed curves with a clear error", () =>
{
    const animation = {
        name: "anim",
        duration: 1,
        trackGroups: [ {
            name: "group",
            transformTracks: [ {
                name: "boneA",
                position: { format: 17, degree: 2, knotsControls: [ 1, 2, 3, 4 ] }
            } ]
        } ]
    };
    assert.throws(() => convertGr2Animation(animation), /decompressCurves/u);
});

test("writeShared converts GR2 skeletons and animations end to end", () =>
{
    const shared = {
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
