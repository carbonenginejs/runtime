import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/TriTextureRes.h
// Source: trinity/trinity/Resources/TriTextureRes.cpp
// Source: trinity/trinity/Resources/TriTextureRes_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { HostBitmap } from "#imageio";
import { TriStorageFlags, Tr2ALMemoryType } from "#consts/graphics";
import { CjsResource, ICacheable } from "#blue";
import { IsSolidColorTexturePath, RasterizeSolidColor } from "./solidColorTexture.js";
import { ResourceRequirement } from "#blue";
// TriTextureRes moves to trinity/resources (docs: projects/resources-move.md); until then it imports the event file directly.
import { Tr2Event } from "#trinity/core/Tr2Event";
import {
  resourceBoundaryError,
  resourceFormatRequiredError,
  resourcePayloadError
} from "../resourceBoundary.js";

/** INVALID_LOD (TriTextureRes.cpp:76): no mip has been requested. */
const INVALID_LOD = 0xffffffff;

/**
 * Resource record that owns Carbon-style texture identity and validated
 * HostBitmap data with mirrored dimension/format
 * metadata, while engine packages decide what those facts become on a device.
 *
 * The resource never CREATES a backend texture - it cannot reach a render
 * context - but it RETAINS the one Trinity makes for it, as Carbon's does
 * (`m_texture`), so every parameter sharing the resource binds one texture.
 */
export class TriTextureRes extends CjsResource
{
  /** Optional DDS worker encoding for subsequent immutable sampled texture loads. */
  @meta.setting("compressUncompressedTextures", { applies: meta.setting.LOAD })
  static compressUncompressedTextures = false;

  /** Diagnostic for the currently published bitmap's optional load compression. */
  compression = null;

  format = null;
  type = null;
  averageColor = [0, 0, 0, 0];
  depth = 0;
  cutoutHeight = 1;
  height = 0;
  lodEnabled = false;
  hadLodRequests = false;
  cpuMip = 0;
  gpuMip = 0;
  wrappedRenderTarget = null;
  originalResolution = 0;
  /** m_requestedMip (TriTextureRes.h:184), INVALID_LOD until a request (cpp:145). */
  requestedMip = INVALID_LOD;
  originalMemoryUsage = 0;
  name = "";
  arraySize = 0;
  cutoutWidth = 1;
  width = 0;
  cutoutX = 0;
  cutoutY = 0;

  /** m_onTextureChange (OnTextureChangeEvent, TriTextureRes.h:160) */
  _onTextureChange = new Tr2Event();


  /**
   * Carbon's Initialize, with its procedural branch (TriTextureRes.cpp:223-236):
   * a `dynamic:/color/` path is rasterized here rather than loaded from source.
   * The `dynamic:/gradient_1d/` branch Carbon checks first is rasterized by
   * trinity's GradientTextureConstructor instead: a gradient needs Tr2CurveScalar,
   * which this layer may not import.
   *
   * Adapted: Carbon rasterizes a procedural path into a half-float HostBitmap and creates
   * the GPU texture inside Initialize; this resource cannot reach a render context, so it
   * publishes the half-float-quantized colour as an rgba32float payload. Trinity
   * rasterizes gradient_1d paths through GradientTextureConstructor.
   *
   * @param {string} path Resource path.
   * @param {string|null} [ext] Extension override.
   * @param {string} [requirement] Semantic requirement.
   * @returns {TriTextureRes} This resource.
   */
  Initialize(path, ext = null, requirement = "") {
    super.Initialize(path, ext, requirement);
    if (IsSolidColorTexturePath(this.path)) this._RasterizeProceduralTexture(RasterizeSolidColor);
    return this;
  }

  /**
   * `RasterizeProceduralTexture` (TriTextureRes.cpp:181-212). Carbon creates the
   * GPU texture from the bitmap here; this layer cannot reach a render context,
   * so it publishes the bitmap as the payload and Trinity makes the texture at
   * first bind, as it does for every other texture.
   *
   * @param {Function} rasterize `(path) => HostBitmap | null`.
   * @returns {void}
   */
  _RasterizeProceduralTexture(rasterize) {
    this.MarkLoading();
    const bitmap = rasterize(this.path);
    if (!bitmap) {
      // Carbon: "Failed to parse dynamic:/color/%s texture path", and the
      // texture is never prepared.
      const error = new Error(`Failed to parse ${this.path} texture path`);
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      error.path = this.path;
      this.SetError(error);
      return;
    }
    this.SetPayload(bitmap);
    this.MarkPrepared();
  }

