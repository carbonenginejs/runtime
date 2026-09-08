import test from "node:test";
import assert from "node:assert/strict";
import { CjsIESFormat } from "../../../../../src/resource/formats/ies/index.js";
import { bakeLightProfile } from "../../../../../src/resource/formats/ies/core/bakeLightProfile.js";
import { num } from "#math/num";

const float16 = { float32To16: num.toHalfFloat, float16To32: num.fromHalfFloat };

/**
 * Golden tests for the light-profile bake - the texture half of Carbon's
 * Tr2LightProfileRes::ParseIes (cpp:160-216). The layout, slice selection,
 * normalization, cosine-uniform mapping and per-level half quantization are
 * each pinned against hand-derivable values.
 */

const header = "IESNA:LM-63-1995\n[TEST] bake fixture";

function iesBytes({ verticalAngles, horizontalAngles, candelaValues })
{
    const numbers = [
        1, 100, 2.5,
        verticalAngles.length, horizontalAngles.length,
        1, 1, 0.2, 0.3, 0.4, 1, 0, 60,
        ...verticalAngles, ...horizontalAngles, ...candelaValues
    ];
    return new TextEncoder().encode(`${header}\nTILT=NONE\n${numbers.join(" ")}\n`);
}

test("a full-range ramp normalizes to peak one and maps cosine-uniformly", () =>
{
    // Two planes with DIFFERENT data prove slice-0 selection: the second
    // plane's values would normalize differently if they leaked in.
    const bytes = iesBytes({
        verticalAngles: [ 0, 180 ],
        horizontalAngles: [ 0, 180 ],
        candelaValues: [ 500, 0, /* plane 2: */ 999, 999 ]
    });
    const profile = CjsIESFormat.read(bytes, { emit: "lightProfile" });

    assert.equal(profile.width, 1024);
    assert.equal(profile.height, 1);
    assert.equal(profile.mipCount, 11);
    assert.equal(profile.format, "r16float");
    assert.equal(profile.samples.length, 2047); // 1024 + 512 + ... + 1

    // i=0 -> angle acos(1) = 0 degrees -> t=0 -> intensities[0]/max = 1.0.
    assert.equal(profile.samples[0], 0x3c00);
    // The strip decreases monotonically along the ramp toward 180 degrees.
    const first = float16.float16To32(profile.samples[0]);
    const mid = float16.float16To32(profile.samples[512]);
    const last = float16.float16To32(profile.samples[1023]);
    assert.ok(first > mid && mid > last, `${first} > ${mid} > ${last}`);
    // i=512 -> angle acos(0) = 90 degrees -> exactly halfway down the ramp.
    assert.equal(mid, 0.5);
    // The final texel is at acos(-1022/1024), NOT 180 degrees - the mapping
    // never reaches the far pole, so the value stays above zero.
    assert.ok(last > 0);
});

test("angles outside the authored table bake to zero", () =>
{
    const bytes = iesBytes({
        verticalAngles: [ 30, 60 ],
        horizontalAngles: [ 0 ],
        candelaValues: [ 100, 100 ]
    });
    const profile = CjsIESFormat.read(bytes, { emit: "lightProfile" });

    // angle(0)=0deg and angle(1023)~177deg both sit outside [30,60].
    assert.equal(profile.samples[0], 0);
    assert.equal(profile.samples[1023], 0);
    // acos(1 - 2*i/1024) = 45deg at i = 1024*(1-cos45)/2 ~ 150.
    assert.equal(profile.samples[150], 0x3c00);
});

test("each mip level is a half-quantized 2-tap box of the level above", () =>
{
    const bytes = iesBytes({
        verticalAngles: [ 0, 180 ],
        horizontalAngles: [ 0 ],
        candelaValues: [ 300, 0 ]
    });
    const { samples } = CjsIESFormat.read(bytes, { emit: "lightProfile" });

    // Recompute every mip from the level above using Carbon's exact
    // per-level decode-average-reencode, and demand equality.
    let previous = 0, offset = 1024;
    for (let width = 512; width > 0; width >>= 1)
    {
        for (let i = 0; i < width; i++)
        {
            const expected = float16.float32To16(Math.fround(
                (float16.float16To32(samples[previous + i * 2])
                    + float16.float16To32(samples[previous + i * 2 + 1])) * 0.5
            ));
            assert.equal(samples[offset + i], expected, `mip texel at ${offset + i}`);
        }
        previous = offset;
        offset += width;
    }
    // The last mip is a single texel and the chain fills the buffer exactly.
    assert.equal(offset, 2047);
});

test("normalization divides only when the peak is positive", () =>
{
    const zeros = iesBytes({
        verticalAngles: [ 0, 180 ],
        horizontalAngles: [ 0 ],
        candelaValues: [ 0, 0 ]
    });
    const profile = CjsIESFormat.read(zeros, { emit: "lightProfile" });
    assert.ok(profile.samples.every(v => v === 0));
});

test("the bake core accepts readIes output directly", () =>
{
    const bytes = iesBytes({
        verticalAngles: [ 0, 180 ],
        horizontalAngles: [ 0 ],
        candelaValues: [ 10, 0 ]
    });
    const viaFormat = CjsIESFormat.read(bytes, { emit: "lightProfile" });
    const viaCore = bakeLightProfile(CjsIESFormat.read(bytes));
    assert.deepEqual([ ...viaCore.samples ], [ ...viaFormat.samples ]);
});
