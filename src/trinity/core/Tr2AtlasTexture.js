// Source: trinity/trinity/Tr2AtlasTexture.h
// Source: trinity/trinity/Tr2AtlasTexture.cpp
// Source: trinity/trinity/Tr2AtlasTexture_Blue.cpp
// Hand-maintained port. Carbon's class is a BlueAsyncRes, an ICacheable and a
// Tr2DeviceResource; this one is none of them yet. The load path (DoLoad,
// DoPrepare, OnPrepareResources and the six `*atlas` resource extensions) is
// left as explicit obligations: see `DoLoad`.
import { meta, type, blue } from "#schema";
import { ICacheable } from "#blue";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { TriStorageFlags } from "#consts/graphics";
import { Tr2TextureAL, Tr2TextureSubresource, Failed } from "#trinityal";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";
import { vec4 } from "#math/vec4";

/**
 * A texture that usually lives in a texture atlas, as a window into the
 * atlas's shared AL texture. When the atlas is full it has its own AL texture
 * (an "outsider") and may be pulled into the atlas later.
 *
 * Not registered as a device resource. Carbon's `Tr2DeviceResource` base
 * registers every instance with `TriDevice` through a raw, non-owning pointer;
 * the JS registry holds strong references, so registering would keep every
 * atlas texture alive forever and the atlas's GC reclamation could never
 * happen. A device reset therefore does not call `ReleaseResources` on atlas
 * textures.
 */
