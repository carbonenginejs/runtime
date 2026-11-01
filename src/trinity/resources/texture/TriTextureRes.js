import { GradientPrefix, RasterizeGradient } from "../procedural/gradientTexture.js";
import { Tr2DeviceResource } from "../../core/device/Tr2DeviceResource.js";
import { blue as blueService } from "#blue/blue";
import { CjsGifFormat } from "../../../resource/formats/gif/CjsGifFormat.js";
import { CjsBmpFormat } from "../../../resource/formats/bmp/CjsBmpFormat.js";
import { CjsTgaFormat } from "../../../resource/formats/tga/CjsTgaFormat.js";
import { CjsJpegFormat } from "../../../resource/formats/jpeg/CjsJpegFormat.js";
import { CjsVtaFormat } from "../../../resource/formats/vta/CjsVtaFormat.js";
import { CjsPngFormat } from "../../../resource/formats/png/CjsPngFormat.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { ImageIO } from "../../../resource/imageio/ImageIO.js";
import { createDdsBitmap } from "../../../resource/formats/dds/ddsBitmap.js";
import { CjsDdsFormat } from "../../../resource/formats/dds/CjsDdsFormat.js";
import { compressBitmapAsync, selectCompression } from "#resource/codecs/bcn";
import { DECODE_BITMAP_CALLBACK, IMAGE_DECODE_FORMATS } from "../../../resource/imageio/imageDecodeCallbacks.js";
import { BeCallbackMan, BlueCallbackMan } from "../../../global/blue/BlueCallbackMan.js";
import { asUint8Array } from "#utils/bytes";
import { getResourceExtension } from "#utils/path";
import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/TriTextureRes.h
// Source: trinity/trinity/Resources/TriTextureRes.cpp
// Source: trinity/trinity/Resources/TriTextureRes_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { HostBitmap, LoadParameters, Metadata } from "#imageio";
import { TriStorageFlags, Tr2ALMemoryType } from "#consts/graphics";
import { BlueAsyncRes, ICacheable } from "#blue";
import { IsSolidColorTexturePath, RasterizeSolidColor } from "../procedural/solidColorTexture.js";
import { Tr2Event } from "#trinity/core/Tr2Event";
import {
  resourceBoundaryError,
  resourceFormatRequiredError,
  resourcePayloadError
} from "../resourceBoundary.js";

/** INVALID_LOD (TriTextureRes.cpp:76): no mip has been requested. */
const INVALID_LOD = 0xffffffff;

/** Stable DDS reader identity preserves ReadFormatOnce sharing. */
const DDS_BITMAP_DESCRIPTOR = { Format: CjsDdsFormat, defaults: { emit: "bitmap" } };

/**
 * Resource record that owns Carbon-style texture identity and validated
 * HostBitmap data with mirrored dimension/format
 * metadata, while engine packages decide what those facts become on a device.
 *
 * Device realization currently creates the backend texture; this resource
 * RETAINS the one Trinity makes for it, as Carbon's does
 * (`m_texture`), so every parameter sharing the resource binds one texture.
 */
export class TriTextureRes extends BlueAsyncRes
{
  /** Carbon: BLUE_REGISTER_RESOURCE_EXTENSION (trinity/trinity/Resources/TriTextureRes.cpp:46-55). */
  static extensions = ["dds", "png", "sdd", "tga", "jpg", "jpeg", "bmp", "ecs", "ctr", "vta"];

  /** Our GIF route extends Carbon's image list for the browser ImageIO decoder. */
  static additionalExtensions = ["gif"];

  /**
   * Formats for the declared extensions. Null means no format route is implemented;
   * it does not advertise a decoder. ImageIO still selects registered image handlers.
   */
  static extensionFormats = {
    dds: CjsDdsFormat, png: CjsPngFormat, sdd: null, tga: CjsTgaFormat,
    jpg: CjsJpegFormat, jpeg: CjsJpegFormat, bmp: CjsBmpFormat,
    ecs: null, ctr: null, vta: CjsVtaFormat, gif: CjsGifFormat
  };