  /**
   * m_texture: the live `Tr2TextureAL`, or null until an engine makes one.
   *
   * Carbon creates it in `DoPrepare` through the main-thread context and
   * stores it here (`TriTextureRes.cpp:690-704`). This layer cannot reach a
   * render context, so Trinity creates it at first bind and stores it here,
   * where every parameter sharing the resource finds the one texture.
   */
  texture = null;

  /** Shared playlist owner; only a full resource purge stops playback. */
  videoController = null;

  /** m_ownTexture: the value produced by deferred realization; SetTexture only borrows. */
  _ownTexture = null;

  /** m_loadedBitmap: the decoded image the texture is made from, or null. */
  loadedBitmap = null;

  /** m_memoryUse: the estimated memory use `GetMemoryUsage` reports. */
  _memoryUse = 0;

  /**
   * The live texture, or null while there is none - Carbon returns nullptr
   * until the load finishes and the parameter substitutes the fallback
   * (`TriTextureRes.cpp:394-405`).
   * Adapted: obtaining the live texture renews the JS cache lease. Carbon's
   * caller holds a reference-counted resource; our time-based cache needs this
   * use signal, including when a runtime parameter skips repeated realization.
   *
   * @returns {object|null} A `Tr2TextureAL`.
   */
  GetTexture() {
    this.KeepAlive();

    // Carbon (cpp:396-401): a wrapped render target that became valid after it was wrapped supplies the texture now.
    if (this.wrappedRenderTarget && (!this.texture || !this.texture.IsValid()) && this.wrappedRenderTarget.GetRenderTarget()?.IsValid())
    {
      this.SetTexture(this.wrappedRenderTarget.GetRenderTarget());
    }

    return this.texture && this.texture.IsValid() ? this.texture : null;
  }

  /**
   * Borrows a texture (`TriTextureRes.cpp:1159-1195`); its owner retains its lifetime.
   *
   * Fires m_onTextureChange every time, as Carbon does (`:1175`, `:1194`).
   *
   * Adapted: Carbon also copies the texture's dimensions onto the resource and sets
   * prepared/good; the payload already carries the dimensions here, and the resource
   * manager owns the state.
   *
   * @param {object|null} texture A `Tr2TextureAL`, or null to drop it.
   * @returns {TriTextureRes} This resource.
   */
  SetTexture(texture) {
    this.texture = texture ?? null;
    this._onTextureChange.Broadcast();
    return this;
  }

  /**
   * Carbon OnTextureChange (`TriTextureRes.cpp:412-415`): the event fired when
   * the texture changes. Listeners register an owner and an unbound method;
   * the event holds owners weakly.
   *
   * @returns {Tr2Event} m_onTextureChange.
   */
  OnTextureChange() {
    return this._onTextureChange;
  }

  /**
   * Changes state, and fires m_onTextureChange when the resource becomes prepared.
   *
   * Adapted: Carbon fires it from DoPrepare, whose SetTexture creates the texture
   * (`TriTextureRes.cpp:662-705`). Ours is created at first bind
   * (Tr2ImageIOHelpers.RealizeTexture), so the event fires when the resource
   * becomes ready to make it.
   *
   * @param {string} state The new state.
   * @param {...*} details State details, passed on.
   * @returns {TriTextureRes} This resource.
   */
  SetState(state, ...details) {
    const wasPrepared = this.IsPrepared();
    super.SetState(state, ...details);
    if (!wasPrepared && this.IsPrepared()) this._onTextureChange.Broadcast();
    return this;
  }

