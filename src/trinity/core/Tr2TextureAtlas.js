// Source: trinity/trinity/Tr2TextureAtlas.h
// Source: trinity/trinity/Tr2TextureAtlas.cpp
// Source: trinity/trinity/Tr2TextureAtlas_Blue.cpp
// Hand-maintained port. Two forced divergences run through the whole file, and
// each is marked again at its sites:
//
// - No out parameters: `CreateTexture` returns the texture (or null) instead of
//   an ALResult plus a `Tr2AtlasTexture**`, and AL maps return
//   `{ result, data, pitch }`.
// - No destructors and no non-owning raw pointers: Carbon's
//   `Tr2AtlasTextureSet_t` holds raw `Tr2AtlasTexture*` that never keep a
//   texture alive, and `~Tr2AtlasTexture`/`OnShutdown` removes the texture from
//   the atlas deterministically. JavaScript can only express a non-owning
//   pointer as a `WeakRef`, and runs no code when the last reference goes. So
//   the two sets are keyed by each texture's `_selfRef`, and
//   `_ReclaimCollectedTextures` (ours) returns what a collected texture held.
import { meta, type, blue } from "#schema";
import * as CcpLog from "../../global/logging/ccpLog.js";
import {
  PixelFormat,
  TextureType,
  Tr2CpuUsage,
  Tr2GpuUsage,
  GetBytesPerPixel,
  GetBlockByteSize,
  IsCompressedFormat
} from "#consts/render-context";
import { TriStorageFlags } from "#consts/graphics";
import { Tr2TextureAL, Tr2BitmapDimensions, Tr2TextureSubresource, Failed, Succeeded } from "#trinityal";
import { Tr2AtlasTexture } from "./Tr2AtlasTexture.js";
import { Tr2TextureAtlasArea } from "./Tr2TextureAtlasArea.js";
import { ITr2TextureProvider } from "./ITr2TextureProvider.js";
import { Tr2Event } from "./Tr2Event.js";
import { Tr2Renderer } from "./Tr2Renderer.js";
import { TriDevice } from "./device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "./context/Tr2RenderContext.js";


/**
 * `Tr2RenderContextEnum::OT_TEXTURE` (`trinityal/Tr2RenderContextEnum.h:11-29`,
 * fifth member of `ObjectType`). `ObjectType` has no JS declaration yet; it
 * belongs in `global/consts/renderContext` and this local copy should be
 * replaced when it lands there.
 */
const OT_TEXTURE = 4;

/**
 * `static unsigned int s_fillValue` in `Tr2TextureAtlas::PaintEmptyArea`
 * (`Tr2TextureAtlas.cpp:906`). Process-wide in Carbon, module-wide here.
 */
let s_fillValue = 0;


/**
 * Copies a rectangle record.
 *
 * @param {{left: number, top: number, right: number, bottom: number}} rect The rectangle.
 * @returns {{left: number, top: number, right: number, bottom: number}} A copy; Carbon copies `Tr2Rect` by value.
 */
function CopyRect(rect)
{
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}


/**
 * `Squareness::Metric` (`Tr2TextureAtlas.cpp:234-245`), the local struct of
 * `ConsolidateFreeAreas`.
 *
 * @param {{left: number, top: number, right: number, bottom: number}} a The rectangle.
 * @returns {number} `(w - h)^2 / (w * h)`, or 0 for an empty rectangle.
 */
function SquarenessMetric(a)
{
  const w = a.right - a.left;
  const h = a.bottom - a.top;
  if (w === 0 || h === 0) return 0;

  const d = Math.fround(w - h);
  return Math.fround(d * d / Math.fround(w * h));
}


/**
 * `Tr2ImageIOHelpers::AddMargin` (`Tr2ImageIOHelpers.cpp:201-325`): copies a
 * tightly packed image into a buffer with `margin` replicated edge texels on
 * every side. Corners stay zero (Carbon's own note at :287-288).
 *
 * MISPLACED: this belongs in `trinity/core/Tr2ImageIOHelpers.js`, which is
 * outside the atlas work's scope; it lives here only until it is moved there.
 *
 * bug, CE-148 (`Tr2ImageIOHelpers.cpp:239-259`): in the compressed branch the block-row
 * loop never advances `dst`, so every block row is written over the first one
 * and the bottom margin lands on the second row of the buffer. Reproduced.
 *
 * bug, CE-148 (`Tr2ImageIOHelpers.cpp:276`): the source pitch is assumed to be the
 * tight, 4-byte-aligned row size, whatever pitch the caller actually mapped.
 *
 * @param {number} format A `PixelFormat` value.
 * @param {Uint8Array} source The source pixels.
 * @param {number} width Source width in pixels.
 * @param {number} height Source height in pixels.
 * @param {number} margin Margin in pixels.
 * @returns {{output: Uint8Array, outputPitch: number}} The padded pixels and their pitch.
 */
function AddMargin(format, source, width, height, margin)
{
  let src = 0;

  if (IsCompressedFormat(format))
  {
    const blockByteSize = GetBlockByteSize(format);
    const blockPixelSize = 4;
    const blockMargin = Math.floor(margin / blockPixelSize);
    const blocksX = Math.floor(width / blockPixelSize);
    const blocksY = Math.floor(height / blockPixelSize);

    const outputPitch = (blocksX + 2 * blockMargin) * blockByteSize;
    const output = new Uint8Array((blockMargin + blocksY + blockMargin) * outputPitch); // alloc: variable-size padded image, Carbon's per-call std::vector output (Tr2ImageIOHelpers.cpp:188, :206)
    let dst = 0;

    for (let i = 0; i < blockMargin; ++i)
    {
      output.set(source.subarray(src, src + blocksX * blockByteSize), dst + blockMargin * blockByteSize);
      dst += outputPitch;
    }

    // bug, CE-148: dst is not advanced inside this loop (Tr2ImageIOHelpers.cpp:239-259).
    for (let line = 0; line < height; line += blockPixelSize)
    {
      for (let i = 0; i !== blockMargin; ++i)
      {
        output.set(source.subarray(src, src + blockByteSize), dst + i * blockByteSize);
      }

      output.set(source.subarray(src, src + blocksX * blockByteSize), dst + blockMargin * blockByteSize);

      for (let i = 0; i !== blockMargin; ++i)
      {
        const last = src + (blocksX - 1) * blockByteSize;
        output.set(source.subarray(last, last + blockByteSize), dst + (blocksX + blockMargin + i) * blockByteSize);
      }

      if (line < height - 1) src += blocksX * blockByteSize;
    }

    for (let i = 0; i !== blockMargin; ++i)
    {
      output.set(source.subarray(src, src + blocksX * blockByteSize), dst + blockMargin * blockByteSize);
      dst += outputPitch;
    }

    return { output, outputPitch };
  }

  const byteCount = GetBytesPerPixel(format);
  const srcPitch = 4 * Math.floor((width * byteCount + 3) / 4);
  const outputPitch = (width + 2 * margin) * byteCount;
  const output = new Uint8Array((height + 2 * margin) * outputPitch); // alloc: variable-size padded image, Carbon's per-call std::vector output (Tr2ImageIOHelpers.cpp:188, :206)
  let dst = 0;

  for (let i = 0; i !== margin; ++i)
  {
    output.set(source.subarray(src, src + width * byteCount), dst + margin * byteCount);
    dst += outputPitch;
  }

  for (let line = 0; line !== height; ++line)
  {
    for (let i = 0; i !== margin; ++i)
    {
      output.set(source.subarray(src, src + byteCount), dst + i * byteCount);
    }

    output.set(source.subarray(src, src + width * byteCount), dst + margin * byteCount);

    for (let i = 0; i !== margin; ++i)
    {
      const last = src + (width - 1) * byteCount;
      output.set(source.subarray(last, last + byteCount), dst + (width + margin + i) * byteCount);
    }

    if (line < height - 1) src += srcPitch;
    dst += outputPitch;
  }

  for (let i = 0; i !== margin; ++i)
  {
    output.set(source.subarray(src, src + width * byteCount), dst + margin * byteCount);
    dst += outputPitch;
  }

  return { output, outputPitch };
}


/**
 * `Tr2ImageIOHelpers::CopyToTexture` (`Tr2ImageIOHelpers.cpp:148-199`): uploads
 * a host bitmap into a texture at `(x, y)`, padded with `margin`.
 *
 * MISPLACED, like `AddMargin`: belongs in `trinity/core/Tr2ImageIOHelpers.js`.
 *
 * @param {import("#imageio").HostBitmap} bitmap The bitmap.
 * @param {Tr2TextureAL} texture The destination texture.
 * @param {number} x Destination left.
 * @param {number} y Destination top.
 * @param {number} margin Margin in pixels.
 * @param {object} renderContext The render context.
 * @returns {boolean} True when the upload succeeded.
 */
