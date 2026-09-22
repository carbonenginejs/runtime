// Source: imageio/include/ImageUtility.h
// Source: imageio/ImageUtility.cpp
//
// Carbon's `ImageUtility` namespace: single-pixel reads from BGRA, BGRX, R8,
// BC1 and BC3 data, returned as one packed 0xAARRGGBB value. `HostBitmap`'s
// GetAverageColor and GetPixel are its only callers. A namespace of free
// functions becomes a class of statics, with Carbon's names kept.
//
// Values are read little-endian, as the x86/ARM targets Carbon ships on do.
//
// TWO CARBON BUGS ARE REPRODUCED HERE, NOT FIXED (see
// /docs/research/carbon-known-defects.md). Art and thresholds were tuned
// against the shipped behaviour:
//
// 1. GetPixelColor_BC3 computes the block index and never uses it: alpha and
//    colour are read from `source`, so every pixel is read from block 0
//    (ImageUtility.cpp:101-102 vs 106-110, 130-134).
// 2. GetPixelColor_BC3 builds its two 24-bit alpha-index masks from `const
//    char` bytes (`auto alphaMask = source + 2`, :108-110). `char` is signed on
//    MSVC, so a byte >= 0x80 sign-extends into the bits above it before the OR.

/** Carbon's `ImageUtility` namespace (imageio/ImageUtility.cpp). */
export class ImageUtility
{

  /**
   * Blend two packed RGB colours per channel (ImageUtility.cpp:9-22).
   *
   * @param {number} color0 Packed 0x00RRGGBB.
   * @param {number} weight0 Weight of color0.
   * @param {number} color1 Packed 0x00RRGGBB.
   * @param {number} weight1 Weight of color1.
   * @param {number} offset Rounding offset added before the divide.
   * @param {number} divisor Divisor.
   * @returns {number} Packed 0x00RRGGBB.
   */
  static InterpolatedColor(color0, weight0, color1, weight1, offset, divisor)
  {
    const r0 = (color0 >>> 16) & 0xff, g0 = (color0 >>> 8) & 0xff, b0 = color0 & 0xff;
    const r1 = (color1 >>> 16) & 0xff, g1 = (color1 >>> 8) & 0xff, b1 = color1 & 0xff;

    const r = Math.floor((r0 * weight0 + r1 * weight1 + offset) / divisor) & 0xff;
    const g = Math.floor((g0 * weight0 + g1 * weight1 + offset) / divisor) & 0xff;
    const b = Math.floor((b0 * weight0 + b1 * weight1 + offset) / divisor) & 0xff;

    return ((r << 16) | (g << 8) | b) >>> 0;
  }

  /**
   * Expand a BGR565 value and an 8-bit alpha to 0xAARRGGBB (ImageUtility.cpp:24-30).
   *
   * @param {number} color BGR565 value (or an interpolation of two, see GetPixelColor_BC1).
   * @param {number} alpha Alpha, 0-255.
   * @returns {number} Packed 0xAARRGGBB.
   */
  static ConvertBGR565A8ToBGRA8(color, alpha)
  {
    return (
      Math.floor((color & 0x1f) * 255 / 31) |
      (Math.floor(((color >>> 5) & 0x3f) * 255 / 63) << 8) |
      (Math.floor(((color >>> 11) & 0x1f) * 255 / 31) << 16) |
      (alpha << 24)
    ) >>> 0;
  }

  /**
   * One BGRA pixel as 0xAARRGGBB (ImageUtility.cpp:32-35).
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} pitch Row pitch in bytes.
   * @param {Uint8Array} source Pixel data.
   * @returns {number} Packed 0xAARRGGBB.
   */
  static GetPixelColor_BGRA(x, y, pitch, source)
  {
    const at = y * pitch + x * 4;

    return (source[at] | (source[at + 1] << 8) | (source[at + 2] << 16) | (source[at + 3] << 24)) >>> 0;
  }

  /**
   * One R8 pixel, placed in the red channel with zero alpha (ImageUtility.cpp:37-40).
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} pitch Row pitch in bytes.
   * @param {Uint8Array} source Pixel data.
   * @returns {number} Packed 0x00RR0000.
   */
  static GetPixelColor_R(x, y, pitch, source)
  {
    return (source[y * pitch + x] << 16) >>> 0;
  }

  /**
   * One BGRX pixel as 0xFFRRGGBB (ImageUtility.cpp:42-45).
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} pitch Row pitch in bytes.
   * @param {Uint8Array} source Pixel data.
   * @returns {number} Packed 0xFFRRGGBB.
   */
  static GetPixelColor_BGRX(x, y, pitch, source)
  {
    return (ImageUtility.GetPixelColor_BGRA(x, y, pitch, source) | 0xff000000) >>> 0;
  }

