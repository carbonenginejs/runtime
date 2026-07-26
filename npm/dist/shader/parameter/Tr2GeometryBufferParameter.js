import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import '@carbonenginejs/runtime-utils/model';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_resourcePath, _init_extra_resourcePath, _init_gpuBuffer, _init_extra_gpuBuffer, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_meshIndex, _init_extra_meshIndex, _init_name, _init_extra_name;

/** Tr2GeometryBufferParameter (shader) - generated from schema shapeHash bc9ed4c6.... */
let _Tr2GeometryBufferPar;
class Tr2GeometryBufferParameter extends CjsParameter {
  static {
    ({
      e: [_init_resourcePath, _init_extra_resourcePath, _init_gpuBuffer, _init_extra_gpuBuffer, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_meshIndex, _init_extra_meshIndex, _init_name, _init_extra_name, _initProto],
      c: [_Tr2GeometryBufferPar, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GeometryBufferParameter",
      family: "shader"
    })], [[[void 0, io.flag("resource"), io, io.notify, io, io.persist, type, type.string], 16, "resourcePath"], [[io, io.notify, io, io.persist, void 0, type.objectRef("ITr2GpuBuffer")], 16, "gpuBuffer"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[io, io.notify, io, io.persist, type, type.int32], 16, "meshIndex"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyToResourceSet"], [[carbon, carbon.method, impl, impl.adapted], 18, "ApplyUav"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGpuBuffer"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGpuBuffer"]], 0, void 0, CjsParameter));
  }
  /** m_resourcePath (std::wstring) [READWRITE, NOTIFY, PERSIST] */
  resourcePath = (_initProto(this), _init_resourcePath(this, ""));

  /** m_gpuBuffer (ITr2GpuBufferPtr) [READWRITE, PERSIST, NOTIFY] */
  gpuBuffer = (_init_extra_resourcePath(this), _init_gpuBuffer(this, null));

  /** m_isUsedByEffect (bool) [READ] */
  usedByCurrentEffect = (_init_extra_gpuBuffer(this), _init_usedByCurrentEffect(this, false));

  /** m_meshIndex (int32_t) [READWRITE, NOTIFY, PERSIST] */
  meshIndex = (_init_extra_usedByCurrentEffect(this), _init_meshIndex(this, 0));

  /** m_name (BlueSharedString) [READWRITE, NOTIFY, PERSIST] */
  name = (_init_extra_meshIndex(this), _init_name(this, ""));
  cachedEffect = (_init_extra_name(this), null);

  /** The shader resource name this buffer binds to. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: resource path (when set) then name. */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    if (this.resourcePath) {
      startingHash = CjsParameter.hashFnv1String(this.resourcePath, startingHash);
    }
    return CjsParameter.hashFnv1String(this.name, startingHash);
  }

  /**
   * Nothing to do in this GPU-free package - a resource path is never resolved
   * to a buffer here; returns true.
   */
  Initialize() {
    return true;
  }

  /**
   * Consumes the `resource` dirty flag by re-initializing and re-resolving
   * handles against the cached shader.
   */
  OnModified(_options = {}) {
    if (this.__state.flags.delete("resource")) {
      this.Initialize();
      this.RebuildEffectHandles(this.cachedEffect);
    }
    return true;
  }

  /**
   * Caches the shader and records whether it reflects a resource of this name;
   * no GPU buffer is bound.
   */
  RebuildEffectHandles(effectRes) {
    this.cachedEffect = effectRes;
    this.usedByCurrentEffect = !!this.name && !!CjsParameter.getEffectResource(effectRes, this.name);
  }

  /**
   * Always false - populating a resource set is device work this package does
   * not do.
   */
  CopyToResourceSet() {
    return false;
  }

  /** Always false - UAV binding is left to the engine adapter. */
  ApplyUav() {
    return false;
  }

  /**
   * Whether a buffer object has actually been attached; an authored resourcePath
   * alone does not make the parameter valid.
   */
  IsValid() {
    return !!this.gpuBuffer;
  }

  /**
   * Attaches a buffer object directly and clears the authored resource path, so
   * the path can no longer override it.
   */
  SetGpuBuffer(buffer) {
    this.resourcePath = "";
    this.gpuBuffer = buffer;
  }

  /**
   * The attached buffer object, or null; held by reference and never created
   * here.
   */
  GetGpuBuffer() {
    return this.gpuBuffer;
  }
  static {
    _initClass();
  }
}

export { _Tr2GeometryBufferPar as Tr2GeometryBufferParameter };
//# sourceMappingURL=Tr2GeometryBufferParameter.js.map
