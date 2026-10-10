// Source: trinity/trinity/Font/Tr2FontMeasurer.h
// Source: trinity/trinity/Font/Tr2FontMeasurer.cpp
// Browser-font adaptation: fallback families and underline metrics are browser-specific.
import { Tr2FontManager, g_fontManager } from "./Tr2FontManager.js";
import { Tr2SBitWrapper } from "./Tr2SBitWrapper.js";
import { GetBytesPerPixel } from "#consts/render-context";
import { Tr2TextureSubresource, Failed } from "#trinityal";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2Sprite2dD3DVertex } from "../sprite2d/Tr2Sprite2dD3DVertex.js";
import { Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { meta } from "#schema";

/** Accumulates cursor position, vertical metrics, spacing, limits, and decoration bounds while measuring laid-out text. */
@meta.define({ className: "Tr2FontMeasurer", family: "font", purpose: "Accumulates cursor position, vertical metrics, spacing, limits, and decoration bounds while measuring laid-out text." })
export class Tr2FontMeasurer
{

  /** m_ascender (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  ascender = 0;

  /** m_cursorX (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  cursorX = 0;

  /** m_cursorY (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  cursorY = 0;

  /** m_descender (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  descender = 0;

  /** m_letterSpace (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  letterSpace = 1;

  /** m_limit (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  limit = 0;

  /** m_ascender (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  get asc() { return this.ascender; }
  /** Sets the measured ascender. */
  set asc(value) { this.ascender = value; }

  /** m_descender (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  get des() { return this.descender; }
  /** Sets the measured descender. */
  set des(value) { this.descender = value; }

  /** m_underline (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  underline = false;

  _renderData = [];
  _committedRenderData = [];
  _changeListeners = new Set();
  _font = "";
  _fontSize = 12;
  _color = 0xffffffff;
  _currentAscender = 0;
  _currentDescender = 0;

  /** Browser adapter lazily initializes the native singleton in this JS realm. */
  constructor()
  {
    if (!g_fontManager) Tr2FontManager.initialize();
  }

  /** CSS font family used by the browser backend. */
  @meta.blue.readwrite
  @meta.type.string
  get font() { return this.GetFont(); }
  /** Selects the font family for subsequent text. */
  set font(value) { this.SetFont(value); }

  /** Requested pixel size. */
  @meta.blue.readwrite
  @meta.type.int32
  get fontSize() { return this.GetFontSize(); }
  /** Sets the pixel size for subsequent text. */
  set fontSize(value) { this.SetFontSize(value); }

  /** Packed little-endian RGBA color for subsequently added text. */
  @meta.blue.readwrite
  @meta.type.int32
  get color() { return this.GetColor(); }
  /** Sets the packed color for subsequent text. */
  set color(value) { this.SetColor(value); }

  /** Selects the CSS family for subsequently added text. */
  @meta.adapted
  SetFont(value)
  {
    if (value === this._font) return;
    this._font = value;
    this._currentAscender = this._currentDescender = 0;
  }

  /** Returns the selected CSS family. */
  @meta.implemented
  GetFont() { return this._font; }

  /** Selects the pixel size for subsequently added text. */
  @meta.implemented
  SetFontSize(value)
  {
    if (value === this._fontSize) return;
    this._fontSize = value;
    this._currentAscender = this._currentDescender = 0;
  }

  /** Returns the selected pixel size. */
  @meta.implemented
  GetFontSize() { return this._fontSize; }

  /** Reads the native signed packed color. */
  @meta.implemented
  GetColor() { return this._color | 0; }

  /** Stores the packed color for subsequently added segments. */
  @meta.implemented
  SetColor(value) { this._color = value >>> 0; }

  /**
   * Adds a cancellable segment using native advance, spacing and limit rules.
   * Adapted: browser fallback handles missing glyphs; JS Unicode code points replace
   * native wchar_t units. Browser fonts expose no underline metrics, so thickness
   * and offset use pixel-size estimates. Native AddText does not apply pair kerning.
   */
  @meta.blue.method
  @meta.adapted
  AddText(text)
  {
    const face = g_fontManager.GetFaceID(this._font || "sans-serif");
    const metrics = g_fontManager.LookupMetricsFromScript(face, this._fontSize, this._fontSize);
    this._currentAscender = metrics[0]; this._currentDescender = metrics[1];
    this.ascender = Math.max(this.ascender, metrics[0]);
    this.descender = Math.min(this.descender, metrics[1]);
    const segment = { prevCursorX: this.cursorX, bitmaps: [], color: this._color, underline: this.underline,
      underlinePosition: -Math.max(1, Math.round(this._fontSize / 10)), underlineThickness: Math.max(1, Math.round(this._fontSize / 14)) };
    this._renderData.push(segment);
    for (const character of text)
    {
      const code = character.codePointAt(0);
      if (code === 0) break;
      const bitmap = g_fontManager.LookupSBit(face, this._fontSize, this._fontSize, code);
      const next = this.cursorX + bitmap.GetXAdvance() + this.letterSpace;
      if (this.limit && next > this.limit) break;
      bitmap.x = this.cursorX; bitmap.y = this.cursorY;
      segment.bitmaps.push(bitmap);
      this.cursorX = next;
    }

    return segment.bitmaps.length;
  }

  /** Commits pending segments with a placement offset and notifies text sprites. */
  @meta.blue.method
  @meta.implemented
  CommitText(shiftX, shiftY)
  {
    for (const segment of this._renderData)
    {
      for (const bitmap of segment.bitmaps) { bitmap.x += shiftX; bitmap.y += shiftY; }
      segment.ascender = this.ascender; segment.descender = this.descender;
      this._committedRenderData.push(segment);
    }
    this._renderData.length = 0;
    this.ascender = this._currentAscender; this.descender = this._currentDescender;
    this._NotifyListenersOfChange();
  }

  /** Cancels only the latest uncommitted segment and restores its starting cursor. */
  @meta.blue.method
  @meta.implemented
  CancelLastText()
  {
    const segment = this._renderData.pop();
    if (segment) this.cursorX = segment.prevCursorX;
  }

  /** Returns whether committed segments exist, including empty segments. */
  @meta.blue.method
  @meta.implemented
  HasCommittedText() { return this._committedRenderData.length !== 0; }

  /** Returns whether pending segments exist. */
  @meta.blue.method
  @meta.implemented
  HasUncommittedText() { return this._renderData.length !== 0; }

  /** Clears segments and cursor/metric state, retaining font settings. */
  @meta.blue.method
  @meta.implemented
  Reset()
  {
    this.ClearSprites();
    this.cursorX = this.cursorY = this.ascender = this.descender = 0;
    this._renderData.length = this._committedRenderData.length = 0;
    this._NotifyListenersOfChange();
  }

  /** Native single-line index lookup, including its behavior in spacing gaps. */
  @meta.blue.method
  @meta.implemented
  GetIndexAtPos(x)
  {
    if (x < 0) return 0;
    let index = 0;
    for (const segment of this._committedRenderData)
    {
      for (const bitmap of segment.bitmaps)
      {
        if (x >= bitmap.x && x <= bitmap.x + bitmap.GetXAdvance()) return index;
        index++;
      }
    }
    return index;
  }

  /** Native width lookup sums advances, deliberately excluding letter spacing. */
  @meta.blue.method
  @meta.implemented
  GetWidthAtIndex(index)
  {
    let current = 0, width = 0;
    for (const segment of this._committedRenderData)
    {
      for (const bitmap of segment.bitmaps)
      {
        if (current === index) return width;
        width += bitmap.GetXAdvance(); current++;
      }
    }
    return width;
  }

  /** Returns the native pre-preparation sprite vertex budget. */
  @meta.implemented
  GetVertexCount()
  {
    if (this._vertices) return this._vertices.length;
    let count = 0;
    for (const segment of this._committedRenderData) count += segment.bitmaps.length + (segment.underline ? 1 : 0);
    return count * 4;
  }

  /** Registers a text-sprite invalidation listener. */
  @meta.implemented
  RegisterForChangeNotification(target) { this._changeListeners.add(target); }

  /** Removes a text-sprite invalidation listener. */
  @meta.implemented
  UnregisterForChangeNotification(target) { this._changeListeners.delete(target); }

  /** Notifies each native font-measurer target. */
  @meta.implemented
  _NotifyListenersOfChange()
  {
    for (const target of this._changeListeners) target.FontMeasurerChanged(this);
  }

  /**
   * Renders committed browser coverage with native top-down overwrite semantics.
   * Adapted: writable byte views replace raw pointers; only grayscale browser sbits exist.
   */
  @meta.adapted
  _DrawToBuffer(width, height, buffer, pitch)
  {
    g_fontManager.ClearBuffer(buffer, width, height, pitch);
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    const output = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (const segment of this._committedRenderData)
    {
      for (const bitmap of segment.bitmaps)
      {
        const glyph = bitmap.sbit, left = bitmap.x + glyph.left, top = bitmap.y - glyph.top;
        for (let y = Math.max(0, -top); y < Math.min(glyph.height, height - top); y++)
        {
          for (let x = Math.max(0, -left); x < Math.min(glyph.width, width - left); x++)
          {
            const coverage = glyph.buffer[y * glyph.pitch + x];
            if (!coverage) continue;
            const alpha = (coverage * ((segment.color >>> 24) + 1)) >> 8;
            output.setUint32((top + y) * pitch + (left + x) * 4, ((segment.color & 0xffffff) | (alpha << 24)) >>> 0, true);
          }
        }
        if (segment.underline)
        {
          const underline = new Tr2SBitWrapper();
          const underlineWidth = glyph.xadvance;
          underline.sbit = { width: underlineWidth, height: segment.underlineThickness, left: 0, top: 0,
            pitch: underlineWidth, buffer: new Uint8Array(underlineWidth * segment.underlineThickness).fill(255) }; // alloc: variable-size glyph pixels retained by the text cache
          underline.ToBuffer(bytes, width, height, pitch, bitmap.x, height - bitmap.y + segment.underlinePosition, segment.color);
        }
      }
    }
  }

  /** Renders committed text into a valid four-byte host bitmap. */
  @meta.blue.method
  @meta.implemented
  DrawToHostBitmap(bitmap)
  {
    if (!bitmap || !bitmap.IsValid() || GetBytesPerPixel(bitmap.GetFormat()) !== 4) return;
    this._DrawToBuffer(bitmap.GetWidth(), bitmap.GetHeight(), bitmap.GetRawData(), bitmap.GetPitch());
  }

  /** Writes to a mapped texture and always releases the mapping. */
  @meta.blue.method
  @meta.adapted
  DrawToTexture(resource)
  {
    if (!resource) return;
    const texture = resource.GetTexture();
    if (!texture || !texture.IsValid() || GetBytesPerPixel(texture.GetFormat()) !== 4) return;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const mapping = texture.MapForWriting(Tr2TextureSubresource.ForMipLevel(0), context);
    if (Failed(mapping.result)) return;
    try { this._DrawToBuffer(resource.GetWidth(), resource.GetHeight(), mapping.data, mapping.pitch); }
    finally { texture.UnmapForWriting(context); }
  }

  /** Draws through the native atlas lock contract, expressed as a JS result record. */
  @meta.blue.method
  @meta.adapted
  DrawToAtlasTexture(texture)
  {
    if (!texture) return;
    const mapping = texture.LockBuffer();
    if (!mapping) return;
    try { this._DrawToBuffer(texture.GetWidth(), texture.GetHeight(), mapping.data, mapping.pitch); }
    finally { texture.UnlockBuffer(); }
  }

  _fadeLeftStart = -3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeLeftStart() { return this.GetFadeLeftStart(); }
  /** Sets the left fade start and invalidates committed text. */
  set fadeLeftStart(value) { this.SetFadeLeftStart(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeLeftStart() { return this._fadeLeftStart; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeLeftStart(value)
  {
    this._fadeLeftStart = value;
    this._NotifyListenersOfChange();
  }

  _fadeLeftEnd = -3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeLeftEnd() { return this.GetFadeLeftEnd(); }
  /** Sets the left fade end and invalidates committed text. */
  set fadeLeftEnd(value) { this.SetFadeLeftEnd(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeLeftEnd() { return this._fadeLeftEnd; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeLeftEnd(value)
  {
    this._fadeLeftEnd = value;
    this._NotifyListenersOfChange();
  }

  _fadeRightStart = 3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeRightStart() { return this.GetFadeRightStart(); }
  /** Sets the right fade start and invalidates committed text. */
  set fadeRightStart(value) { this.SetFadeRightStart(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeRightStart() { return this._fadeRightStart; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeRightStart(value)
  {
    this._fadeRightStart = value;
    this._NotifyListenersOfChange();
  }

  _fadeRightEnd = 3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeRightEnd() { return this.GetFadeRightEnd(); }
  /** Sets the right fade end and invalidates committed text. */
  set fadeRightEnd(value) { this.SetFadeRightEnd(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeRightEnd() { return this._fadeRightEnd; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeRightEnd(value)
  {
    this._fadeRightEnd = value;
    this._NotifyListenersOfChange();
  }

  _fadeTopStart = -3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeTopStart() { return this.GetFadeTopStart(); }
  /** Sets the top fade start and invalidates committed text. */
  set fadeTopStart(value) { this.SetFadeTopStart(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeTopStart() { return this._fadeTopStart; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeTopStart(value)
  {
    this._fadeTopStart = value;
    this._NotifyListenersOfChange();
  }

  _fadeTopEnd = -3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeTopEnd() { return this.GetFadeTopEnd(); }
  /** Sets the top fade end and invalidates committed text. */
  set fadeTopEnd(value) { this.SetFadeTopEnd(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeTopEnd() { return this._fadeTopEnd; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeTopEnd(value)
  {
    this._fadeTopEnd = value;
    this._NotifyListenersOfChange();
  }

  _fadeBottomStart = 3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeBottomStart() { return this.GetFadeBottomStart(); }
  /** Sets the bottom fade start and invalidates committed text. */
  set fadeBottomStart(value) { this.SetFadeBottomStart(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeBottomStart() { return this._fadeBottomStart; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeBottomStart(value)
  {
    this._fadeBottomStart = value;
    this._NotifyListenersOfChange();
  }

  _fadeBottomEnd = 3.4028234663852886e38;

  /** Native text fade boundary. */
  @meta.blue.readwrite
  @meta.type.float32
  get fadeBottomEnd() { return this.GetFadeBottomEnd(); }
  /** Sets the bottom fade end and invalidates committed text. */
  set fadeBottomEnd(value) { this.SetFadeBottomEnd(value); }

  /** Reads the fade boundary. */
  @meta.implemented
  GetFadeBottomEnd() { return this._fadeBottomEnd; }

  /** Changes the fade boundary and invalidates text sprites. */
  @meta.implemented
  SetFadeBottomEnd(value)
  {
    this._fadeBottomEnd = value;
    this._NotifyListenersOfChange();
  }

  /** Computes native horizontal edge fading, including the left-start exception. */
  @meta.implemented
  _CalcAlphaForHorizontal(x)
  {
    if (this._fadeLeftStart > 0 && x < this._fadeLeftStart) return 0;
    if (x > this._fadeRightEnd) return 0;
    if (x >= this._fadeLeftEnd && x <= this._fadeRightStart) return 1;
    if (x >= this._fadeLeftStart && x <= this._fadeLeftEnd) return (x - this._fadeLeftStart) / (this._fadeLeftEnd - this._fadeLeftStart);
    if (x >= this._fadeRightStart && x <= this._fadeRightEnd) return 1 - (x - this._fadeRightStart) / (this._fadeRightEnd - this._fadeRightStart);
    return 1;
  }

  /** Computes native vertical edge fading. */
  @meta.implemented
  _CalcAlphaForVertical(y)
  {
    if (y < this._fadeTopStart || y > this._fadeBottomEnd) return 0;
    if (y >= this._fadeTopEnd && y <= this._fadeBottomStart) return 1;
    if (y >= this._fadeTopStart && y <= this._fadeTopEnd) return (y - this._fadeTopStart) / (this._fadeTopEnd - this._fadeTopStart);
    if (y >= this._fadeBottomStart && y <= this._fadeBottomEnd) return 1 - (y - this._fadeBottomStart) / (this._fadeBottomEnd - this._fadeBottomStart);
    return 1;
  }

  _vertices = null;
  _indices = null;
  _drawCalls = [];

  /** Releases prepared geometry and each committed glyph's atlas reference. */
  @meta.implemented
  ClearSprites()
  {
    this._vertices = this._indices = null;
    this._drawCalls.length = 0;
    for (const segment of this._committedRenderData)
    {
      for (const bitmap of segment.bitmaps) bitmap.atlasTexture = null;
    }
  }

  /**
   * Builds Carbon's glyph quads, texture runs, shadow pass and segment underlines.
   * Adapted: arrays replace native pointer ranges; uninitialized unused attributes
   * remain zero. Atlas identity still determines draw-call boundaries.
   */
  @meta.adapted
  PrepareSprites(renderer, translation, color, sfx, blendMode, target, glowBrightness, dropShadow, shadowOffset, shadowColor, shadowSfx)
  {
    this._vertices = [];
    this._indices = [];
    this._drawCalls.length = 0;
    let currentTexture = null, startSprite = 0, vertexIndex = 0;
    const finishRun = () =>
    {
      const spriteCount = this._vertices.length / 4 - startSprite;
      if (spriteCount) this._drawCalls.push({ startSprite, spriteCount, texture: currentTexture });
      startSprite += spriteCount;
      vertexIndex = 0;
    };
    const addQuad = (x, y, width, height, tint, effect, uv, opposite, alpha) =>
    {
      for (let corner = 0; corner < 4; corner++)
      {
        const right = corner === 1 || corner === 2, bottom = corner >= 2;
        const vertex = new Tr2Sprite2dD3DVertex();
        vertex.position.set([translation[0] + x + (right ? width : 0), translation[1] + y + (bottom ? height : 0), 0]);
        vertex.color.set(tint);
        if (alpha) vertex.color[3] *= alpha[right ? 1 : 0] * alpha[bottom ? 3 : 2];
        vertex.glowBrightness = glowBrightness;
        vertex.blendMode = blendMode | (target << 3);
        vertex.spriteEffect = effect;
        if (uv) vertex.texCoord[0].set([uv[right ? 2 : 0], uv[bottom ? 3 : 1]]);
        if (opposite) vertex.texCoord[1].set([opposite[right ? 0 : 2], opposite[bottom ? 1 : 3]]);
        this._vertices.push(vertex);
      }
      this._indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 3, vertexIndex + 3, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 4;
    };
    const addSprites = (offset, passColor, effect) =>
    {
      for (const segment of this._committedRenderData)
      {
        const tint = [0, 8, 16, 24].map((shift, i) => ((segment.color >>> shift) & 255) / 255 * passColor[i]);
        for (const bitmap of segment.bitmaps)
        {
          const glyph = bitmap.sbit;
          if (!glyph.width || !glyph.height) continue;
          const atlas = bitmap.atlasTexture ??= g_fontManager.GetAtlasTextureForSbit(glyph);
          let reciprocalWidth = 1, reciprocalHeight = 1;
          const window = [0, 0, 0, 0];
          if (atlas)
          {
            if (!currentTexture || currentTexture.GetTexture() !== atlas.GetTexture())
            {
              finishRun();
              currentTexture = atlas;
            }
            atlas.GetTextureWindow(window);
            reciprocalWidth = 1 / atlas.GetTextureWidth();
            reciprocalHeight = 1 / atlas.GetTextureHeight();
          }
          let x = bitmap.x + glyph.left + offset[0], y = bitmap.y - glyph.top + offset[1];
          let width = glyph.width, height = glyph.height + 1;
          const alpha = [this._CalcAlphaForHorizontal(x), this._CalcAlphaForHorizontal(x + width),
            this._CalcAlphaForVertical(y), this._CalcAlphaForVertical(y + height)];
          const original = [window[0], window[1], window[0] + window[2], window[1] + window[3]];
          const uv = original.slice();
          if (effect === Tr2SpriteObjectEffect.TR2_SFX_BLUR || effect === Tr2SpriteObjectEffect.TR2_SFX_GLOW)
          {
            x--; y--; width += 2; height += 2;
            uv[0] -= reciprocalWidth; uv[1] -= reciprocalHeight;
            uv[2] += reciprocalWidth; uv[3] += reciprocalHeight;
          }
          addQuad(x, y, width, height, tint, effect, uv, original, alpha);
        }
        if (segment.underline && segment.bitmaps.length)
        {
          const first = segment.bitmaps[0], last = segment.bitmaps.at(-1);
          const left = first.x + first.sbit.left;
          // Native TR2_SFX_FILL is the zero-texture effect (zero-valued alias).
          addQuad(left + offset[0], first.y - segment.underlinePosition + offset[1],
            last.x + last.sbit.xadvance - left, segment.underlineThickness, tint, 0);
        }
      }
    };
    if (dropShadow) addSprites(shadowOffset, shadowColor, shadowSfx);
    addSprites([0, 0], color, sfx);
    finishRun();
  }

  /** Submits texture runs within the scene's vertex limit, rebasing each batch. */
  @meta.adapted
  SubmitSprites(renderer)
  {
    if (!this._indices?.length) return;
    const limit = renderer.IsCapturing() ? 0xffffffff : Math.floor(renderer.GetMaxVertexCountPerDrawCall() / 4);
    if (limit < 1) throw new RangeError("Sprite renderer cannot fit one glyph quad.");
    for (const entry of this._drawCalls)
    {
      renderer.SetTexture(0, entry.texture, 0);
      for (let offset = 0; offset < entry.spriteCount; offset += limit)
      {
        const count = Math.min(limit, entry.spriteCount - offset), start = entry.startSprite + offset;
        const indices = this._indices.slice(start * 6, (start + count) * 6).map(index => index - offset * 4);
        renderer.RenderTriangleVerts(this._vertices.slice(start * 4, (start + count) * 4), count * 4, indices, count * 6);
      }
    }
  }
}
