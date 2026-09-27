import assert from "node:assert/strict";
import test from "node:test";

import { CjsDdsFormat } from "../../../../../npm/dist/resource/formats/dds/index.js";
import { ImageUtility } from "../../../../../npm/dist/global/imageio/index.js";
// The AL door is imported from source: no barrel exports it, so the build does
// not emit it, and it carries no decorators.
import { BcDecompress } from "../../../../../src/trinityal/BcDecompress.js";
import { PixelFormat } from "../../../../../npm/dist/global/consts/renderContext/index.js";

// The DDS format is the one home of BC decoding and holds two behaviours under
// two names: `metal.bcDecompress` (Carbon's Metal-only BcDecompress, BGRA8, CE-36/37) and
// `decodeBlockSlice` (the format's rounding RGBA8). These pin Carbon's output,
// prove the AL door reads through it, and pin ImageUtility's own BC3 pixel read
// to it byte for byte.

let seed = 7;
const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 16) & 0xff;
const randomBytes = length => Uint8Array.from({ length }, random);

/** One BC1 block: two 565 endpoints and 2-bit indices, row-major. */
function bc1Block(color0, color1, indices)
{
    const block = new Uint8Array(8);
    const view = new DataView(block.buffer);
    view.setUint16(0, color0, true);
    view.setUint16(2, color1, true);
    view.setUint32(4, indices.reduce((bits, index, i) => bits | (index << (2 * i)), 0) >>> 0, true);
    return block;
}

const level = (bytes, slicePitch = 0) => ({ m_sysMem: bytes, m_sysMemSlicePitch: slicePitch });
const pixel = (out, i) => Array.from(out.subarray(i * 4, i * 4 + 4));
const red = [ 0, 0, 255, 255 ], blue = [ 255, 0, 0, 255 ];

test("bcDecompress writes BGRA8 with Carbon's truncating 565 expansion", () =>
{
    // Pure red 0xF800 and pure blue 0x001F, four-colour mode (color0 > color1).
    const block = bc1Block(0xf800, 0x001f, [ 0, 1, 2, 3, ...new Array(12).fill(0) ]);
    const out = CjsDdsFormat.metal.bcDecompress(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM, level(block));

    assert.deepEqual(pixel(out, 0), red, "B, G, R, A");
    assert.deepEqual(pixel(out, 1), blue);
    // Carbon's InterpolatedColor: (2*255 + 0 + 1) / 3 = 170, truncated.
    assert.deepEqual(pixel(out, 2), [ 85, 0, 170, 255 ]);
});

test("CE-37: BC1 three-colour index 3 keeps color2's RGB with alpha 0", () =>
{
    // color0 <= color1 selects three-colour mode.
    const block = bc1Block(0x001f, 0xf800, new Array(16).fill(3));
    const out = CjsDdsFormat.metal.bcDecompress(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM, level(block));

    // color2 = (blue + red) / 2 per channel, truncated: 127 and 127.
    assert.deepEqual(pixel(out, 0), [ 127, 0, 127, 0 ], "not transparent black");

    const ours = CjsDdsFormat.decodeBlockSlice(block, { width: 4, height: 4, pixelFormat: "bc1-rgba-unorm" });
    assert.deepEqual(pixel(ours, 0), [ 0, 0, 0, 0 ], "the format's own decode gives transparent black");
});

test("CE-36: a width that is not a multiple of four lets a later block overwrite the next row", () =>
{
    // 6x4: block 0 all red (index 0), block 1 all blue (index 1). Block 1's
    // columns 6 and 7 wrap into the next row's columns 0 and 1, after block 0
    // has already written them.
    const source = new Uint8Array(16);
    source.set(bc1Block(0xf800, 0x001f, new Array(16).fill(0)), 0);
    source.set(bc1Block(0xf800, 0x001f, new Array(16).fill(1)), 8);

    const out = CjsDdsFormat.metal.bcDecompress(6, 4, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM, level(source));
    const at = (x, y) => pixel(out, y * 6 + x);

    assert.deepEqual(at(0, 0), red, "row 0 is untouched");
    for (const y of [ 1, 2, 3 ])
    {
        assert.deepEqual(at(0, y), blue, `row ${y} column 0 took block 1's overflow`);
        assert.deepEqual(at(1, y), blue);
        assert.deepEqual(at(2, y), red, `row ${y} column 2 is block 0's own`);
    }
});