  /**
   * Build this texture from a texture pipeline: Carbon's `.ctr` route
   * (`TriTextureRes.cpp:238-258` then `ResourcePrepFinished`, `:296-340`).
   *
   * By default every path the pipeline names is a raw `Tr2ImageRes` (Carbon asks
   * for the `"raw"` requirement; ours is `ResourceRequirement.IMAGE`), the
   * pipeline runs once they have all settled, and the result becomes this
   * texture's bitmap. An input that failed to load reaches the pipeline as
   * null, exactly as Carbon passes it, so the step that needed it fails.
   *
   * adapted: Carbon reads the pipeline from a `.ctr` file with
   * `BeResMan->LoadObject` and waits on a fence. No shipped build contains a
   * `.ctr` (checked across 45 resfileindexes, 2026-09-24), so the pipeline is
   * handed in - built in memory by the `dynamic:/` constructors that use this
   * route - and the fence is a promise. The manager is passed because the
   * resource layer has no global `BeResMan`.
   *
   * quirk: Carbon marks the resource good even when the pipeline fails
   * (`m_isGood = true` after the branch, `:337`), so the texture is simply
   * absent and the parameter binds its fallback. Reproduced: the resource is
   * prepared either way, with no bitmap when the pipeline failed.
   *
   * Adapted: Carbon's .ctr branch reads the pipeline from a file through the global BeResMan
   * and waits on a fence; no shipped build has a .ctr, so the pipeline is handed in, the
   * manager passed, and the fence is a promise.
   *
   * @param {import("./Tr2TexturePipeline.js").Tr2TexturePipeline} pipeline The recipe.
   * @param {object} resourceManager The `CjsBlueResMan` that loads its inputs.
   * @param {string} [requirement=ResourceRequirement.IMAGE] Input resource kind. The
   * WebGPU detail-array extension uses TEXTURE to reuse its named parameters'
   * already decoded bitmaps; Carbon's raw-image pipeline remains the default.
   * @returns {Promise<boolean>} Whether the pipeline produced a bitmap.
   */
  async LoadPipeline(pipeline, resourceManager, requirement = ResourceRequirement.IMAGE) {
    this.MarkLoading();

    const images = new Map();

    for (const path of pipeline.GetResourceDependencies()) {
      images.set(path, resourceManager.GetResource(path, { requirement }));
    }

    // Carbon's m_pipelineFence: wait for every input, whatever became of it.
    await Promise.allSettled([ ...images.values() ].map(image => image.Ready()));

    // Carbon: it->second && it->second->IsGood() ? &it->second->GetBitmap() : nullptr
    const inputs = new Map();

    for (const [ path, image ] of images) {
      inputs.set(path, image.IsGood() ? image.GetBitmap() : null);
    }

    const result = new HostBitmap();
    const executed = await pipeline.Execute(result, inputs);

    if (executed) this.SetPayload(result);

    this.MarkPrepared();
    return executed;
  }

  /**
   * Adopt the cutout an image declared (Carbon reads ImageIO::Metadata's
   * cutout in DoPrepare and stores it as m_cutoutX/Y/Width/Height).
   *
   * Adapted: Carbon reads the cutout from ImageIO::Metadata inside DoPrepare; the read
   * happens in the loader here, so the resource is told.
   *
   * @param {{x: number, y: number, width: number, height: number}} cutout The rectangle.
   * @returns {TriTextureRes} This resource.
   */
  SetCutout(cutout) {
    this.SetValues({
      cutoutX: cutout.x,
      cutoutY: cutout.y,
      cutoutWidth: cutout.width,
      cutoutHeight: cutout.height
    });
    return this;
  }

  /**
   * The decoded bitmap this resource was loaded from, or null.
   *
   * Carbon's `m_loadedBitmap` (`TriTextureRes.cpp:606`): the CPU-side image
   * the texture is made from, kept so the texture can be remade - for a device
   * reset, a LOD change or a save.
   *
   * Adapted: Carbon keeps m_loadedBitmap private and uploads it inside CreateFromHostBitmap;
   * the upload happens at bind time here, so the bitmap has to be readable.
   *
   * @returns {import("#imageio").HostBitmap|null} The bitmap.
   */
  GetBitmap() {
    return this.loadedBitmap;
  }

  /**
   * `ITriTextureRes::IsValid`, which Carbon's TriTextureRes answers with
   * `IsGood()` (`TriTextureRes.h:65-68`).
   *
   * @returns {boolean} Whether the resource loaded.
   */
  IsValid() {
    return this.IsGood();
  }

  /**
   * `ITriTextureRes::GetWidth`. Carbon's resource IS its Tr2BitmapDimensions
   * (`TriTextureRes.h:46-49`); ours keeps them on the loaded bitmap.
   *
   * @returns {number} Width of mip zero, or 0 before load.
   */
  GetWidth() {
    return this.loadedBitmap ? this.loadedBitmap.GetWidth() : this.width;
  }

  /**
   * `ITriTextureRes::GetHeight` (`TriTextureRes.h:50-53`).
   *
   * @returns {number} Height of mip zero, or 0 before load.
   */
  GetHeight() {
    return this.loadedBitmap ? this.loadedBitmap.GetHeight() : this.height;
  }

