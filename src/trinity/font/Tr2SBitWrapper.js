// Source: trinity/trinity/Font/Tr2SBit.h
// Source: trinity/trinity/Font/Tr2SBit.cpp
// Source: trinity/trinity/Font/Tr2Sbit_Blue.cpp
// Maintained browser-font adapter; native interfaces retain their Carbon names.
import { meta, type, blue } from "#schema";

/**
 * Carbon's `RGBA::BlendOverAlpha` (Tr2FontMeasurer.cpp:1427-1442), for the
 * pixel at `index`: the source colour `col` with alpha `sourceAlpha` over the
 * destination, both straight alpha. A transparent destination or an opaque
 * source is replaced.
 *
 * @param {Uint8Array} bytes Destination RGBA bytes.
 * @param {number} index Byte offset of the pixel.
 * @param {number} col Packed source colour; red in the low byte.
 * @param {number} sourceAlpha Source alpha, 0-255.
 * @returns {void}
 */
function blendOverAlpha(bytes, index, col, sourceAlpha)
{
  const red = col & 255, green = (col >>> 8) & 255, blue = (col >>> 16) & 255;
  const destinationAlpha = bytes[index + 3];

  if (!destinationAlpha || sourceAlpha === 255)
  {
    bytes[index] = red; bytes[index + 1] = green; bytes[index + 2] = blue; bytes[index + 3] = sourceAlpha;
    return;
  }
  if (!sourceAlpha) return;

  const scaledAlpha = 255 * (destinationAlpha + sourceAlpha) - destinationAlpha * sourceAlpha;
  bytes[index] = (bytes[index] * destinationAlpha * (255 - sourceAlpha) + 255 * red * sourceAlpha) / scaledAlpha;
  bytes[index + 1] = (bytes[index + 1] * destinationAlpha * (255 - sourceAlpha) + 255 * green * sourceAlpha) / scaledAlpha;
  bytes[index + 2] = (bytes[index + 2] * destinationAlpha * (255 - sourceAlpha) + 255 * blue * sourceAlpha) / scaledAlpha;
  bytes[index + 3] = scaledAlpha / 255;
}

/** Models Carbon's cached font-glyph wrapper, including placement coordinates and buffer-copy entry points. */
@blue.define({ className: "Tr2SBitWrapper", purpose: "Models Carbon's cached font-glyph wrapper, including placement coordinates and buffer-copy entry points." })
export class Tr2SBitWrapper
{

  /** x (int) [READ] */
  @blue.read
  @type.int32
  x = 0;

  /** y (int) [READ] */
  @blue.read
  @type.int32
  y = 0;

  /** Browser-rasterized equivalent of the native FTC_SBit record. */
  sbit = null;

  /** Face identifier owned by the font manager. */
  faceId = 0;

  /**
   * The pixel size the glyph was rasterized at.
   *
   * Ours: Carbon's wrapper has no such field (Tr2SBit.h:73-78); its
   * `ToBufferWithUnderline` reads the face's underline metrics through
   * `faceId` (Tr2SBit.cpp:80-81). A browser font exposes none, so the
   * underline is estimated from this size instead.
   */
  @meta.ours
  fontSize = 12;

  /** Blue "xOffset" [READ] (Tr2Sbit_Blue.cpp:23-26): GetXOffset. @returns {number} Bitmap left offset. */
  @blue.read
  @type.int32
  @meta.implemented
  get xOffset()
  {
    return this.GetXOffset();
  }

  /** Blue "yOffset" [READ] (Tr2Sbit_Blue.cpp:28-31): GetYOffset. @returns {number} Bitmap top offset. */
  @blue.read
  @type.int32
  @meta.implemented
  get yOffset()
  {
    return this.GetYOffset();
  }

  /** Blue "width" [READ] (Tr2Sbit_Blue.cpp:33-36): GetWidth. @returns {number} Bitmap width. */
  @blue.read
  @type.int32
  @meta.implemented
  get width()
  {
    return this.GetWidth();
  }

  /** Blue "height" [READ] (Tr2Sbit_Blue.cpp:38-41): GetHeight. @returns {number} Bitmap height. */
  @blue.read
  @type.int32
  @meta.implemented
  get height()
  {
    return this.GetHeight();
  }

  /** Blue "xadvance" [READ] (Tr2Sbit_Blue.cpp:43-47): GetXAdvance. @returns {number} Horizontal advance. */
  @blue.read
  @type.int32
  @meta.implemented
  get xadvance()
  {
    return this.GetXAdvance();
  }

  /** Blue "yadvance" [READ] (Tr2Sbit_Blue.cpp:49-53): GetYAdvance. @returns {number} Vertical advance. */
  @blue.read
  @type.int32
  @meta.implemented
  get yadvance()
  {
    return this.GetYAdvance();
  }

  /** Returns the cached glyph width. */
  @meta.implemented
  GetWidth()
  {
    return this.sbit.width;
  }

  /** Returns the cached glyph height. */
  @meta.implemented
  GetHeight()
  {
    return this.sbit.height;
  }

  /** Returns the cached glyph left. */
  @meta.implemented
  GetXOffset()
  {
    return this.sbit.left;
  }

  /** Returns the cached glyph top. */
  @meta.implemented
  GetYOffset()
  {
    return this.sbit.top;
  }

  /** Returns the cached glyph xadvance. */
  @meta.implemented
  GetXAdvance()
  {
    return this.sbit.xadvance;
  }