test("CE-36 does not reach a level one block wide: the next row overwrites the overflow", () =>
{
    const block = bc1Block(0xf800, 0x001f, [ 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1 ]);
    const out = CjsDdsFormat.metal.bcDecompress(2, 2, 1, PixelFormat.PIXEL_FORMAT_BC1_UNORM, level(block));

    assert.deepEqual([ pixel(out, 0), pixel(out, 1), pixel(out, 2), pixel(out, 3) ], [ red, blue, red, blue ]);
});

test("bcDecompress answers null for a format Carbon's decompressor does not handle", () =>
{
    assert.equal(CjsDdsFormat.metal.bcDecompress(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC7_UNORM, level(new Uint8Array(16))), null);
});

test("BC2 and BC3 read each depth slice at the slice pitch", () =>
{
    for (const format of [ PixelFormat.PIXEL_FORMAT_BC2_UNORM, PixelFormat.PIXEL_FORMAT_BC3_UNORM ])
    {
        const block = randomBytes(16);
        const twoSlices = new Uint8Array(32);
        twoSlices.set(block, 0);
        twoSlices.set(block, 16);

        const one = CjsDdsFormat.metal.bcDecompress(4, 4, 1, format, level(block));
        const two = CjsDdsFormat.metal.bcDecompress(4, 4, 2, format, level(twoSlices, 16));

        assert.deepEqual(Array.from(two.subarray(0, 64)), Array.from(one));
        assert.deepEqual(Array.from(two.subarray(64)), Array.from(one));
    }
});

test("the AL's BcDecompress is a door to the DDS format's, byte for byte", () =>
{
    for (const [ format, blockBytes ] of [ [ PixelFormat.PIXEL_FORMAT_BC1_UNORM, 8 ], [ PixelFormat.PIXEL_FORMAT_BC2_UNORM, 16 ], [ PixelFormat.PIXEL_FORMAT_BC3_UNORM, 16 ] ])
    {
        const source = randomBytes(6 * blockBytes);
        assert.deepEqual(
            Array.from(BcDecompress.bcDecompress(12, 8, 1, format, level(source))),
            Array.from(CjsDdsFormat.metal.bcDecompress(12, 8, 1, format, level(source))));
    }

    assert.equal(BcDecompress.bcDecompress(4, 4, 1, PixelFormat.PIXEL_FORMAT_BC7_UNORM, level(new Uint8Array(16))), null);
});

test("ImageUtility.getPixelColor_BC3 matches the DDS format's Carbon BC3, byte for byte", () =>
{
    // ImageUtility keeps its own Carbon code (global/imageio may not import a
    // format); this pins the two implementations of the same maths together.
    const width = 12, height = 8;
    for (let trial = 0; trial < 20; trial++)
    {
        const source = randomBytes(3 * 2 * 16);
        const whole = CjsDdsFormat.metal.bcDecompress(width, height, 1, PixelFormat.PIXEL_FORMAT_BC3_UNORM, level(source));

        for (let y = 0; y < height; y++)
        {
            for (let x = 0; x < width; x++)
            {
                const at = (y * width + x) * 4;
                // BGRA bytes against 0xAARRGGBB.
                const expected = (whole[at] | (whole[at + 1] << 8) | (whole[at + 2] << 16) | (whole[at + 3] << 24)) >>> 0;
                assert.equal(ImageUtility.getPixelColor_BC3(x, y, width, 0, source), expected, `pixel ${x},${y}`);
            }
        }
    }
});