  /**
   * Declared by Carbon, not routed here. The .ctr behavior is implemented by
   * LoadPipeline with a pipeline supplied by our dynamic constructors; the
   * shipped builds contain no .ctr files. Carbon loads that object itself
   * (trinity/trinity/Resources/TriTextureRes.cpp:238-260).
   */
  static unroutedExtensions = {
    sdd: "declared by Carbon, not routed here: no image handler",
    ecs: "declared by Carbon, not routed here: no image handler",
    ctr: "declared by Carbon, not routed here: dynamic constructors supply LoadPipeline's object"
  };

  /**
   * Our asynchronous ImageIO decode bridge uses Carbon's BeCallbackMan worker owner.
   *
   * @cjs
   * @adapted
   */
  static async _decodeImageBitmap(Format, bytes, context)
  {
    if (!BeCallbackMan.HasCallbackModule(DECODE_BITMAP_CALLBACK)) return Format.readBitmapAsync(bytes, { source: context.path });
    const id = { value: 0 };
    const cancel = () => BeCallbackMan.Cancel(id.value);
    const signal = context.signal;
    if (signal) signal.addEventListener("abort", cancel, { once: true });
    try
    {
      return await BeCallbackMan.Add__Name(DECODE_BITMAP_CALLBACK,
        { format: Format.id, input: asUint8Array(bytes), source: context.path }, BlueCallbackMan.BCBF_NONE, id);
    }
    finally
    {
      if (signal) signal.removeEventListener("abort", cancel);
    }
  }

