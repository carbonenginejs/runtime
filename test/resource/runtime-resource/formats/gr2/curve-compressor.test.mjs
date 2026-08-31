import assert from "node:assert/strict";
import test from "node:test";
import {
    compressGr2Curve
} from "../../../../../src/resource/formats/gr2/core/curveCompressor.js";
import {
    decodeCurve,
    sampleDecodedCurve
} from "../../../../../src/resource/formats/gr2/core/curves.js";
import {
    normalizeQuaternion,
    normalizeQuaternionSeries,
    quaternionAngularDifference
} from "../../../../../src/resource/formats/cmf/core/utils/quaternion.js";

function curve(dimension, controls)
{
    return { degree: 1, knots: [ 0, 1 ], controls, dimension };
}

test("selects the smallest accurate 8-bit curve families", () =>
{
    const scalar = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 2, 3 ],
        controls: [ 0, 85, 170, 255 ]
    }, 1);
    const position = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 255 ],
        controls: [ 0, 0, 0, 255, 0, 0, 0, 255, 0 ]
    }, 3);
    const orientation = compressGr2Curve(curve(4, [
        0, 0, 0, 1,
        0, 0.38268343, 0, 0.9238795
    ]), 4, { asQuaternion: true, orientationTolerance: 0.1 });
    const uniformScale = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 2, 255 ],
        controls: [ 0, 85, 170, 255 ].flatMap(value => [ value, 0, 0, 0, value, 0, 0, 0, value ])
    }, 9);
    const diagonalScale = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 255 ],
        controls: [
            0, 0, 0, 0, 0, 0, 0, 0, 0,
            255, 0, 0, 0, 0, 0, 0, 0, 128,
            0, 0, 0, 0, 255, 0, 0, 0, 255
        ]
    }, 9, { scaleShearTolerance: 1 });

    assert.deepEqual(
        [ scalar.format, position.format, orientation.format, uniformScale.format, diagonalScale.format ],
        [ 7, 11, 9, 14, 15 ]
    );
});

test("falls back from 8-bit to each 16-bit sibling", () =>
{
    const scalar = compressGr2Curve({
        degree: 1,
        knots: [ 0, 0.5, 1 ],
        controls: [ 0, 0.123, 1 ]
    }, 1, { tolerance: 1e-4 });
    const position = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 255 ],
        controls: [ 0, 0, 0, 0.123, 0.777, 0.222, 1, 0.111, 0.999 ]
    }, 3, { positionTolerance: 1e-4 });
    const orientation = compressGr2Curve(curve(4, [
        0, 0, 0, 1,
        0, 0.38268343, 0, 0.9238795
    ]), 4, { asQuaternion: true });
    const uniformScale = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 255 ],
        controls: [ 0, 0.123, 1 ].flatMap(value => [ value, 0, 0, 0, value, 0, 0, 0, value ])
    }, 9, { scaleShearTolerance: 1e-4 });
    const diagonalScale = compressGr2Curve({
        degree: 1,
        knots: [ 0, 1, 255 ],
        controls: [
            0, 0, 0, 0, 0, 0, 0, 0, 0,
            0.123, 0, 0, 0, 0.777, 0, 0, 0, 0.222,
            1, 0, 0, 0, 0.111, 0, 0, 0, 0.999
        ]
    }, 9, { scaleShearTolerance: 1e-4 });

    assert.deepEqual(
        [ scalar.format, position.format, orientation.format, uniformScale.format, diagonalScale.format ],
        [ 6, 10, 8, 12, 13 ]
    );
});

test("selects D3I1 8-bit, 16-bit, and float line representations", () =>
{
    const packed8 = compressGr2Curve(curve(3, [ 0, 1, 2, 3, 4, 5 ]), 3);
    const packed16 = compressGr2Curve({
        degree: 1,
        knots: [ 0, 0.5, 1 ],
        controls: [ 0, 0, 0, 0.12345, 0.2469, 0.37035, 1, 2, 3 ]
    }, 3, { positionTolerance: 1e-4 });
    const packedFloat = compressGr2Curve({
        degree: 1,
        knots: [ 0, 0.5, 1 ],
        controls: [ 0, 0, 0, 0.12345679, 0.24691358, 0.37037037, 1, 2, 3 ]
    }, 3, { positionTolerance: 1e-7 });

    assert.deepEqual([ packed8.format, packed16.format, packedFloat.format ], [ 18, 17, 16 ]);
    assert.deepEqual(decodeCurve(packed8, 3).controls, [ 0, 1, 2, 3, 4, 5 ]);
});

