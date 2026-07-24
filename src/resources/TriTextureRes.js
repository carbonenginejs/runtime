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
} from "../format/payloadContract.js";
import {
  CarbonStubError,
  ResourceBoundaryError,
  ResourcePayloadError,
  ValidateResourcePayload
} from "./resourceBoundary.js";

/**
 * TriTextureRes resource record.
 *
 * This class owns Carbon-style resource identity and texture payload facts.
 * Engine-gpu decides what those facts become on a device.
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
      throw ResourcePayloadError(
        "TriTextureRes",
        'Expected payloadType "rgba", "texture", or "video".',
        "payloadType"
      );
    }
    ValidateResourcePayload("TriTextureRes", payload, validator);

    const values = { ...(options || {}) };
    if (payload.pixelFormat !== undefined || payload.format !== undefined) values.format = payload.pixelFormat || payload.format;
    if (payload.width !== undefined) values.width = payload.width;
    if (payload.height !== undefined) values.height = payload.height;
    if (payload.depth !== undefined) values.depth = payload.depth;
    if (payload.arraySize !== undefined) values.arraySize = payload.arraySize;
    else if (Array.isArray(payload.faces)) values.arraySize = payload.faces.length;
    if (payload.mipCount !== undefined) values.cpuMip = payload.mipCount;
    else if (payload.payloadType === ResourcePayloadType.RGBA) values.cpuMip = 1;
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
  @impl.notImplemented
  GetMsaaType() {
    throw CarbonStubError("TriTextureRes", "GetMsaaType");
  }

  /**
   * Return the multisample quality for this texture.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.notImplemented
  GetMsaaQuality() {
    throw CarbonStubError("TriTextureRes", "GetMsaaQuality");
  }

  /**
   * Return true if this texture has received LOD requests.
   *
   * @returns {boolean}
   */
  @carbon.method
  @impl.notImplemented
  HadLodRequests() {
    throw CarbonStubError("TriTextureRes", "HadLodRequests");
  }

  /**
   * Return the shader-resource-view heap index when a backend owns one.
   *
   * @returns {number}
   */
  @carbon.method
  @impl.notSupported
  GetSrvIndexInHeap() {
    throw ResourceBoundaryError("TriTextureRes", "GetSrvIndexInHeap", "Runtime-resource does not own descriptor heaps.");
  }

  /**
   * Save this texture asynchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  @carbon.method
  @impl.notImplemented
  SaveAsync(path = "") {
    throw CarbonStubError("TriTextureRes", "SaveAsync", path);
  }

  /**
   * Save this texture synchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  @carbon.method
  @impl.notImplemented
  Save(path = "") {
    throw CarbonStubError("TriTextureRes", "Save", path);
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
    throw ResourceBoundaryError("TriTextureRes", "CreateEmptyTexture", "Use engine-gpu to allocate device textures.");
  }

  /**
   * Render-target wrapping belongs to engine-gpu.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  SetFromRenderTarget() {
    throw ResourceBoundaryError("TriTextureRes", "SetFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create a texture copy from a render target.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateAndCopyFromRenderTarget() {
    throw ResourceBoundaryError("TriTextureRes", "CreateAndCopyFromRenderTarget", "Runtime-resource does not own render targets.");
  }

  /**
   * Create a device texture from a host bitmap.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateFromHostBitmap() {
    throw ResourceBoundaryError("TriTextureRes", "CreateFromHostBitmap", "Use engine-gpu to allocate and upload texture data.");
  }

  /**
   * Create this texture from another texture resource.
   *
   * @throws {Error}
   */
  @carbon.method
  @impl.notSupported
  CreateFromTexture() {
    throw ResourceBoundaryError("TriTextureRes", "CreateFromTexture", "Use engine-gpu to copy device textures.");
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
  @impl.notImplemented
  GetOriginalMemoryUsage() {
    throw CarbonStubError("TriTextureRes", "GetOriginalMemoryUsage");
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
    throw ResourceBoundaryError("TriTextureRes", "UpdateSubresource", "Use engine-gpu to upload texture bytes.");
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
