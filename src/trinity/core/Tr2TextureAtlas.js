// Source: trinity/trinity/Tr2TextureAtlas.h
// Source: trinity/trinity/Tr2TextureAtlas.cpp
// Maintained allocation and resource implementation.
import { meta } from "#schema";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage, GetBytesPerPixel } from "#consts/render-context";
import { Tr2TextureAL, Tr2BitmapDimensions, Failed } from "#trinityal";
import { Tr2AtlasTexture } from "./Tr2AtlasTexture.js";
import { ITr2TextureProvider } from "./ITr2TextureProvider.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";

/** Carries texture-atlas dimensions, format, mip levels, margins, empty-area painting, and removal-compaction policy. */
@meta.define({ className: "Tr2TextureAtlas", family: "trinityCore", purpose: "Carries texture-atlas dimensions, format, mip levels, margins, empty-area painting, and removal-compaction policy." })
@meta.blue.interface(ITr2TextureProvider)
export class Tr2TextureAtlas extends ITr2TextureProvider
{

  /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READ, ENUM] */
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("PixelFormat")
  format = 87;

  /** m_mipLevels (unsigned) [READ] */
  @meta.blue.read
  @meta.type.uint32
  mipCount = 0;

  /** m_height (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  height = 2048;

  /** m_paintEmptyAreas (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  paintEmptyAreas = false;

  /** m_optimizeOnRemoval (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  optimizeOnRemoval = true;

  /** m_margin (unsigned int) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.uint32
  margin = 2;

  /** m_width (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  width = 2048;

  /** Creates an atlas view or native standalone fallback; JS returns the output pointer. */
  @meta.blue.method
  @meta.adapted
  CreateTexture(width, height, type = 0)
  {
    const texture = new Tr2AtlasTexture();
    texture.atlas = this;
    let area = type === 0 && !this._IsLargeTexture(width, height) ? this._GetFreeArea(width + this.margin * 2, height + this.margin * 2) : null;
    if (!area && type === 0 && this._optimizationWarranted)
    {
      this.CollapseFreeAreas();
      area = this._GetFreeArea(width + this.margin * 2, height + this.margin * 2);
    }
    if (area)
    {
      area.type = 1;
      area.tex = new WeakRef(texture);
      texture._atlasArea = area;
      texture.x = area.rect.left + this.margin;
      texture.y = area.rect.top + this.margin;
      texture.atlasWidth = this.width;
      texture.atlasHeight = this.height;
      this._texturesInAtlas.add(area);
    }
    else if (this._createOutsiders)
    {
      const result = texture._texture.Create(Tr2BitmapDimensions.texture2D(width, height, 1, this.format),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.READ | Tr2CpuUsage.WRITE }, Tr2RenderContext_GetMainThreadRenderContext());
      if (Failed(result)) return null;
      texture._isStandAlone = type === 1;
      texture.atlasWidth = width;
      texture.atlasHeight = height;
      this._texturesOutsideAtlas.add(new WeakRef(texture));
    }
    else return null;
    texture.width = width;
    texture.height = height;
    texture._memoryUsage = width * height * GetBytesPerPixel(this.format);
    texture._FinalizePrepare();
    texture._isPrepared = true;
    return texture;
  }

  /** Merges touching free rectangles until neither native sort pass finds a merge. */
  @meta.blue.method
  @meta.implemented
  CollapseFreeAreas()
  {
    this._optimizationWarranted = false;
    this._areasFreedSinceLastCollapse = 0;
    let changed;
    do
    {
      changed = false;
      for (const horizontal of [true, false])
      {
        this._freeAreas.sort((a, b) => horizontal ? a.rect.left - b.rect.left || a.rect.right - b.rect.right : a.rect.top - b.rect.top || a.rect.bottom - b.rect.bottom);
        for (let i = 0; i < this._freeAreas.length; i++)
        {
          const a = this._freeAreas[i].rect;
          for (let j = i + 1; j < this._freeAreas.length;)
          {
            const b = this._freeAreas[j].rect;
            const adjacent = horizontal ? a.right === b.left && a.top === b.top && a.bottom === b.bottom : a.bottom === b.top && a.left === b.left && a.right === b.right;
            if (!adjacent) { j++; continue; }
            if (horizontal) a.right = b.right;
            else a.bottom = b.bottom;
            this._freeAreas.splice(j, 1);
            changed = true;
          }
        }
      }
    } while (changed);
    this._UpdateFreeMaxima();
  }


  /** Carbon method EjectAllTextures (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  EjectAllTextures(...args)
  {
    throw new Error("Tr2TextureAtlas.EjectAllTextures is not implemented in CarbonEngineJS.");
  }

  /** Native GetFreeMaxHeight query. */
  @meta.blue.method
  @meta.implemented
  GetFreeMaxHeight() { return this._freeMaxHeight; }


  /** Native GetFreeMaxWidth query. */
  @meta.blue.method
  @meta.implemented
  GetFreeMaxWidth() { return this._freeMaxWidth; }


  /** Native GetFreeTexels query. */
  @meta.blue.method
  @meta.implemented
  GetFreeTexels() { return this._freeTexels; }


  /** Carbon method PullInOutsiders (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  PullInOutsiders(...args)
  {
    throw new Error("Tr2TextureAtlas.PullInOutsiders is not implemented in CarbonEngineJS.");
  }

  /** Native GetFreeTexelPercentage query. */
  @meta.blue.method
  @meta.implemented
  GetFreeTexelPercentage() { return this._freeTexels / (this.width * this.height); }


  /** Native GetTexturesOutsideAtlas query. */
  @meta.blue.method
  @meta.implemented
  GetTexturesOutsideAtlas() { return Array.from(this._texturesOutsideAtlas, reference => reference.deref()).filter(Boolean); }


  /** Carbon method HasALObject (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  HasALObject(...args)
  {
    throw new Error("Tr2TextureAtlas.HasALObject is not implemented in CarbonEngineJS.");
  }

  /** Carbon method ConsolidateFreeAreas (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  ConsolidateFreeAreas(...args)
  {
    throw new Error("Tr2TextureAtlas.ConsolidateFreeAreas is not implemented in CarbonEngineJS.");
  }

  static AtlasTextureType = Object.freeze({
    ATT_DEFAULT: 0,
    ATT_VIDEO: 1,
  });

  static PixelFormat = PixelFormat;


  _texture = new Tr2TextureAL();
  _freeAreas = [];
  _texturesInAtlas = new Set();
  _texturesOutsideAtlas = new Set();
  _onTextureChange = new Set();
  _createOutsiders = true;
  _maxTextureArea = 512 * 512;
  _freeTexels = 0;
  _freeMaxWidth = -1;
  _freeMaxHeight = -1;
  _optimizationWarranted = false;
  _areasFreedSinceLastCollapse = 0;

  /** Initializes the native atlas dimensions and prepares its AL storage. */
  @meta.implemented
  Initialize(format, width, height)
  {
    this._texture.Destroy();
    this.format = format;
    this.width = width;
    this.height = height;
    this._OnPrepareResources();
  }

  /** Allocates native CPU-writable storage, reducing dimensions on allocation failure. */
  @meta.implemented
  _OnPrepareResources()
  {
    if (this._texture.IsValid()) return true;
    for (;;)
    {
      if (this.width <= 1 || this.height <= 1) return false;
      this.mipCount = 1;
      const result = this._texture.Create(Tr2BitmapDimensions.texture2D(this.width, this.height, this.mipCount, this.format),
        { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.READ | Tr2CpuUsage.WRITE }, Tr2RenderContext_GetMainThreadRenderContext());
      if (!Failed(result)) break;
      if (this.width > this.height) this.width = Math.floor(this.width / 2);
      else this.height = Math.floor(this.height / 2);
    }
    this._freeAreas.length = 0;
    this._FreeArea({ rect: { left: 0, top: 0, right: this.width, bottom: this.height } });
    this._freeTexels = this.width * this.height;
    this._UpdateFreeMaxima();
    for (const listener of this._onTextureChange) listener();
    return true;
  }

  /** Returns borrowed AL storage, preserving its identity between glyph views. */
  @meta.implemented
  GetTexture() { return this._texture; }

  /** JS listener adapter for the native texture-provider event. */
  @meta.adapted
  OnTextureChange(listener)
  {
    this._onTextureChange.add(listener);
    return () => this._onTextureChange.delete(listener);
  }

  /** Returns the atlas pixel format. */
  @meta.implemented
  GetFormat() { return this.format; }

  /** Returns padding between entries. */
  @meta.implemented
  GetMargin() { return this.margin; }

  /** Native size cutoff for atlas allocation. */
  @meta.implemented
  _IsLargeTexture(width, height) { return width * height > this._maxTextureArea; }

  /** Adds a nonempty free rectangle without changing the separate texel count. */
  @meta.implemented
  _FreeArea(area)
  {
    if (!area || area.rect.right === area.rect.left || area.rect.bottom === area.rect.top) return;
    area.type = 0;
    area.tex = null;
    this._freeAreas.push(area);
    if (++this._areasFreedSinceLastCollapse > 32) this._optimizationWarranted = true;
  }

  /** Recomputes the cached maximum free dimensions. */
  @meta.implemented
  _UpdateFreeMaxima()
  {
    this._freeMaxWidth = this._freeMaxHeight = 0;
    for (const { rect } of this._freeAreas)
    {
      this._freeMaxWidth = Math.max(this._freeMaxWidth, rect.right - rect.left);
      this._freeMaxHeight = Math.max(this._freeMaxHeight, rect.bottom - rect.top);
    }
  }

  /** Ports native best-fit selection, eight-pixel alignment and small-region splitting. */
  @meta.adapted
  _GetFreeArea(width, height)
  {
    this._ReleasePendingFreeAreas();
    if (this._IsLargeTexture(width, height)) return null;
    width = (width + 7) & ~7;
    height = (height + 7) & ~7;
    let index = -1, primary = this.width + this.height, secondary = primary;
    for (let i = 0; i < this._freeAreas.length; i++)
    {
      const r = this._freeAreas[i].rect, w = r.right - r.left, h = r.bottom - r.top;
      if (width === w && height === h) { index = i; break; }
      if (width > w || height > h) continue;
      const first = Math.min(w - width, h - height), second = Math.max(w - width, h - height);
      if (first < primary || first === primary && second < secondary)
      {
        index = i; primary = first; secondary = second;
      }
    }
    if (index < 0) return null;
    const area = this._freeAreas.splice(index, 1)[0], r = area.rect;
    const candidateWidth = r.right - r.left, candidateHeight = r.bottom - r.top;
    const add = (left, top, right, bottom) => this._FreeArea({ rect: { left, top, right, bottom } });
    if (candidateWidth !== width || candidateHeight !== height)
    {
      const minimum = 128 + this.margin * 4;
      if (width < minimum && height < minimum)
      {
        if (candidateHeight > minimum) { add(r.left, r.top + minimum, r.right, r.bottom); r.bottom = r.top + minimum; }
        if (candidateWidth > minimum) { add(r.left + minimum, r.top, r.right, r.bottom); r.right = r.left + minimum; }
      }
      if (candidateWidth === width) add(r.left, r.top + height, r.right, r.bottom);
      else if (candidateHeight === height) add(r.left + width, r.top, r.right, r.bottom);
      else
      {
        add(r.left + width, r.top, r.right, r.top + height);
        add(r.left, r.top + height, r.right, r.bottom);
      }
    }
    r.right = r.left + width;
    r.bottom = r.top + height;
    this._freeTexels -= width * height;
    this._UpdateFreeMaxima();
    return area;
  }

  /**
   * Browser adaptation: native weak pointers/destructors become WeakRefs.
   * Reclaim dead entries before allocation; GC timing can delay space recovery.
   * Explicit OnShutdown on a view still frees its area immediately.
   */
  @meta.adapted
  _ReleasePendingFreeAreas()
  {
    for (const area of this._texturesInAtlas)
    {
      if (area.tex.deref()) continue;
      this._texturesInAtlas.delete(area);
      this._freeTexels += (area.rect.right - area.rect.left) * (area.rect.bottom - area.rect.top);
      this._FreeArea(area);
    }
    for (const reference of this._texturesOutsideAtlas)
    {
      if (!reference.deref()) this._texturesOutsideAtlas.delete(reference);
    }
    this._UpdateFreeMaxima();
  }

  /** Removes a view's weak registration and returns its allocation. */
  @meta.adapted
  _RemoveFromAtlas(texture)
  {
    const area = texture._atlasArea;
    if (area && this._texturesInAtlas.delete(area))
    {
      this._freeTexels += (area.rect.right - area.rect.left) * (area.rect.bottom - area.rect.top);
      texture._atlasArea = null;
      this._FreeArea(area);
      this._UpdateFreeMaxima();
    }
    for (const reference of this._texturesOutsideAtlas)
    {
      if (reference.deref() === texture) this._texturesOutsideAtlas.delete(reference);
    }
  }
}
