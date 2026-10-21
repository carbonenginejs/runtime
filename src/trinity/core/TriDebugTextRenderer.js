// Source: trinity/trinity/TriDebugTextRenderer.h
// Source: trinity/trinity/TriDebugTextRenderer.cpp
//
// Queues debug text and draws each entry by rasterising it into a temporary
// texture and blitting that into the current render target.
//
// Carbon has two rasterisers. On Win32 it draws with GDI fonts into an
// offscreen DIB; elsewhere it copies glyphs from the baked bitmaps in
// TriDebugTextRendererBitmaps.h. A browser has no GDI, so this is the baked
// path (cpp:254-325) - Carbon's own non-Windows code, not a substitute.
import { blue, meta } from "#schema";
import { color as colorMath } from "#math/color";
import { formatMessage } from "../../global/logging/ccpLog.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { ALResult, Tr2TextureAL, Tr2TextureSubresource, Tr2BitmapDimensions } from "#trinityal";
import { Tr2Renderer } from "./Tr2Renderer.js";
import { s_charHeight, s_charOffsets, s_charPixels, s_charPixelsArraySizes, s_charWidths } from "./TriDebugTextRendererBitmaps.js";

/** TriDebugFontStyle (blue/include/ITr2DebugRenderer2.h:26-34). */
export const TriDebugFontStyle = {
  TRI_DFS_LEFT: 0x00000000,
  TRI_DFS_CENTER: 0x00000001,
  TRI_DFS_RIGHT: 0x00000002,
  TRI_DFS_TOP: 0x00000000,
  TRI_DFS_BOTTOM: 0x00000008,
  TRI_DFS_VCENTER: 0x00000004
};

/** TriDebugFont (blue/include/ITr2DebugRenderer2.h:19-24). */
export const TriDebugFont = {
  TRI_DBG_FONT_SMALL: 0,
  TRI_DBG_FONT_MEDIUM: 1,
  TRI_DBG_FONT_LARGE: 2
};

/** Vprintf's BUFFER_SIZE (cpp:67): formatted text is truncated to 1023 characters. */
const BUFFER_SIZE = 1024;

/**
 * Carbon vsnprintf_s( buffer, BUFFER_SIZE, _TRUNCATE, msg, args ), through the
 * runtime's one printf implementation (CcpLog's).
 * @param {string} msg
 * @param {Array<*>} args
 * @returns {string}
 */
function FormatTruncated(msg, args)
{
  return formatMessage(msg, args).slice(0, BUFFER_SIZE - 1);
}

/** Queues and draws debug text (TriDebugTextRenderer.h:19-79). */
@meta.carbon("TriDebugTextRenderer")
export class TriDebugTextRenderer
{

  /** m_entries: { font, rect, format, color, text } records, rect as { left, top, right, bottom }. */
  _entries = [];

  /** m_texture (Tr2TextureAL): the temporary text texture. */
  _texture = new Tr2TextureAL();

  /**
   * Carbon Printf (cpp:93-101): formats and queues text for the next Render.
   * @param {number} font A TriDebugFont value.
   * @param {{left: number, top: number, right: number, bottom: number}} rect
   * @param {number} format TriDebugFontStyle bits.
   * @param {Float32Array} color
   * @param {string} msg printf format.
   * @param {...*} args
   */
  @blue.method
  @meta.implemented
  Printf(font, rect, format, color, msg, ...args)
  {
    this.Vprintf(font, rect, format, color, msg, args);
  }

  /**
   * Carbon PrintfImmediate (cpp:104-111): formats and draws at once.
   * @param {Tr2RenderContext} renderContext
   * @param {number} font A TriDebugFont value.
   * @param {{left: number, top: number, right: number, bottom: number}} rect
   * @param {number} format TriDebugFontStyle bits.
   * @param {Float32Array} color
   * @param {string} msg printf format.
   * @param {...*} args
   */
  @blue.method
  @meta.implemented
  PrintfImmediate(renderContext, font, rect, format, color, msg, ...args)
  {
    this.VprintfImmediate(renderContext, font, rect, format, color, msg, args);
  }

