import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/core-types/schema';
import { CjsResource as _CjsResource } from '../CjsResource.js';
import { CarbonStubError, ResourceBoundaryError } from './resourceBoundary.js';

let _initProto, _initClass, _init_format, _init_extra_format, _init_type, _init_extra_type, _init_averageColor, _init_extra_averageColor, _init_depth, _init_extra_depth, _init_cutoutHeight, _init_extra_cutoutHeight, _init_height, _init_extra_height, _init_lodEnabled, _init_extra_lodEnabled, _init_cpuMip, _init_extra_cpuMip, _init_gpuMip, _init_extra_gpuMip, _init_wrappedRenderTarget, _init_extra_wrappedRenderTarget, _init_originalResolution, _init_extra_originalResolution, _init_name, _init_extra_name, _init_arraySize, _init_extra_arraySize, _init_cutoutWidth, _init_extra_cutoutWidth, _init_width, _init_extra_width, _init_cutoutX, _init_extra_cutoutX, _init_cutoutY, _init_extra_cutoutY;

/**
 * TriTextureRes resource record.
 *
 * This class owns Carbon-style resource identity and texture payload facts.
 * Engine-gpu decides what those facts become on a device.
 */
let _TriTextureRes;
new class extends _identity {
  static [class TriTextureRes extends _CjsResource {
    static {
      ({
        e: [_init_format, _init_extra_format, _init_type, _init_extra_type, _init_averageColor, _init_extra_averageColor, _init_depth, _init_extra_depth, _init_cutoutHeight, _init_extra_cutoutHeight, _init_height, _init_extra_height, _init_lodEnabled, _init_extra_lodEnabled, _init_cpuMip, _init_extra_cpuMip, _init_gpuMip, _init_extra_gpuMip, _init_wrappedRenderTarget, _init_extra_wrappedRenderTarget, _init_originalResolution, _init_extra_originalResolution, _init_name, _init_extra_name, _init_arraySize, _init_extra_arraySize, _init_cutoutWidth, _init_extra_cutoutWidth, _init_width, _init_extra_width, _init_cutoutX, _init_extra_cutoutX, _init_cutoutY, _init_extra_cutoutY, _initProto],
        c: [_TriTextureRes, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriTextureRes",
        family: "resources"
      })], [[[io, io.read, type, type.unknown], 16, "format"], [[io, io.persist, type, type.unknown], 16, "type"], [[io, io.read, type, type.color], 16, "averageColor"], [[io, io.read, type, type.uint32], 16, "depth"], [[io, io.readwrite, type, type.float32], 16, "cutoutHeight"], [[io, io.read, type, type.uint32], 16, "height"], [[io, io.read, type, type.boolean], 16, "lodEnabled"], [[io, io.read, type, type.uint32], 16, "cpuMip"], [[io, io.read, type, type.uint32], 16, "gpuMip"], [[io, io.read, type, type.unknown], 16, "wrappedRenderTarget"], [[io, io.read, type, type.uint32], 16, "originalResolution"], [[io, io.readwrite, type, type.string], 16, "name"], [[io, io.read, type, type.uint32], 16, "arraySize"], [[io, io.readwrite, type, type.float32], 16, "cutoutWidth"], [[io, io.read, type, type.uint32], 16, "width"], [[io, io.readwrite, type, type.float32], 16, "cutoutX"], [[io, io.readwrite, type, type.float32], 16, "cutoutY"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMipCount"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetMsaaType"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetMsaaQuality"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "HadLodRequests"], [[carbon, carbon.method, impl, impl.notSupported], 18, "GetSrvIndexInHeap"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SaveAsync"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "Save"], [[carbon, carbon.method, impl, impl.noop], 18, "IsSaving"], [[carbon, carbon.method, impl, impl.noop], 18, "IsSaveCompleted"], [[carbon, carbon.method, impl, impl.noop], 18, "IsSaveSucceeded"], [[carbon, carbon.method, impl, impl.noop], 18, "WaitForSave"], [[carbon, carbon.method, impl, impl.notSupported], 18, "CreateEmptyTexture"], [[carbon, carbon.method, impl, impl.notSupported], 18, "SetFromRenderTarget"], [[carbon, carbon.method, impl, impl.notSupported], 18, "CreateAndCopyFromRenderTarget"], [[carbon, carbon.method, impl, impl.notSupported], 18, "CreateFromHostBitmap"], [[carbon, carbon.method, impl, impl.notSupported], 18, "CreateFromTexture"], [[carbon, carbon.method, impl, impl.adapted], 18, "HasALObject"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPipeline"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetOriginalMemoryUsage"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetAverageColor"], [[carbon, carbon.method, impl, impl.notSupported], 18, "UpdateSubresource"], [[carbon, carbon.method, impl, impl.adapted], 18, "PrepareResources"]], 0, void 0, _CjsResource));
    }
    format = (_initProto(this), _init_format(this, null));
    type = (_init_extra_format(this), _init_type(this, null));
    averageColor = (_init_extra_type(this), _init_averageColor(this, [0, 0, 0, 0]));
    depth = (_init_extra_averageColor(this), _init_depth(this, 0));
    cutoutHeight = (_init_extra_depth(this), _init_cutoutHeight(this, 1));
    height = (_init_extra_cutoutHeight(this), _init_height(this, 0));
    lodEnabled = (_init_extra_height(this), _init_lodEnabled(this, false));
    cpuMip = (_init_extra_lodEnabled(this), _init_cpuMip(this, 0));
    gpuMip = (_init_extra_cpuMip(this), _init_gpuMip(this, 0));
    wrappedRenderTarget = (_init_extra_gpuMip(this), _init_wrappedRenderTarget(this, null));
    originalResolution = (_init_extra_wrappedRenderTarget(this), _init_originalResolution(this, 0));
    name = (_init_extra_originalResolution(this), _init_name(this, ""));
    arraySize = (_init_extra_name(this), _init_arraySize(this, 0));
    cutoutWidth = (_init_extra_arraySize(this), _init_cutoutWidth(this, 1));
    width = (_init_extra_cutoutWidth(this), _init_width(this, 0));
    cutoutX = (_init_extra_width(this), _init_cutoutX(this, 0));
    cutoutY = (_init_extra_cutoutX(this), _init_cutoutY(this, 0));
    constructor(values = null) {
      super(), _init_extra_cutoutY(this);
      this.SetValues(values || {}, {
        markDirty: false,
        skipUpdate: true,
        skipEvents: true
      });
    }

    /**
     * Attach a texture DTO and mirror Carbon-exposed metadata.
     *
     * @param {object|null} dto
     * @param {object|null} options
     * @returns {TriTextureRes}
     */
    SetDTO(dto = null, options = null) {
      super.SetDTO(dto);
      const values = {
        ...(options || {})
      };
      if (dto && typeof dto === "object") {
        if (dto.pixelFormat !== undefined || dto.format !== undefined) values.format = dto.pixelFormat || dto.format;
        if (dto.width !== undefined) values.width = dto.width;
        if (dto.height !== undefined) values.height = dto.height;
        if (dto.depth !== undefined) values.depth = dto.depth;
        if (Array.isArray(dto.faces)) values.arraySize = dto.faces.length;
        if (dto.mipCount !== undefined) values.cpuMip = dto.mipCount;
        values.originalResolution = Math.max(dto.width || 0, dto.height || 0, this.originalResolution || 0);
      }
      this.SetValues(values);
      Object.assign(this, values);
      return this;
    }

    /**
     * Return the number of mip levels known to this texture resource.
     *
     * @returns {number}
     */
    GetMipCount() {
      return this.GetDTO()?.mipCount || this.cpuMip || 0;
    }

    /**
     * Return the multisample type for this texture.
     *
     * @returns {number}
     */
    GetMsaaType() {
      throw CarbonStubError("TriTextureRes", "GetMsaaType");
    }

    /**
     * Return the multisample quality for this texture.
     *
     * @returns {number}
     */
    GetMsaaQuality() {
      throw CarbonStubError("TriTextureRes", "GetMsaaQuality");
    }

    /**
     * Return true if this texture has received LOD requests.
     *
     * @returns {boolean}
     */
    HadLodRequests() {
      throw CarbonStubError("TriTextureRes", "HadLodRequests");
    }

    /**
     * Return the shader-resource-view heap index when a backend owns one.
     *
     * @returns {number}
     */
    GetSrvIndexInHeap() {
      throw ResourceBoundaryError("TriTextureRes", "GetSrvIndexInHeap", "Runtime-resource does not own descriptor heaps.");
    }

    /**
     * Save this texture asynchronously.
     *
     * @param {string} path
     * @returns {boolean}
     */
    SaveAsync(path = "") {
      throw CarbonStubError("TriTextureRes", "SaveAsync", path);
    }

    /**
     * Save this texture synchronously.
     *
     * @param {string} path
     * @returns {boolean}
     */
    Save(path = "") {
      throw CarbonStubError("TriTextureRes", "Save", path);
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
      throw ResourceBoundaryError("TriTextureRes", "CreateEmptyTexture", "Use engine-gpu to allocate device textures.");
    }

    /**
     * Render-target wrapping belongs to engine-gpu.
     *
     * @throws {Error}
     */
    SetFromRenderTarget() {
      throw ResourceBoundaryError("TriTextureRes", "SetFromRenderTarget", "Runtime-resource does not own render targets.");
    }

    /**
     * Create a texture copy from a render target.
     *
     * @throws {Error}
     */
    CreateAndCopyFromRenderTarget() {
      throw ResourceBoundaryError("TriTextureRes", "CreateAndCopyFromRenderTarget", "Runtime-resource does not own render targets.");
    }

    /**
     * Create a device texture from a host bitmap.
     *
     * @throws {Error}
     */
    CreateFromHostBitmap() {
      throw ResourceBoundaryError("TriTextureRes", "CreateFromHostBitmap", "Use engine-gpu to allocate and upload texture data.");
    }

    /**
     * Create this texture from another texture resource.
     *
     * @throws {Error}
     */
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
      throw ResourceBoundaryError("TriTextureRes", "UpdateSubresource", "Use engine-gpu to upload texture bytes.");
    }

    /**
     * Resource preparation does not decide device upload policy.
     *
     * @returns {boolean}
     */
    PrepareResources() {
      return this.IsPrepared();
    }
  }];
  payload = "texture";
  constructor() {
    super(_TriTextureRes), _initClass();
  }
}();

export { _TriTextureRes as TriTextureRes };
//# sourceMappingURL=TriTextureRes.js.map