@blue.define({ className: "Tr2AtlasTexture", purpose: "A window into a shared texture atlas, or a standalone outsider texture associated with one." })
@blue.inherit(ICacheable)
@blue.interface(ICacheable)
export class Tr2AtlasTexture
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_resPath (std::string) [READ] */
  @blue.read
  @type.path
  resPath = "";

  /** m_width (unsigned int) [READ] */
  @blue.read
  @type.uint32
  width = 0;

  /** m_height (unsigned int) [READ] */
  @blue.read
  @type.uint32
  height = 0;

  /** m_textureWidth (unsigned int) [READ] */
  @blue.read
  @type.uint32
  atlasWidth = 0;

  /** m_textureHeight (unsigned int) [READ] */
  @blue.read
  @type.uint32
  atlasHeight = 0;

  /** m_x (unsigned int) [READ] */
  @blue.read
  @type.uint32
  x = 0;

  /** m_y (unsigned int) [READ] */
  @blue.read
  @type.uint32
  y = 0;

  /** m_textureAtlas (Tr2TextureAtlasPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2TextureAtlas")
  atlas = null;

  /**
   * Ours: this texture as a non-owning pointer. Carbon's atlas and its areas
   * hold raw `Tr2AtlasTexture*` that never keep the texture alive; JavaScript's
   * only non-owning reference is a `WeakRef`, and the atlas needs one identity
   * per texture to key its sets, so each texture carries its own.
   * @type {WeakRef<Tr2AtlasTexture>}
   */
  _selfRef = new WeakRef(this);

  /** m_texture: own AL texture, used when stand-alone or outside the atlas. */
  _texture = new Tr2TextureAL();

  /** m_textureRes (TriTextureResPtr), for dynamic textures. */
  _textureRes = null;

  /** m_renderTarget (Tr2TextureAL*) */
  _renderTarget = null;

  /** @type {import("./Tr2TextureAtlasArea.js").Tr2TextureAtlasArea|null} m_atlasArea */
  _atlasArea = null;

  /** @type {import("#imageio").HostBitmap|null} m_loadedBitmap, filled by the (unported) load path. */
  _loadedBitmap = null;

  /** m_textureWindow */
  _textureWindow = vec4.create();

  /** m_widthReciprocal */
  _widthReciprocal = 0;

  /** m_heightReciprocal */
  _heightReciprocal = 0;

  /** m_textureWidthReciprocal */
  _textureWidthReciprocal = 0;

  /** m_textureHeightReciprocal */
  _textureHeightReciprocal = 0;

  /** BlueAsyncRes m_isGood */
  _isGood = false;

  /** BlueAsyncRes m_isPrepared */
  _isPrepared = false;

  /** BlueAsyncRes loading state; nothing sets it until the load path is ported. */
  _isLoading = false;

  /** m_isStandAlone */
  _isStandAlone = false;

  /** m_isLocked */
  _isLocked = false;

  /** m_memoryUsage */
  _memoryUsage = 0;

  /** @type {Set<{AtlasTextureChanged: Function}>} m_changeListeners */
  _changeListeners = new Set();

  /**
   * A stand-alone atlas texture is a permanent outsider
   * (`Tr2AtlasTexture_Blue.cpp:167-174`).
   *
   * @returns {boolean} Whether it is stand-alone.
   */
  @blue.readwrite
  @type.boolean
  get isStandAlone()
  {
    return this.IsStandAlone();
  }

  /**
   * Sets stand-alone; ejects the texture from its atlas when true.
   *
   * @param {boolean} value Stand-alone.
   */
  set isStandAlone(value)
  {
    this.SetStandAlone(value);
  }

  /**
   * Sets a texture res directly, for dynamic textures
   * (`Tr2AtlasTexture_Blue.cpp:176-180`).
   *
   * @returns {object|null} The texture resource.
   */
  @blue.readwrite
  @type.rootRef("TriTextureRes")
  get textureRes()
  {
    return this.GetTextureRes();
  }

  /**
   * Sets the texture resource.
   *
   * @param {object} value The texture resource.
   */
  set textureRes(value)
  {
    this.SetTextureRes(value);
  }

  /**
   * Returns the AL texture to draw from: the atlas's when in the atlas, else
   * its own, else the texture resource's (`Tr2AtlasTexture.cpp:45-64`).
   *
   * @returns {Tr2TextureAL|null} The texture, or null.
   */
  @meta.implemented
  GetTexture()
  {
    // are we part of an atlas? If so, go get the texture from that to guarantee pointer identity.
    if (this.atlas && this._atlasArea) return this.atlas.GetTexture();

    if (this._texture.IsValid()) return this._texture;

    if (this._textureRes && this._textureRes.IsGood()) return this._textureRes.GetTexture();

    return null;
  }

  /**
   * Returns the render target, if any (`Tr2AtlasTexture.cpp:73-76`).
   *
   * @returns {Tr2TextureAL|null} The render target.
   */
  @meta.implemented
  GetRenderTarget()
  {
    return this._renderTarget;
  }

  /**
   * Attaches a render target and makes it the whole texture
   * (`Tr2AtlasTexture.cpp:78-97`).
   *
   * @param {Tr2TextureAL|null} rt The render target.
   * @returns {void}
   */
  @meta.implemented
  SetRenderTarget(rt)
  {
    this._renderTarget = rt;
    this._isGood = true;
    this._isPrepared = true;
    if (this._renderTarget)
    {
      this.width = rt.GetWidth();
      this.atlasWidth = this.width;
      this.height = rt.GetHeight();
      this.atlasHeight = this.height;

      this._CalcReciprocals();

      this._textureWindow[0] = 0;
      this._textureWindow[1] = 0;
      this._textureWindow[2] = 1;
      this._textureWindow[3] = 1;
    }
  }

  /**
   * Copies the cached texture window `(u, v, du, dv)` (`Tr2AtlasTexture.cpp:99-102`).
   *
   * @param {Float32Array|number[]} tw Receives the window.
   * @returns {void}
   */
  @meta.implemented
  GetTextureWindow(tw)
  {
    tw[0] = this._textureWindow[0];
    tw[1] = this._textureWindow[1];
    tw[2] = this._textureWindow[2];
    tw[3] = this._textureWindow[3];
  }

  /**
   * Caches the window of the whole texture (`Tr2AtlasTexture.cpp:104-107`).
   *
   * @returns {void}
   */
  @meta.implemented
  _CalcTextureWindow()
  {
    this.CalcSubTextureWindow(this._textureWindow, 0, 0, 0, 0);
  }

  /**
   * Texture coordinates of a sub-rectangle; zero size means the whole texture
   * (`Tr2AtlasTexture.cpp:109-137`).
   *
   * @param {Float32Array|number[]} tw Receives `(u, v, du, dv)`.
   * @param {number} rectX Left, in texture pixels.
   * @param {number} rectY Top, in texture pixels.
   * @param {number} rectWidth Width, or 0 for the texture width.
   * @param {number} rectHeight Height, or 0 for the texture height.
   * @returns {void}
   */
  @meta.implemented
  CalcSubTextureWindow(tw, rectX, rectY, rectWidth, rectHeight)
  {
    const tex = this.GetTexture();

    if (!tex)
    {
      tw[0] = 0;
      tw[1] = 0;
      tw[3] = 1;
      tw[2] = 1;
      return;
    }

    if (rectWidth === 0) rectWidth = this.width;

    if (rectHeight === 0) rectHeight = this.height;

    tw[0] = (this.x + rectX) * this._textureWidthReciprocal;
    tw[1] = (this.y + rectY) * this._textureHeightReciprocal;
    tw[2] = rectWidth * this._textureWidthReciprocal;
    tw[3] = rectHeight * this._textureHeightReciprocal;
  }

  /**
   * Removes the texture from its atlas and releases its resources
   * (`Tr2AtlasTexture.cpp:139-146`), then runs what Carbon's destructor does
   * (`Tr2AtlasTexture.cpp:36-43`).
   *
   * Carbon calls `OnShutdown` when the last reference goes and the destructor
   * right after. JavaScript has no destructors, so the caller must call this
   * explicitly; a texture that is merely dropped is reclaimed by the atlas's
   * `_ReclaimCollectedTextures` (ours) at some later point instead.
   *
   * quirk, CE-147 (`Tr2AtlasTexture.cpp:36-43` after :139-146): the destructor's
   * unlock runs after the area and own texture are gone, so `UnlockBuffer`
   * finds no texture and returns without unmapping. Reproduced; only the
   * warning is effective.
   *
   * @returns {void}
   */
  @meta.adapted
  OnShutdown()
  {
    if (this.atlas) this.atlas._RemoveFromAtlas(this);
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);

    if (this._isLocked)
    {
      CcpLog.CCP_LOGWARN("Tr2AtlasTexture locked upon destruction - unlock before destroying");
      this.UnlockBuffer();
    }
  }

  /**
   * Reloads the texture after a device reset (`Tr2AtlasTexture.cpp:148-157`)
   * through `BlueAsyncRes::Initialize`.
   *
   * Not implemented: it needs the `BlueAsyncRes` load path, see `DoLoad`.
   *
   * @returns {boolean} Never returns.
   */
  @meta.notImplemented
  OnPrepareResources()
  {
    throw new Error("Tr2AtlasTexture.OnPrepareResources is not implemented in CarbonEngineJS: it reloads through the unported BlueAsyncRes load path.");
  }

  /**
   * Drops the own texture and the atlas area when the storage class matches
   * (`Tr2AtlasTexture.cpp:159-183`).
   *
   * Carbon deletes the area while the texture stays registered with the atlas.
   * The deleted area is marked by clearing its `tex`, so the atlas's GC
   * reclamation never frees it a second time. `CancelPendingLoad` is skipped:
   * no load can be pending until the load path is ported.
   *
   * @param {number} s A `TriStorageFlags` mask.
   * @returns {void}
   */
  @meta.adapted
  ReleaseResources(s)
  {
    let texture = null;
    if (this.atlas && this._atlasArea) texture = this.atlas.GetTexture();
    else if (this._texture.IsValid()) texture = this._texture;

    if (texture && (texture.GetMemoryClass() & s))
    {
      // When managed memory is freed, both standalone textures and the
      // ones resident in an atlas are purged.
      this._texture.Destroy();

      if (this._atlasArea) this._atlasArea.tex = null;
      this._atlasArea = null;

      this._isPrepared = false;
    }
  }

  /**
   * Reads the image file into `_loadedBitmap` (`Tr2AtlasTexture.cpp:185-205`).
   *
   * Not implemented, together with `DoPrepare`, `OnPrepareResources`,
   * `ICacheable` and the `ddsatlas`/`sddatlas`/`pngatlas`/`jpgatlas`/
   * `jpegatlas`/`ecsatlas` extensions (`Tr2AtlasTexture_Blue.cpp:10-22`).
   * Porting them needs decisions outside this class: `Tr2AtlasTexture` would
   * have to become a `CjsResource` (the BlueAsyncRes port), the extensions
   * would need a registrar composed by whoever builds a resource manager (as
   * `registerTextureResources` is), and browser image decoding is
   * asynchronous, so the read moves into a loader as it does for
   * `Tr2ImageRes`. The atlas side (`Tr2TextureAtlas._DoPrepare`) is ported.
   *
   * @returns {number} Never returns.
   */
  @meta.notImplemented
  DoLoad()
  {
    throw new Error("Tr2AtlasTexture.DoLoad is not implemented in CarbonEngineJS: the BlueAsyncRes load path and *atlas extensions need a resource-manager design decision.");
  }

  /**
   * Places the loaded bitmap in an atlas or a texture of its own
   * (`Tr2AtlasTexture.cpp:207-268`). Not implemented; see `DoLoad`.
   *
   * @returns {boolean} Never returns.
   */
  @meta.notImplemented
  DoPrepare()
  {
    throw new Error("Tr2AtlasTexture.DoPrepare is not implemented in CarbonEngineJS: it belongs to the unported BlueAsyncRes load path.");
  }

  /**
   * Returns the left offset in the AL texture (`Tr2AtlasTexture.cpp:270-273`).
   *
   * @returns {number} X.
   */
  @meta.implemented
  GetX()
  {
    return this.x;
  }

  /**
   * Returns the top offset in the AL texture (`Tr2AtlasTexture.cpp:275-278`).
   *
   * @returns {number} Y.
   */
  @meta.implemented
  GetY()
  {
    return this.y;
  }

  /**
   * Returns the width (`Tr2AtlasTexture.cpp:280-283`).
   *
   * @returns {number} Width.
   */
  @meta.implemented
  GetWidth()
  {
    return this.width;
  }

  /**
   * Returns `1 / width` (`Tr2AtlasTexture.cpp:285-288`).
   *
   * @returns {number} The reciprocal.
   */
  @meta.implemented
  GetWidthReciprocal()
  {
    return this._widthReciprocal;
  }

  /**
   * Returns the height (`Tr2AtlasTexture.cpp:290-293`).
   *
   * @returns {number} Height.
   */
  @meta.implemented
  GetHeight()
  {
    return this.height;
  }

  /**
   * Returns `1 / height` (`Tr2AtlasTexture.cpp:295-298`).
   *
   * @returns {number} The reciprocal.
   */
  @meta.implemented
  GetHeightReciprocal()
  {
    return this._heightReciprocal;
  }

  /**
   * Returns the width of the AL texture this lives in (`Tr2AtlasTexture.cpp:300-303`).
   *
   * @returns {number} Width.
   */
  @meta.implemented
  GetTextureWidth()
  {
    return this.atlasWidth;
  }

  /**
   * Returns the height of the AL texture this lives in (`Tr2AtlasTexture.cpp:305-308`).
   *
   * @returns {number} Height.
   */
  @meta.implemented
  GetTextureHeight()
  {
    return this.atlasHeight;
  }

  /**
   * Maps this texture's rectangle for writing (`Tr2AtlasTexture.cpp:310-351`).
   *
   * Carbon returns a bool and writes the pointer and pitch through reference
   * parameters; JS has none, so the AL mapping record is returned on success
   * and null on failure.
   *
   * @returns {{result: number, data: Uint8Array, pitch: number}|null} The mapping, or null.
   */
  @blue.method
  @meta.adapted
  LockBuffer()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    let texture = null;
    if (this.atlas && this._atlasArea) texture = this.atlas.GetTexture();
    else if (this._texture.IsValid()) texture = this._texture;

    if (!texture || !texture.IsValid()) return null;

    if (this._isLocked)
    {
      CcpLog.CCP_LOGERR("Tr2AtlasTexture::LockBuffer failed - texture is already locked");
      return null;
    }

    const region = Tr2TextureSubresource.create__MipLevel(0).SetRect(this.x, this.y, this.x + this.width, this.y + this.height);
    const mapping = texture.MapForWriting(region, renderContext);

    if (Failed(mapping.result))
    {
      CcpLog.CCP_LOGERR("Tr2AtlasTexture::LockBuffer failed - another atlas texture may be locked already (HR: %08lx)", mapping.result);
      return null;
    }

    this._isLocked = true;

    return mapping;
  }

  /**
   * Maps this texture's rectangle including the atlas margin
   * (`Tr2AtlasTexture.cpp:353-390`). Outside an atlas the margin is 0 and this
   * is `LockBuffer`. Returns the mapping with `margin` added, or null; JS has
   * no reference parameters.
   *
   * @returns {{result: number, data: Uint8Array, pitch: number, margin: number}|null} The mapping, or null.
   */
  @blue.method
  @meta.adapted
  LockBufferAndMargin()
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    let texture = null;
    if (this.atlas && this._atlasArea) texture = this.atlas.GetTexture();
    else if (this._texture.IsValid()) texture = this._texture;

    if (!this.atlas || !this._atlasArea || this._isLocked || !texture || !texture.IsValid())
    {
      const mapping = this.LockBuffer();
      return mapping ? { result: mapping.result, data: mapping.data, pitch: mapping.pitch, margin: 0 } : null;
    }

    const margin = this.atlas.GetMargin();
    const region = Tr2TextureSubresource.create__MipLevel(0).SetRect(this.x - margin, this.y - margin, this.x + this.width + margin, this.y + this.height + margin);
    const mapping = texture.MapForWriting(region, renderContext);

    if (Failed(mapping.result))
    {
      CcpLog.CCP_LOGERR("Tr2AtlasTexture::LockBufferAndMargin failed - another atlas texture may be locked already (HR: %08lx)", mapping.result);
      return null;
    }

    this._isLocked = true;

    return { result: mapping.result, data: mapping.data, pitch: mapping.pitch, margin };
  }

  /**
   * Unmaps a rectangle mapped by `LockBuffer`, marks the texture good and
   * notifies listeners (`Tr2AtlasTexture.cpp:392-423`).
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  UnlockBuffer()
  {
    if (!this._isLocked)
    {
      CcpLog.CCP_LOGWARN("Tr2AtlasTexture::UnlockBuffer failed - texture is not locked");
      return;
    }

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    let texture = null;
    if (this.atlas && this._atlasArea) texture = this.atlas.GetTexture();
    else if (this._texture.IsValid()) texture = this._texture;

    if (!texture) return;

    texture.UnmapForWriting(renderContext);

    this._isLocked = false;
    this._isGood = true;

    this._NotifyListenersOfChange();
  }

  /**
   * Whether `GetMemoryUsage` is meaningful (`Tr2AtlasTexture.cpp:425-428`).
   *
   * @returns {boolean} True unless loading.
   */
  @meta.implemented
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Estimated memory use in bytes (`Tr2AtlasTexture.cpp:430-433`).
   *
   * @returns {number} Bytes.
   */
  @meta.implemented
  GetMemoryUsage()
  {
    return this._memoryUsage;
  }

  /**
   * Updates the non-zero reciprocals (`Tr2AtlasTexture.cpp:435-453`). Carbon
   * stores them as float.
   *
   * @returns {void}
   */
  @meta.implemented
  _CalcReciprocals()
  {
    if (this.width) this._widthReciprocal = Math.fround(1 / this.width);
    if (this.height) this._heightReciprocal = Math.fround(1 / this.height);
    if (this.atlasWidth) this._textureWidthReciprocal = Math.fround(1 / this.atlasWidth);
    if (this.atlasHeight) this._textureHeightReciprocal = Math.fround(1 / this.atlasHeight);
  }

  /**
   * Recomputes reciprocals and window, then notifies (`Tr2AtlasTexture.cpp:455-461`).
   *
   * @returns {void}
   */
  @meta.implemented
  _FinalizePrepare()
  {
    this._CalcReciprocals();
    this._CalcTextureWindow();

    this._NotifyListenersOfChange();
  }

  /**
   * Adds a change listener (`Tr2AtlasTexture.cpp:463-466`).
   *
   * @param {{AtlasTextureChanged: Function}} p The listener.
   * @returns {void}
   */
  @meta.implemented
  RegisterForChangeNotification(p)
  {
    this._changeListeners.add(p);
  }

  /**
   * Removes a change listener (`Tr2AtlasTexture.cpp:468-471`).
   *
   * @param {{AtlasTextureChanged: Function}} p The listener.
   * @returns {void}
   */
  @meta.implemented
  UnregisterForChangeNotification(p)
  {
    this._changeListeners.delete(p);
  }

  /**
   * Makes the texture a permanent outsider, ejecting it from its atlas
   * (`Tr2AtlasTexture.cpp:473-484`).
   *
   * @param {boolean} b Stand-alone.
   * @returns {void}
   */
  @meta.implemented
  SetStandAlone(b)
  {
    this._isStandAlone = b;

    if (this._isStandAlone)
    {
      if (this.atlas) this.atlas.EjectTexture(this);
    }
  }

  /**
   * Whether the texture is a permanent outsider (`Tr2AtlasTexture.cpp:486-489`).
   *
   * @returns {boolean} Stand-alone.
   */
  @meta.implemented
  IsStandAlone()
  {
    return this._isStandAlone;
  }

  /**
   * Calls every listener's `AtlasTextureChanged` (`Tr2AtlasTexture.cpp:491-497`).
   *
   * @returns {void}
   */
  @meta.implemented
  _NotifyListenersOfChange()
  {
    for (const target of this._changeListeners) target.AtlasTextureChanged(this);
  }

  /**
   * Chooses the atlas to load into, once (`Tr2AtlasTexture.cpp:499-506`).
   *
   * @param {import("./Tr2TextureAtlas.js").Tr2TextureAtlas} atlas The atlas.
   * @returns {void}
   */
  @meta.implemented
  SetTargetAtlasBeforeLoad(atlas)
  {
    if (this.atlas) return;
    this.atlas = atlas;
  }

  /**
   * Uses a texture resource directly, for dynamic textures
   * (`Tr2AtlasTexture.cpp:508-525`).
   *
   * @param {object} p A `TriTextureRes`.
   * @returns {void}
   */
  @meta.implemented
  SetTextureRes(p)
  {
    this._textureRes = p;
    this._isPrepared = true;
    this._isGood = true;

    this.x = 0;
    this.y = 0;
    this.width = this._textureRes.GetWidth();
    this.atlasWidth = this.width;
    this.height = this._textureRes.GetHeight();
    this.atlasHeight = this.height;

    this._CalcReciprocals();
    this._CalcTextureWindow();
  }

  /**
   * Returns the texture resource (`Tr2AtlasTexture.cpp:527-530`).
   *
   * @returns {object|null} The texture resource.
   */
  @meta.implemented
  GetTextureRes()
  {
    return this._textureRes;
  }

  /**
   * BlueAsyncRes `IsGood`.
   *
   * @returns {boolean} Whether the texture holds valid pixels.
   */
  @meta.implemented
  IsGood()
  {
    return this._isGood;
  }

  /**
   * BlueAsyncRes `IsPrepared`.
   *
   * @returns {boolean} Whether the texture is prepared.
   */
  @meta.implemented
  IsPrepared()
  {
    return this._isPrepared;
  }

  /**
   * BlueAsyncRes `IsLoading`. Always false until the load path is ported.
   *
   * @returns {boolean} Whether a load is in flight.
   */
  @meta.implemented
  IsLoading()
  {
    return this._isLoading;
  }
}