  /**
   * Carbon: Tr2ImageRes::DoLoad (trinity/trinity/Resources/Tr2ImageRes.cpp:39-52).
   *
   * @cjs
   * @adapted PNG/VTA and worker decoding may await; finish the bitmap in LOADING
   *   before synchronous publication. Shared by textures, raw images and light profiles.
   * @param {Uint8Array|ArrayBuffer} bytes Image bytes.
   * @param {object} context Resource manager's load context.
   * @param {object} [compression] Optional backend compression policy.
   * @returns {Promise<HostBitmap>} Completed CPU bitmap.
   */
  static async readImageResource(bytes, context, compression = {})
  {
    // Snapshot before decoding: LOAD changes affect later loads, never this one.
    const texture = CjsSchema.cast(context.resource, TriTextureRes);
    const request = texture ? { enabled: TriTextureRes.compressUncompressedTextures,
      backend: compression.backend, features: Array.from(compression.features ?? []),
      role: compression.resolveRole ? compression.resolveRole(context.path) : null } : null;
    let bitmap;
    if (getResourceExtension(context.resource.GetPath()) === "dds")
    {
      const packet = await context.resMan.ReadFormatOnce(context.resource, DDS_BITMAP_DESCRIPTOR, bytes, {
        ...context, emit: "bitmap"
      });
      bitmap = createDdsBitmap(packet);
    }
    else if (TriTextureRes._isDecodedImage(ImageIO.getImageHandler(ImageIO.getExtension(context.path))))
    {
      const Format = ImageIO.getImageHandler(ImageIO.getExtension(context.path));
      try
      {
        bitmap = createDdsBitmap(await TriTextureRes._decodeImageBitmap(Format, bytes, context));
      }
      catch (error)
      {
        if (error.name === "AbortError") throw error;
        CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes: error reading '%S' - %s", context.path, error.message);
        const failure = new Error(`${context.path || "image"}: ${error.message}`, { cause: error });
        failure.code = "CJS_RESOURCE_IMAGE_READ_FAILED";
        throw failure;
      }
    }
    else
    {
      bitmap = new HostBitmap();
      const metadata = new Metadata();
      const path = context.path;
      const result = await ImageIO.readImageAsync(bytes, new LoadParameters(path), bitmap, metadata);

      if (!result.IsOk())
      {
        CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "Tr2ImageRes: error reading '%S' - %s", path, result.GetErrorMessage());
        const error = new Error(`${path || "image"}: ${result.GetErrorMessage()}`);
        error.code = "CJS_RESOURCE_IMAGE_READ_FAILED";
        throw error;
      }

      bitmap.metadata = metadata;
    }
    if (request) bitmap = await TriTextureRes._compressLoadedBitmap(bitmap, request, context.path, context.signal);
    return bitmap;
  }

  /**
   * Our worker-format membership check keeps non-worker ImageIO handlers local.
   *
   * @cjs
   * @implemented
   */
  static _isDecodedImage(Format)
  {
    return Format !== null && IMAGE_DECODE_FORMATS.get(Format.id) === Format;
  }

  /**
   * Optional load extension; complete output and diagnostics publish together.
   * A compression, or a failed one, is also logged on trinity's Main channel,
   * where texture loading logs (a skip is only recorded in the diagnostic).
   *
   * @cjs
   * @adapted
   */
  static async _compressLoadedBitmap(bitmap, request, path, signal)
  {
    const packet = { description: {
      type: bitmap.GetType(), format: bitmap.GetFormat(), width: bitmap.GetWidth(),
      height: bitmap.GetHeight(), depth: bitmap.GetDepth(), mipCount: bitmap.GetMipCount(),
      arraySize: bitmap.GetArraySize()
    }, data: bitmap.GetRawData(), metadata: bitmap.metadata };
    const choice = selectCompression(packet, request);
    const diagnostic = { requested: request.enabled, backend: request.backend ?? null,
      activeFeatures: request.features, role: request.role, outcome: "skipped", reason: choice.reason,
      originalFormat: bitmap.GetFormat(), outputFormat: bitmap.GetFormat(),
      originalBytes: packet.data.length, outputBytes: packet.data.length, encodeTimeMs: 0 };
    if (choice.mode !== null)
    {
      try
      {
        const encoded = await compressBitmapAsync(packet, choice.mode, { signal });
        bitmap = createDdsBitmap(encoded);
        diagnostic.outcome = "compressed";
        diagnostic.outputFormat = bitmap.GetFormat(); diagnostic.outputBytes = encoded.data.length;
        diagnostic.encodeTimeMs = encoded.encodeTimeMs;
        CcpLog.CCP_LOG_CH(CcpLog.GetModuleChannel("trinity"), "Compressed '%S' on load: mode %d, format %d to %d, %d to %d bytes in %g ms",
          path, choice.mode, diagnostic.originalFormat, diagnostic.outputFormat, diagnostic.originalBytes, diagnostic.outputBytes, diagnostic.encodeTimeMs);
      }
      catch (error)
      {
        if (signal?.aborted) throw error;
        diagnostic.reason = `worker-failed: ${error.message}`;
        CcpLog.CCP_LOGWARN_CH(CcpLog.GetModuleChannel("trinity"), "On-load compression of '%S' failed: %s", path, error.message);
      }
    }
    bitmap.compression = diagnostic;
    return bitmap;
  }


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
   * Carbon Initialize (TriTextureRes.cpp:223-236): procedural colors are built
   * directly; other paths use BlueAsyncRes. GPU creation is deferred in JS.
   *
   * @adapted
   * @param {string} path Resource path.
   * @param {string} [ext=""] Native factory suffix.
   * @returns {TriTextureRes} This resource.
   */
  Initialize(path, ext = "")
  {
    if (IsSolidColorTexturePath(path) || path.startsWith(GradientPrefix))
    {
      this._path = path;
      this._ext = ext;
      this._RasterizeProceduralTexture(path.startsWith(GradientPrefix) ? RasterizeGradient : RasterizeSolidColor);
    }
    else if (this._pipeline)
    {
      this._path = path;
      this._ext = ext;
      this.LoadPipeline(this._pipeline, blueService.resMan, this._pipelineEx);
    }
    else super.Initialize(path, ext);
    return this;
  }

  /**
   * Carbon procedural rasterization, with deferred browser GPU allocation.
   *
   * @cjs
   * @implemented
   * @param {(path: string) => HostBitmap|null} rasterize Existing procedural path decoder.
   * @returns {void}
   */
  _RasterizeProceduralTexture(rasterize)
  {
    blueService.resMan._StartResourceLoad(this);
    const bitmap = rasterize(this.GetPath());
    if (!bitmap)
    {
      const error = new Error("Failed to parse " + this.GetPath() + " texture path");
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      blueService.resMan._FailResourceLoad(this, error);
      return;
    }
    this.CreateFromHostBitmap(bitmap);
    blueService.resMan._FinishResourceLoad(this);
    this._NotifyRebuildCachedData();
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
   *
   * @adapted obtaining the live texture renews the JS cache lease. Carbon's
   *   caller holds a reference-counted resource; our time-based cache needs this
   *   use signal, including when a runtime parameter skips repeated realization.
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
   * @adapted Carbon also copies the texture's dimensions onto the resource and sets
   *   prepared/good; the payload already carries the dimensions here, and the resource
   *   manager owns the state.
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
   * @implemented
   * @returns {Tr2Event} m_onTextureChange.
   */
  OnTextureChange() {
    return this._onTextureChange;
  }


  /**
   * Carbon's pipeline completion, adapted to await browser inputs. Preserve the
   * native quirk: a failed Execute still prepares a good, empty texture.
   *
   * @adapted
   * @param {Tr2TexturePipeline} pipeline Recipe supplied by a dynamic constructor.
   * @param {BlueResMan} resourceManager Global manager used by existing callers.
   * @param {string} [ex="raw"] Input image factory suffix.
   * @returns {Promise<boolean>} Whether execution produced a bitmap.
   */
  async LoadPipeline(pipeline, resourceManager, ex = "raw") {
    this._pipeline = pipeline;
    this._pipelineEx = ex;
    this._isLoading = true;
    this._isGood = this._isPrepared = false;
    const attempt = blueService.resMan._StartResourceLoad(this);

    try
    {
    const images = new Map();

    for (const path of pipeline.GetResourceDependencies()) {
      images.set(path, resourceManager.GetResource(path, { ex }));
    }

    // Carbon's m_pipelineFence: wait for every input, whatever became of it.
    await Promise.allSettled([ ...images.values() ].filter(Boolean).map(image => blueService.resMan.Ready(image)));

    // Carbon: it->second && it->second->IsGood() ? &it->second->GetBitmap() : nullptr
    const inputs = new Map();

    for (const [ path, image ] of images) {
      inputs.set(path, image?.IsGood() ? image.GetBitmap() : null);
    }

    const result = new HostBitmap();
    const executed = await pipeline.Execute(result, inputs);

    blueService.resMan._AssertResourceLoad(this, attempt);
    if (executed) this.CreateFromHostBitmap(result);

    this._isLoading = false;
    this._isGood = this._isPrepared = true;
    blueService.resMan._FinishResourceLoad(this);
    this._NotifyRebuildCachedData();
    return executed;
    }
    catch (error)
    {
      if (blueService.resMan._IsResourceLoadCurrent(this, attempt)) blueService.resMan._FailResourceLoad(this, error);
      return false;
    }
  }

  /**
   * Adopt ImageIO cutout metadata read by Carbon's DoPrepare.
   *
   * @cjs
   * @implemented
   * @param {object|null} cutout Decoded ImageIO cutout metadata.
   */
  SetCutout(cutout)
  {
    this.cutoutX = cutout.x;
    this.cutoutY = cutout.y;
    this.cutoutWidth = cutout.width;
    this.cutoutHeight = cutout.height;
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
   * @implemented
   * @returns {boolean} Whether the resource loaded.
   */
  IsValid() {
    return this.IsGood();
  }

  /**
   * `ITriTextureRes::GetWidth`. Carbon's resource IS its Tr2BitmapDimensions
   * (`TriTextureRes.h:46-49`); ours keeps them on the loaded bitmap.
   *
   * @adapted
   * @returns {number} Width of mip zero, or 0 before load.
   */
  GetWidth() {
    return this.loadedBitmap ? this.loadedBitmap.GetWidth() : this.width;
  }

  /**
   * `ITriTextureRes::GetHeight` (`TriTextureRes.h:50-53`).
   *
   * @adapted
   * @returns {number} Height of mip zero, or 0 before load.
   */
  GetHeight() {
    return this.loadedBitmap ? this.loadedBitmap.GetHeight() : this.height;
  }

  /**
   * `ITriTextureRes::GetMipLevelCount` (`TriTextureRes.h:54-57`).
   *
   * @adapted
   * @returns {number} Mip count, or 0 before load.
   */
  GetMipLevelCount() {
    return this.loadedBitmap ? this.loadedBitmap.GetMipCount() : this.cpuMip;
  }

  /**
   * Carbon CreateFromHostBitmap (TriTextureRes.cpp:960-978). Browser GPU creation
   * is deferred until bind; the resource owns the bitmap and native ready flags.
   *
   * @adapted
   * @param {HostBitmap|null} bitmap Decoded image.
   * @returns {boolean} Whether a valid bitmap was adopted.
   */
  CreateFromHostBitmap(bitmap)
  {
    this.ReleaseResources();
    this.loadedBitmap = bitmap;
    if (!bitmap || !bitmap.IsValid())
    {
      this.compression = null;
      this._memoryUse = 0;
      return false;
    }
    this._memoryUse = TriTextureRes.EstimateMemoryUse(bitmap);
    this.format = bitmap.GetFormat();
    this.width = bitmap.GetWidth();
    this.height = bitmap.GetHeight();
    this.depth = bitmap.GetDepth();
    this.arraySize = bitmap.GetArraySize();
    this.cpuMip = bitmap.GetTrueMipCount();
    this.compression = bitmap.compression ?? null;
    const average = bitmap.GetAverageColor();
    if (average) this.SetAverageColor(average.r, average.g, average.b, average.a);
    if (bitmap.metadata?.cutout) this.SetCutout(bitmap.metadata.cutout);
    this._isGood = this._isPrepared = true;
    this._isLoading = false;
    this._onTextureChange.Broadcast();
    return true;
  }


  /**
   * Carbon DoLoad (TriTextureRes.cpp:583-641). Browser image decoding may await
   * a worker; the manager rejects cancelled attempts before adoption.
   *
   * @adapted
   * @returns {Promise<number>} Native LoadingResult.
   */
  async _DoLoad()
  {
    const value = await blueService.resMan.ReadResourceObjectPayload(this, this._dataStream.data);
    const bitmap = CjsSchema.cast(value, HostBitmap);
    if (!bitmap) throw resourcePayloadError("TriTextureRes", "Expected an ImageIO::HostBitmap.", "bitmap");
    this.loadedBitmap = bitmap;
    return BlueAsyncRes.LoadingResult.LR_SUCCESS;
  }

  /**
   * Return the number of mip levels known to this texture resource.
   *
   * @adapted
   * @returns {number}
   */
  GetMipCount() {
    return this.GetBitmap()?.mipCount || this.cpuMip || 0;
  }

  /**
   * The image's average colour, cached when the bitmap loads or pushed by a
   * video source (`TriTextureRes.h:61-64`, `m_averageColor`). Banners, planes,
   * screens and textured lights take their light colour from it.
   *
   * @implemented
   * @returns {number[]} `[r, g, b, a]`, zero until something sets it.
   */
  GetAverageColor() {
    return this.averageColor;
  }

  /**
   * Return the multisample type for this texture.
   *
   * @implemented
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
   * @implemented
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
   * @adapted
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
   * @notSupported
   * @returns {number}
   */
  GetSrvIndexInHeap() {
    throw resourceBoundaryError("TriTextureRes", "GetSrvIndexInHeap", "Runtime-resource does not own descriptor heaps.");
  }

  /**
   * Save this texture asynchronously.
   *
   * @notSupported
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
   * @notSupported
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
   * @adapted
   * @returns {boolean}
   */
  IsSaving() {
    return false;
  }

  /**
   * Return true if the asynchronous save operation has completed.
   *
   * @adapted
   * @returns {boolean}
   */
  IsSaveCompleted() {
    return true;
  }

  /**
   * Return true if the asynchronous save operation succeeded.
   *
   * @adapted
   * @returns {boolean}
   */
  IsSaveSucceeded() {
    return false;
  }

  /**
   * Wait for an asynchronous save operation.
   *
   * @adapted
   * @returns {boolean}
   */
  WaitForSave() {
    return this.IsSaveCompleted();
  }

  /**
   * Device texture allocation belongs to engine-gpu.
   *
   * @notSupported
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
   * @adapted Carbon holds the render target in a counted pointer and registers
   *   `OnWrappedRenderTargetChanged` on its event; the event holds the owner
   *   weakly here, and the resource holds the render target in
   *   `wrappedRenderTarget`. The own texture is dropped through
   *   `_DestroyOwnTexture`, which does not yet notify the texture LOD manager
   *   (`lodEnabled` is never set here, so the case cannot arise).
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
   *
   * @notImplemented
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

  /**
   * OnWrappedRenderTargetChanged (cpp:1266-1269): the wrapped render target's texture changed, so this one's did.
   *
   * @implemented
   */
  _OnWrappedRenderTargetChanged() {
    this._onTextureChange.Broadcast();
  }

  /**
   * Create a texture copy from a render target.
   *
   * @notSupported
   * @throws {Error}
   */
  CreateAndCopyFromRenderTarget() {
    throw resourceBoundaryError("TriTextureRes", "CreateAndCopyFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create this texture from another texture resource.
   *
   * @notSupported
   * @throws {Error}
   */
  CreateFromTexture() {
    throw resourceBoundaryError("TriTextureRes", "CreateFromTexture", "Use engine-gpu to copy device textures.");
  }

  /**
   * Return true if this texture owns a backend allocation object.
   *
   * @adapted
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
   * @adapted
   * @returns {*}
   */
  GetPipeline() {
    return this.GetAdapterResource("pipeline");
  }

  /**
   * Return memory size for the original non-LODed texture.
   *
   * @adapted
   * @returns {number}
   */
  GetOriginalMemoryUsage() {
    return this.originalMemoryUsage || getPayloadMemoryUsage(this.GetBitmap());
  }

  /**
   * Store the average color reported by decoded texture data: Carbon's
   * `SetAverageColor` (`TriTextureRes.cpp:862-865`), also the hook a video
   * source pushes each frame's average through (`VideoPlayer.cpp:179`).
   *
   * @adapted
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
   * @notSupported
   * @throws {Error}
   */
  UpdateSubresource() {
    throw resourceBoundaryError("TriTextureRes", "UpdateSubresource", "Use engine-gpu to upload texture bytes.");
  }

  /**
   * Resource preparation does not decide device upload policy.
   *
   * @adapted
   * @returns {boolean}
   */
  PrepareResources() {
    return this.IsPrepared();
  }

  /**
   * Release the texture for Carbon's requested storage classes, keeping its bitmap.
   *
   * Source: trinity/trinity/Resources/TriTextureRes.cpp:356-392.
   *
   * @adapted explicit Destroy replaces the owned AL value's C++ destructor;
   *   load cancellation remains manager-owned and UNLOADED combines good/prepared.
   *   Asynchronous saves are not implemented here.
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
      this._isGood = this._isPrepared = false;
      this._onTextureChange.Broadcast();
    }
    return this;
  }

  /**
   * Full JS teardown releases the video owner and decoded bitmap as well as device allocations.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.destroyAdapters !== false) this.DestroyAdapterResources();
    if (options.releasePayload === false) return;
    if (this.videoController) this.videoController.Destruct();
    this.videoController = null;
    this.ReleaseResources();
    this.loadedBitmap = null;
    this._memoryUse = 0;

  }

  /**
   * Carbon `IsMemoryUsageKnown` (TriTextureRes.cpp:431-434): known once loaded.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown() {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (TriTextureRes.cpp:436-439): `m_memoryUse`.
   *
   * @implemented
   * @returns {number} Bytes.
   */
  GetMemoryUsage() {
    return this._memoryUse;
  }

  /**
   * Carbon's memory estimate for the resource cache (TriTextureRes.cpp:1182-1189):
   * every mip's size, times the array size.
   *
   * @adapted Carbon takes it from the texture when `SetTexture` installs one.
   *   The texture here is made at first bind, so the estimate comes from the
   *   bitmap it is made from, whose dimensions it copies.
   * @param {import("#imageio").HostBitmap} bitmap The adopted bitmap.
   * @returns {number} Bytes.
   */
  static EstimateMemoryUse(bitmap) {
    let bytes = 0;
    const mipCount = bitmap.GetTrueMipCount();
    for (let i = 0; i < mipCount; ++i) bytes += bitmap.GetMipSize(i);
    return bytes * Math.max(1, bitmap.GetArraySize());
  }


  /**
   * Carbon DoPrepare, adapted to defer device creation until the first bind.
   *
   * @adapted
   */
  _DoPrepare()
  {
    return this.CreateFromHostBitmap(this.loadedBitmap);
  }

  /** Opaque browser device allocations, supplied by Tr2DeviceResource. */
  __adapterResources = null;

  /**
   * m_pipeline: custom dynamic paths supply the recipe that Carbon reads from
   * .ctr. Keep that small recipe so native Reload can refill this same handle.
   */
  _pipeline = null;

  /** Native raw-image inputs, except the existing texture-array shared route. */
  _pipelineEx = "raw";
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

CjsSchema.decorateMethod(TriTextureRes, "SaveAsync", be.mapMethod());
CjsSchema.decorateMethod(TriTextureRes, "Save", be.mapMethod());
CjsSchema.decorateMethod(TriTextureRes, "IsSaving", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "IsSaveCompleted", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "IsSaveSucceeded", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "WaitForSave", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "CreateEmptyTexture", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "SetTextureFromRT", be.mapMethodAndWrap("SetFromRenderTarget"));
CjsSchema.decorateMethod(TriTextureRes, "CreateAndCopyFromRenderTarget", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "CreateFromHostBitmap", be.mapMethodAndWrap());
CjsSchema.exposure.mapICacheableMethods()(TriTextureRes);
CjsSchema.decorateMethod(TriTextureRes, "CreateFromTexture", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "HasALObject", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "GetPipeline", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "GetOriginalMemoryUsage", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriTextureRes, "PrepareResources", be.mapMethodAndWrap());
be.define("TriTextureRes")(TriTextureRes);
be.inherit(ICacheable)(TriTextureRes, { kind: "class" });
CjsSchema.exposure.mapInterface(ICacheable)(TriTextureRes);
// Carbon: TriTextureRes::ExposeToBlue (trinity/trinity/Resources/TriTextureRes_Blue.cpp:318).
CjsSchema.blue.chainTo(BlueAsyncRes)(TriTextureRes);
// Carbon maps these in TriTextureRes_Blue.cpp:227-229 although BlueAsyncRes (BlueAsyncRes) declares them.
be.mapMethodAndWrap([ "IsPrepared", "IsLoading", "IsGood" ])(TriTextureRes);


be.inherit(Tr2DeviceResource)(TriTextureRes, { kind: "class" });


