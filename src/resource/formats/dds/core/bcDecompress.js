// Source: trinity/trinityal/BcDecompress.h
// Source: trinity/trinityal/BcDecompress.cpp
//
// Carbon's software BC1/BC2/BC3 decompressor, to BGRA8, with Carbon's exact
// output - the second BC behaviour the DDS format holds, beside its own rounding
// RGBA8 decode in `helpers.js`. `CjsDdsFormat.metal.bcDecompress` is its door, and
// `trinityal/BcDecompress.js` keeps Carbon's name where Carbon keeps it.
//
// Carbon keeps it at the AL root, shared by every backend; its one caller is
// Metal, which decompresses compressed VOLUME textures on a macOS that cannot
// hold them (`Tr2TextureALMetal.mm:166-186`). It lives in the DDS format here
// because the format is the runtime's one home of BC decoding, importable from
// every layer.
//
// THE TWO BEHAVIOURS DIFFER, which is why each has its own name:
//
// | | channel order | 565 expansion | BC1 3-colour index 3 | edges |
// |---|---|---|---|---|
// | `bcDecompress` (this, Carbon) | BGRA8 | truncated | color2, alpha 0 (CE-37) | whole blocks (CE-36) |
// | `decodeBlockSlice` (the format's own) | RGBA8 | rounded | transparent black | clipped |
//
// A third, Carbon's `ImageUtility::GetPixelColor_BC1`, interpolates on the
// packed 565 value and stays in `global/imageio/ImageUtility.js`.
//
// Carbon repeats `ConvertBGR565A8ToBGRA8` and `InterpolatedColor` here that
// `imageio/ImageUtility.cpp` also defines; the formulas are identical, so this
// uses `ImageUtility`'s ports rather than another copy.
//
// TWO CARBON QUIRKS, KEPT - do not "fix" them (docs/research/carbon-known-defects.md
// CE-36 and CE-37):
//
// - Blocks are written whole, never clipped (`BcDecompress.cpp:58`, `:87`,
//   `:133`, `:215`; buffer sized once at `:243-246`), so a block's columns past
//   the width land at the start of the next row. With one block across, the
//   block's next row overwrites that overflow and the level comes out right.
//   With several blocks across and a width that is not a multiple of four (6,
//   10, ...), a later block's overflow lands on columns the earlier block has
//   already written, and those pixels come out as the later block's. The last
//   rows run past the end of the level: harmless in Carbon's oversized reused
//   buffer, and dropped past the end of a JavaScript typed array.
// - BC1's three-colour mode writes index 3 as `color2` with alpha 0
//   (`BcDecompress.cpp:99-100`). The format defines it as transparent black;
//   Carbon's pixel keeps color2's RGB, which shows wherever alpha is ignored.

import { ImageUtility } from "#imageio";
import { PixelFormat } from "#consts/render-context";


