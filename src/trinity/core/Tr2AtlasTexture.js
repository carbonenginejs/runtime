// Source: trinity/trinity/Tr2AtlasTexture.h
// Source: trinity/trinity/Tr2AtlasTexture.cpp
// Maintained atlas view and write-mapping implementation.
import { meta } from "#schema";
import { Tr2TextureAL, Tr2TextureSubresource, Failed } from "#trinityal";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { vec4 } from "#math/vec4";

/** Describes one named subtexture's resource path, pixel rectangle, and owning atlas dimensions. */
@meta.define({ className: "Tr2AtlasTexture", family: "trinityCore", purpose: "Describes one named subtexture's resource path, pixel rectangle, and owning atlas dimensions." })
export class Tr2AtlasTexture
{

  /** m_textureHeight (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  atlasHeight = 0;

  /** m_height (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  height = 0;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_resPath (std::string) [READ] */
  @meta.blue.read
  @meta.type.path
  resPath = "";

  /** m_textureAtlas (Tr2TextureAtlasPtr) [READ] */
  @meta.blue.read
  @meta.type.rootRef("Tr2TextureAtlas")
  atlas = null;

  /** m_textureWidth (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  atlasWidth = 0;

  /** m_width (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  width = 0;

  /** m_x (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  x = 0;

  /** m_y (unsigned int) [READ] */
  @meta.blue.read
  @meta.type.uint32
  y = 0;

  _texture = new Tr2TextureAL();
  _textureRes = null;
  _renderTarget = null;
  _atlasArea = null;
  _textureWindow = vec4.create();
  _widthReciprocal = 0;
  _heightReciprocal = 0;
  _textureWidthReciprocal = 0;
  _textureHeightReciprocal = 0;
  _isGood = false;
  _isPrepared = false;
  _isLoading = false;
  _isStandAlone = false;
  _isLocked = false;
  _memoryUsage = 0;
  _changeListeners = new Set();

  /** Returns the shared atlas AL object, then standalone or resource storage. */
  @meta.implemented
  GetTexture()
  {
    if (this.atlas && this._atlasArea) return this.atlas.GetTexture();
    if (this._texture.IsValid()) return this._texture;
    if (this._textureRes && this._textureRes.IsGood()) return this._textureRes.GetTexture();
    return null;
  }

  /** Returns the independently attached render target. */
  @meta.implemented
  GetRenderTarget() { return this._renderTarget; }

  /** Attaches the native render-target view without taking ownership of its AL texture. */
  @meta.implemented
  SetRenderTarget(texture)
  {
    this._renderTarget = texture;
    this._isGood = this._isPrepared = true;
    if (!texture) return;
    this.width = this.atlasWidth = texture.GetWidth();
    this.height = this.atlasHeight = texture.GetHeight();
    this._CalcReciprocals();
    this._textureWindow.set([0, 0, 1, 1]);
  }

  /** Copies the cached offset and UV extent. */
  @meta.implemented
  GetTextureWindow(out) { for (let i = 0; i < 4; i++) out[i] = this._textureWindow[i]; }

  /** Calculates a subrectangle, preserving native full-window fallback. */
  @meta.implemented
  CalcSubTextureWindow(out, x, y, width, height)
  {
    if (!this.GetTexture())
    {
      out[0] = out[1] = 0; out[2] = out[3] = 1;
      return;
    }
    out[0] = (this.x + x) * this._textureWidthReciprocal;
    out[1] = (this.y + y) * this._textureHeightReciprocal;
    out[2] = (width || this.width) * this._textureWidthReciprocal;
    out[3] = (height || this.height) * this._textureHeightReciprocal;
  }

  /** Caches the UV window after placement. */
  @meta.implemented
  _CalcTextureWindow() { this.CalcSubTextureWindow(this._textureWindow, 0, 0, 0, 0); }

  /** Updates nonzero dimension reciprocals, as native. */
  @meta.implemented
  _CalcReciprocals()
  {
    if (this.width) this._widthReciprocal = 1 / this.width;
    if (this.height) this._heightReciprocal = 1 / this.height;
    if (this.atlasWidth) this._textureWidthReciprocal = 1 / this.atlasWidth;
    if (this.atlasHeight) this._textureHeightReciprocal = 1 / this.atlasHeight;
  }

  /** Finishes native placement and invalidates texture users. */
  @meta.implemented
  _FinalizePrepare()
  {
    this._CalcReciprocals();
    this._CalcTextureWindow();
    this._NotifyListenersOfChange();
  }

