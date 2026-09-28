// CMF animation curve evaluation, against Carbon's cmf SampleCurve and
// SampleQuaternionCurve (mesh/src/cmf/animation.cpp:30-58, 140-158, 203-226)
// and Slerp (math/include/Quaternion_inline.h:244-266).
import assert from "node:assert/strict";
import test from "node:test";
import { CjsCmfFormat } from "../../../../../src/resource/formats/cmf/index.js";

/** A CMF AnimationCurve as the payload holds it: Float32 knots and values as bytes. */
function curve(interpolation, dimension, knots, values)
{
    const bytes = array => Array.from(new Uint8Array(Float32Array.from(array).buffer));
    return CjsCmfFormat.decodeAnimationCurve({
        valueDimension: dimension,
        interpolation,
        knotType: "Float32",
        valueType: "Float32",
        knotCount: knots.length,
        knots: bytes(knots),
        values: bytes(values)
    });
}

test("knot intervals clamp before the first knot and past the last, as Carbon's FindKnotInterval", () =>
{
    const linear = curve("Linear", 1, [ 1, 2, 4 ], [ 10, 20, 40 ]);
    const out = [ 0 ];
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve(out, linear, 0), [ 10 ], "before the first knot: knot 0");
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve(out, linear, 1.5), [ 15 ]);
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve(out, linear, 3), [ 30 ]);
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve(out, linear, 9), [ 40 ], "past the last knot: the last value");
});

test("Step holds the left knot's value", () =>
{
    const step = curve("Step", 3, [ 0, 1 ], [ 1, 2, 3, 4, 5, 6 ]);
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve([ 0, 0, 0 ], step, 0.99), [ 1, 2, 3 ]);
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve([ 0, 0, 0 ], step, 1), [ 4, 5, 6 ]);
});

test("an interpolation Carbon does not handle answers zeros, as its default branch", () =>
{
    const cubic = curve("Cubic", 2, [ 0, 1 ], [ 1, 1, 2, 2 ]);
    assert.deepEqual(CjsCmfFormat.sampleAnimationCurve([ 9, 9 ], cubic, 0.5), [ 0, 0 ]);
});

test("rotations slerp along the shorter arc", () =>
{
    // 0 and 90 degrees about z; halfway is 45 degrees.
    const s = Math.SQRT1_2;
    const rotation = curve("Linear", 4, [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, s, s ]);
    const half = CjsCmfFormat.sampleQuaternionCurve([ 0, 0, 0, 0 ], rotation, 0.5);
    const expected = [ 0, 0, Math.sin(Math.PI / 8), Math.cos(Math.PI / 8) ];
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(half[i] - expected[i]) < 1e-6, `component ${i}`);

    // The same rotation stored with the opposite sign still takes the short way.
    const flipped = curve("Linear", 4, [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, -s, -s ]);
    const short = CjsCmfFormat.sampleQuaternionCurve([ 0, 0, 0, 0 ], flipped, 0.5);
    for (let i = 0; i < 4; i++) assert.ok(Math.abs(short[i] - expected[i]) < 1e-6, `flipped component ${i}`);
});

test("nearly parallel rotations fall back to a plain lerp, as Carbon's Slerp does", () =>
{
    const rotation = curve("Linear", 4, [ 0, 1 ], [ 0, 0, 0, 1, 0, 0, 0.01, 0.99995 ]);
    const half = CjsCmfFormat.sampleQuaternionCurve([ 0, 0, 0, 0 ], rotation, 0.5);
    assert.ok(Math.abs(half[2] - 0.005) < 1e-6);
    assert.ok(Math.abs(half[3] - 0.999975) < 1e-6);
});