/** A little-endian view over a subresource's bytes. */
function View(bytes)
{
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Writes one packed 0xAARRGGBB pixel as B, G, R, A bytes, dropping writes past the end. */
function Put(out, at, color)
{
  if (at + 3 >= out.length) return;

  out[at] = color & 0xff;
  out[at + 1] = (color >>> 8) & 0xff;
  out[at + 2] = (color >>> 16) & 0xff;
  out[at + 3] = (color >>> 24) & 0xff;
}

/** Scratch for the eight BC3 alpha values of one block. */
const alphaScratch = new Uint32Array(8);


/** Scratch for one decoded 4x4 block, sixteen packed 0xAARRGGBB pixels. */
const blockScratch = new Uint32Array(16);

/**
 * Decompresses BC1 to BGRA8 (`BcDecompress.cpp:28-108`), every depth slice.
 *
 * @param {number} width Level width in pixels.
 * @param {number} height Level height in pixels.
 * @param {number} depth Level depth in slices.
 * @param {{m_sysMem: Uint8Array, m_sysMemSlicePitch: number}} src The compressed level.
 * @param {Uint8Array} decompressed The BGRA8 destination.
 */
function DecompressBc1(width, height, depth, src, decompressed)
{
  const pitch = width * 4;
  const slice = pitch * height;
  const view = View(src.m_sysMem);

  for (let k = 0; k < depth; ++k)
  {
    let source = src.m_sysMemSlicePitch * k;

    for (let j = 0; j < height; j += 4)
    {
      for (let i = 0; i < width; i += 4)
      {
        let color0 = view.getUint16(source, true);
        let color1 = view.getUint16(source + 2, true);
        const bits = view.getUint32(source + 4, true);

        const fourColour = color0 > color1;
        color0 = ImageUtility.convertBGR565A8ToBGRA8(color0, 0);
        color1 = ImageUtility.convertBGR565A8ToBGRA8(color1, 0);

        const color2 = fourColour
          ? ImageUtility.interpolatedColor(color0, 2, color1, 1, 1, 3)
          : ImageUtility.interpolatedColor(color0, 1, color1, 1, 0, 2);
        const color3 = fourColour ? ImageUtility.interpolatedColor(color0, 1, color1, 2, 1, 3) : 0;

        for (let y = 0; y < 4; ++y)
        {
          for (let x = 0; x < 4; ++x)
          {
            const at = k * slice + (j + y) * pitch + (x + i) * 4;

            switch ((bits >>> (2 * (4 * y + x))) & 3)
            {
              case 0: Put(decompressed, at, (color0 | 0xff000000) >>> 0); break;
              case 1: Put(decompressed, at, (color1 | 0xff000000) >>> 0); break;
              case 2: Put(decompressed, at, (color2 | 0xff000000) >>> 0); break;
              // quirk: three-colour index 3 keeps color2's RGB (CE-37).
              case 3: Put(decompressed, at, fourColour ? (color3 | 0xff000000) >>> 0 : color2); break;
            }
          }
        }

        source += 8;
      }
    }
  }
}

/**
 * Decompresses BC2 to BGRA8 (`BcDecompress.cpp:110-155`), every depth slice.
 *
 * @param {number} width Level width in pixels.
 * @param {number} height Level height in pixels.
 * @param {number} depth Level depth in slices.
 * @param {{m_sysMem: Uint8Array, m_sysMemSlicePitch: number}} src The compressed level.
 * @param {Uint8Array} decompressed The BGRA8 destination.
 */
function DecompressBc2(width, height, depth, src, decompressed)
{
  const pitch = width * 4;
  const slice = pitch * height;
  const view = View(src.m_sysMem);

  for (let k = 0; k < depth; ++k)
  {
    let source = src.m_sysMemSlicePitch * k;

    for (let j = 0; j < height; j += 4)
    {
      for (let i = 0; i < width; i += 4)
      {
        const color0 = ImageUtility.convertBGR565A8ToBGRA8(view.getUint16(source + 8, true), 0);
        const color1 = ImageUtility.convertBGR565A8ToBGRA8(view.getUint16(source + 8 + 2, true), 0);
        const colors = [
          color0,
          color1,
          ImageUtility.interpolatedColor(color0, 2, color1, 1, 1, 3),
          ImageUtility.interpolatedColor(color0, 1, color1, 2, 1, 3)
        ];
        const bits = view.getUint32(source + 8 + 4, true);

        for (let y = 0; y < 4; ++y)
        {
          for (let x = 0; x < 4; ++x)
          {
            const at = k * slice + (j + y) * pitch + (x + i) * 4;
            let alphaValue = (view.getUint16(source + y * 2, true) >>> (x * 4)) & 15;
            alphaValue = Math.floor(alphaValue * 255 / 15);

            Put(decompressed, at, (colors[(bits >>> (2 * (4 * y + x))) & 3] | (alphaValue << 24)) >>> 0);
          }
        }

        source += 16;
      }
    }
  }
}

/**
 * Decompresses BC3 to BGRA8 (`BcDecompress.cpp:157-238`), every depth slice.
 *
 * @param {number} width Level width in pixels.
 * @param {number} height Level height in pixels.
 * @param {number} depth Level depth in slices.
 * @param {{m_sysMem: Uint8Array, m_sysMemSlicePitch: number}} src The compressed level.
 * @param {Uint8Array} decompressed The BGRA8 destination.
 */
function DecompressBc3(width, height, depth, src, decompressed)
{
  const pitch = width * 4;
  const slice = pitch * height;
  const bytes = src.m_sysMem;

  for (let k = 0; k < depth; ++k)
  {
    let source = src.m_sysMemSlicePitch * k;

    for (let j = 0; j < height; j += 4)
    {
      for (let i = 0; i < width; i += 4)
      {
        DecompressBc3Block(bytes, source, blockScratch);

        for (let y = 0; y < 4; ++y)
        {
          for (let x = 0; x < 4; ++x)
          {
            Put(decompressed, k * slice + (y + j) * pitch + (x + i) * 4, blockScratch[4 * y + x]);
          }
        }

        source += 16;
      }
    }
  }
}

/**
 * One BC3 block as sixteen packed 0xAARRGGBB pixels, row-major: the body of
 * Carbon's `DecompressBc3` loop (`BcDecompress.cpp:167-232`) for one block.
 *
 * Not a Carbon function: the loop body, factored out so each block is decoded
 * once into sixteen packed pixels before they are placed. Carbon's
 * `ImageUtility::GetPixelColor_BC3` does the same maths for one pixel; a test
 * pins the two together byte for byte.
 *
 * @param {Uint8Array} bytes BC3 data.
 * @param {number} offset Byte offset of the block.
 * @param {Uint32Array} out Sixteen slots to fill.
 * @returns {Uint32Array} `out`.
 */
function DecompressBc3Block(bytes, offset, out)
{
  const alpha = alphaScratch;
  const view = View(bytes);

  alpha[0] = bytes[offset];
  alpha[1] = bytes[offset + 1];

  const mask = offset + 2;
  const alphaMask0 = bytes[mask] | (bytes[mask + 1] << 8) | (bytes[mask + 2] << 16);
  const alphaMask1 = bytes[mask + 3] | (bytes[mask + 4] << 8) | (bytes[mask + 5] << 16);

  if (alpha[0] > alpha[1])
  {
    alpha[2] = Math.floor((6 * alpha[0] + 1 * alpha[1] + 3) / 7);
    alpha[3] = Math.floor((5 * alpha[0] + 2 * alpha[1] + 3) / 7);
    alpha[4] = Math.floor((4 * alpha[0] + 3 * alpha[1] + 3) / 7);
    alpha[5] = Math.floor((3 * alpha[0] + 4 * alpha[1] + 3) / 7);
    alpha[6] = Math.floor((2 * alpha[0] + 5 * alpha[1] + 3) / 7);
    alpha[7] = Math.floor((1 * alpha[0] + 6 * alpha[1] + 3) / 7);
  }
  else
  {
    alpha[2] = Math.floor((4 * alpha[0] + 1 * alpha[1] + 2) / 5);
    alpha[3] = Math.floor((3 * alpha[0] + 2 * alpha[1] + 2) / 5);
    alpha[4] = Math.floor((2 * alpha[0] + 3 * alpha[1] + 2) / 5);
    alpha[5] = Math.floor((1 * alpha[0] + 4 * alpha[1] + 2) / 5);
    alpha[6] = 0;
    alpha[7] = 255;
  }

  const color0 = ImageUtility.convertBGR565A8ToBGRA8(view.getUint16(offset + 8, true), 0);
  const color1 = ImageUtility.convertBGR565A8ToBGRA8(view.getUint16(offset + 8 + 2, true), 0);
  const color2 = ImageUtility.interpolatedColor(color0, 2, color1, 1, 1, 3);
  const color3 = ImageUtility.interpolatedColor(color0, 1, color1, 2, 1, 3);
  const bits = view.getUint32(offset + 8 + 4, true);

  for (let y = 0; y < 4; ++y)
  {
    for (let x = 0; x < 4; ++x)
    {
      const alphaValue = y < 2
        ? alpha[(alphaMask0 >>> ((x + y * 4) * 3)) & 0x7]
        : alpha[(alphaMask1 >>> ((x + (y - 2) * 4) * 3)) & 0x7];
      const alphaBits = (alphaValue << 24) >>> 0;

      let color;
      switch ((bits >>> (2 * (4 * y + x))) & 3)
      {
        case 0: color = color0; break;
        case 1: color = color1; break;
        case 2: color = color2; break;
        default: color = color3; break;
      }

      out[4 * y + x] = (color | alphaBits) >>> 0;
    }
  }

  return out;
}

/**
 * Decompresses one BC1, BC2 or BC3 subresource - every depth slice of it - to
 * BGRA8 (`BcDecompress.cpp:240-270`).
 *
 * Carbon's signature fills a caller's `unique_ptr`, allocating it only when
 * it is empty, and answers whether the format was handled. JavaScript has no
 * reference argument, so the pixels come back instead: a `Uint8Array` of
 * `width * height * depth * 4` bytes, or null for a format this does not
 * decode, where Carbon answers false.
 *
 * @param {number} width Level width in pixels.
 * @param {number} height Level height in pixels.
 * @param {number} depth Level depth in slices.
 * @param {number} format A `PixelFormat` value.
 * @param {{m_sysMem: Uint8Array, m_sysMemSlicePitch: number}} src The compressed level.
 * @param {Uint8Array} [decompressed] A buffer to reuse, as Carbon reuses its
 *   `unique_ptr`; allocated when absent.
 * @returns {Uint8Array|null} The BGRA8 pixels.
 */
export function bcDecompress(width, height, depth, format, src, decompressed = null)
{
  let decode;

  switch (format)
  {
    case PixelFormat.PIXEL_FORMAT_BC1_TYPELESS:
    case PixelFormat.PIXEL_FORMAT_BC1_UNORM:
    case PixelFormat.PIXEL_FORMAT_BC1_UNORM_SRGB:
      decode = DecompressBc1;
      break;
    case PixelFormat.PIXEL_FORMAT_BC2_TYPELESS:
    case PixelFormat.PIXEL_FORMAT_BC2_UNORM:
    case PixelFormat.PIXEL_FORMAT_BC2_UNORM_SRGB:
      decode = DecompressBc2;
      break;
    case PixelFormat.PIXEL_FORMAT_BC3_TYPELESS:
    case PixelFormat.PIXEL_FORMAT_BC3_UNORM:
    case PixelFormat.PIXEL_FORMAT_BC3_UNORM_SRGB:
      decode = DecompressBc3;
      break;
    default:
      return null;
  }

  const out = decompressed ?? new Uint8Array(width * height * depth * 4);
  decode(width, height, depth, src, out);
  return out;
}
