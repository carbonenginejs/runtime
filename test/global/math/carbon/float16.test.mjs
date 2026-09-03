// Ported from e:\carbonengine\math\tests\Float16.cpp (gtest). Same test names for
// the three ported suites; the remaining tests are JS-added and prove the conversion
// matches Carbon's src\Float16.cpp branch conversion across the special values:
// zeros, subnormals, infinities, NaN, rounding at mantissa boundaries, and Carbon's
// deliberate quirks (only 0x7fff/0xffff decode as NaN; [65520, 131072) encodes with
// exponent 31), plus an exhaustive decode->encode roundtrip over every finite half.

import { test } from "node:test";
import assert from "node:assert/strict";
import { float16, vector2_16, vector3_16, vector4_16 } from "../../../../npm/dist/global/math/carbon/float16.js";

const f32 = Math.fround;
const to16 = float16.float32To16;
const to32 = float16.float16To32;

test("Float16.ConstructFromFloat", () =>
{
    assert.equal(to16(0), 0);
    assert.equal(to16(-0), 0x8000);
    assert.equal(to16(1), 0x3c00);
    assert.equal(to16(-1), 0x3c00 | 0x8000);
});

test("Float16.From32To16To32", () =>
{
    assert.ok(Object.is(to32(to16(0)), 0));
    assert.ok(Object.is(to32(to16(-0)), -0));
    assert.equal(to32(to16(1)), 1);
    assert.equal(to32(to16(-1)), -1);
    assert.ok(Number.isNaN(to32(to16(NaN))));
});

test("Float16.Comparisons", () =>
{
    assert.ok(to16(0) === to16(0));
    assert.ok(to16(1) === to16(1));
    assert.ok(to16(-1) === to16(-1));
    assert.ok(to16(NaN) === to16(NaN));

    assert.ok(!(to16(-0) === to16(0)));
    assert.ok(!(to16(1) === to16(0)));
    assert.ok(!(to16(0) === to16(1)));
    assert.ok(!(to16(-1) === to16(1)));

    assert.ok(!(to16(0) !== to16(0)));
    assert.ok(!(to16(1) !== to16(1)));
    assert.ok(!(to16(-1) !== to16(-1)));
    assert.ok(!(to16(NaN) !== to16(NaN)));

    assert.ok(to16(-0) !== to16(0));
    assert.ok(to16(1) !== to16(0));
    assert.ok(to16(0) !== to16(1));
    assert.ok(to16(-1) !== to16(1));

    assert.ok(float16.exactEquals(to16(NaN), to16(NaN)));
    assert.ok(!float16.exactEquals(to16(-0), to16(0)));
});

test("Float16.SpecialValueEncoding (JS-added)", () =>
{
    assert.equal(to16(Infinity), 0x7fff);      // Carbon encodes INF as 0x7fff, not 0x7c00
    assert.equal(to16(-Infinity), 0xffff);
    assert.equal(to16(NaN), 0x7fff);
    assert.equal(to16(65504), 0x7bff);         // largest finite half
    assert.equal(to16(65520), 0x7c00);         // rounds up into exponent 31
    assert.equal(to16(65536), 0x7c00);
    assert.equal(to16(100000), 0x7e1a);        // Carbon quirk: exponent 31 with mantissa bits
    assert.equal(to16(131072), 0x7fff);        // exponent > 31 -> INF pattern
    assert.equal(to16(-131072), 0xffff);
});

test("Float16.SubnormalEncoding (JS-added)", () =>
{
    assert.equal(to16(Math.pow(2, -24)), 0x0001);          // smallest subnormal
    assert.equal(to16(-Math.pow(2, -24)), 0x8001);
    assert.equal(to16(Math.pow(2, -25)), 0x0000);          // ties to even -> 0
    assert.equal(to16(Math.pow(2, -26)), 0x0000);          // too small
    assert.equal(to16(1023 * Math.pow(2, -24)), 0x03ff);   // largest subnormal
    assert.equal(to16(Math.pow(2, -14)), 0x0400);          // smallest normal
});

test("Float16.RoundHalfToEvenAtMantissaBoundaries (JS-added)", () =>
{
    assert.equal(to16(1 + 1 / 1024), 0x3c01);   // exactly representable
    assert.equal(to16(1 + 1 / 2048), 0x3c00);   // tie, even mantissa -> down
    assert.equal(to16(1 + 3 / 2048), 0x3c02);   // tie, odd mantissa -> up
    assert.equal(to16(f32(1 + 1 / 4096)), 0x3c00); // below the tie -> down
    assert.equal(to16(f32(1 + 3 / 4096)), 0x3c01); // above the tie -> up
});

test("Float16.Decoding (JS-added)", () =>
{
    assert.equal(to32(0x3c00), 1);
    assert.equal(to32(0xbc00), -1);
    assert.equal(to32(0x0001), Math.pow(2, -24));
    assert.equal(to32(0x03ff), 1023 * Math.pow(2, -24));
    assert.equal(to32(0x7bff), 65504);
    assert.equal(to32(0x7c00), 65536);          // Carbon quirk: not Infinity
    assert.ok(Number.isNaN(to32(0x7fff)));
    assert.ok(Number.isNaN(to32(0xffff)));
    assert.ok(Object.is(to32(0x8000), -0));
});

test("Float16.ExhaustiveDecodeEncodeRoundTrip (JS-added)", () =>
{
    // Every finite half (exponent < 31), both signs, must survive decode -> encode
    for (let u = 0; u <= 0x7bff; u++)
    {
        assert.equal(to16(to32(u)), u, `0x${u.toString(16)}`);
        const n = (u | 0x8000) >>> 0;
        assert.equal(to16(to32(n)), n, `0x${n.toString(16)}`);
    }
});

test("Float16.PackedVectors (JS-added)", () =>
{
    const v2 = vector2_16.set(vector2_16.create(), 1, -2);
    assert.deepEqual(Array.from(v2), [0x3c00, 0xc000]);
    const outV2 = vector2_16.toVector2(new Float32Array(2), v2);
    assert.deepEqual(Array.from(outV2), [1, -2]);

    const v3 = vector3_16.fromVector3(vector3_16.create(), new Float32Array([0.5, 65504, Math.pow(2, -24)]));
    const outV3 = vector3_16.toVector3(new Float32Array(3), v3);
    assert.deepEqual(Array.from(outV3), [0.5, 65504, Math.pow(2, -24)]);

    const v4 = vector4_16.set(vector4_16.create(), 0, -0, 1.5, -1.5);
    assert.deepEqual(Array.from(v4), [0x0000, 0x8000, 0x3e00, 0xbe00]);
    const outV4 = vector4_16.toVector4(new Float32Array(4), v4);
    assert.deepEqual(Array.from(outV4), [0, -0, 1.5, -1.5]);
});