test("rejects D3I1 representations for non-collinear position controls", () =>
{
    const packed = compressGr2Curve({
        degree: 1,
        knots: [ 0, 0.5, 1 ],
        controls: [ 0, 0, 0, 0.5, 1, 0, 1, 0, 0 ]
    }, 3, { positionTolerance: 1e-4 });

    assert.ok(![ 16, 17, 18 ].includes(packed.format));
});

test("encodes all D4n omitted-component selectors within angular tolerance", () =>
{
    const controls = normalizeQuaternionSeries([
        -0.95, 0.1, 0.1, Math.sqrt(0.0775),
        0.1, 0.95, 0.1, Math.sqrt(0.0775),
        0.1, 0.1, 0.95, Math.sqrt(0.0775),
        0.1, 0.1, Math.sqrt(0.0775), 0.95
    ]);
    const source = { degree: 1, knots: [ 0, 1, 2, 3 ], controls };
    const packed = compressGr2Curve(source, 4, { asQuaternion: true });
    const packed8 = compressGr2Curve(source, 4, {
        asQuaternion: true,
        orientationTolerance: 0.1
    });

    assert.equal(packed.format, 8);
    assert.equal(packed8.format, 9);
    assert.ok((packed8.knotsControls[4] & 0x80) !== 0, "negative omitted-component sign");
    for (const candidate of [ packed, packed8 ])
    {
        const decoded = decodeCurve(candidate, 4);
        const tolerance = candidate.format === 9 ? 0.1 : Math.PI / 1800;
        for (let index = 0; index < controls.length; index += 4)
        {
            assert.ok(quaternionAngularDifference(
                controls.slice(index, index + 4),
                decoded.controls.slice(index, index + 4)
            ) <= tolerance);
        }
    }
});

test("hemisphere-stabilizes antipodal orientation keys before validation", () =>
{
    const packed = compressGr2Curve(curve(4, [
        0, 0, 0, 1,
        0, 0, 0, -1
    ]), 4, { asQuaternion: true, identity: [ 0, 0, 0, 1 ] });

    assert.equal(packed.format, 2);
    assert.deepEqual(packed, { format: 2, degree: 0, dimension: 4 });
});

test("samples orientation intervals at shared quarter points before accepting packing", () =>
{
    const source = {
        degree: 1,
        knots: [
            1.0698109537586569, 2.095752027954906, 2.6104144854210314, 3.0855642336383458,
            3.668351604714989, 3.765328900370746, 4.846516245294362, 6.159961171999573
        ],
        controls: [
            0.5830234141481657, 0.3256318870345304, 0.45645386295648105, 0.5879604099711588,
            0.5338073781560413, 0.68169074125802, 0.2704459673492179, -0.4209588994828473,
            -0.42710555474600265, 0.5362231679850433, -0.5520335836676031, -0.4746624924346736,
            -0.6121023850730778, 0.6509811585005096, -0.4294136092472013, 0.13098913565053968,
            -0.5290433887327062, 0.011894210562535508, -0.630025363186824, 0.568365782163757,
            -0.17049169980638446, 0.3769242186870926, 0.665701904506883, 0.6210488612018891,
            -0.6991955588531309, 0.17390353098841246, 0.6886807461989741, 0.08125245968365818,
            -0.8967929597340578, -0.27009719503769675, 0.3488167201085676, -0.033716292454810025
        ]
    };
    const packed = compressGr2Curve(source, 4, { asQuaternion: true });
    const decoded = decodeCurve(packed, 4);
    const normalizedSource = {
        ...source,
        dimension: 4,
        controls: normalizeQuaternionSeries(source.controls.slice())
    };
    const sourceValue = new Array(4);
    const decodedValue = new Array(4);
    const time = 3.7410260921157894;

    sampleDecodedCurve(sourceValue, normalizedSource, time);
    sampleDecodedCurve(decodedValue, decoded, time);
    assert.ok(quaternionAngularDifference(
        normalizeQuaternion(sourceValue),
        normalizeQuaternion(decodedValue)
    ) <= Math.PI / 1800);
});

