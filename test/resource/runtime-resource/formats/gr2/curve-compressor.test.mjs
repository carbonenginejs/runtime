import assert from "node:assert/strict";
import test from "node:test";
import {
    compressGr2Curve
} from "../../../../../src/resource/formats/gr2/core/curveCompressor.js";
import {
    decodeCurve
} from "../../../../../src/resource/formats/gr2/core/curves.js";
import {
    normalizeQuaternionSeries,
    quaternionAngularDifference
} from "../../../../../src/resource/formats/cmf/core/utils/quaternion.js";

function curve(dimension, controls)
{
    return { degree: 1, knots: [ 0, 1 ], controls, dimension };
}

test("chooses specialized 16-bit position and scale formats", () =>
{
    const position = compressGr2Curve(curve(3, [ 0, 1, 2, 3, 4, 5 ]), 3);
    const uniformScale = compressGr2Curve(curve(9, [
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        2, 0, 0, 0, 2, 0, 0, 0, 2
    ]), 9);
    const diagonalScale = compressGr2Curve(curve(9, [
        1, 0, 0, 0, 2, 0, 0, 0, 3,
        2, 0, 0, 0, 4, 0, 0, 0, 6
    ]), 9);

    assert.equal(position.format, 10);
    assert.equal(uniformScale.format, 12);
    assert.equal(diagonalScale.format, 13);
    assert.deepEqual(decodeCurve(position, 3).controls, [ 0, 1, 2, 3, 4, 5 ]);
    assert.deepEqual(decodeCurve(uniformScale, 9).controls, [
        1, 0, 0, 0, 1, 0, 0, 0, 1,
        2, 0, 0, 0, 2, 0, 0, 0, 2
    ]);
});

test("uses general DaK16 for scalar and sheared scale curves", () =>
{
    const scalar = compressGr2Curve(curve(1, [ 0, 10 ]), 1);
    const shear = compressGr2Curve(curve(9, [
        1, 0.25, 0, 0, 1, 0, 0, 0, 1,
        1, 0.5, 0, 0, 1, 0, 0, 0, 1
    ]), 9);
    assert.equal(scalar.format, 6);
    assert.equal(shear.format, 6);
    assert.deepEqual(decodeCurve(scalar, 1).controls, [ 0, 10 ]);
});

test("encodes all D4n omitted-component selectors within angular tolerance", () =>
{
    const controls = normalizeQuaternionSeries([
        0.95, 0.1, 0.1, Math.sqrt(0.0775),
        0.1, 0.95, 0.1, Math.sqrt(0.0775),
        0.1, 0.1, 0.95, Math.sqrt(0.0775),
        0.1, 0.1, Math.sqrt(0.0775), 0.95
    ]);
    const source = { degree: 1, knots: [ 0, 1, 2, 3 ], controls };
    const packed = compressGr2Curve(source, 4);
    const decoded = decodeCurve(packed, 4);

    assert.equal(packed.format, 8);
    for (let index = 0; index < controls.length; index += 4)
    {
        assert.ok(quaternionAngularDifference(
            controls.slice(index, index + 4),
            decoded.controls.slice(index, index + 4)
        ) <= Math.PI / 1800);
    }
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
