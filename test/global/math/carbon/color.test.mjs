// Carbon's gtest file e:\carbonengine\math\tests\Color.cpp contains NO TEST cases
// (it only pulls in the headers), so there is nothing to port one-to-one. These are
// JS-added tests locking in Color_inline.h behavior: the ARGB uint32 pack/unpack with
// Carbon's exact clamp and +0.5 rounding, the operators, Lerp, and Saturate.

import { test } from "node:test";
import assert from "node:assert/strict";
import { color } from "../../../../npm/dist/global/math/carbon/color.js";

const f32 = Math.fround;

function expectFloatEq(expected, actual)
{
    if (Number.isNaN(expected) && Number.isNaN(actual)) return;
    if (expected === actual) return;
    const tol = 1e-6 * Math.max(Math.abs(expected), Math.abs(actual), 1);
    assert.ok(Math.abs(expected - actual) <= tol, `expected ${expected}, got ${actual}`);
}

test("ColorTest.Constructors", () =>
{
    const c0 = color.create();
    assert.ok(color.exactEquals(c0, color.fromValues(0, 0, 0, 0)));

    const c1 = color.fromValues(0.25, 0.5, 0.75, 1);
    assert.equal(c1[0], 0.25);
    assert.equal(c1[1], 0.5);
    assert.equal(c1[2], 0.75);
    assert.equal(c1[3], 1);

    const c2 = color.copy(color.create(), c1);
    assert.ok(color.exactEquals(c2, c1));
});

test("ColorTest.ToUint32PackRoundingAndClamping", () =>
{
    assert.equal(color.toUint32(color.fromValues(0, 0, 0, 0)), 0x00000000);
    assert.equal(color.toUint32(color.fromValues(1, 1, 1, 1)), 0xFFFFFFFF);

    // +0.5 truncation rounding: 0.5*255+0.5=128.0 -> 128, 0.25*255+0.5=64.25 -> 64,
    // 0.75*255+0.5=191.75 -> 191
    assert.equal(color.toUint32(color.fromValues(0.5, 0.25, 0.75, 1)), 0xFF8040BF);

    // out-of-range clamps before conversion
    assert.equal(color.toUint32(color.fromValues(1.5, -0.5, 2, -1)), 0x00FF00FF);
});

test("ColorTest.FromUint32Unpack", () =>
{
    const f = f32(1 / 255);
    const c = color.fromUint32(color.create(), 0x80FF00FF);
    assert.equal(c[0], 1);              // R = 0xFF: fround(fround(1/255) * 255) == 1
    assert.equal(c[1], 0);              // G = 0x00
    assert.equal(c[2], 1);              // B = 0xFF
    assert.equal(c[3], f32(f * 128));   // A = 0x80
});

test("ColorTest.Uint32RoundTripsAllByteValues", () =>
{
    const c = color.create();
    for (let v = 0; v <= 255; v++)
    {
        const packed = ((v << 24) | (v << 16) | (v << 8) | v) >>> 0;
        color.fromUint32(c, packed);
        assert.equal(color.toUint32(c), packed, `byte value ${v}`);
    }
});

test("ColorTest.Operators", () =>
{
    const a = color.fromValues(0.1, 0.2, 0.3, 0.4);
    const b = color.fromValues(0.4, 0.3, 0.2, 0.1);

    const sum = color.add(color.create(), a, b);
    expectFloatEq(0.5, sum[0]);
    expectFloatEq(0.5, sum[1]);
    expectFloatEq(0.5, sum[2]);
    expectFloatEq(0.5, sum[3]);

    const diff = color.subtract(color.create(), sum, b);
    expectFloatEq(a[0], diff[0]);
    expectFloatEq(a[1], diff[1]);
    expectFloatEq(a[2], diff[2]);
    expectFloatEq(a[3], diff[3]);

    const scaled = color.scale(color.create(), a, 2);
    expectFloatEq(0.2, scaled[0]);
    expectFloatEq(0.8, scaled[3]);

    const divided = color.divideScalar(color.create(), scaled, 2);
    expectFloatEq(a[0], divided[0]);
    expectFloatEq(a[3], divided[3]);

    const neg = color.negate(color.create(), a);
    assert.equal(neg[0], -a[0]);
    assert.equal(neg[3], -a[3]);

    assert.ok(color.exactEquals(a, color.fromValues(0.1, 0.2, 0.3, 0.4)));
    assert.ok(!color.exactEquals(a, b));
});

test("ColorTest.Lerp", () =>
{
    const red = color.fromValues(1, 0, 0, 1);
    const blue = color.fromValues(0, 0, 1, 1);

    const mid = color.lerp(color.create(), red, blue, 0.5);
    assert.ok(color.exactEquals(mid, color.fromValues(0.5, 0, 0.5, 1)));

    const s0 = color.lerp(color.create(), red, blue, 0);
    assert.ok(color.exactEquals(s0, red));

    const s1 = color.lerp(color.create(), red, blue, 1);
    assert.ok(color.exactEquals(s1, blue));
});

test("ColorTest.Saturate", () =>
{
    const a = color.fromValues(0.2, 0.4, 0.8, 0.5);

    // saturation == 1 returns the color unchanged
    const same = color.saturate(color.create(), a, 1);
    assert.ok(color.exactEquals(same, a));

    // saturation == 0 collapses rgb to perceived intensity, alpha untouched
    const i = 0.2 * 0.299 + 0.4 * 0.587 + 0.8 * 0.114;
    const grey = color.saturate(color.create(), a, 0);
    expectFloatEq(i, grey[0]);
    expectFloatEq(i, grey[1]);
    expectFloatEq(i, grey[2]);
    assert.equal(grey[3], 0.5);

    // negative saturation clamps to 0
    const clamped = color.saturate(color.create(), a, -3);
    assert.ok(color.exactEquals(clamped, grey));

    // saturation > 1 extrapolates away from grey
    const boosted = color.saturate(color.create(), a, 2);
    expectFloatEq(i + (0.2 - i) * 2, boosted[0]);
    expectFloatEq(i + (0.4 - i) * 2, boosted[1]);
    expectFloatEq(i + (0.8 - i) * 2, boosted[2]);
    assert.equal(boosted[3], 0.5);
});
