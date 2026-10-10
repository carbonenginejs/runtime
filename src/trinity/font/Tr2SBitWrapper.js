// Source: trinity/trinity/Font/Tr2SBit.h
// Maintained browser-font adapter; native interfaces retain their Carbon names.
import { meta } from "#schema";

/** Models Carbon's cached font-glyph wrapper, including placement coordinates and buffer-copy entry points. */
@meta.define({ className: "Tr2SBitWrapper", family: "font", purpose: "Models Carbon's cached font-glyph wrapper, including placement coordinates and buffer-copy entry points." })
export class Tr2SBitWrapper
{

  /** x (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  x = 0;

  /** y (int) [READ] */
  @meta.blue.read
  @meta.type.int32
  y = 0;

  /** Browser-rasterized equivalent of the native FTC_SBit record. */
  sbit = null;

  /** Face identifier owned by the font manager. */
  faceId = 0;

  /** Pixel size retained for browser underline metrics. */
  fontSize = 12;

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
  @meta.blue.method
  @meta.adapted
  ToBuffer(buffer, width, height, pitch, x, y, color)
  {
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    if (![width, height, pitch].every(value => Number.isInteger(value) && value >= 0) || width * 4 > pitch || height * pitch > bytes.byteLength) throw new RangeError("Invalid glyph destination dimensions.");
    const bitmap = this.sbit;
    const left = x + bitmap.left, top = height - (y + bitmap.top);
    const red = color & 255, green = (color >>> 8) & 255, blue = (color >>> 16) & 255, alpha = color >>> 24;
    for (let row = Math.max(0, -top); row < Math.min(bitmap.height, height - top); row++)
    {
      for (let column = Math.max(0, -left); column < Math.min(bitmap.width, width - left); column++)
      {
        const gray = bitmap.buffer[row * bitmap.pitch + column];
        if (!gray) continue;

        const sourceAlpha = (alpha * (gray + 1)) >> 8;
        const index = (top + row) * pitch + (left + column) * 4;
        const destinationAlpha = bytes[index + 3];
        if (!destinationAlpha || sourceAlpha === 255)
        {
          bytes[index] = red; bytes[index + 1] = green; bytes[index + 2] = blue; bytes[index + 3] = sourceAlpha;
        }
        else if (sourceAlpha)
        {
          const scaledAlpha = 255 * (destinationAlpha + sourceAlpha) - destinationAlpha * sourceAlpha;
          bytes[index] = (bytes[index] * destinationAlpha * (255 - sourceAlpha) + 255 * red * sourceAlpha) / scaledAlpha;
          bytes[index + 1] = (bytes[index + 1] * destinationAlpha * (255 - sourceAlpha) + 255 * green * sourceAlpha) / scaledAlpha;
          bytes[index + 2] = (bytes[index + 2] * destinationAlpha * (255 - sourceAlpha) + 255 * blue * sourceAlpha) / scaledAlpha;
          bytes[index + 3] = scaledAlpha / 255;
        }
      }
    }
  }

  /**
   * Draws the glyph and underline with native blending and extra spacing.
   * Adapted: browsers expose no underline metrics; use the same pixel-size
   * estimate as Tr2FontMeasurer, instead of claiming FreeType equivalence.
   */
  @meta.blue.method
  @meta.adapted
  ToBufferWithUnderline(buffer, width, height, pitch, x, y, color, extraSpace)
  {
    this.ToBuffer(buffer, width, height, pitch, x, y, color);
    const underlineWidth = Math.max(0, this.sbit.xadvance + extraSpace);
    const thickness = Math.max(1, Math.round(this.fontSize / 14));
    const position = -Math.max(1, Math.round(this.fontSize / 10));
    const underline = new Tr2SBitWrapper();
    underline.sbit = { width: underlineWidth, height: thickness, left: 0, top: 0,
      pitch: underlineWidth, buffer: new Uint8Array(underlineWidth * thickness).fill(255) }; // alloc: variable-size glyph pixels retained by the text cache
    underline.ToBuffer(buffer, width, height, pitch, x, y + position, color);
  }

}