test("checks orientation error stationary points between fixed samples", () =>
{
    const packed = compressGr2Curve({
        degree: 1,
        knots: [
            0.74188137244666, 0.9270634303311818, 0.966065623217728, 1.9652820608881303,
            2.580297346424777, 3.7725571927777493, 4.4674098329129635, 5.932332858818118
        ],
        controls: [
            -0.5181598093451155, 0.15357494140744726, 0.07078017475410364, 0.838400450985632,
            0.7335128071790662, 0.10376418825034006, -0.2796662120344087, 0.6107198742364287,
            0.32333015990152003, -0.04431823216189494, -0.9284793851705148, -0.1772555593189817,
            0.5269211445879911, -0.5385680279637634, -0.43250876074937916, 0.49521183196319224,
            -0.4967478320965301, 0.23214752627485158, -0.603026198778985, 0.5794035907189672,
            0.5582249196048438, 0.5971953248990706, -0.5491300842865816, 0.17377811594752346,
            0.5884150832726949, 0.7898093526347384, 0.02009210961329876, 0.17194529187846422,
            0.30589728457255594, -0.019675451051923563, 0.9487231773950857, 0.07722733059230365
        ]
    }, 4, { asQuaternion: true });

    assert.equal(packed.format, 1);
});

test("treats arbitrary dimension-4 tracks as vectors unless explicitly quaternion", () =>
{
    const source = curve(4, [
        2, 3, 4, 5,
        6, 7, 8, 9
    ]);
    const packed = compressGr2Curve(source, 4);
    const decoded = decodeCurve(packed, 4);

    assert.ok(![ 8, 9 ].includes(packed.format));
    assert.ok(decoded.controls.every((value, index) => Math.abs(value - source.controls[index]) <= 0.1));
});

test("keeps degree-2 curves in float storage until interior error is bounded", () =>
{
    const packed = compressGr2Curve({
        degree: 2,
        knots: [
            0.40193280087783934, 0.8294499320723117, 1.01438735678792,
            1.213398050479591, 2.720451124664396, 3.470894533153623, 4.517546009905636
        ],
        controls: [
            -2.285234099254012, -4.567701327614486, -8.33098804578185,
            6.844454421661794, -9.782423945143819, -4.495931058190763, -4.923275522887707
        ]
    }, 1, { tolerance: 0.1 });

    assert.equal(packed.format, 1);
});

test("validates quantized extrapolation through the animation duration", () =>
{
    const source = {
        degree: 1,
        knots: [ 0, 0.31861531506292523, 1 ],
        controls: [
            1.0135640809312463, 2.0644940195605157, -0.9856724813813343,
            -2.3304771166294813, -4.62446022441145, 2.3441608193330468,
            -2.2301101172342896, -4.506827884213999, 2.255524419923313
        ]
    };
    const packed = compressGr2Curve(source, 3, {
        duration: 100,
        positionTolerance: 0.1
    });
    const decoded = decodeCurve(packed, 3);
    const sourceAtDuration = new Array(3);
    const decodedAtDuration = new Array(3);

    sampleDecodedCurve(sourceAtDuration, { ...source, dimension: 3 }, 100, false, 100);
    sampleDecodedCurve(decodedAtDuration, decoded, 100, false, 100);
    assert.ok(Math.hypot(...sourceAtDuration.map((value, index) => value - decodedAtDuration[index])) <= 0.1);
});

test("does not collapse near-constant controls past a strict caller tolerance", () =>
{
    const source = curve(1, [ 0, 5e-8 ]);
    const packed = compressGr2Curve(source, 1, { tolerance: 1e-9 });
    const decoded = decodeCurve(packed, 1);

    assert.notEqual(packed.format, 3);
    assert.ok(decoded.controls.every((value, index) => Math.abs(value - source.controls[index]) <= 1e-9));
});

test("rejects negative and duplicate Step/Linear knots before quantization", () =>
{
    assert.throws(
        () => compressGr2Curve({ degree: 1, knots: [ -1, 0 ], controls: [ 0, 1 ] }, 1),
        /non-negative/
    );
    assert.throws(
        () => compressGr2Curve({ degree: 0, knots: [ 0, 0 ], controls: [ 0, 1 ] }, 1),
        /distinct knots/
    );
});

test("float mode retains explicit knots and controls", () =>
{
    const packed = compressGr2Curve(curve(3, [ 0, 1, 2, 3, 4, 5 ]), 3, { compressed: false });
    assert.equal(packed.format, 1);
    assert.deepEqual(packed.knots, [ 0, 1 ]);
    assert.deepEqual(packed.controls, [ 0, 1, 2, 3, 4, 5 ]);
});

test("does not infer format-0 timing without verified TimeStep semantics", () =>
{
    const packed = compressGr2Curve({
        degree: 0,
        knots: [ 0, 0.5, 1 ],
        controls: [ 0, 0.5, 1 ]
    }, 1, { duration: 1 });

    assert.notEqual(packed.format, 0);
    const decoded = decodeCurve(packed, 1).controls;
    assert.ok(decoded.every((value, index) => Math.abs(value - [ 0, 0.5, 1 ][index]) <= 0.1));
});
