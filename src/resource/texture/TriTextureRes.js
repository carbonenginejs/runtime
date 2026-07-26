// Source: trinity/trinity/Resources/TriTextureRes.h
// Source: trinity/trinity/Resources/TriTextureRes.cpp
// Source: trinity/trinity/Resources/TriTextureRes_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsResource } from "../CjsResource.js";
import {
  ResourcePayloadType,
  validateRgbaPayload,
  validateTexturePayload,
  validateVideoPayload
} from "../../format/payloadContract.js";
import {
  resourceBoundaryError,
  resourcePayloadError,
  validateResourcePayload
} from "../resourceBoundary.js";

/**
 * Resource record that owns Carbon-style texture identity and validated
 * texture, RGBA, or video payload facts with mirrored dimension/format
 * metadata, while engine packages decide what those facts become on a device.
 *
 * The resource never creates or retains a backend texture.
 */
@type.define({ className: "TriTextureRes", family: "resources" })
export class TriTextureRes extends CjsResource
{
  @io.read
  @type.unknown
  format = null;

  @io.persist
  @type.unknown
  type = null;

  @io.read
  @type.color
  averageColor = [0, 0, 0, 0];

  @io.read
  @type.uint32
  depth = 0;

  @io.readwrite
  @type.float32
  cutoutHeight = 1;

  @io.read
  @type.uint32
  height = 0;

  @io.read
  @type.boolean
  lodEnabled = false;

  @io.read
  @type.boolean
  hadLodRequests = false;

  @io.read
  @type.uint32
  cpuMip = 0;

  @io.read
  @type.uint32
  gpuMip = 0;

  @io.read
  @type.unknown
  wrappedRenderTarget = null;

  @io.read
  @type.uint32
  originalResolution = 0;

  @io.read
  @type.uint64
  originalMemoryUsage = 0;

  @io.readwrite
  @type.string
  name = "";

  @io.read
  @type.uint32
  arraySize = 0;

  @io.readwrite
  @type.float32
  cutoutWidth = 1;

  @io.read
  @type.uint32
  width = 0;

  @io.readwrite
  @type.float32
  cutoutX = 0;

  @io.readwrite
  @type.float32
  cutoutY = 0;

  /** Creates a TriTextureRes with caller-provided initial state. */
  constructor(values = null) {
    super();
    this.SetValues(values || {}, {
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    });
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
      super.SetPayload(null);
      return this;
    }

    const validator = {
      [ResourcePayloadType.RGBA]: validateRgbaPayload,
      [ResourcePayloadType.TEXTURE]: validateTexturePayload,
      [ResourcePayloadType.VIDEO]: validateVideoPayload
    }[payload?.payloadType];
    if (!validator) {
      throw resourcePayloadError(
        "TriTextureRes",
        'Expected payloadType "rgba", "texture", or "video".',
        "payloadType"
      );
    }
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
   * Return the number of mip levels known to this texture resource.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetMipCount() {
    return this.GetPayload()?.mipCount || this.cpuMip || 0;
  }

  /**
   * Return the multisample type for this texture.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetMsaaType() {
    const payload = this.GetPayload();
    return payload?.multiSampleType ?? payload?.msaaType ?? payload?.samples ?? 1;
  }

  /**
   * Return the multisample quality for this texture.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
  GetMsaaQuality() {
    const payload = this.GetPayload();
    return payload?.multiSampleQuality ?? payload?.msaaQuality ?? 0;
  }

  /**
   * Return true if this texture has received LOD requests.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
  HadLodRequests() {
    return this.hadLodRequests;
  }

  /**
   * Return the shader-resource-view heap index when a backend owns one.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.notSupported
  GetSrvIndexInHeap() {
    throw resourceBoundaryError("TriTextureRes", "GetSrvIndexInHeap", "Runtime-resource does not own descriptor heaps.");
  }

  /**
   * Save this texture asynchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  @carbon.method
  @impl.notSupported
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
  @carbon.method
  @impl.notSupported
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
  @carbon.method
  @impl.noop
  IsSaving() {
    return false;
  }

  /**
   * Return true if the asynchronous save operation has completed.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.noop
  IsSaveCompleted() {
    return true;
  }

  /**
   * Return true if the asynchronous save operation succeeded.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.noop
  IsSaveSucceeded() {
    return false;
  }

  /**
   * Wait for an asynchronous save operation.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.noop
  WaitForSave() {
    return this.IsSaveCompleted();
  }

  /**
   * Device texture allocation belongs to engine-gpu.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateEmptyTexture() {
    throw resourceBoundaryError("TriTextureRes", "CreateEmptyTexture", "Use engine-gpu to allocate device textures.");
  }

  /**
   * Render-target wrapping belongs to engine-gpu.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  SetFromRenderTarget() {
    throw resourceBoundaryError("TriTextureRes", "SetFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create a texture copy from a render target.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateAndCopyFromRenderTarget() {
    throw resourceBoundaryError("TriTextureRes", "CreateAndCopyFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create a device texture from a host bitmap.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateFromHostBitmap() {
    throw resourceBoundaryError("TriTextureRes", "CreateFromHostBitmap", "Use engine-gpu to allocate and upload texture data.");
  }

  /**
   * Create this texture from another texture resource.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
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
  @carbon.method
  @impl.adapted
  HasALObject(type, object) {
    return this.HasAdapterResource(`${type}:${object}`);
  }

  /**
   * Return an engine-owned texture pipeline object when attached.
   *
   * @returns {*}
   */
  @carbon.method
  @impl.adapted
  GetPipeline() {
    return this.GetAdapterResource("pipeline");
  }

  /**
   * Return memory size for the original non-LODed texture.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  SetAverageColor(red = 0, green = 0, blue = 0, alpha = 0) {
    this.averageColor = [red, green, blue, alpha];
    return this;
  }

  /**
   * Update a texture subresource.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  UpdateSubresource() {
    throw resourceBoundaryError("TriTextureRes", "UpdateSubresource", "Use engine-gpu to upload texture bytes.");
  }

  /**
   * Resource preparation does not decide device upload policy.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.adapted
  PrepareResources() {
    return this.IsPrepared();
  }

  static payload = "texture";
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