function CopyToTexture(bitmap, texture, x, y, margin, renderContext)
{
  if (!bitmap.IsValid()) return false;

  if (texture.GetFormat() !== bitmap.GetFormat())
  {
    CcpLog.CCP_LOGERR("Tr2ImageHandler::CopyToTexture - formats don't match");
    return false;
  }

  if (x >= texture.GetWidth() || y >= texture.GetHeight())
  {
    CcpLog.CCP_LOGERR("Tr2ImageHandler::CopyToTexture - out of bounds");
    return false;
  }

  if (x + bitmap.GetWidth() > texture.GetWidth() || y + bitmap.GetHeight() > texture.GetHeight())
  {
    CcpLog.CCP_LOGERR("Tr2ImageHandler::CopyToTexture - out of bounds");
    return false;
  }

  if (!margin)
  {
    const region = Tr2TextureSubresource.create__MipLevel(0).SetRect(x, y, x + bitmap.GetWidth(), y + bitmap.GetHeight());
    const result = texture.UpdateSubresource(region, bitmap.GetRawData(), bitmap.GetPitch(), 0, renderContext);
    if (Failed(result)) CcpLog.CCP_LOGERR("Tr2ImageHandler::CopyToTexture - UpdateSubresource failed [no margin]: %08x", result);
    return Succeeded(result);
  }

  const { output, outputPitch } = AddMargin(bitmap.GetFormat(), bitmap.GetRawData(), bitmap.GetWidth(), bitmap.GetHeight(), margin);

  const region = Tr2TextureSubresource.create__MipLevel(0).SetRect(x, y, x + bitmap.GetWidth() + 2 * margin, y + bitmap.GetHeight() + 2 * margin);
  const result = texture.UpdateSubresource(region, output, outputPitch, 0, renderContext);
  if (Failed(result)) CcpLog.CCP_LOGERR("Tr2ImageHandler::CopyToTexture - UpdateSubresource failed [margin]: %08x", result);
  return Succeeded(result);
}


/**
 * A texture that many small textures share: each `Tr2AtlasTexture` is a window
 * into it. Allocation is best-fit over a list of free rectangles; textures that
 * do not fit become "outsiders" with their own AL texture and are pulled in when
 * space opens.
 */
@blue.define({ className: "Tr2TextureAtlas", purpose: "Shares one AL texture between many atlas textures, allocating best-fit rectangles and tracking textures that did not fit." })
@blue.interface(ITr2TextureProvider)
export class Tr2TextureAtlas extends ITr2TextureProvider
{

  /** m_format (Tr2RenderContextEnum::PixelFormat) [READ, ENUM] */
  @blue.read
  @type.int32
  @type.enum("PixelFormat")
  format = PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM;

  /** m_width (unsigned int) [READ] */
  @blue.read
  @type.uint32
  width = 2048;

  /** m_height (unsigned int) [READ] */
  @blue.read
  @type.uint32
  height = 2048;

  /** m_mipLevels (unsigned) [READ] */
  @blue.read
  @type.uint32
  mipCount = 0;

  /** m_optimizeOnRemoval (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  optimizeOnRemoval = true;

  /** m_paintEmptyAreas (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  paintEmptyAreas = false;

  /** m_margin (unsigned int) [READWRITE] */
  @blue.readwrite
  @type.uint32
  margin = 2;

  /** Carbon `AtlasTextureType` (`Tr2TextureAtlas.h:47-51`). */
  static AtlasTextureType = {
    ATT_DEFAULT: 0,
    ATT_VIDEO: 1
  };

  /** The pixel-format vocabulary for `format`. */
  static PixelFormat = PixelFormat;

  /** m_texture */
  _texture = new Tr2TextureAL();

  /** m_onTextureChange (OnTextureChangeEvent) */
  _onTextureChange = new Tr2Event();

  /** @type {Tr2TextureAtlasArea[]} m_freeAreas */
  _freeAreas = [];

  /**
   * m_pendingFreeAreas: `[area, recordingFrameNumber]` pairs, freed once the
   * device has rendered that frame (`Tr2TextureAtlas.h:155-156`).
   * @type {Array<[Tr2TextureAtlasArea, number]>}
   */
  _pendingFreeAreas = [];

  /**
   * m_texturesInAtlas. Carbon: a set of raw, non-owning `Tr2AtlasTexture*`.
   * Keys are each texture's `_selfRef`, the JS spelling of that pointer; the
   * value is the area the texture held when registered, so that
   * `_ReclaimCollectedTextures` can still reach it once the texture is gone.
   * @type {Map<WeakRef<Tr2AtlasTexture>, Tr2TextureAtlasArea|null>}
   * adapted: see above; no decorator because this is not a schema field.
   */
  _texturesInAtlas = new Map();

  /**
   * m_texturesOutsideAtlas. Keys as for `_texturesInAtlas`; the value is the
   * outsider's own `Tr2TextureAL`, so that a collected outsider's AL texture
   * can still be destroyed.
   * @type {Map<WeakRef<Tr2AtlasTexture>, Tr2TextureAL>}
   * adapted: see _texturesInAtlas.
   */
  _texturesOutsideAtlas = new Map();

  /** m_createOutsiders */
  _createOutsiders = true;

  /** m_maxTextureArea */
  _maxTextureArea = 512 * 512;

  /** m_freeTexels */
  _freeTexels = 0;

  /** m_freeMaxWidth */
  _freeMaxWidth = -1;

  /** m_freeMaxHeight */
  _freeMaxHeight = -1;

  /** m_optimizationWarranted */
  _optimizationWarranted = false;

  /** m_areasFreedSinceLastCollapse */
  _areasFreedSinceLastCollapse = 0;

  /** m_hasMipMaps. Carbon has no setter for it, so it is always false there. */
  _hasMipMaps = false;

  /** @type {Array<{left: number, top: number, right: number, bottom: number}>} m_dirtyMipRegions */
  _dirtyMipRegions = [];

  /**
   * Registers with the device, as Carbon's `Tr2DeviceResource` base
   * constructor does (`Tr2DeviceResource.cpp:10-13`).
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** How many textures are in the atlas texture? Counts live textures only. */
  @blue.read
  @type.int32
  get texturesInAtlasCount()
  {
    return this.GetTexturesInAtlasCount();
  }

  /** How many textures are registered with the atlas but didn't fit? Counts live textures only. */
  @blue.read
  @type.int32
  get texturesOutsideAtlasCount()
  {
    return this.GetTexturesOutsideAtlasCount();
  }

  /** multiSampleType: always 1 (`Tr2TextureAtlas.cpp:1582-1585`). */
  @blue.read
  @type.uint32
  get multiSampleType()
  {
    return this.GetMsaaSamples();
  }

  /** multiSampleQuality: always 0 (`Tr2TextureAtlas.cpp:1587-1590`). */
  @blue.read
  @type.uint32
  get multiSampleQuality()
  {
    return this.GetMsaaQuality();
  }

  /**
   * Releases, resizes and re-prepares the atlas (`Tr2TextureAtlas.cpp:38-47`).
   *
   * @param {number} fmt A `PixelFormat` value.
   * @param {number} width Atlas width.
   * @param {number} height Atlas height.
   * @returns {void}
   */
  @meta.implemented
  Initialize(fmt, width, height)
  {
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);

    this.format = fmt;
    this.width = width;
    this.height = height;

