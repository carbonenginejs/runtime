// Source: trinity/trinity/Font/Tr2FontManager.h
// Maintained browser-font adapter; native interfaces retain their Carbon names.
import { Tr2SBitWrapper } from "./Tr2SBitWrapper.js";
import { g_textureAtlasMan } from "../core/Tr2TextureAtlasMan.js";
import { PixelFormat } from "#consts/render-context";
import { meta } from "#schema";

/** Tracks font-loading policy together with the glyph-cache memory budget and occupancy. */
@meta.define({ className: "Tr2FontManager", family: "font", purpose: "Tracks font-loading policy together with the glyph-cache memory budget and occupancy." })
export class Tr2FontManager
{

  /** m_glyphCacheBudget (size_t) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.uint64
  glyphCacheBudget = 524288;

  /** m_loadflag (int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.int32
  loadFlag = 0;

  /** m_totalGlyphsCachedSize (size_t) [READ] */
  @meta.blue.read
  @meta.type.uint64
  totalGlyphsCachedSize = 0;

  /** Initializes Carbon's manager singleton; browser resources are acquired lazily. */
  @meta.adapted
  static initialize()
  {
    g_fontManager = new Tr2FontManager();
  }

  /** Releases manager-owned CPU caches. */
  @meta.adapted
  static shutdown()
  {
    if (g_fontManager) g_fontManager.ClearCachedGlyphs();
    g_fontManager = null;
  }

  /** Browser face names retain stable native-style numeric identities. */
  _faces = [];
  _faceMap = new Map();
  _glyphs = new Map();
  _canvas = null;
  _context = null;
  _sizes = new Map();

  /**
   * Registers a CSS font family; loading a custom font is explicitly asynchronous.
   * Adapted: face IDs refer to browser families rather than FreeType faces.
   */
  @meta.adapted
  GetFaceID(font)
  {
    if (this._faceMap.has(font)) return this._faceMap.get(font);

    const id = this._faces.length;
    this._faces.push(font);
    this._faceMap.set(font, id);
    return id;
  }

  /**
   * Loads font bytes or a FontFace source and registers it in this browser/worker.
   * JS extension: native synchronous ResFile/FreeType loading has no browser equivalent.
   */
  @meta.ours
  async LoadFont(family, source)
  {
    const fonts = globalThis.document?.fonts ?? globalThis.fonts;
    if (!fonts || !globalThis.FontFace) throw new Error("Browser FontFace loading is unavailable.");

    const face = new FontFace(family, source);
    await face.load();
    fonts.add(face);
    this.ClearCachedGlyphs();
    return this.GetFaceID(family);
  }

  /** Lazily acquires a browser CPU canvas; importing the engine remains headless-safe. */
  @meta.ours
  _GetContext()
  {
    if (this._context) return this._context;

    if (globalThis.OffscreenCanvas) this._canvas = new OffscreenCanvas(1, 1);
    else if (globalThis.document) this._canvas = document.createElement("canvas");
    else throw new Error("Browser font rasterization requires Canvas2D or OffscreenCanvas.");

    this._context = this._canvas.getContext("2d", { willReadFrequently: true });
    if (!this._context) throw new Error("Browser font rasterization could not acquire Canvas2D.");
    return this._context;
  }

  /** Restores canvas font state after a bitmap resize resets it. */
  @meta.ours
  _SetFont(faceID, height)
  {
    const family = this._faces[faceID];
    if (family === undefined) throw new RangeError("Unknown font face ID.");
    if (!(height > 0) || !Number.isFinite(height)) throw new RangeError("Font height must be positive and finite.");

    const context = this._GetContext();
    context.font = `${height}px ${family}`;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.direction = "ltr";
    context.fillStyle = "white";
    this._sizes.set(faceID, height);
    return context;
  }

  /**
   * Returns a browser character identity. The browser does not expose font glyph IDs
   * or missing-glyph detection; Unicode code points replace FreeType indices.
   */
  @meta.adapted
  LookupGlyphIndex(faceID, charCode)
  {
    if (typeof faceID === "string") return this.LookupFaceIDAndGlyphIndex(faceID, charCode);
    if (this._faces[faceID] === undefined) return -1;
    return Number.isInteger(charCode) && charCode >= 0 && charCode <= 0x10ffff ? charCode : -1;
  }

  /** Returns the face and browser glyph identity for script callers. */
  @meta.adapted
  LookupFaceIDAndGlyphIndex(font, charCode)
  {
    const faceID = this.GetFaceID(font);
    return [faceID, this.LookupGlyphIndex(faceID, charCode)];
  }

  /** Browser font-box metrics converted into native 26.6 fixed-point units. */
  @meta.adapted
  LookupMetrics(faceID, width, height)
  {
    const size = height || width, context = this._SetFont(faceID, size);
    const metrics = context.measureText("Mg");
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
    return { ascender: Math.round(ascent * 64), descender: -Math.round(descent * 64), height: Math.round((ascent + descent) * 64) };
  }

  /** Returns pixel ascender/descender, as the native script wrapper does. */
  @meta.adapted
  LookupMetricsFromScript(faceID, width, height)
  {
    const metrics = this.LookupMetrics(faceID, width, height);
    return [metrics.ascender >> 6, metrics.descender >> 6];
  }

  /** Approximates pair kerning using browser-shaped advances at the active size. */
  @meta.adapted
  LookupKerningXP(faceID, leftIndex, rightIndex)
  {
    const context = this._SetFont(faceID, this._sizes.get(faceID) ?? 12);
    const left = String.fromCodePoint(leftIndex), right = String.fromCodePoint(rightIndex);
    return Math.round(context.measureText(left + right).width - context.measureText(left).width - context.measureText(right).width);
  }

