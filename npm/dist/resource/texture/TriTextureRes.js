import { CjsSchema, carbon, impl, type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsResource } from '../CjsResource.js';
import { validateVideoPayload, validateTexturePayload, validateRgbaPayload, ResourcePayloadType } from '../../format/payloadContract.js';
import { resourcePayloadError, validateResourcePayload, resourceBoundaryError } from '../resourceBoundary.js';

// Source: trinity/trinity/Resources/TriTextureRes.h
// Source: trinity/trinity/Resources/TriTextureRes.cpp
// Source: trinity/trinity/Resources/TriTextureRes_Blue.cpp

/**
 * Resource record that owns Carbon-style texture identity and validated
 * texture, RGBA, or video payload facts with mirrored dimension/format
 * metadata, while engine packages decide what those facts become on a device.
 *
 * The resource never creates or retains a backend texture.
 */
class TriTextureRes extends CjsResource {
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
      throw resourcePayloadError("TriTextureRes", 'Expected payloadType "rgba", "texture", or "video".', "payloadType");
    }
    validateResourcePayload("TriTextureRes", payload, validator);
    const values = {
      ...(options || {})
    };
    if (payload.pixelFormat !== undefined || payload.format !== undefined) values.format = payload.pixelFormat || payload.format;
    if (payload.width !== undefined) values.width = payload.width;
    if (payload.height !== undefined) values.height = payload.height;
    if (payload.depth !== undefined) values.depth = payload.depth;
    if (payload.arraySize !== undefined) values.arraySize = payload.arraySize;else if (Array.isArray(payload.faces)) values.arraySize = payload.faces.length;
    if (payload.mipCount !== undefined) values.cpuMip = payload.mipCount;else if (payload.payloadType === ResourcePayloadType.RGBA) values.cpuMip = 1;
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
  GetMipCount() {
    return this.GetPayload()?.mipCount || this.cpuMip || 0;
  }

  /**
   * Return the multisample type for this texture.
   *
   * @returns {number}
   */
  GetMsaaType() {
    const payload = this.GetPayload();
    return payload?.multiSampleType ?? payload?.msaaType ?? payload?.samples ?? 1;
  }

  /**
   * Return the multisample quality for this texture.
   *
   * @returns {number}
   */
  GetMsaaQuality() {
    const payload = this.GetPayload();
    return payload?.multiSampleQuality ?? payload?.msaaQuality ?? 0;
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
    throw resourceBoundaryError("TriTextureRes", "SaveAsync", `Use a format writer and caller-owned destination to save texture payloads${path ? ` (${path})` : ""}.`);
  }

  /**
   * Save this texture synchronously.
   *
   * @param {string} path
   * @returns {boolean}
   */
  Save(path = "") {
    throw resourceBoundaryError("TriTextureRes", "Save", `Use a format writer and caller-owned destination to save texture payloads${path ? ` (${path})` : ""}.`);
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
   * Create a device texture from a host bitmap.
   *
   * @throws {Error}
   */
  CreateFromHostBitmap() {
    throw resourceBoundaryError("TriTextureRes", "CreateFromHostBitmap", "Use engine-gpu to allocate and upload texture data.");
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
  static payload = "texture";
}
function getPayloadMemoryUsage(payload) {
  if (!payload || typeof payload !== "object") return 0;
  if (Number.isSafeInteger(payload.originalMemoryUsage) && payload.originalMemoryUsage >= 0) {
    return payload.originalMemoryUsage;
  }
  return ArrayBuffer.isView(payload.data) || payload.data instanceof ArrayBuffer ? payload.data.byteLength : 0;
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.
CjsSchema.define(TriTextureRes, {
  className: "TriTextureRes",
  family: "resources",
  fields: {
    format: [type.unknown, io.read],
    type: [type.unknown, io.persist],
    averageColor: [type.color, io.read],
    depth: [type.uint32, io.read],
    cutoutHeight: [type.float32, io.readwrite],
    height: [type.uint32, io.read],
    lodEnabled: [type.boolean, io.read],
    hadLodRequests: [type.boolean, io.read],
    cpuMip: [type.uint32, io.read],
    gpuMip: [type.uint32, io.read],
    wrappedRenderTarget: [type.unknown, io.read],
    originalResolution: [type.uint32, io.read],
    originalMemoryUsage: [type.uint64, io.read],
    name: [type.string, io.readwrite],
    arraySize: [type.uint32, io.read],
    cutoutWidth: [type.float32, io.readwrite],
    width: [type.uint32, io.read],
    cutoutX: [type.float32, io.readwrite],
    cutoutY: [type.float32, io.readwrite]
  },
  methods: {
    GetMipCount: [carbon.method, impl.adapted],
    GetMsaaType: [carbon.method, impl.adapted],
    GetMsaaQuality: [carbon.method, impl.adapted],
    HadLodRequests: [carbon.method, impl.adapted],
    GetSrvIndexInHeap: [carbon.method, impl.notSupported],
    SaveAsync: [carbon.method, impl.notSupported],
    Save: [carbon.method, impl.notSupported],
    IsSaving: [carbon.method, impl.noop],
    IsSaveCompleted: [carbon.method, impl.noop],
    IsSaveSucceeded: [carbon.method, impl.noop],
    WaitForSave: [carbon.method, impl.noop],
    CreateEmptyTexture: [carbon.method, impl.notSupported],
    SetFromRenderTarget: [carbon.method, impl.notSupported],
    CreateAndCopyFromRenderTarget: [carbon.method, impl.notSupported],
    CreateFromHostBitmap: [carbon.method, impl.notSupported],
    CreateFromTexture: [carbon.method, impl.notSupported],
    HasALObject: [carbon.method, impl.adapted],
    GetPipeline: [carbon.method, impl.adapted],
    GetOriginalMemoryUsage: [carbon.method, impl.adapted],
    SetAverageColor: [carbon.method, impl.adapted],
    UpdateSubresource: [carbon.method, impl.notSupported],
    PrepareResources: [carbon.method, impl.adapted]
  }
});

export { TriTextureRes };
//# sourceMappingURL=TriTextureRes.js.map