  /**
   * `ITriTextureRes::GetMipLevelCount` (`TriTextureRes.h:54-57`).
   *
   * @returns {number} Mip count, or 0 before load.
   */
  GetMipLevelCount() {
    return this.loadedBitmap ? this.loadedBitmap.GetMipCount() : this.cpuMip;
  }

  /**
   * Adopt a decoded bitmap as this resource's image
   * (`TriTextureRes::CreateFromHostBitmap`, `TriTextureRes.cpp:960-978`).
   *
   * adapted: Carbon creates the texture here, on the main thread's render
   * context (`USE_MAIN_THREAD_RENDER_CONTEXT`). The resource layer may not
   * reach a render context (layers.json), so the texture is made on first bind
   * instead - `Tr2ImageIOHelpers.RealizeTexture` - and this only adopts the
   * bitmap and drops any texture made from the previous one.
   *
   * Adapted: Carbon creates the texture here on the main thread's render context; the
   * resource layer may not reach one, so this adopts the bitmap and the texture is made on
   * first bind (Tr2ImageIOHelpers.RealizeTexture).
   *
   * @param {import("#imageio").HostBitmap|null} bitmap The decoded bitmap.
   * @returns {boolean} Whether the bitmap was adopted.
   */
  CreateFromHostBitmap(bitmap) {
    this.ReleaseResources();

    if (!bitmap || !bitmap.IsValid()) {
      this.loadedBitmap = null;
      this.compression = null;
      this._memoryUse = 0;
      return false;
    }

    this.loadedBitmap = bitmap;
    this._memoryUse = TriTextureRes.EstimateMemoryUse(bitmap);
    this.SetValues({
      format: bitmap.GetFormat(),
      width: bitmap.GetWidth(),
      height: bitmap.GetHeight(),
      depth: bitmap.GetDepth(),
      arraySize: bitmap.GetArraySize(),
      cpuMip: bitmap.GetTrueMipCount()
    });
    return true;
  }

  /**
   * Attach a native bitmap and mirror Carbon-exposed
   * metadata. Invalid payloads are rejected before replacing the current one.
   *
   * The registered loader materializes worker results before publication.
   * Browser video is uploaded by VideoPlayer and never enters this bitmap boundary.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {TriTextureRes}
   */
  SetPayload(payload = null, options = null) {
    if (payload === null) {
      // The bytes are gone; so is the texture made from them.
      this.ReleaseResources();
      this.loadedBitmap = null;
      super.SetPayload(null);
      return this;
    }

    // Carbon's resource IS its bitmap (TriTextureRes.cpp:606, 960-978).
    const bitmap = CjsSchema.cast(payload, HostBitmap);

    if (bitmap) {
      this.CreateFromHostBitmap(bitmap);
      this.compression = bitmap.compression ?? null;
      // A loaded image caches its average colour (TriTextureRes.cpp:627-629).
      // Carbon's out-parameters stay untouched when the bitmap declines.
      const average = bitmap.GetAverageColor();
      if (average) this.SetAverageColor(average.r, average.g, average.b, average.a);
      super.SetPayload(bitmap, options);
      if (options) this.SetValues(options);
      if (bitmap.metadata?.cutout) this.SetCutout(bitmap.metadata.cutout);
      return this;
    }

    throw resourcePayloadError("TriTextureRes", "Expected an ImageIO::HostBitmap.", "payload");
  }

  /**
   * Turn source bytes into this texture.
   *
   * This is the family the route design exists for. One `.dds` is readable as a
   * compressed `texture` or decoded `rgba`, and six formats — dds, png, jpeg,
   * tga, gif, webp — populate this same resource. Which reader and which
   * representation is a registration decision, so neither is written here.
   *
   * The resource imports none of them. A texture resource that imported its
   * formats would drag all six into anything that touches a texture, which is
   * the whole reason the store exists.
   *
   * @param {ArrayBuffer|ArrayBufferView|object} data Source bytes, or a payload already read.
   * @param {object|null} [options] `{ format, read, output }` plus values applied after the read.
   * @returns {TriTextureRes} This resource.
   */
  DoLoad(data, options = null) {
    const { format = null, read = null, output = null, ...values } = options || {};

    // Already a payload: the manager read it, and there is nothing to route.
    if (CjsSchema.cast(data, HostBitmap)) return this.SetPayload(data, values);

    const route = this.ResolveFormat(data, format ? { format, read, output } : { output });
    if (!route) throw resourceFormatRequiredError("TriTextureRes", this.ext, output);
    return this.SetPayload(route.Read(data), values);
  }