  /**
   * Rasterizes browser glyph coverage into a native-shaped 8-bit sbit record.
   * Adapted: bitmap bounds and advances follow browser metrics, not FreeType hinting.
   * The return value replaces the native result/output-pointer pair.
   */
  @meta.adapted
  LookupSBit(faceID, width, height, glyphIndex)
  {
    const size = height || width;
    if (this.LookupGlyphIndex(faceID, glyphIndex) < 0) throw new RangeError("Invalid browser glyph identity.");
    const key = `${faceID}:${width}:${height}:${glyphIndex}`;
    let sbit = this._glyphs.get(key);
    if (sbit)
    {
      this._glyphs.delete(key);
      this._glyphs.set(key, sbit);
      this._sizes.set(faceID, size);
    }
    else
    {
      let context = this._SetFont(faceID, size);
      const text = String.fromCodePoint(glyphIndex), metrics = context.measureText(text);
      const scale = width > 0 && height > 0 ? width / height : 1;
      const left = Math.floor(-metrics.actualBoundingBoxLeft * scale);
      const top = Math.ceil(metrics.actualBoundingBoxAscent);
      const bitmapWidth = Math.max(0, Math.ceil(metrics.actualBoundingBoxRight * scale) - left);
      const bitmapHeight = Math.max(0, top + Math.ceil(metrics.actualBoundingBoxDescent));
      const buffer = new Uint8Array(bitmapWidth * bitmapHeight); // alloc: variable-size glyph pixels retained by the text cache
      if (bitmapWidth && bitmapHeight)
      {
        this._canvas.width = bitmapWidth;
        this._canvas.height = bitmapHeight;
        context = this._SetFont(faceID, size);
        context.setTransform(scale, 0, 0, 1, -left, top);
        context.fillText(text, 0, 0);
        const rgba = context.getImageData(0, 0, bitmapWidth, bitmapHeight).data;
        for (let i = 0; i < buffer.length; i++) buffer[i] = rgba[i * 4 + 3];
      }

      sbit = { width: bitmapWidth, height: bitmapHeight, left, top, xadvance: Math.round(metrics.width * scale), yadvance: 0, pitch: bitmapWidth, format: 2, max_grays: 255, buffer };
      this._glyphs.set(key, sbit);
      this.totalGlyphsCachedSize += buffer.byteLength;
      this.TrimGlyphCache(this.glyphCacheBudget);
    }

    const result = new Tr2SBitWrapper();
    result.faceId = faceID;
    result.fontSize = size;
    result.sbit = sbit;
    return result;
  }

  /** Releases browser glyph cache ownership; existing wrappers retain their bitmaps. */
  @meta.blue.method
  @meta.adapted
  ClearCachedGlyphs()
  {
    this._glyphs.clear();
    this.totalGlyphsCachedSize = 0;
  }

  /** Evicts least-recently-used browser glyphs to the requested byte budget. */
  @meta.blue.method
  @meta.adapted
  TrimGlyphCache(cacheSize)
  {
    if (cacheSize === 0)
    {
      this.ClearCachedGlyphs();
      return;
    }

    for (const [key, sbit] of this._glyphs)
    {
      if (this.totalGlyphsCachedSize <= cacheSize) break;
      this._glyphs.delete(key);
      this.totalGlyphsCachedSize -= sbit.buffer.byteLength;
    }
  }

  /** Clears a rectangular RGBA buffer, preserving row padding and view boundaries. */
  @meta.blue.method
  @meta.adapted
  ClearBuffer(buffer, width, height, pitch, color = 0)
  {
    const bytes = new Uint8Array(buffer.buffer ?? buffer, buffer.byteOffset ?? 0, buffer.byteLength); // alloc: byte view of caller-owned bitmap storage; does not copy pixels
    if (![width, height, pitch].every(value => Number.isInteger(value) && value >= 0)) throw new RangeError("Invalid buffer dimensions.");
    if (width * 4 > pitch) throw new RangeError("width larger than pitch!");
    if (height * pitch > bytes.byteLength) throw new RangeError("destination too short!");

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let y = 0; y < height; y++)
    {
      for (let x = 0; x < width; x++) view.setUint32(y * pitch + x * 4, color >>> 0, true);
    }
  }
  /**
   * Browser adaptation: weak glyph identity replaces native weak-ref resurrection.
   * An active text run retains its atlas view; unused glyphs do not retain views.
   */
  _sbitToTextureMap = new WeakMap();

  /** Uploads grayscale glyph coverage once, including native transparent shadow row. */
  @meta.adapted
  GetAtlasTextureForSbit(sbit)
  {
    const existing = this._sbitToTextureMap.get(sbit)?.deref();
    if (existing) return existing;
    const atlas = g_textureAtlasMan.FindAtlas(PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    if (!atlas) return null;
    const texture = atlas.CreateTexture(sbit.width, sbit.height + 1);
    if (!texture) return null;
    const mapping = texture.LockBuffer();
    if (!mapping) return null;
    try
    {
      const bytes = mapping.data;
      for (let y = 0; y < sbit.height; y++)
      {
        for (let x = 0; x < sbit.width; x++)
        {
          const offset = y * mapping.pitch + x * 4;
          bytes[offset] = bytes[offset + 1] = bytes[offset + 2] = 255;
          bytes[offset + 3] = sbit.buffer[y * sbit.pitch + x];
        }
      }
      bytes.fill(0, sbit.height * mapping.pitch, sbit.height * mapping.pitch + sbit.width * 4);
    }
    finally { texture.UnlockBuffer(); }
    this._sbitToTextureMap.set(sbit, new WeakRef(texture));
    return texture;
  }

}

/** Native font-manager singleton; no browser context is created at import time. */
export let g_fontManager = null;