  /** Maps this view's rectangle; JS returns the native data/pitch outputs together. */
  @meta.blue.method
  @meta.adapted
  LockBuffer()
  {
    const texture = this.atlas && this._atlasArea ? this.atlas.GetTexture() : this._texture;
    if (!texture.IsValid() || this._isLocked) return null;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const region = Tr2TextureSubresource.ForMipLevel(0).SetRect(this.x, this.y, this.x + this.width, this.y + this.height);
    const mapping = texture.MapForWriting(region, context);
    if (Failed(mapping.result)) return null;
    this._isLocked = true;
    return mapping;
  }

  /** Maps atlas margins too; standalone views have no margin. */
  @meta.blue.method
  @meta.adapted
  LockBufferAndMargin()
  {
    const texture = this.atlas && this._atlasArea ? this.atlas.GetTexture() : this._texture;
    if (!this.atlas || !this._atlasArea || this._isLocked || !texture.IsValid())
    {
      const mapping = this.LockBuffer();
      return mapping ? { ...mapping, margin: 0 } : null;
    }
    const margin = this.atlas.GetMargin();
    const region = Tr2TextureSubresource.ForMipLevel(0).SetRect(this.x - margin, this.y - margin, this.x + this.width + margin, this.y + this.height + margin);
    const mapping = texture.MapForWriting(region, Tr2RenderContext_GetMainThreadRenderContext());
    if (Failed(mapping.result)) return null;
    this._isLocked = true;
    return { ...mapping, margin };
  }

  /** Finishes the write and publishes native readiness/change notification. */
  @meta.blue.method
  @meta.implemented
  UnlockBuffer()
  {
    if (!this._isLocked) return;
    const texture = this.atlas && this._atlasArea ? this.atlas.GetTexture() : this._texture;
    if (!texture.IsValid()) return;
    texture.UnmapForWriting(Tr2RenderContext_GetMainThreadRenderContext());
    this._isLocked = false;
    this._isGood = true;
    this._NotifyListenersOfChange();
  }

  /** Registers one atlas change target by identity. */
  @meta.implemented
  RegisterForChangeNotification(target) { this._changeListeners.add(target); }

  /** Removes a registered atlas change target. */
  @meta.implemented
  UnregisterForChangeNotification(target) { this._changeListeners.delete(target); }

  /** Broadcasts native invalidation after placement or writing. */
  @meta.implemented
  _NotifyListenersOfChange()
  {
    for (const target of this._changeListeners) target.AtlasTextureChanged(this);
  }

  /** Keeps a permanent outsider outside its owning atlas. */
  @meta.implemented
  SetStandAlone(value)
  {
    this._isStandAlone = value;
    if (value && this.atlas) this.atlas.EjectTexture(this);
  }

  /** Sets the intended atlas once, before loading. */
  @meta.implemented
  SetTargetAtlasBeforeLoad(atlas) { if (!this.atlas) this.atlas = atlas; }

  /** Native GetX query. */
  @meta.implemented
  GetX() { return this.x; }

  /** Native GetY query. */
  @meta.implemented
  GetY() { return this.y; }

  /** Native GetWidth query. */
  @meta.implemented
  GetWidth() { return this.width; }

  /** Native GetHeight query. */
  @meta.implemented
  GetHeight() { return this.height; }

  /** Native GetTextureWidth query. */
  @meta.implemented
  GetTextureWidth() { return this.atlasWidth; }

  /** Native GetTextureHeight query. */
  @meta.implemented
  GetTextureHeight() { return this.atlasHeight; }

  /** Native GetWidthReciprocal query. */
  @meta.implemented
  GetWidthReciprocal() { return this._widthReciprocal; }

  /** Native GetHeightReciprocal query. */
  @meta.implemented
  GetHeightReciprocal() { return this._heightReciprocal; }

  /** Native IsGood query. */
  @meta.implemented
  IsGood() { return this._isGood; }

  /** Native IsPrepared query. */
  @meta.implemented
  IsPrepared() { return this._isPrepared; }

  /** Native IsLoading query. */
  @meta.implemented
  IsLoading() { return this._isLoading; }

  /** Native IsStandAlone query. */
  @meta.implemented
  IsStandAlone() { return this._isStandAlone; }

  /** Native GetMemoryUsage query. */
  @meta.implemented
  GetMemoryUsage() { return this._memoryUsage; }

  /** Native IsMemoryUsageKnown query. */
  @meta.implemented
  IsMemoryUsageKnown() { return !this.IsLoading(); }

  /** Releases this view's atlas allocation and independently owned texture. */
  @meta.adapted
  OnShutdown()
  {
    if (this._isLocked) this.UnlockBuffer();
    if (this.atlas) this.atlas._RemoveFromAtlas(this);
    this._texture.Destroy();
    this._isPrepared = this._isGood = false;
  }
}