  /**
   * Carbon Vprintf (cpp:64-80): the va_list form of Printf; the arguments
   * arrive as an array.
   * @param {number} font
   * @param {{left: number, top: number, right: number, bottom: number}} rect
   * @param {number} format
   * @param {Float32Array} color
   * @param {string} msg
   * @param {Array<*>} args
   */
  @blue.method
  @meta.implemented
  Vprintf(font, rect, format, color, msg, args)
  {
    this._entries.push({
      font,
      rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      format,
      // e.m_color = color (cpp:75): the entry keeps its own copy.
      color: colorMath.fromValues(color[0], color[1], color[2], color[3]),
      text: FormatTruncated(msg, args)
    });
  }

  /**
   * Carbon VprintfImmediate (cpp:82-90).
   * @param {Tr2RenderContext} renderContext
   * @param {number} font
   * @param {{left: number, top: number, right: number, bottom: number}} rect
   * @param {number} format
   * @param {Float32Array} color
   * @param {string} msg
   * @param {Array<*>} args
   */
  @blue.method
  @meta.implemented
  VprintfImmediate(renderContext, font, rect, format, color, msg, args)
  {
    this._DrawText(renderContext, font, FormatTruncated(msg, args), rect, format, color);
  }

  /**
   * Carbon Render (cpp:113-119): draws every queued entry.
   * @param {Tr2RenderContext} renderContext
   */
  @blue.method
  @meta.implemented
  Render(renderContext)
  {
    for (const entry of this._entries)
    {
      this._DrawText(renderContext, entry.font, entry.text, entry.rect, entry.format, entry.color);
    }
  }

  /** Carbon Clear (cpp:121-128). */
  @blue.method
  @meta.implemented
  Clear()
  {
    this._entries.length = 0;
  }

