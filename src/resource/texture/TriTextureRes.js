// Source: trinity/trinity/Resources/TriTextureRes.h
// Source: trinity/trinity/Resources/TriTextureRes.cpp
// Source: trinity/trinity/Resources/TriTextureRes_Blue.cpp
import { CjsSchema, carbon, impl, edit, type } from "#schema";
import { HostBitmap } from "#imageio";
import { CjsResource } from "../CjsResource.js";
import { IsSolidColorTexturePath, RasterizeSolidColor } from "./solidColorTexture.js";
import { ResourceRequirement } from "../ResourceRequirement.js";
import {
  ResourcePayloadType,
  validateRgbaPayload,
  validateTexturePayload,
  validateVideoPayload
} from "../format/payloadContract.js";
import {
  resourceBoundaryError,
  resourceFormatRequiredError,
  resourcePayloadError,
  validateResourcePayload
} from "../resourceBoundary.js";

/**
 * Resource record that owns Carbon-style texture identity and validated
 * texture, RGBA, or video payload facts with mirrored dimension/format
 * metadata, while engine packages decide what those facts become on a device.
 *
 * The resource never CREATES a backend texture - it cannot reach a render
 * context - but it RETAINS the one Trinity makes for it, as Carbon's does
 * (`m_texture`), so every parameter sharing the resource binds one texture.
 */
export class TriTextureRes extends CjsResource
{
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
  originalMemoryUsage = 0;
  name = "";
  arraySize = 0;
  cutoutWidth = 1;
  width = 0;
  cutoutX = 0;
  cutoutY = 0;