  /**
   * One BC1 pixel as 0xAARRGGBB (ImageUtility.cpp:47-97).
   *
   * Faithful to Carbon, including two choices a textbook decoder would not
   * make: `pitch` is unused (the block row stride comes from `width`), and the
   * two interpolated palette entries are computed on the PACKED 565 value
   * (`(2 * color0 + color1) / 3`) rather than per channel.
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} width Image width in pixels.
   * @param {number} _pitch Unused, as in Carbon.
   * @param {Uint8Array} source BC1 blocks.
   * @returns {number} Packed 0xAARRGGBB.
   */
  static GetPixelColor_BC1(x, y, width, _pitch, source)
  {
    // ((width + 3) / 4) is a ceiling (ImageUtility.cpp:49-50).
    const index = (Math.floor(x / 4) + Math.floor(y / 4) * Math.floor((width + 3) / 4)) * 8;
    const color0 = source[index] | (source[index + 1] << 8);
    const color1 = source[index + 2] | (source[index + 3] << 8);
    const bits = (source[index + 4] | (source[index + 5] << 8) | (source[index + 6] << 16) | (source[index + 7] << 24)) >>> 0;

    const selector = (bits >>> (2 * (4 * (y % 4) + (x % 4)))) & 3;
    const convert = ImageUtility.ConvertBGR565A8ToBGRA8;

    if (color0 > color1)
    {
      switch (selector)
      {
        case 0: return convert(color0, 255);
        case 1: return convert(color1, 255);
        case 2: return convert(Math.floor((2 * color0 + color1) / 3), 255);
        default: return convert(Math.floor((color0 + 2 * color1) / 3), 255);
      }
    }

    switch (selector)
    {
      case 0: return convert(color0, 255);
      case 1: return convert(color1, 255);
      case 2: return convert(Math.floor((color0 + color1) / 2), 255);
      default: return convert(Math.floor((color0 + 2 * color1) / 3), 0);
    }
  }

  /**
   * One BC3 pixel as 0xAARRGGBB (ImageUtility.cpp:99-165).
   *
   * Reproduces both Carbon bugs in the file header: every read is from block 0,
   * and the alpha-index masks are built from signed bytes.
   *
   * @param {number} x Column.
   * @param {number} y Row.
   * @param {number} width Image width in pixels.
   * @param {number} _pitch Unused, as in Carbon.
   * @param {Uint8Array} source BC3 blocks.
   * @returns {number} Packed 0xAARRGGBB.
   */
  static GetPixelColor_BC3(x, y, width, _pitch, source)
  {
    // bug: Carbon computes the block index here (ImageUtility.cpp:101-102)
    // and never uses it; every read below is from block 0.

    const alpha = new Array(8);
    alpha[0] = source[0];
    alpha[1] = source[1];

    // bug: `char` bytes, sign-extended on MSVC before the shifts and ORs.
    const s = i => (source[2 + i] << 24) >> 24;
    const alphaMask0 = (s(0) | (s(1) << 8) | (s(2) << 16)) >>> 0;
    const alphaMask1 = (s(3) | (s(4) << 8) | (s(5) << 16)) >>> 0;

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

    const color0 = ImageUtility.ConvertBGR565A8ToBGRA8(source[8] | (source[9] << 8), 0);
    const color1 = ImageUtility.ConvertBGR565A8ToBGRA8(source[10] | (source[11] << 8), 0);
    const color2 = ImageUtility.InterpolatedColor(color0, 2, color1, 1, 1, 3);
    const color3 = ImageUtility.InterpolatedColor(color0, 1, color1, 2, 1, 3);
    const bits = (source[12] | (source[13] << 8) | (source[14] << 16) | (source[15] << 24)) >>> 0;

    const px = x % 4;
    const py = y % 4;

    const alphaValue = py < 2
      ? alpha[(alphaMask0 >>> ((px + py * 4) * 3)) & 0x7]
      : alpha[(alphaMask1 >>> ((px + (py - 2) * 4) * 3)) & 0x7];

    const alphaBits = (alphaValue << 24) >>> 0;

    switch ((bits >>> (2 * (4 * py + px))) & 3)
    {
      case 0: return (color0 | alphaBits) >>> 0;
      case 1: return (color1 | alphaBits) >>> 0;
      case 2: return (color2 | alphaBits) >>> 0;
      default: return (color3 | alphaBits) >>> 0;
    }
  }

}