  /**
   * Carbon OnPrepareResources (cpp:135-138): nothing to prepare; the text
   * texture is created on first draw.
   * @returns {boolean} True, always.
   */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    return true;
  }

  /**
   * Carbon GetDescription (TriDebugTextRenderer.h:43-48, TRINITYDEV): the
   * device-resource description.
   *
   * Adapted: returned rather than written to an output string, as the other
   * resource descriptions are (TriDebugResourceHelper.GetDescription).
   * @returns {string} "<TriDebugFont>".
   */
  @blue.method
  @meta.adapted
  GetDescription()
  {
    return "<TriDebugFont>";
  }

  /**
   * Carbon ReleaseResources (cpp:130-133): drops the text texture.
   * @param {number} _s TriStorage flags.
   */
  @blue.method
  @meta.implemented
  ReleaseResources(_s)
  {
    this._texture = new Tr2TextureAL();
  }

  /**
   * Carbon DrawText, baked-bitmap path (cpp:146-152, 254-353): measures the
   * text in glyph cells, copies each glyph's coverage into the texture as
   * premultiplied B8G8R8A8 (alpha is the coverage, the colour's alpha is
   * ignored), places it in the rect by the format bits, and blits it.
   * Characters outside 1..127 are skipped, as Carbon's signed `*ch > 0` does.
   * @param {Tr2RenderContext} renderContext
   * @param {number} font
   * @param {string} string
   * @param {{left: number, top: number, right: number, bottom: number}} rect
   * @param {number} format
   * @param {Float32Array} vecColor
   */
  _DrawText(renderContext, font, string, rect, format, vecColor)
  {
    const color = colorMath.toARGB(vecColor);

    if (!Tr2Renderer.IsResourceCreationAllowed())
    {
      return;
    }

    const charHeight = s_charHeight[font];
    const widths = s_charWidths[font];

    // Measure.
    const size = { left: 0, top: 0, right: 0, bottom: charHeight };
    let rowWidth = 0;
    for (let c = 0; c < string.length; c++)
    {
      const ch = string.charCodeAt(c);
      if (ch > 0 && ch < 128)
      {
        if (ch === 10)
        {
          size.bottom += charHeight;
          if (size.right < rowWidth)
          {
            size.right = rowWidth;
          }
          rowWidth = 0;
        }
        else
        {
          rowWidth += widths[ch];
        }
      }
    }
    if (size.right < rowWidth)
    {
      size.right = rowWidth;
    }

    // Grow the texture.
    if (!this._texture.IsValid() || this._texture.GetWidth() < size.right || this._texture.GetHeight() < size.bottom)
    {
      const created = this._texture.Create__GpuUsageCpuUsage(
        Tr2BitmapDimensions.create__WidthHeightMipCountFormat(size.right, size.bottom, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
        Tr2GpuUsage.SHADER_RESOURCE,
        Tr2CpuUsage.WRITE_OFTEN,
        renderContext);
      if (created !== ALResult.S_OK)
      {
        return;
      }
    }

    // Copy the glyphs.
    const b = color & 0xff;
    const g = (color >>> 8) & 0xff;
    const r = (color >>> 16) & 0xff;
    const mapped = this._texture.MapForWriting(Tr2TextureSubresource.create__MipLevel(0), renderContext);
    if (mapped.result !== ALResult.S_OK)
    {
      return;
    }

    const textureData = new DataView(mapped.data.buffer, mapped.data.byteOffset, mapped.data.byteLength);
    const pitch = mapped.pitch;
    const pixels = s_charPixels[font];
    const offsets = s_charOffsets[font];
    const pixelWidths = Math.floor(s_charPixelsArraySizes[font] / charHeight);
    let offsetX = 0;
    let offsetY = 0;
    for (let c = 0; c < string.length; c++)
    {
      const index = string.charCodeAt(c);
      if (index > 0 && index < 128)
      {
        if (index === 10)
        {
          offsetY += charHeight;
          offsetX = 0;
        }
        else
        {
          for (let j = 0; j < charHeight; ++j)
          {
            const rowStart = (j + offsetY) * pitch + offsetX * 4;
            for (let i = 0; i < widths[index]; ++i)
            {
              const alpha = pixels[pixelWidths * j + i + offsets[index]];
              const texel = ((b * alpha) >>> 8) |
                (((g * alpha) >>> 8) << 8) |
                (((r * alpha) >>> 8) << 16) |
                (alpha << 24);
              textureData.setUint32(rowStart + i * 4, texel >>> 0, true);
            }
          }
          // Carbon advances only past a drawn glyph: the newline branch has
          // already reset offsetX, then adds the newline's width (cpp:321).
        }
        offsetX += widths[index];
      }
    }
    this._texture.UnmapForWriting(renderContext);

    // Place it in the rect (cpp:327-349).
    let x;
    let y;
    if (format & TriDebugFontStyle.TRI_DFS_RIGHT)
    {
      x = rect.right - size.right;
    }
    else if (format & TriDebugFontStyle.TRI_DFS_CENTER)
    {
      x = Math.trunc((rect.right + rect.left - size.right) / 2);
    }
    else
    {
      x = rect.left;
    }
    if (format & TriDebugFontStyle.TRI_DFS_BOTTOM)
    {
      y = rect.bottom - size.bottom;
    }
    else if (format & TriDebugFontStyle.TRI_DFS_VCENTER)
    {
      y = Math.trunc((rect.bottom + rect.top - size.bottom) / 2);
    }
    else
    {
      y = rect.top;
    }

    // Blit it (cpp:351-355).
    const esm = renderContext.GetEffectStateManager();
    esm.ApplyStandardStates(RenderingMode.RM_SPRITE2D);
    esm.PushViewport();
    esm.SetViewport({ x, y, width: size.right, height: size.bottom, minZ: 0, maxZ: 1 });
    Tr2Renderer.drawTexture(renderContext, this._texture, {
      tlTexCoord: [ 0, 0 ],
      brTexCoord: [ size.right / this._texture.GetWidth(), size.bottom / this._texture.GetHeight() ]
    });
    esm.PopViewport();
  }
}