  /**
   * Return the number of mip levels known to this texture resource.
   *
   * @returns {number}
   */
  GetMipCount() {
    return this.GetPayload()?.mipCount || this.cpuMip || 0;
  }

  /**
   * The image's average colour, cached when the bitmap loads or pushed by a
   * video source (`TriTextureRes.h:61-64`, `m_averageColor`). Banners, planes,
   * screens and textured lights take their light colour from it.
   *
   * @returns {number[]} `[r, g, b, a]`, zero until something sets it.
   */
  GetAverageColor() {
    return this.averageColor;
  }

  /**
   * Return the multisample type for this texture.
   *
   * @returns {number}
   */
  GetMsaaType() {
    // Carbon: m_texture ? m_texture->GetMsaaDesc().samples : 1 (cpp:1214-1216).
    const texture = this.GetTexture();
    return texture ? texture.GetMsaaDesc().samples : 1;
  }

  /**
   * Return the multisample quality for this texture.
   *
   * @returns {number}
   */
  GetMsaaQuality() {
    // Carbon: m_texture ? m_texture->GetMsaaDesc().quality : 0 (cpp:1219-1222).
    const texture = this.GetTexture();
    return texture ? texture.GetMsaaDesc().quality : 0;
  }

  /**
   * Return true if this texture has received LOD requests.
   *
   * @returns {boolean}
   */
  HadLodRequests() {
    return this.hadLodRequests;
  }

  /**
   * Carbon RequestResolution (TriTextureRes.cpp:712-721): keeps the finest
   * (smallest) mip requested since the last LOD update. A texture with no
   * original resolution takes no request.
   *
   * @param {number} requestedLod Requested mip level.
   * @returns {void}
   */
  RequestResolution(requestedLod) {
    if (this.requestedMip === requestedLod || this.originalResolution === 0) return;
    this.hadLodRequests = true;
    // AtomicMinUpdate (cpp:119-125); JS has one thread, so a plain min.
    this.requestedMip = Math.min(this.requestedMip, requestedLod);
  }

  /**
   * Carbon GetOriginalResolutionAsFloat (TriTextureRes.cpp:819-822).
   *
   * @returns {number} The original resolution.
   */
  GetOriginalResolutionAsFloat() {
    return this.originalResolution;
  }

  /**
   * Return the shader-resource-view heap index when a backend owns one.
   *
   * @returns {number}
   */
  GetSrvIndexInHeap() {
    throw resourceBoundaryError("TriTextureRes", "GetSrvIndexInHeap", "Runtime-resource does not own descriptor heaps.");
  }

  /**
   * Save this texture asynchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  SaveAsync(path = "") {
    throw resourceBoundaryError(
      "TriTextureRes",
      "SaveAsync",
      `Use a format writer and caller-owned destination to save texture payloads${path ? ` (${path})` : ""}.`
    );
  }

  /**
   * Save this texture synchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  Save(path = "") {
    throw resourceBoundaryError(
      "TriTextureRes",
      "Save",
      `Use a format writer and caller-owned destination to save texture payloads${path ? ` (${path})` : ""}.`
    );
  }

  /**
   * Return true if an asynchronous save is active.
   *
   * @returns {boolean}
   */
  IsSaving() {
    return false;
  }

  /**
   * Return true if the asynchronous save operation has completed.
   *
   * @returns {boolean}
   */
  IsSaveCompleted() {
    return true;
  }

  /**
   * Return true if the asynchronous save operation succeeded.
   *
   * @returns {boolean}
   */
  IsSaveSucceeded() {
    return false;
  }

  /**
   * Wait for an asynchronous save operation.
   *
   * @returns {boolean}
   */
  WaitForSave() {
    return this.IsSaveCompleted();
  }

  /**
   * Device texture allocation belongs to engine-gpu.
   *
   * @throws {Error}
   */
  CreateEmptyTexture() {
    throw resourceBoundaryError("TriTextureRes", "CreateEmptyTexture", "Use engine-gpu to allocate device textures.");
  }