  /** Returns the cached glyph yadvance. */
  @meta.implemented
  GetYAdvance()
  {
    return this.sbit.yadvance;
  }

  /**
   * Copies browser grayscale coverage with Carbon's clipped, bottom-origin placement.
   * Adapted: typed byte views replace the Python writable-buffer interface.
   */
  @blue.method
  @meta.adapted
  ToBuffer(buffer, width, height, pitch, x, y, color)
  {
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    if (![width, height, pitch].every(value => Number.isInteger(value) && value >= 0) || width * 4 > pitch || height * pitch > bytes.byteLength) throw new RangeError("Invalid glyph destination dimensions.");
    Tr2SBitWrapper.sBit_To_RGBABuffer(bytes, width, height, pitch, this.sbit, x, y, color);
  }

  /**
   * Carbon's free function `SBit_To_RGBABuffer` (declared Tr2SBit.h:14,
   * defined Tr2FontMeasurer.cpp:1459-1567): blends a glyph's coverage into a
   * bottom-origin RGBA buffer, clipped, colour alpha modulated by coverage,
   * blended over the destination.
   *
   * Adapted: a static here, as the casing rule names it; only the 8-bit
   * grayscale branch, since browser sbits are never 1-bit.
   *
   * @param {Uint8Array} bytes Destination RGBA bytes.
   * @param {number} dWidth Destination width in pixels.
   * @param {number} dHeight Destination height in pixels.
   * @param {number} dPitch Destination row pitch in bytes.
   * @param {object} sbit The sbit record.
   * @param {number} left Pen x.
   * @param {number} top Pen y, bottom-origin.
   * @param {number} col Packed colour, as Carbon's `RGBA::col`.
   * @returns {void}
   */
  @meta.adapted
  static sBit_To_RGBABuffer(bytes, dWidth, dHeight, dPitch, sbit, left, top, col)
  {
    left += sbit.left;
    top = dHeight - (top + sbit.top);

    const alpha = col >>> 24;
    for (let row = Math.max(0, -top); row < Math.min(sbit.height, dHeight - top); row++)
    {
      for (let column = Math.max(0, -left); column < Math.min(sbit.width, dWidth - left); column++)
      {
        const gray = sbit.buffer[row * sbit.pitch + column];
        if (!gray) continue;

        blendOverAlpha(bytes, (top + row) * dPitch + (left + column) * 4, col, (alpha * (gray + 1)) >> 8);
      }
    }
  }

  /**
   * Carbon's free function `Underline_To_RGBABuffer` (declared Tr2SBit.h:15,
   * defined Tr2FontMeasurer.cpp:1569-1600): blends a solid underline of the
   * given width and thickness into a bottom-origin RGBA buffer, clipped.
   *
   * Adapted: a static here, as the casing rule names it.
   *
   * @param {Uint8Array} bytes Destination RGBA bytes.
   * @param {number} dWidth Destination width in pixels.
   * @param {number} dHeight Destination height in pixels.
   * @param {number} dPitch Destination row pitch in bytes.
   * @param {number} left Start x.
   * @param {number} top Top y, bottom-origin.
   * @param {number} width Length in pixels.
   * @param {number} thickness Thickness in pixels.
   * @param {number} col Packed colour, as Carbon's `RGBA::col`.
   * @returns {void}
   */
  @meta.adapted
  static underline_To_RGBABuffer(bytes, dWidth, dHeight, dPitch, left, top, width, thickness, col)
  {
    top = dHeight - top;

    for (let line = 0; line < thickness; line++)
    {
      const dLine = top + line;
      if (dLine < 0 || dLine >= dHeight) continue;

      for (let pixel = 0; pixel < width; pixel++)
      {
        const dCol = left + pixel;
        if (dCol < 0 || dCol >= dWidth) continue;

        blendOverAlpha(bytes, dLine * dPitch + dCol * 4, col, col >>> 24);
      }
    }
  }

  /**
   * Draws the glyph and underline with native blending and extra spacing.
   * Adapted: browsers expose no underline metrics; use the same pixel-size
   * estimate as Tr2FontMeasurer, instead of claiming FreeType equivalence.
   *
   * Carbon bug CE-129, Tr2SBit.cpp:80-81: Carbon shifts the FT_Face
   * underline_position/underline_thickness by 6 as if they were 26.6 pixels,
   * but they are font units, so its underline offset and thickness do not
   * scale with the font size. Fixed, operator ruling 2026-10-13: the
   * underline is estimated from the pixel size, which scales.
   *
   * @param {ArrayBuffer|ArrayBufferView} buffer Destination RGBA bytes.
   * @param {number} width Destination width in pixels.
   * @param {number} height Destination height in pixels.
   * @param {number} pitch Destination row pitch in bytes.
   * @param {number} x Pen x.
   * @param {number} y Pen y, bottom-origin.
   * @param {number} color Packed colour.
   * @param {number} extraSpace Extra underline length after the advance.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
  ToBufferWithUnderline(buffer, width, height, pitch, x, y, color, extraSpace)
  {
    this.ToBuffer(buffer, width, height, pitch, x, y, color);
    const underlineWidth = Math.max(0, this.sbit.xadvance + extraSpace);
    const thickness = Math.max(1, Math.round(this.fontSize / 14));
    const position = -Math.max(1, Math.round(this.fontSize / 10));
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    Tr2SBitWrapper.underline_To_RGBABuffer(bytes, width, height, pitch, x, y + position, underlineWidth, thickness, color);
  }

}