    this.PrepareResources();
  }

  /**
   * `Tr2DeviceResource::PrepareResources` (`Tr2DeviceResource.cpp:21-33`):
   * prepares only while resource creation is allowed.
   *
   * @returns {boolean} False only when preparation was attempted and failed.
   */
  @meta.implemented
  PrepareResources()
  {
    if (Tr2Renderer.IsResourceCreationAllowed())
    {
      if (!this.OnPrepareResources()) return false;
    }
    return true;
  }

  /**
   * Drops the AL texture and every free and pending area
   * (`Tr2TextureAtlas.cpp:49-69`). Areas held by textures stay with them.
   *
   * @param {number} s A `TriStorageFlags` mask.
   * @returns {void}
   */
  @meta.implemented
  ReleaseResources(s)
  {
    if (s & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)
    {
      this._texture.Destroy();

      this._freeAreas.length = 0;
      this._pendingFreeAreas.length = 0;
      this._dirtyMipRegions.length = 0;

      this._FireTextureChange();
    }
  }

  /**
   * Creates the atlas texture, halving the longer side until creation
   * succeeds, then makes the whole atlas one free area
   * (`Tr2TextureAtlas.cpp:72-128`).
   *
   * @returns {boolean} False when the atlas shrank to nothing.
   */
  @meta.implemented
  OnPrepareResources()
  {
    if (this._texture.IsValid()) return true;

    let hr;
    do
    {
      if (this.height <= 1 || this.width <= 1) return false;

      this.mipCount = this._hasMipMaps ? Math.trunc(0.5 + Math.log(Math.max(this.height, this.width)) / Math.log(2.0)) : 1;
      const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
      hr = this._texture.Create__GpuUsageCpuUsage(
        Tr2BitmapDimensions.create__WidthHeightMipCountFormat(this.width, this.height, this.mipCount, this.format),
        Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE,
        renderContext);

      if (Failed(hr))
      {
        if (this.width > this.height) this.width = Math.floor(this.width / 2);
        else this.height = Math.floor(this.height / 2);
      }
    } while (Failed(hr));

    const area = new Tr2TextureAtlasArea(0, 0, this.width, this.height);
    area.type = Tr2TextureAtlasArea.Type.FREE;
    area.tex = null;

    this._freeAreas.length = 0;
    this._pendingFreeAreas.length = 0;
    this._FreeArea(area);

    this._freeTexels = this.width * this.height;
    this._freeMaxWidth = this.width;
    this._freeMaxHeight = this.height;

    this._FireTextureChange();

    return true;
  }

  /**
   * Places a loaded texture's bitmap into the atlas
   * (`Tr2TextureAtlas.cpp:131-178`). Called by `Tr2AtlasTexture`'s load path,
   * which reads `tex._loadedBitmap`.
   *
   * @param {Tr2AtlasTexture} tex The texture being prepared.
   * @returns {boolean} False when it does not belong in, or does not fit, the atlas.
   */
  @meta.implemented
  _DoPrepare(tex)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    const width = tex._loadedBitmap.GetWidth();
    const height = tex._loadedBitmap.GetHeight();
    const areaWidth = width + this.margin * 2;
    const areaHeight = height + this.margin * 2;

    // Large textures are not good for atlassing, end up with a lot of small outsiders
    if (areaWidth * areaHeight > this._maxTextureArea) return false;

    const area = this._GetFreeArea(areaWidth, areaHeight);
    if (!area) return false;

    area.type = Tr2TextureAtlasArea.Type.IN_USE;
    area.tex = tex._selfRef;
    tex._atlasArea = area;

    tex.x = area.rect.left + this.margin;
    tex.y = area.rect.top + this.margin;
    tex.width = width;
    tex.height = height;
    tex.atlasWidth = this.width;
    tex.atlasHeight = this.height;

    CopyToTexture(tex._loadedBitmap, this._texture, area.rect.left, area.rect.top, this.margin, renderContext);

    if (this._hasMipMaps) this._dirtyMipRegions.push(CopyRect(area.rect));

    this._RegisterInsider(tex);

    return true;
  }

  /**
   * Registers a texture that lives inside the atlas (`Tr2TextureAtlas.cpp:181-184`).
   *
   * @param {Tr2AtlasTexture} tex The texture.
   * @returns {void}
   */
  @meta.implemented
  _RegisterInsider(tex)
  {
    this._texturesInAtlas.set(tex._selfRef, tex._atlasArea);
  }

  /**
   * Registers a texture that lives outside the atlas; it may be pulled in when
   * space opens (`Tr2TextureAtlas.cpp:188-192`).
   *
   * @param {Tr2AtlasTexture} tex The texture.
   * @returns {void}
   */
  @meta.implemented
  _RegisterOutsider(tex)
  {
    this._texturesOutsideAtlas.set(tex._selfRef, tex._texture);
  }

  /**
   * Unregisters a texture and returns its area (`Tr2TextureAtlas.cpp:194-219`).
   * With `optimizeOnRemoval` the freed space is offered to the outsiders.
   *
   * @param {Tr2AtlasTexture} tex The texture.
   * @returns {void}
   */
  @meta.implemented
  _RemoveFromAtlas(tex)
  {
    this._texturesInAtlas.delete(tex._selfRef);
    this._texturesOutsideAtlas.delete(tex._selfRef);

    const area = tex._atlasArea;
    if (area)
    {
      this._freeTexels += (area.rect.bottom - area.rect.top) * (area.rect.right - area.rect.left);
      tex._atlasArea = null;

      area.type = Tr2TextureAtlasArea.Type.FREE;
      this._FreeArea(area);

      this._PaintEmptyArea(area);

      if (this.optimizeOnRemoval) this.PullInOutsiders();
      else this._UpdateFreeMaxima();
    }
  }

  /**
   * Rotates the split between adjacent free areas where that makes them more
   * square, and merges exact neighbours (`Tr2TextureAtlas.cpp:223-442`).
   *
   * Reproduced as written, including these Carbon defects:
   * - quirk, CE-142 (:264): the vertical test reads `rect_i.bottom == rect_i.top`
   *   where `rect_j.top` is meant, so only "j directly above i" is found;
   * - bug, CE-143 (:370, :405): `std::min( rect_i.left, rect_i.bottom )` where
   *   `rect_j.left` is meant;
   * - quirk, CE-144 (:255): `square_i` is computed once per outer area and goes stale
   *   once that area changes;
   * - quirk, CE-144: the cached free maxima are not updated afterwards;
   * - quirk, CE-145 (:279): after a merge, `j = erase( j )` is followed by the loop's
   *   `++j`, which skips one area, and increments `end()` (undefined
   *   behaviour) when the erased area was last. Here the skip is reproduced
   *   and the end case ends the inner loop.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  ConsolidateFreeAreas()
  {
    this._ReleasePendingFreeAreas();

    if (this._freeAreas.length < 2) return;

    let restartLoop = true;

    while (restartLoop)
    {
      restartLoop = false;
      for (let i = 0; i < this._freeAreas.length; ++i)
      {
        const rect_i = this._freeAreas[i].rect;
        const square_i = SquarenessMetric(rect_i);

        for (let j = i + 1; j < this._freeAreas.length; ++j)
        {
          const rect_j = this._freeAreas[j].rect;
          const square_j = SquarenessMetric(rect_j);
          const squareStart = Math.fround(square_i + square_j);

          // quirk, CE-142: rect_i.bottom == rect_i.top (Tr2TextureAtlas.cpp:264).
          if (rect_i.bottom === rect_i.top || rect_i.top === rect_j.bottom)
          {
            if (rect_i.right === rect_j.right && rect_i.left === rect_j.left)
            {
              const sum = {
                left: rect_i.left,
                right: rect_i.right,
                top: Math.min(rect_i.top, rect_j.top),
                bottom: Math.max(rect_i.bottom, rect_j.bottom)
              };

              // quirk, CE-145: erase then ++j skips the next area (Tr2TextureAtlas.cpp:279).
              this._freeAreas.splice(j, 1);
              Object.assign(rect_i, sum);

              this._PaintEmptyArea(this._freeAreas[i]);

              restartLoop = true;
            }
            else if (rect_i.right === rect_j.right)
            {
              const l = { left: 0, top: 0, right: 0, bottom: 0 };
              const r = { left: 0, top: 0, right: 0, bottom: 0 };
              l.left = Math.min(rect_i.left, rect_j.left);
              l.right = Math.max(rect_i.left, rect_j.left);
              r.left = l.right;
              r.right = rect_i.right;
              r.top = Math.min(rect_i.top, rect_j.top);
              r.bottom = Math.max(rect_i.bottom, rect_j.bottom);
              if (rect_i.left < rect_j.left)
              {
                l.top = rect_i.top;
                l.bottom = rect_i.bottom;
              }
              else
              {
                l.top = rect_j.top;
                l.bottom = rect_j.bottom;
              }

              const squareNew = Math.fround(SquarenessMetric(l) + SquarenessMetric(r));

              if (squareNew < squareStart)
              {
                restartLoop = true;
                Object.assign(rect_i, l);
                Object.assign(rect_j, r);
                this._PaintEmptyArea(this._freeAreas[i]);
                this._PaintEmptyArea(this._freeAreas[j]);
              }
            }
            else if (rect_i.left === rect_j.left)
            {
              const l = { left: 0, top: 0, right: 0, bottom: 0 };
              const r = { left: 0, top: 0, right: 0, bottom: 0 };
              r.left = Math.min(rect_i.right, rect_j.right);
              r.right = Math.max(rect_i.right, rect_j.right);
              l.left = rect_i.left;
              l.right = r.left;
              l.top = Math.min(rect_i.top, rect_j.top);
              l.bottom = Math.max(rect_i.bottom, rect_j.bottom);
              if (rect_i.right > rect_j.right)
              {
                r.top = rect_i.top;
                r.bottom = rect_i.bottom;
              }
              else
              {
                r.top = rect_j.top;
                r.bottom = rect_j.bottom;
              }

              const squareNew = Math.fround(SquarenessMetric(l) + SquarenessMetric(r));

              if (squareNew < squareStart)
              {
                restartLoop = true;
                Object.assign(rect_i, l);
                Object.assign(rect_j, r);
                this._PaintEmptyArea(this._freeAreas[i]);
                this._PaintEmptyArea(this._freeAreas[j]);
              }
            }
          }
          else if (rect_i.left === rect_j.right || rect_i.right === rect_j.left)
          {
            if (rect_i.top === rect_j.top)
            {
              const t = { left: 0, top: 0, right: 0, bottom: 0 };
              const b = { left: 0, top: 0, right: 0, bottom: 0 };
              t.top = rect_i.top;
              t.bottom = Math.min(rect_i.bottom, rect_j.bottom);
              // bug, CE-143: rect_i.bottom where rect_j.left is meant (Tr2TextureAtlas.cpp:370).
              t.left = Math.min(rect_i.left, rect_i.bottom);
              t.right = Math.max(rect_i.right, rect_j.right);
              b.top = t.bottom;
              b.bottom = Math.max(rect_i.bottom, rect_j.bottom);

              if (rect_i.bottom > rect_j.bottom)
              {
                b.left = rect_i.left;
                b.right = rect_i.right;
              }
              else
              {
                b.left = rect_j.left;
                b.right = rect_j.right;
              }

              const squareNew = Math.fround(SquarenessMetric(t) + SquarenessMetric(b));

              if (squareNew < squareStart)
              {
                restartLoop = true;
                Object.assign(rect_i, t);
                Object.assign(rect_j, b);
                this._PaintEmptyArea(this._freeAreas[i]);
                this._PaintEmptyArea(this._freeAreas[j]);
              }
            }
            else if (rect_i.bottom === rect_j.bottom)
            {
              const t = { left: 0, top: 0, right: 0, bottom: 0 };
              const b = { left: 0, top: 0, right: 0, bottom: 0 };
              t.top = Math.min(rect_i.top, rect_j.top);
              t.bottom = Math.max(rect_i.top, rect_j.top);
              // bug, CE-143: rect_i.bottom where rect_j.left is meant (Tr2TextureAtlas.cpp:405).
              b.left = Math.min(rect_i.left, rect_i.bottom);
              b.right = Math.max(rect_i.right, rect_j.right);
              b.top = t.bottom;
              b.bottom = rect_i.bottom;

              if (rect_i.top < rect_j.top)
              {
                t.left = rect_i.left;
                t.right = rect_i.right;
              }
              else
              {
                t.left = rect_j.left;
                t.right = rect_j.right;
              }

              const squareNew = Math.fround(SquarenessMetric(t) + SquarenessMetric(b));

              if (squareNew < squareStart)
              {
                restartLoop = true;
                Object.assign(rect_i, t);
                Object.assign(rect_j, b);
                this._PaintEmptyArea(this._freeAreas[i]);
                this._PaintEmptyArea(this._freeAreas[j]);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Merges free areas that share a full edge, first left-to-right then
   * top-to-bottom, until a pass finds nothing (`Tr2TextureAtlas.cpp:486-631`).
   *
   * As in Carbon, fewer than two free areas returns before the
   * "optimization warranted" state is cleared.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  CollapseFreeAreas()
  {
    this._ReleasePendingFreeAreas();

    if (this._freeAreas.length < 2) return;

    this._optimizationWarranted = false;
    this._areasFreedSinceLastCollapse = 0;

    let restartLoop = true;

    while (restartLoop)
    {
      restartLoop = false;

      // FreeAreasLeftToRight (Tr2TextureAtlas.cpp:444-463); std::list::sort is stable, as is Array.sort.
      this._freeAreas.sort((a, b) => (a.rect.left - b.rect.left) || (a.rect.right - b.rect.right));

      for (let outer = 0; outer < this._freeAreas.length; ++outer)
      {
        const area1 = this._freeAreas[outer];

        for (let candidate = outer + 1; candidate < this._freeAreas.length;)
        {
          const area2 = this._freeAreas[candidate];

          if (area1.rect.right > area2.rect.left)
          {
            ++candidate;
            continue;
          }

          if (area1.rect.right < area2.rect.left) break;

          let newRect = null;
          if (area1.rect.top === area2.rect.top && area1.rect.bottom === area2.rect.bottom)
          {
            if (area1.rect.right === area2.rect.left)
            {
              newRect = { left: area1.rect.left, right: area2.rect.right, top: area1.rect.top, bottom: area1.rect.bottom };
            }
            else if (area1.rect.left === area2.rect.right)
            {
              newRect = { left: area2.rect.left, right: area1.rect.right, top: area1.rect.top, bottom: area1.rect.bottom };
            }
          }

          if (newRect)
          {
            area1.rect = newRect;
            this._freeAreas.splice(candidate, 1);

            restartLoop = true;
          }
          else
          {
            ++candidate;
          }
        }
      }

      // FreeAreasTopToBottom (Tr2TextureAtlas.cpp:465-484).
      this._freeAreas.sort((a, b) => (a.rect.top - b.rect.top) || (a.rect.bottom - b.rect.bottom));

      for (let outer = 0; outer < this._freeAreas.length; ++outer)
      {
        const area1 = this._freeAreas[outer];

        for (let candidate = outer + 1; candidate < this._freeAreas.length;)
        {
          const area2 = this._freeAreas[candidate];

          if (area1.rect.bottom > area2.rect.top)
          {
            ++candidate;
            continue;
          }

          if (area1.rect.bottom < area2.rect.top) break;

          let newRect = null;
          if (area1.rect.left === area2.rect.left && area1.rect.right === area2.rect.right)
          {
            if (area1.rect.bottom === area2.rect.top)
            {
              newRect = { left: area1.rect.left, right: area1.rect.right, top: area1.rect.top, bottom: area2.rect.bottom };
            }
            else if (area1.rect.top === area2.rect.bottom)
            {
              newRect = { left: area1.rect.left, right: area1.rect.right, top: area2.rect.top, bottom: area1.rect.bottom };
            }
          }

          if (newRect)
          {
            area1.rect = newRect;
            this._freeAreas.splice(candidate, 1);

            restartLoop = true;
          }
          else
          {
            ++candidate;
          }
        }
      }
    }

    this._UpdateFreeMaxima();
  }

  /**
   * Merges `area2` into `area1` when they share a full edge
   * (`Tr2TextureAtlas.cpp:633-686`). Carbon declares it and nothing calls it.
   *
   * @param {Tr2TextureAtlasArea} area1 The area that grows.
   * @param {Tr2TextureAtlasArea} area2 The area merged into it.
   * @returns {boolean} True when the areas were adjacent and merged.
   */
  @meta.implemented
  _CollapseAreas(area1, area2)
  {
    let newRect = null;

    if (area1.rect.left === area2.rect.left && area1.rect.right === area2.rect.right)
    {
      if (area1.rect.bottom === area2.rect.top)
      {
        newRect = { left: area1.rect.left, right: area1.rect.right, top: area1.rect.top, bottom: area2.rect.bottom };
      }
      else if (area1.rect.top === area2.rect.bottom)
      {
        newRect = { left: area1.rect.left, right: area1.rect.right, top: area2.rect.top, bottom: area1.rect.bottom };
      }
    }
    else if (area1.rect.top === area2.rect.top && area1.rect.bottom === area2.rect.bottom)
    {
      if (area1.rect.right === area2.rect.left)
      {
        newRect = { left: area1.rect.left, right: area2.rect.right, top: area1.rect.top, bottom: area1.rect.bottom };
      }
      else if (area1.rect.left === area2.rect.right)
      {
        newRect = { left: area2.rect.left, right: area1.rect.right, top: area1.rect.top, bottom: area1.rect.bottom };
      }
    }

    if (newRect) area1.rect = newRect;

    return newRect !== null;
  }

  /**
   * Best-fit allocation (`Tr2TextureAtlas.cpp:688-860`).
   *
   * Sizes round up to multiples of 8. A perfect fit wins outright; otherwise
   * the area with the smallest (then largest) leftover side is split. A small
   * request first cuts a `128 + 4 * margin` square out of a large area.
   *
   * quirk, CE-135 (:758-819, compared at :796 and :808): `candidateWidth` and
   * `candidateHeight` are taken before the small-request pre-split and are
   * still compared after it; reproduced (no observable effect).
   *
   * quirk, CE-146 (:842-847): the cached free maxima are refreshed only when the
   * taken area was at least as large as the cache, which an area already cut down
   * by the pre-split is not, so the cache keeps the old size. Reproduced; only the
   * Blue `GetFreeMaxWidth`/`GetFreeMaxHeight` read it.
   *
   * The GC sweep `_ReclaimCollectedTextures` (ours) runs right after Carbon's
   * pending-free release, so collected textures' space is offered here.
   *
   * @param {number} width Requested width, margins included.
   * @param {number} height Requested height, margins included.
   * @returns {Tr2TextureAtlasArea|null} The allocated area, removed from the free list.
   */
  @meta.implemented
  _GetFreeArea(width, height)
  {
    if (this._IsLargeTexture(width, height)) return null;

    this._ReleasePendingFreeAreas();
    this._ReclaimCollectedTextures();

    // Align to 8pixels to prevent thin slivers as free areas
    width = (width + 7) & ~7;
    height = (height + 7) & ~7;

    let anyFit = -1;
    let perfectFit = -1;
    let bestPrimaryMetric = this.width + this.height;
    let bestSecondaryMetric = this.width + this.height;
    for (let it = 0; it < this._freeAreas.length; ++it)
    {
      const area = this._freeAreas[it];
      const candidateWidth = area.rect.right - area.rect.left;
      const candidateHeight = area.rect.bottom - area.rect.top;

      if (width === candidateWidth && height === candidateHeight)
      {
        perfectFit = it;
        break;
      }

      if (width <= candidateWidth && height <= candidateHeight)
      {
        const metric = Math.min(candidateWidth - width, candidateHeight - height);
        const altMetric = Math.max(candidateWidth - width, candidateHeight - height);
        if (metric < bestPrimaryMetric || (bestPrimaryMetric === metric && altMetric < bestSecondaryMetric))
        {
          bestPrimaryMetric = metric;
          bestSecondaryMetric = altMetric;
          anyFit = it;
        }
      }
    }

    if (perfectFit !== -1)
    {
      const freeArea = this._freeAreas[perfectFit];
      this._freeTexels -= (freeArea.rect.bottom - freeArea.rect.top) * (freeArea.rect.right - freeArea.rect.left);
      this._freeAreas.splice(perfectFit, 1);

      if ((freeArea.rect.right - freeArea.rect.left) >= this._freeMaxWidth ||
        (freeArea.rect.bottom - freeArea.rect.top) >= this._freeMaxHeight)
      {
        this._UpdateFreeMaxima();
      }

      return freeArea;
    }

    if (anyFit !== -1)
    {
      const freeArea = this._freeAreas[anyFit];
      this._freeAreas.splice(anyFit, 1);

      // CE-135: taken before the pre-split below and still used after it.
      const candidateWidth = freeArea.rect.right - freeArea.rect.left;
      const candidateHeight = freeArea.rect.bottom - freeArea.rect.top;

      // if we're allocating a small bit out of a large area, first split it into squares
      const minNewRegion = 128 + this.margin * 4;

      if (height < minNewRegion && width < minNewRegion)
      {
        // vertical split
        if (candidateHeight > minNewRegion)
        {
          const newArea = new Tr2TextureAtlasArea(freeArea.rect.left, freeArea.rect.top + minNewRegion, freeArea.rect.right, freeArea.rect.bottom);
          this._PaintEmptyArea(newArea);

          this._FreeArea(newArea);
          freeArea.rect.bottom = freeArea.rect.top + minNewRegion;
        }

        // horizontal split
        if (candidateWidth > minNewRegion)
        {
          const newArea = new Tr2TextureAtlasArea(freeArea.rect.left + minNewRegion, freeArea.rect.top, freeArea.rect.right, freeArea.rect.bottom);
          this._PaintEmptyArea(newArea);

          this._FreeArea(newArea);
          freeArea.rect.right = freeArea.rect.left + minNewRegion;
        }
      }

      // Must split the area. CE-135: stale candidateWidth/candidateHeight.
      if (candidateWidth === width)
      {
        // Split area vertically
        const newArea = new Tr2TextureAtlasArea(freeArea.rect.left, freeArea.rect.top + height, freeArea.rect.right, freeArea.rect.bottom);
        this._PaintEmptyArea(newArea);

        this._FreeArea(newArea);
      }
      else if (candidateHeight === height)
      {
        // Split area horizontally
        const newArea = new Tr2TextureAtlasArea(freeArea.rect.left + width, freeArea.rect.top, freeArea.rect.right, freeArea.rect.bottom);
        this._PaintEmptyArea(newArea);

        this._FreeArea(newArea);
      }
      else
      {
        // Need two new areas
        let newArea = new Tr2TextureAtlasArea(freeArea.rect.left + width, freeArea.rect.top, freeArea.rect.right, freeArea.rect.top + height);
        this._PaintEmptyArea(newArea);

        this._FreeArea(newArea);

        newArea = new Tr2TextureAtlasArea(freeArea.rect.left, freeArea.rect.top + height, freeArea.rect.right, freeArea.rect.bottom);
        this._PaintEmptyArea(newArea);

        this._FreeArea(newArea);
      }

      // update cached largest free area (freeArea not yet resized but has been erased from free list)
      // quirk, CE-146: after the pre-split freeArea is already cut down, so the cache can stay stale (cpp:842-847).
      if ((freeArea.rect.right - freeArea.rect.left) >= this._freeMaxWidth ||
        (freeArea.rect.bottom - freeArea.rect.top) >= this._freeMaxHeight)
      {
        this._UpdateFreeMaxima();
      }

      freeArea.rect.right = freeArea.rect.left + width;
      freeArea.rect.bottom = freeArea.rect.top + height;

      this._freeTexels -= (freeArea.rect.bottom - freeArea.rect.top) * (freeArea.rect.right - freeArea.rect.left);

      return freeArea;
    }

    return null;
  }

  /**
   * Returns the atlas pixel format (`Tr2TextureAtlas.cpp:862-865`).
   *
   * @returns {number} A `PixelFormat` value.
   */
  @meta.implemented
  GetFormat()
  {
    return this.format;
  }

  /**
   * Debug aid: fills an empty area with a cycling opaque colour
   * (`Tr2TextureAtlas.cpp:867-945`). Only for 2D B8G8R8A8 atlases with
   * `paintEmptyAreas` set.
   *
   * bug, CE-139 (:899-944): the whole of mip 0 is mapped and the rows are written from
   * the mapped base, never offset to `area.rect.left/top`, so it always paints
   * a `width x height` block at texel (0, 0), over whatever textures live
   * there. Reproduced.
   *
   * @param {Tr2TextureAtlasArea|null} area The area.
   * @returns {void}
   */
  @meta.implemented
  _PaintEmptyArea(area)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (!area || !this.paintEmptyAreas || !this._texture.IsValid()) return;

    if (this._texture.GetType() !== TextureType.TEX_TYPE_2D ||
      this.format !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM)
    {
      return;
    }

    const isValidArea =
      area.rect.left >= 0 &&
      area.rect.top >= 0 &&
      area.rect.right >= 0 &&
      area.rect.bottom >= 0 &&
      area.rect.right >= area.rect.left &&
      area.rect.bottom >= area.rect.top &&
      area.rect.right <= this._texture.GetWidth() &&
      area.rect.bottom <= this._texture.GetHeight();

    if (!isValidArea) return;

    const mapping = this._texture.MapForWriting(Tr2TextureSubresource.create__MipLevel(0), renderContext);
    if (Failed(mapping.result)) return;

    try
    {
      const view = new DataView(mapping.data.buffer, mapping.data.byteOffset, mapping.data.byteLength);
      let dst = 0;

      s_fillValue = (s_fillValue + 0xabcdef) >>> 0;
      s_fillValue &= 0xffffff;
      const fill = (s_fillValue | 0xff000000) >>> 0;

      const width = area.rect.right - area.rect.left;
      const height = area.rect.bottom - area.rect.top;

      if (IsCompressedFormat(this.format))
      {
        const blockSize = GetBlockByteSize(this.format);
        const blocksX = Math.floor(width / 4);

        for (let line = 0; line < height; line += 4)
        {
          for (let i = 0; i < Math.floor(blocksX * blockSize / 4); ++i) view.setUint32(dst + i * 4, fill, true);
          dst += mapping.pitch;
        }
      }
      else
      {
        const byteCount = GetBytesPerPixel(this.format);

        for (let line = 0; line < height; ++line)
        {
          for (let i = 0; i < Math.floor(width * byteCount / 4); ++i) view.setUint32(dst + i * 4, fill, true);
          dst += mapping.pitch;
        }
      }
    }
    finally
    {
      this._texture.UnmapForWriting(renderContext);
    }
  }

  /**
   * Returns the atlas AL texture; every in-atlas texture returns this same
   * value (`Tr2TextureAtlas.cpp:947-950`).
   *
   * @returns {Tr2TextureAL} The atlas texture.
   */
  @meta.implemented
  GetTexture()
  {
    return this._texture;
  }

  /**
   * Carbon OnTextureChange (`Tr2TextureAtlas.cpp:952-955`): the event fired
   * when the atlas texture changes. Listeners register an owner and an
   * unbound method; the event holds owners weakly.
   *
   * @returns {Tr2Event} m_onTextureChange.
   */
  @meta.implemented
  OnTextureChange()
  {
    return this._onTextureChange;
  }

  /**
   * Fires `m_onTextureChange()`.
   *
   * @returns {void}
   */
  _FireTextureChange()
  {
    this._onTextureChange.Broadcast();
  }

  /**
   * Number of textures in the atlas (`Tr2TextureAtlas.cpp:957-960`). Entries
   * whose texture has been collected but not yet reclaimed are not counted.
   *
   * @returns {number} The count.
   */
  @meta.adapted
  GetTexturesInAtlasCount()
  {
    let count = 0;
    for (const reference of this._texturesInAtlas.keys()) if (reference.deref()) count++;
    return count;
  }

  /**
   * Number of outsiders (`Tr2TextureAtlas.cpp:962-965`). Collected entries are
   * not counted, as for `GetTexturesInAtlasCount`.
   *
   * @returns {number} The count.
   */
  @meta.adapted
  GetTexturesOutsideAtlasCount()
  {
    let count = 0;
    for (const reference of this._texturesOutsideAtlas.keys()) if (reference.deref()) count++;
    return count;
  }

  /**
   * Moves outsiders into the atlas as far as free space allows
   * (`Tr2TextureAtlas.cpp:967-1034`), optionally smallest first.
   *
   * bug, CE-138 (:1005-1011 with `Tr2AtlasTexture.cpp:45-51`): the area is assigned to
   * the texture BEFORE `CopyTextureIntoAtlas`, so the texture's `GetTexture()`
   * already answers the atlas texture, and the copy reads from the atlas
   * itself rather than from the outsider's own texture. Reproduced; the pulled-in
   * texture loses its pixels.
   *
   * Iteration order: Carbon copies a `std::set` ordered by pointer address;
   * JS has no addresses, so registration order is used.
   *
   * @param {boolean} [optimiseInsertion] Sort smallest area first.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  PullInOutsiders(optimiseInsertion = false)
  {
    this._ReclaimCollectedTextures();

    const sorted = [];
    for (const reference of this._texturesOutsideAtlas.keys())
    {
      const texture = reference.deref();
      if (texture) sorted.push(texture);
    }

    if (optimiseInsertion)
    {
      sorted.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    }

    this.CollapseFreeAreas();

    for (const tex of sorted)
    {
      // Texture prefers to be an outsider
      if (tex.IsStandAlone()) continue;

      const area = this._GetFreeArea(tex.width + this.margin * 2, tex.height + this.margin * 2);
      if (area)
      {
        area.tex = tex._selfRef;
        area.type = Tr2TextureAtlasArea.Type.IN_USE;
        tex._atlasArea = area;
        if (this._CopyTextureIntoAtlas(tex))
        {
          // Set up the texture window into the atlas
          tex._texture.Destroy();
          tex._renderTarget = null;
          tex.x = area.rect.left + this.margin;
          tex.y = area.rect.top + this.margin;
          tex.atlasWidth = this.width;
          tex.atlasHeight = this.height;

          tex._FinalizePrepare();

          this._texturesOutsideAtlas.delete(tex._selfRef);
          this._texturesInAtlas.set(tex._selfRef, area);
        }
        else
        {
          // Oops, failed. Continue to use as an outsider, remembering to return free area to the pool.
          tex._atlasArea = null;
          this._FreeArea(area);
        }
      }
    }
  }

  /**
   * Copies a texture's pixels into its newly assigned area
   * (`Tr2TextureAtlas.cpp:1036-1077`). See the bug note (CE-138) on `PullInOutsiders`:
   * `tex.GetTexture()` is the atlas texture by the time this runs.
   *
   * bug, CE-148 (:1064-1071): the mapped source pitch is ignored; `AddMargin`
   * assumes a tight pitch.
   *
   * @param {Tr2AtlasTexture} tex The texture, already holding its area.
   * @returns {boolean} True when the copy succeeded.
   */
  @meta.implemented
  _CopyTextureIntoAtlas(tex)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (!this._texture.IsValid() || !tex || !tex.GetTexture())
    {
      CcpLog.CCP_LOGERR("CopyTextureIntoAtlas failed, target or source textures invalid");
      return false;
    }

    const r = tex._atlasArea.rect;

    if (!this.margin)
    {
      const dest = Tr2TextureSubresource.create__FaceMipLevel(0, 0);
      dest.box.left = r.left;
      dest.box.top = r.top;
      return Succeeded(this._texture.CopySubresourceRegion(dest, tex.GetTexture(), Tr2TextureSubresource.create__FaceMipLevel(0, 0), renderContext));
    }

    if (this._hasMipMaps) this._dirtyMipRegions.push(CopyRect(r));

    const source = tex.GetTexture();
    const mapping = source.MapForReading(Tr2TextureSubresource.create__MipLevel(0), renderContext);
    if (Failed(mapping.result)) return false;

    try
    {
      const { output, outputPitch } = AddMargin(this._texture.GetFormat(), mapping.data, tex.GetWidth(), tex.GetHeight(), this.margin);

      // Area may be larger than texture due to alignment
      const right = r.left + tex.GetWidth() + 2 * this.margin;
      const bottom = r.top + tex.GetHeight() + 2 * this.margin;
      return Succeeded(this._texture.UpdateSubresource(Tr2TextureSubresource.create__MipLevel(0).SetRect(r.left, r.top, right, bottom), output, outputPitch, 0, renderContext));
    }
    finally
    {
      source.UnmapForReading(renderContext);
    }
  }

  /**
   * Creates a texture in the atlas, or an outsider when it does not fit
   * (`Tr2TextureAtlas.cpp:1079-1164`). The new texture is prepared but not
   * good until its pixels are written and unlocked.
   *
   * Carbon returns an `ALResult` and writes the texture through an out
   * pointer. JS has no out parameters, so the texture is returned and every
   * Carbon path that writes `*result = nullptr` returns null; the distinction
   * between `S_OK` (no outsiders allowed), `E_DEVICELOST` and a creation
   * failure is not reported.
   *
   * @param {number} width Texture width.
   * @param {number} height Texture height.
   * @param {number} [type] A `Tr2TextureAtlas.AtlasTextureType` value.
   * @returns {Tr2AtlasTexture|null} The texture, or null.
   */
  @blue.method
  @meta.adapted
  CreateTexture(width, height, type = Tr2TextureAtlas.AtlasTextureType.ATT_DEFAULT)
  {
    const tex = new Tr2AtlasTexture();
    tex.atlas = this;

    let area = null;

    if (type === Tr2TextureAtlas.AtlasTextureType.ATT_DEFAULT && !this._IsLargeTexture(width, height))
    {
      area = this._GetFreeArea(width + this.margin * 2, height + this.margin * 2);

      if (!area && this._optimizationWarranted)
      {
        this.CollapseFreeAreas();
        area = this._GetFreeArea(width + this.margin * 2, height + this.margin * 2);
      }
    }

    if (area)
    {
      area.type = Tr2TextureAtlasArea.Type.IN_USE;
      area.tex = tex._selfRef;
      tex._atlasArea = area;

      // Set up the texture window into the atlas
      tex._renderTarget = null;
      tex.x = area.rect.left + this.margin;
      tex.y = area.rect.top + this.margin;
      tex.width = width;
      tex.height = height;
      tex.atlasWidth = this.width;
      tex.atlasHeight = this.height;

      this._RegisterInsider(tex);
      this._PaintEmptyArea(area);
    }
    else if (this._createOutsiders)
    {
      if (!Tr2Renderer.IsResourceCreationAllowed()) return null;

      const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
      const hr = tex._texture.Create__GpuUsageCpuUsage(
        Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, this.format),
        Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE,
        renderContext);
      if (Failed(hr)) return null;

      if (type === Tr2TextureAtlas.AtlasTextureType.ATT_VIDEO) tex.SetStandAlone(true);

      tex.x = 0;
      tex.y = 0;
      tex.width = width;
      tex.height = height;
      tex.atlasWidth = width;
      tex.atlasHeight = height;

      this._RegisterOutsider(tex);
    }
    else
    {
      return null;
    }

    tex._memoryUsage = width * height * GetBytesPerPixel(this.format);
    tex._FinalizePrepare();
    tex._isPrepared = true;
    tex._isGood = false;

    return tex;
  }

  /**
   * Live textures in the atlas (Python-only `GetTexturesInAtlas`,
   * `Tr2TextureAtlas.cpp:1167-1179`).
   *
   * @returns {Tr2AtlasTexture[]} The textures.
   */
  @meta.adapted
  GetTexturesInAtlas()
  {
    const textures = [];
    for (const reference of this._texturesInAtlas.keys())
    {
      const texture = reference.deref();
      if (texture) textures.push(texture);
    }
    return textures;
  }

  /**
   * Live outsiders (`Tr2TextureAtlas.cpp:1181-1193`).
   *
   * @returns {Tr2AtlasTexture[]} The textures.
   */
  @blue.method
  @meta.adapted
  GetTexturesOutsideAtlas()
  {
    const textures = [];
    for (const reference of this._texturesOutsideAtlas.keys())
    {
      const texture = reference.deref();
      if (texture) textures.push(texture);
    }
    return textures;
  }

  /**
   * Returns the margin around each texture (`Tr2TextureAtlas.h:82-85`).
   *
   * @returns {number} Margin in pixels.
   */
  @meta.implemented
  GetMargin()
  {
    return this.margin;
  }

  /**
   * Returns the atlas width (`Tr2TextureAtlas.h:74-77`).
   *
   * @returns {number} Width in pixels.
   */
  @meta.implemented
  GetWidth()
  {
    return this.width;
  }

  /**
   * Returns the atlas height (`Tr2TextureAtlas.h:78-81`).
   *
   * @returns {number} Height in pixels.
   */
  @meta.implemented
  GetHeight()
  {
    return this.height;
  }

  /**
   * Sets the margin (`Tr2TextureAtlas.cpp:1196-1199`).
   *
   * @param {number} margin Margin in pixels.
   * @returns {void}
   */
  @meta.implemented
  SetMargin(margin)
  {
    this.margin = margin;
  }

  /**
   * Sets `paintEmptyAreas` (`Tr2TextureAtlas.cpp:1201-1204`).
   *
   * @param {boolean} paintEmptyAreas Whether to paint empty areas.
   * @returns {void}
   */
  @meta.implemented
  SetPaintEmptyAreas(paintEmptyAreas)
  {
    this.paintEmptyAreas = paintEmptyAreas;
  }

  /**
   * Sets whether textures that do not fit become outsiders
   * (`Tr2TextureAtlas.cpp:1206-1209`).
   *
   * @param {boolean} createOutsiders Whether to create outsiders.
   * @returns {void}
   */
  @meta.implemented
  SetCreateOutsiders(createOutsiders)
  {
    this._createOutsiders = createOutsiders;
  }

  /**
   * Sets the largest texture area accepted into the atlas
   * (`Tr2TextureAtlas.cpp:1211-1214`).
   *
   * @param {number} maxTextureArea Area in texels.
   * @returns {void}
   */
  @meta.implemented
  SetMaxTextureArea(maxTextureArea)
  {
    this._maxTextureArea = maxTextureArea;
  }

  /**
   * Copies of the free rectangles, pending ones included
   * (`Tr2TextureAtlas.cpp:1216-1228`).
   *
   * @returns {Array<{left: number, top: number, right: number, bottom: number}>} The rectangles.
   */
  @meta.implemented
  GetFreeAreas()
  {
    const areas = [];
    for (const area of this._freeAreas) areas.push(CopyRect(area.rect));
    for (const [area] of this._pendingFreeAreas) areas.push(CopyRect(area.rect));
    return areas;
  }

  /**
   * Copies of the rectangles used by textures in the atlas
   * (`Tr2TextureAtlas.cpp:1230-1245`). Collected textures are skipped.
   *
   * @returns {Array<{left: number, top: number, right: number, bottom: number}>} The rectangles.
   */
  @meta.implemented
  GetUsedAreas()
  {
    const areas = [];
    for (const reference of this._texturesInAtlas.keys())
    {
      const t = reference.deref();

      // After a device reset, the texture may not have a valid area.
      if (t && t._atlasArea) areas.push(CopyRect(t._atlasArea.rect));
    }
    return areas;
  }

  /**
   * Recomputes the largest free width and height (`Tr2TextureAtlas.cpp:1248-1260`).
   *
   * @returns {void}
   */
  @meta.implemented
  _UpdateFreeMaxima()
  {
    this._freeMaxWidth = this._freeMaxHeight = 0;
    for (const area of this._freeAreas)
    {
      const w = area.rect.right - area.rect.left;
      const h = area.rect.bottom - area.rect.top;
      if (w > this._freeMaxWidth) this._freeMaxWidth = w;
      if (h > this._freeMaxHeight) this._freeMaxHeight = h;
    }
  }

  /**
   * Moves a texture out of the atlas into its own AL texture
   * (`Tr2TextureAtlas.cpp:1262-1285`).
   *
   * @param {Tr2AtlasTexture} tex The texture.
   * @returns {boolean} True when it was ejected.
   */
  @meta.implemented
  EjectTexture(tex)
  {
    if (!tex.atlas || !tex._atlasArea) return false;

    if (this._EjectTextureHelper(tex))
    {
      return this._texturesInAtlas.delete(tex._selfRef);
    }

    return false;
  }

  /**
   * Copies a texture out of the atlas and registers it as an outsider, leaving
   * it in the in-atlas set (`Tr2TextureAtlas.cpp:1287-1356`).
   *
   * The vacated area is not freed at once: it is parked with the current
   * recording frame number and freed by `_ReleasePendingFreeAreas` once the
   * device has rendered that frame (Carbon's driver-bug workaround, :1342-1345).
   *
   * bug, CE-140: `m_freeTexels` is never credited with the ejected area, here or when
   * the pending area is finally freed (`FreeArea`, :1417-1435, does not count
   * texels), so `GetFreeTexels` under-reports after every eject. Reproduced.
   *
   * @param {Tr2AtlasTexture} tex The texture.
   * @returns {boolean} True when the copy succeeded.
   */
  @meta.implemented
  _EjectTextureHelper(tex)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    if (!tex) return false;

    const texArea = tex._atlasArea;

    const copyRect = { left: 0, top: 0, right: 0, bottom: 0 };
    copyRect.left = texArea.rect.left + this.margin;
    copyRect.top = texArea.rect.top + this.margin;
    copyRect.right = copyRect.left + tex.GetWidth();
    copyRect.bottom = copyRect.top + tex.GetHeight();
    const width = tex.GetWidth();
    const height = tex.GetHeight();

    if (!Tr2Renderer.IsResourceCreationAllowed())
    {
      CcpLog.CCP_LOGERR("EjectTexture: There is no AL device available");
      return false;
    }

    const hr = tex._texture.Create__GpuUsageCpuUsage(
      Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, this.format),
      Tr2GpuUsage.SHADER_RESOURCE, Tr2CpuUsage.READ | Tr2CpuUsage.WRITE,
      renderContext);

    if (Failed(hr))
    {
      CcpLog.CCP_LOGERR("Tr2TextureAtlas::EjectTexture - couldn't create D3D texture (%d)", hr);
      return false;
    }

    const subrect = new Tr2TextureSubresource();
    subrect.endMipLevel = 1;
    subrect.box.left = copyRect.left;
    subrect.box.right = copyRect.right;
    subrect.box.top = copyRect.top;
    subrect.box.bottom = copyRect.bottom;
    if (Succeeded(tex._texture.CopySubresourceRegion(new Tr2TextureSubresource(), this._texture, subrect, renderContext)))
    {
      tex.x = 0;
      tex.y = 0;
      tex.width = width;
      tex.height = height;
      tex.atlasWidth = width;
      tex.atlasHeight = height;
      tex._atlasArea = null;

      tex._FinalizePrepare();

      // Instead of immediately freeing the area, we put it in a pending free list with the current frame number.
      this._pendingFreeAreas.push([ texArea, renderContext.GetRecordingFrameNumber() ]);

      this._RegisterOutsider(tex);
      return true;
    }
    else
    {
      tex._texture.Destroy();
    }

    return false;
  }

  /**
   * Ejects every texture from the atlas (`Tr2TextureAtlas.cpp:1358-1391`).
   *
   * bug, CE-141 (:1373-1386): when the atlas empties, the free list is replaced by one
   * full-atlas area, but areas still pending from this very eject stay pending
   * and are added to the free list later, overlapping it, so the same texels
   * can be handed out twice. `m_freeTexels` and the free maxima are also not
   * reset. Reproduced.
   *
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  EjectAllTextures()
  {
    this._ReclaimCollectedTextures();

    for (const reference of this._texturesInAtlas.keys())
    {
      const t = reference.deref();
      if (t && this._EjectTextureHelper(t)) this._texturesInAtlas.delete(reference);
    }

    if (this._texturesInAtlas.size === 0)
    {
      this._freeAreas.length = 0;

      const newArea = new Tr2TextureAtlasArea(0, 0, this.width, this.height);
      newArea.type = Tr2TextureAtlasArea.Type.FREE;
      this._PaintEmptyArea(newArea);

      this._FreeArea(newArea);
    }
    else if (this.optimizeOnRemoval)
    {
      this.CollapseFreeAreas();
    }
  }

  /**
   * Frees the parked areas whose frame the device has finished rendering
   * (`Tr2TextureAtlas.cpp:1393-1415`).
   *
   * @returns {void}
   */
  @meta.implemented
  _ReleasePendingFreeAreas()
  {
    if (this._pendingFreeAreas.length === 0) return;

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const rendered = renderContext.GetRenderedFrameNumber();

    for (const [area, frameNumber] of this._pendingFreeAreas)
    {
      if (frameNumber <= rendered) this._FreeArea(area);
    }

    const kept = this._pendingFreeAreas.filter(([, frameNumber]) => frameNumber > rendered);
    if (kept.length === this._pendingFreeAreas.length) return;

    this._pendingFreeAreas = kept;
    this._UpdateFreeMaxima();
  }

  /**
   * Returns what textures that were garbage-collected without `OnShutdown`
   * still held.
   *
   * Ours. Carbon needs no such step: `Tr2AtlasTexture` is shut down when its
   * last reference goes (`TYPEDEF_BLUECLASS_WR_SHUTDOWN`, `Tr2AtlasTexture.h:171`)
   * and `OnShutdown` calls `RemoveFromAtlas` (`Tr2AtlasTexture.cpp:139-146`).
   * JavaScript has no destructors and runs nothing when an object becomes
   * unreachable, so a texture dropped without an explicit `OnShutdown` is only
   * noticed here, after the collector has cleared its `WeakRef`, which may be
   * much later or never. Until then its space is unusable and the
   * counts/maxima do not include it.
   *
   * For a collected insider: the area recorded at registration is freed and
   * its texels credited, as `RemoveFromAtlas` does, unless
   * `Tr2AtlasTexture.ReleaseResources` already dropped that area. Unlike
   * `RemoveFromAtlas` it does not call `PullInOutsiders`, because this runs
   * inside `GetFreeArea`, which `PullInOutsiders` itself calls.
   *
   * For a collected outsider: its own AL texture, recorded at registration, is
   * destroyed here. Without this the backend implementation would stay in the
   * AL device-resource registry and never be released, because Carbon's
   * `ReleaseResources( TRISTORAGE_ALL )` from `OnShutdown` never ran.
   *
   * @returns {void}
   */
  _ReclaimCollectedTextures()
  {
    let freed = false;

    for (const [reference, area] of this._texturesInAtlas)
    {
      if (reference.deref()) continue;

      this._texturesInAtlas.delete(reference);
      if (!area || area.tex !== reference) continue;

      this._freeTexels += (area.rect.bottom - area.rect.top) * (area.rect.right - area.rect.left);
      area.type = Tr2TextureAtlasArea.Type.FREE;
      this._FreeArea(area);
      this._PaintEmptyArea(area);
      freed = true;
    }

    for (const [reference, texture] of this._texturesOutsideAtlas)
    {
      if (reference.deref()) continue;

      this._texturesOutsideAtlas.delete(reference);
      texture.Destroy();
    }

    if (freed) this._UpdateFreeMaxima();
  }

  /**
   * Adds a non-empty area to the free list; texel counts are the caller's
   * (`Tr2TextureAtlas.cpp:1417-1435`). More than 32 frees since the last
   * collapse makes a collapse "warranted".
   *
   * @param {Tr2TextureAtlasArea|null} area The area.
   * @returns {void}
   */
  @meta.implemented
  _FreeArea(area)
  {
    if (area === null ||
      (area.rect.right - area.rect.left) === 0 ||
      (area.rect.bottom - area.rect.top) === 0)
    {
      return;
    }

    area.type = Tr2TextureAtlasArea.Type.FREE;
    area.tex = null;
    this._freeAreas.push(area);

    ++this._areasFreedSinceLastCollapse;
    if (this._areasFreedSinceLastCollapse > 32) this._optimizationWarranted = true;
  }

  /**
   * Whether a size is too large to atlas (`Tr2TextureAtlas.cpp:1437-1446`).
   *
   * @param {number} width Width.
   * @param {number} height Height.
   * @returns {boolean} True above `_maxTextureArea` texels.
   */
  @meta.implemented
  _IsLargeTexture(width, height)
  {
    return width * height > this._maxTextureArea;
  }

  /**
   * Box-filters dirty regions down the mip chain (`Tr2TextureAtlas.cpp:1449-1553`).
   * Carbon never sets `m_hasMipMaps`, so this returns at once there too.
   *
   * @param {object} renderContext The render context.
   * @returns {void}
   */
  @meta.implemented
  UpdateMipMaps(renderContext)
  {
    if (!this._hasMipMaps || this._dirtyMipRegions.length === 0) return;

    if (this.format !== PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM)
    {
      CcpLog.CCP_LOGERR("Texture format not supported for mipmapped atlases: %08x [%d]", this.format, this.format);
      this._dirtyMipRegions.length = 0;
      return;
    }

    if (!this._texture.IsValid())
    {
      this._dirtyMipRegions.length = 0;
      return;
    }

    // Get a copy of the first mip level into system memory
    const source = this._texture.MapForReading(Tr2TextureSubresource.create__MipLevel(0), renderContext);
    if (Failed(source.result))
    {
      CcpLog.CCP_LOGERR("Tr2TextureAtlas::UpdateMipMaps: Failed to read texture");
      return;
    }
    const textureWidth = this._texture.GetWidth();
    const buffer0 = new Uint8Array(this._texture.GetMipSize(0)); // alloc: variable-size mip 0 copy, Carbon's per-call std::vector buffer0 (Tr2TextureAtlas.cpp:1478)
    for (let i = 0; i < this._texture.GetHeight(); ++i)
    {
      buffer0.set(source.data.subarray(i * source.pitch, i * source.pitch + textureWidth * 4), i * textureWidth * 4);
    }
    this._texture.UnmapForReading(renderContext);
    let sourcePitch = textureWidth * 4;

    let destPitch = sourcePitch / 2;

    let prevMip = buffer0;
    let nextMip = new Uint8Array(this._texture.GetMipSize(1)); // alloc: variable-size mip buffer, Carbon's per-call std::vector buffer1 (Tr2TextureAtlas.cpp:1493)

    for (let i = 1; i < this.mipCount; ++i)
    {
      let updated = false;
      for (const it of this._dirtyMipRegions)
      {
        const src = { left: it.left >> (i - 1), top: it.top >> (i - 1), right: it.right >> (i - 1), bottom: it.bottom >> (i - 1) };
        const dest = { left: it.left >> i, top: it.top >> i, right: it.right >> i, bottom: it.bottom >> i };
        const height = dest.bottom - dest.top;
        const width = dest.right - dest.left;
        if (height === 0 || width === 0) continue;

        const srcBase = sourcePitch * src.top + src.left * 4;
        let dst = destPitch * dest.top + dest.left * 4;

        const region = Tr2TextureSubresource.create__MipLevel(i).SetRect(dest.left, dest.top, dest.right, dest.bottom);
        const mapped = this._texture.MapForWriting(region, renderContext);
        if (Succeeded(mapped.result))
        {
          let dstRow = 0;

          for (let y = 0; y < height; ++y)
          {
            for (let x = 0; x < width; ++x)
            {
              for (let ch = 0; ch < 4; ++ch)
              {
                const s00 = prevMip[srcBase + y * 2 * sourcePitch + x * 2 * 4 + ch];
                const s01 = prevMip[srcBase + y * 2 * sourcePitch + (x * 2 + 1) * 4 + ch];
                const s10 = prevMip[srcBase + (y * 2 + 1) * sourcePitch + x * 2 * 4 + ch];
                const s11 = prevMip[srcBase + (y * 2 + 1) * sourcePitch + (x * 2 + 1) * 4 + ch];
                nextMip[dst + x * 4 + ch] = (s00 + s01 + s10 + s11) >> 2;
                mapped.data[dstRow + x * 4 + ch] = nextMip[dst + x * 4 + ch];
              }
            }
            dst += destPitch;
            dstRow += mapped.pitch;
          }
          this._texture.UnmapForWriting(renderContext);
        }
        updated = true;
      }
      if (!updated) break;

      sourcePitch = destPitch;
      destPitch >>= 1;
      const swap = prevMip;
      prevMip = nextMip;
      nextMip = swap;
    }

    this._dirtyMipRegions.length = 0;
  }

  /**
   * Records a region whose lower mips need rebuilding
   * (`Tr2TextureAtlas.cpp:1555-1559`).
   *
   * @param {{left: number, top: number, right: number, bottom: number}} rect The region.
   * @returns {void}
   */
  @meta.implemented
  DirtyRegion(rect)
  {
    if (this._hasMipMaps) this._dirtyMipRegions.push(CopyRect(rect));
  }

  /**
   * Whether the atlas holds a given AL object (`Tr2TextureAtlas.cpp:1572-1580`).
   * Carbon receives the object's address as a number; JS has no addresses, so
   * the `Tr2TextureAL` value itself is passed and compared by shared
   * implementation identity.
   *
   * @param {number} type A `Tr2RenderContextEnum::ObjectType` value.
   * @param {Tr2TextureAL} object The AL object.
   * @returns {boolean} True when it is the atlas texture.
   */
  @blue.method
  @meta.adapted
  HasALObject(type, object)
  {
    switch (type)
    {
      case OT_TEXTURE:
        return this._texture.Equals(object);
    }
    return false;
  }

  /**
   * Atlases are never multisampled (`Tr2TextureAtlas.cpp:1582-1585`).
   *
   * @returns {number} 1.
   */
  @meta.implemented
  GetMsaaSamples()
  {
    return 1;
  }

  /**
   * Atlases are never multisampled (`Tr2TextureAtlas.cpp:1587-1590`).
   *
   * @returns {number} 0.
   */
  @meta.implemented
  GetMsaaQuality()
  {
    return 0;
  }

  /**
   * How many texels are not assigned to a texture (`Tr2TextureAtlas.h:117-120`).
   *
   * @returns {number} Free texels.
   */
  @blue.method
  @meta.implemented
  GetFreeTexels()
  {
    return this._freeTexels;
  }

  /**
   * Fraction of the atlas that is unused (`Tr2TextureAtlas.h:121-124`).
   *
   * @returns {number} Free texels over total texels, as a float.
   */
  @blue.method
  @meta.implemented
  GetFreeTexelPercentage()
  {
    return Math.fround(this._freeTexels / Math.fround(this.width * this.height));
  }

  /**
   * Width of the largest free area, as last cached (`Tr2TextureAtlas.h:125-128`).
   *
   * @returns {number} Width.
   */
  @blue.method
  @meta.implemented
  GetFreeMaxWidth()
  {
    return this._freeMaxWidth;
  }

  /**
   * Height of the largest free area, as last cached (`Tr2TextureAtlas.h:129-132`).
   *
   * @returns {number} Height.
   */
  @blue.method
  @meta.implemented
  GetFreeMaxHeight()
  {
    return this._freeMaxHeight;
  }
}