  /**
   * Makes this resource a live view on a render target. The caller keeps the render
   * target alive; `OnTextureChange` fires whenever the render target's texture changes.
   *
   * Carbon: TriTextureRes::SetTextureFromRT (trinity/trinity/Resources/TriTextureRes.cpp:871-892;
   * TriTextureRes.h:79). Exposed as "SetFromRenderTarget"
   * (TriTextureRes_Blue.cpp:253-258, MAP_METHOD_AND_WRAP).
   *
   * Adapted: Carbon holds the render target in a counted pointer and registers
   * `OnWrappedRenderTargetChanged` on its event; the event holds the owner
   * weakly here, and the resource holds the render target in
   * `wrappedRenderTarget`. The own texture is dropped through
   * `_DestroyOwnTexture`, which does not yet notify the texture LOD manager
   * (`lodEnabled` is never set here, so the case cannot arise).
   *
   * @param {Tr2RenderTarget|null} renderTarget The render target to view, or null to unwrap.
   * @returns {boolean} Always true, as Carbon returns.
   */
  SetTextureFromRT(renderTarget) {
    this._DestroyOwnTexture();

    if (this.wrappedRenderTarget)
    {
      this.wrappedRenderTarget.OnTextureChange().UnregisterListener(this, TriTextureRes.prototype._OnWrappedRenderTargetChanged);
    }
    this.wrappedRenderTarget = renderTarget ?? null;

    if (this.wrappedRenderTarget)
    {
      this.wrappedRenderTarget.OnTextureChange().RegisterListener(this, TriTextureRes.prototype._OnWrappedRenderTargetChanged);
    }

    if (renderTarget && renderTarget.IsValid())
    {
      // Carbon also clears m_isTextureResizable here (cpp:887, TriTextureRes.h:178: whether the texture follows the
      // global mip-skip setting). The member is not ported: its only reader, ComputeMipSkipCount (cpp:170-178), is not either.
      this.SetTexture(renderTarget.GetRenderTarget());
    }

    return true;
  }

  /**
   * Drops the texture this resource made for itself, and the texture it shows.
   *
   * Carbon: TriTextureRes::DestroyOwnTexture (trinity/trinity/Resources/TriTextureRes.cpp:1224-1242;
   * TriTextureRes.h:212).
   *
   * Not implemented: with `lodEnabled` Carbon first tells the texture LOD manager
   * (`GpuTextureDestroyed`, `CpuTextureDestroyed`, cpp:1226-1239), which are not
   * ported, so that case throws. Adapted: an explicit Destroy replaces the
   * owned value's C++ destructor.
   */
  _DestroyOwnTexture() {
    if (this.lodEnabled)
    {
      throw new Error("TriTextureRes.DestroyOwnTexture: Tr2TextureLodManager GpuTextureDestroyed and CpuTextureDestroyed are not ported.");
    }

    if (this._ownTexture) this._ownTexture.Destroy();
    this._ownTexture = null;
    this.SetTexture(null);
  }

  /** OnWrappedRenderTargetChanged (cpp:1266-1269): the wrapped render target's texture changed, so this one's did. */
  _OnWrappedRenderTargetChanged() {
    this._onTextureChange.Broadcast();
  }