  /** Creates a TriTextureRes with caller-provided initial state. */
  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      skipUpdate: true,
      skipEvents: true
    });
  }

  /**
   * Carbon's Initialize, with its procedural branch (TriTextureRes.cpp:223-236):
   * a `dynamic:/color/` path is rasterized here rather than loaded from source.
   * The `dynamic:/gradient_1d/` branch Carbon checks first is rasterized by
   * trinity's GradientTextureConstructor instead: a gradient needs Tr2CurveScalar,
   * which this layer may not import.
   *
   * @param {string} path Resource path.
   * @param {string|null} [ext] Extension override.
   * @param {string} [requirement] Semantic requirement.
   * @returns {TriTextureRes} This resource.
   */
  Initialize(path, ext = null, requirement = "") {
    super.Initialize(path, ext, requirement);
    if (IsSolidColorTexturePath(this.path)) this.#RasterizeProceduralTexture(RasterizeSolidColor);
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
  #RasterizeProceduralTexture(rasterize) {
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

  /** m_loadedBitmap: the decoded image the texture is made from, or null. */
  loadedBitmap = null;

  /**
   * The live texture, or null while there is none - Carbon returns nullptr
   * until the load finishes and the parameter substitutes the fallback
   * (`TriTextureRes.cpp:394-405`).
   *
   * @returns {object|null} A `Tr2TextureAL`.
   */
  GetTexture() {
    return this.texture && this.texture.IsValid() ? this.texture : null;
  }

  /**
   * Adopts a texture as this resource's (`TriTextureRes.cpp:1159-1195`).
   *
   * @param {object|null} texture A `Tr2TextureAL`, or null to drop it.
   * @returns {TriTextureRes} This resource.
   */
  SetTexture(texture) {
    if (this.texture && this.texture !== texture) this.texture.Destroy();
    this.texture = texture ?? null;
    return this;
  }

  /**
   * Build this texture from a texture pipeline: Carbon's `.ctr` route
   * (`TriTextureRes.cpp:238-258` then `ResourcePrepFinished`, `:296-340`).
   *
   * Every path the pipeline names is loaded as a raw `Tr2ImageRes` (Carbon asks
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
   * @param {import("./Tr2TexturePipeline.js").Tr2TexturePipeline} pipeline The recipe.
   * @param {object} resourceManager The `CjsResMan` that loads its inputs.
   * @returns {Promise<boolean>} Whether the pipeline produced a bitmap.
   */
  async LoadPipeline(pipeline, resourceManager) {
    this.MarkLoading();

    const images = new Map();

    for (const path of pipeline.GetResourceDependencies()) {
      images.set(path, resourceManager.GetResource(path, { requirement: ResourceRequirement.IMAGE }));
    }

    // Carbon's m_pipelineFence: wait for every input, whatever became of it.
    await Promise.allSettled([ ...images.values() ].map(image => image.Ready()));

    // Carbon: it->second && it->second->IsGood() ? &it->second->GetBitmap() : nullptr
    const inputs = new Map();

    for (const [ path, image ] of images) {
      inputs.set(path, image.IsGood() ? image.GetBitmap() : null);
    }

    const result = new HostBitmap();
    const executed = pipeline.Execute(result, inputs);

    if (executed) this.SetPayload(result);

    this.MarkPrepared();
    return executed;
  }

  /**
   * Adopt the cutout an image declared (Carbon reads ImageIO::Metadata's
   * cutout in DoPrepare and stores it as m_cutoutX/Y/Width/Height).
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
   * @returns {import("#imageio").HostBitmap|null} The bitmap.
   */
  GetBitmap() {
    return this.loadedBitmap;
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
   * @param {import("#imageio").HostBitmap|null} bitmap The decoded bitmap.
   * @returns {boolean} Whether the bitmap was adopted.
   */
  CreateFromHostBitmap(bitmap) {
    this.SetTexture(null);

    if (!bitmap || !bitmap.IsValid()) {
      this.loadedBitmap = null;
      return false;
    }

    this.loadedBitmap = bitmap;
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
   * Attach a plain texture, RGBA, or video payload and mirror Carbon-exposed
   * metadata. Invalid payloads are rejected before replacing the current one.
   *
   * @param {object|null} payload
   * @param {object|null} options
   * @returns {TriTextureRes}
   */
  SetPayload(payload = null, options = null) {
    if (payload === null) {
      // The bytes are gone; so is the texture made from them.
      this.SetTexture(null);
      this.loadedBitmap = null;
      super.SetPayload(null);
      return this;
    }

    // Carbon's resource IS its bitmap (TriTextureRes.cpp:606, 960-978).
    const bitmap = CjsSchema.cast(payload, HostBitmap);

    if (bitmap) {
      this.CreateFromHostBitmap(bitmap);
      super.SetPayload(bitmap, options);
      if (options) this.SetValues(options);
      if (bitmap.metadata?.cutout) this.SetCutout(bitmap.metadata.cutout);
      return this;
    }

    // A video frame source is the one payload left: it is not an image the
    // CPU decoded, it is a playing element the backend samples.
    if (payload?.payloadType !== ResourcePayloadType.VIDEO) {
      throw resourcePayloadError(
        "TriTextureRes",
        'Expected an ImageIO::HostBitmap, or payloadType "video".',
        "payloadType"
      );
    }
    const validator = validateVideoPayload;
    validateResourcePayload("TriTextureRes", payload, validator);

    const values = { ...(options || {}) };
    if (payload.pixelFormat !== undefined || payload.format !== undefined) values.format = payload.pixelFormat || payload.format;
    if (payload.width !== undefined) values.width = payload.width;
    if (payload.height !== undefined) values.height = payload.height;
    if (payload.depth !== undefined) values.depth = payload.depth;
    if (payload.arraySize !== undefined) values.arraySize = payload.arraySize;
    else if (Array.isArray(payload.faces)) values.arraySize = payload.faces.length;
    if (payload.mipCount !== undefined) values.cpuMip = payload.mipCount;
    else if (payload.payloadType === ResourcePayloadType.RGBA) values.cpuMip = 1;
    if (payload.hadLodRequests !== undefined) values.hadLodRequests = !!payload.hadLodRequests;
    values.originalMemoryUsage = getPayloadMemoryUsage(payload);
    values.originalResolution = Math.max(payload.width || 0, payload.height || 0, this.originalResolution || 0);

    super.SetPayload(payload);
    this.SetValues(values);
    return this;
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
    if (data?.payloadType !== undefined) return this.SetPayload(data, values);

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
   * Render-target wrapping belongs to engine-gpu.
   *
   * @throws {Error}
   */
  SetFromRenderTarget() {
    throw resourceBoundaryError("TriTextureRes", "SetFromRenderTarget", "Runtime-resource does not own render targets.");
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
   * Store the average color reported by decoded texture data.
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
CjsSchema.define(TriTextureRes, {
  className: "TriTextureRes",
  family: "resources",
  fields: {
    format: [ type.unknown, edit.read ],
    type: [ type.unknown, edit.persist ],
    averageColor: [ type.color, edit.read ],
    depth: [ type.uint32, edit.read ],
    cutoutHeight: [ type.float32, edit.readwrite ],
    height: [ type.uint32, edit.read ],
    lodEnabled: [ type.boolean, edit.read ],
    hadLodRequests: [ type.boolean, edit.read ],
    cpuMip: [ type.uint32, edit.read ],
    gpuMip: [ type.uint32, edit.read ],
    wrappedRenderTarget: [ type.unknown, edit.read ],
    originalResolution: [ type.uint32, edit.read ],
    originalMemoryUsage: [ type.uint64, edit.read ],
    name: [ type.string, edit.readwrite ],
    arraySize: [ type.uint32, edit.read ],
    cutoutWidth: [ type.float32, edit.readwrite ],
    width: [ type.uint32, edit.read ],
    cutoutX: [ type.float32, edit.readwrite ],
    cutoutY: [ type.float32, edit.readwrite ],
    loadedBitmap: [ type.unknown, edit.read ]
  },
  methods: {
    Initialize: [ carbon.method, impl.adapted, impl.reason("Carbon rasterizes a procedural path into a half-float HostBitmap and creates the GPU texture inside Initialize; this resource cannot reach a render context, so it publishes the half-float-quantized colour as an rgba32float payload. The gradient_1d branch is not ported.") ],
    GetMipCount: [ carbon.method, impl.adapted ],
    GetMsaaType: [ carbon.method, impl.implemented ],
    GetMsaaQuality: [ carbon.method, impl.implemented ],
    HadLodRequests: [ carbon.method, impl.adapted ],
    GetSrvIndexInHeap: [ carbon.method, impl.notSupported ],
    GetTexture: [ carbon.method, impl.implemented ],
    SetTexture: [ carbon.method, impl.adapted, impl.reason("Carbon also copies the texture's dimensions onto the resource and fires m_onTextureChange; the payload already carries the dimensions here, and the binding parameter arms the resource's completion instead.") ],
    SaveAsync: [ carbon.method, impl.notSupported ],
    Save: [ carbon.method, impl.notSupported ],
    IsSaving: [ carbon.method, impl.noop ],
    IsSaveCompleted: [ carbon.method, impl.noop ],
    IsSaveSucceeded: [ carbon.method, impl.noop ],
    WaitForSave: [ carbon.method, impl.noop ],
    CreateEmptyTexture: [ carbon.method, impl.notSupported ],
    SetFromRenderTarget: [ carbon.method, impl.notSupported ],
    CreateAndCopyFromRenderTarget: [ carbon.method, impl.notSupported ],
    CreateFromHostBitmap: [ carbon.method, impl.adapted, impl.reason("Carbon creates the texture here on the main thread's render context; the resource layer may not reach one, so this adopts the bitmap and the texture is made on first bind (Tr2ImageIOHelpers.RealizeTexture).") ],
    LoadPipeline: [ impl.adapted, impl.reason("Carbon's .ctr branch reads the pipeline from a file through the global BeResMan and waits on a fence; no shipped build has a .ctr, so the pipeline is handed in, the manager passed, and the fence is a promise.") ],
    SetCutout: [ impl.custom, impl.reason("Carbon reads the cutout from ImageIO::Metadata inside DoPrepare; the read happens in the loader here, so the resource is told.") ],
    GetBitmap: [ impl.custom, impl.reason("Carbon keeps m_loadedBitmap private and uploads it inside CreateFromHostBitmap; the upload happens at bind time here, so the bitmap has to be readable.") ],
    CreateFromTexture: [ carbon.method, impl.notSupported ],
    HasALObject: [ carbon.method, impl.adapted ],
    GetPipeline: [ carbon.method, impl.adapted ],
    GetOriginalMemoryUsage: [ carbon.method, impl.adapted ],
    SetAverageColor: [ carbon.method, impl.adapted ],
    UpdateSubresource: [ carbon.method, impl.notSupported ],
    PrepareResources: [ carbon.method, impl.adapted ]
  }
});