  /**
   * Create a texture copy from a render target.
   *
   * @throws {Error}
   */
  CreateAndCopyFromRenderTarget() {
    throw resourceBoundaryError("TriTextureRes", "CreateAndCopyFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create this texture from another texture resource.
   *
   * @throws {Error}
   */
  CreateFromTexture() {
    throw resourceBoundaryError("TriTextureRes", "CreateFromTexture", "Use engine-gpu to copy device textures.");
  }

  /**
   * Return true if this texture owns a backend allocation object.
   *
   * @param {string|number} type
   * @param {string|number} object
   * @returns {boolean}
   */
  HasALObject(type, object) {
    return this.HasAdapterResource(`${type}:${object}`);
  }

  /**
   * Return an engine-owned texture pipeline object when attached.
   *
   * @returns {*}
   */
  GetPipeline() {
    return this.GetAdapterResource("pipeline");
  }

  /**
   * Return memory size for the original non-LODed texture.
   *
   * @returns {number}
   */
  GetOriginalMemoryUsage() {
    return this.originalMemoryUsage || getPayloadMemoryUsage(this.GetPayload());
  }

  /**
   * Store the average color reported by decoded texture data: Carbon's
   * `SetAverageColor` (`TriTextureRes.cpp:862-865`), also the hook a video
   * source pushes each frame's average through (`VideoPlayer.cpp:179`).
   *
   * @param {number} red
   * @param {number} green
   * @param {number} blue
   * @param {number} alpha
   * @returns {TriTextureRes}
   */
  SetAverageColor(red = 0, green = 0, blue = 0, alpha = 0) {
    this.averageColor = [red, green, blue, alpha];
    return this;
  }

  /**
   * Update a texture subresource.
   *
   * @throws {Error}
   */
  UpdateSubresource() {
    throw resourceBoundaryError("TriTextureRes", "UpdateSubresource", "Use engine-gpu to upload texture bytes.");
  }

  /**
   * Resource preparation does not decide device upload policy.
   *
   * @returns {boolean}
   */
  PrepareResources() {
    return this.IsPrepared();
  }

  /**
   * Release the texture for Carbon's requested storage classes, keeping its bitmap.
   *
   * Source: trinity/trinity/Resources/TriTextureRes.cpp:356-392.
   * Adapted: explicit Destroy replaces the owned AL value's C++ destructor;
   * load cancellation remains manager-owned and UNLOADED combines good/prepared.
   * Asynchronous saves are not implemented here.
   *
   * @param {number} [storage=TriStorageFlags.TRISTORAGE_ALL] Carbon's TriStorage mask.
   * @returns {TriTextureRes} This resource.
   */
  ReleaseResources(storage = TriStorageFlags.TRISTORAGE_ALL)
  {
    const owned = this._ownTexture;
    if (owned && owned.IsValid() && (owned.GetMemoryClass() & storage) !== 0) owned.Destroy();
    const texture = this.texture;
    if (!texture) return this;

    const memoryClass = texture.GetMemoryClass();
    const release = Boolean(storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)
      || Boolean((storage & TriStorageFlags.TRISTORAGE_VIDEOMEMORY) && memoryClass === Tr2ALMemoryType.AL_MEMORY_VIDEO);

    if (release)
    {
      if (owned) owned.Destroy();
      this._ownTexture = null;
      this.texture = null;
      if (this.wrappedRenderTarget)
      {
        // Carbon (cpp:383-386) stops listening before it lets go of the render target.
        this.wrappedRenderTarget.OnTextureChange().UnregisterListener(this, TriTextureRes.prototype._OnWrappedRenderTargetChanged);
      }
      this.wrappedRenderTarget = null;
      this._memoryUse = 0;
      this.originalMemoryUsage = 0;
      this.SetState(CjsResource.State.UNLOADED);
      this._onTextureChange.Broadcast();
    }
    return this;
  }

  /**
   * Release the texture and bitmap when the cache relinquishes this resource.
   *
   * Adapted: JavaScript full purge explicitly drops the bitmap that Carbon's
   * resource destructor owns; ReleaseResources alone deliberately retains it.
   * The payload-only inactivity tier skips textures so they can be rebound.
   *
   * @returns {TriTextureRes} This resource without its owned payload.
   */
  ReleasePayload()
  {
    if (this.videoController) this.videoController.Destruct();
    this.videoController = null;
    this.ReleaseResources();
    this.loadedBitmap = null;
    this._memoryUse = 0;
    return super.ReleasePayload();
  }

  /**
   * Carbon `IsMemoryUsageKnown` (TriTextureRes.cpp:431-434): known once loaded.
   *
   * @returns {boolean}
   */
  IsMemoryUsageKnown() {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (TriTextureRes.cpp:436-439): `m_memoryUse`.
   *
   * @returns {number} Bytes.
   */
  GetMemoryUsage() {
    return this._memoryUse;
  }

  /**
   * Carbon's memory estimate for the resource cache (TriTextureRes.cpp:1182-1189):
   * every mip's size, times the array size.
   *
   * Adapted: Carbon takes it from the texture when `SetTexture` installs one.
   * The texture here is made at first bind, so the estimate comes from the
   * bitmap it is made from, whose dimensions it copies.
   *
   * @param {import("#imageio").HostBitmap} bitmap The adopted bitmap.
   * @returns {number} Bytes.
   */
  static EstimateMemoryUse(bitmap) {
    let bytes = 0;
    const mipCount = bitmap.GetTrueMipCount();
    for (let i = 0; i < mipCount; ++i) bytes += bitmap.GetMipSize(i);
    return bytes * Math.max(1, bitmap.GetArraySize());
  }

  static payload = ResourceRequirement.TEXTURE;
}

function getPayloadMemoryUsage(payload)
{
  if (!payload || typeof payload !== "object") return 0;
  if (Number.isSafeInteger(payload.originalMemoryUsage) && payload.originalMemoryUsage >= 0)
  {
    return payload.originalMemoryUsage;
  }
  return ArrayBuffer.isView(payload.data) || payload.data instanceof ArrayBuffer
    ? payload.data.byteLength
    : 0;
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.

CjsSchema.decorateField(TriTextureRes, "format", type.int32, type.enum("trinity.ImageIO.PixelFormat"), be.mapAttributeWithChooser(be.READ | be.ENUM, "trinity.ImageIO.PixelFormat"));
CjsSchema.decorateField(TriTextureRes, "type", type.int32, type.enum("trinity.ImageIO.TextureType"), blue.read, blue.persist);
CjsSchema.decorateField(TriTextureRes, "averageColor", type.color, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "depth", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "cutoutHeight", type.float32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriTextureRes, "height", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "lodEnabled", type.boolean, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "hadLodRequests", type.boolean, blue.read);
CjsSchema.decorateField(TriTextureRes, "cpuMip", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "gpuMip", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "wrappedRenderTarget", type.object.ref("Tr2RenderTarget"), be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "originalResolution", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "originalMemoryUsage", type.uint64, meta.read);
CjsSchema.decorateField(TriTextureRes, "name", type.string, be.mapAttribute(be.READ | be.WRITE));
CjsSchema.decorateField(TriTextureRes, "arraySize", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "cutoutWidth", type.float32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriTextureRes, "width", type.uint32, be.mapAttribute(be.READ));
CjsSchema.decorateField(TriTextureRes, "cutoutX", type.float32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriTextureRes, "cutoutY", type.float32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriTextureRes, "loadedBitmap", type.unknown, meta.read);
CjsSchema.decorateMethod(TriTextureRes, "DoLoad", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "Initialize", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetMipCount", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetMsaaType", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "GetMsaaQuality", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "HadLodRequests", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetSrvIndexInHeap", meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "GetTexture", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "SetTexture", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "OnTextureChange", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "SetState", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "SaveAsync", be.mapMethod(), meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "Save", be.mapMethod(), meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "IsSaving", be.mapMethodAndWrap(), meta.noop);
CjsSchema.decorateMethod(TriTextureRes, "IsSaveCompleted", be.mapMethodAndWrap(), meta.noop);
CjsSchema.decorateMethod(TriTextureRes, "IsSaveSucceeded", be.mapMethodAndWrap(), meta.noop);
CjsSchema.decorateMethod(TriTextureRes, "WaitForSave", be.mapMethodAndWrap(), meta.noop);
CjsSchema.decorateMethod(TriTextureRes, "CreateEmptyTexture", be.mapMethodAndWrap(), meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "SetTextureFromRT", be.mapMethodAndWrap("SetFromRenderTarget"), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "_DestroyOwnTexture", meta.notImplemented);
CjsSchema.decorateMethod(TriTextureRes, "_OnWrappedRenderTargetChanged", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "CreateAndCopyFromRenderTarget", be.mapMethodAndWrap(), meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "CreateFromHostBitmap", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "IsMemoryUsageKnown", blue.method, meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "GetMemoryUsage", blue.method, meta.implemented);
// A static method has no prototype descriptor, so decorateMethod would record it as a field.
CjsSchema.defineMethod(TriTextureRes, "EstimateMemoryUse", "impl", { adapted: true, status: "adapted" });
CjsSchema.decorateMethod(TriTextureRes, "LoadPipeline", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "IsValid", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "GetWidth", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetHeight", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetMipLevelCount", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "CreateFromTexture", be.mapMethodAndWrap(), meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "HasALObject", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetPipeline", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetOriginalMemoryUsage", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "GetAverageColor", meta.implemented);
CjsSchema.decorateMethod(TriTextureRes, "SetAverageColor", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "UpdateSubresource", meta.notSupported);
CjsSchema.decorateMethod(TriTextureRes, "PrepareResources", be.mapMethodAndWrap(), meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "ReleaseResources", meta.adapted);
CjsSchema.decorateMethod(TriTextureRes, "ReleasePayload", meta.adapted);
be.define("TriTextureRes")(TriTextureRes);
blue.inherit(ICacheable)(TriTextureRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(TriTextureRes);
// Carbon maps these in TriTextureRes_Blue.cpp:227-229 although BlueAsyncRes (CjsResource) declares them.
be.mapMethodAndWrap([ "IsPrepared", "IsLoading", "IsGood" ])(TriTextureRes);
