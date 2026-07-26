import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_constantBufferDirty, _init_extra_constantBufferDirty, _init_sharedBufferKey, _init_extra_sharedBufferKey, _init_shaderParameters, _init_extra_shaderParameters, _init_shaderParametersWithNotification, _init_extra_shaderParametersWithNotification, _init_textures, _init_extra_textures, _init_uavs, _init_extra_uavs, _init_constantBuffer, _init_extra_constantBuffer, _init_constantMirror, _init_extra_constantMirror;

/** Tr2MaterialStageInput (shader) - generated from schema shapeHash 8bae330e.... */
let _Tr2MaterialStageInpu;
class Tr2MaterialStageInput extends CjsModel {
  static {
    ({
      e: [_init_constantBufferDirty, _init_extra_constantBufferDirty, _init_sharedBufferKey, _init_extra_sharedBufferKey, _init_shaderParameters, _init_extra_shaderParameters, _init_shaderParametersWithNotification, _init_extra_shaderParametersWithNotification, _init_textures, _init_extra_textures, _init_uavs, _init_extra_uavs, _init_constantBuffer, _init_extra_constantBuffer, _init_constantMirror, _init_extra_constantMirror],
      c: [_Tr2MaterialStageInpu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2MaterialStageInput",
      family: "shader"
    })], [[[type, type.boolean], 16, "constantBufferDirty"], [type.rawStruct("Tr2SharedConstantBuffers::Key"), 0, "sharedBufferKey"], [type.list("Tr2EffectParam"), 0, "shaderParameters"], [type.list("Tr2EffectParam"), 0, "shaderParametersWithNotification"], [type.list("Tr2EffectParam"), 0, "textures"], [type.list("Tr2EffectParam"), 0, "uavs"], [type.rawStruct("Tr2ConstantBufferAL"), 0, "constantBuffer"], [type.rawStruct("CcpMallocBuffer"), 0, "constantMirror"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_constantMirror(this);
  }
  /** m_constantBufferDirty (bool) */
  constantBufferDirty = _init_constantBufferDirty(this, false);

  /** m_sharedBufferKey (Tr2SharedConstantBuffers::Key) */
  sharedBufferKey = (_init_extra_constantBufferDirty(this), _init_sharedBufferKey(this, null));

  /** m_shaderParameters (Tr2EffectParamVector) */
  shaderParameters = (_init_extra_sharedBufferKey(this), _init_shaderParameters(this, []));

  /** m_shaderParametersWithNotification (Tr2EffectParamVector) */
  shaderParametersWithNotification = (_init_extra_shaderParameters(this), _init_shaderParametersWithNotification(this, []));

  /** m_textures (Tr2EffectParamVector) */
  textures = (_init_extra_shaderParametersWithNotification(this), _init_textures(this, []));

  /** m_uavs (Tr2EffectParamVector) */
  uavs = (_init_extra_textures(this), _init_uavs(this, []));

  /** m_constantBuffer (Tr2ConstantBufferAL) */
  constantBuffer = (_init_extra_uavs(this), _init_constantBuffer(this, null));

  /** m_constantMirror (CcpMallocBuffer) */
  constantMirror = (_init_extra_constantBuffer(this), _init_constantMirror(this, null));

  /**
   * Allocates the CPU-side constant mirror rounded up to a 16-byte multiple and marks it dirty; a zero size clears the mirror instead. No GPU buffer is created.
   * @param size requested mirror size in bytes
   */
  AllocateConstants(size = 0) {
    const byteSize = Math.max(0, Number(size) || 0);
    const alignedSize = byteSize % 16 ? byteSize + 16 - byteSize % 16 : byteSize;
    this.constantMirror = alignedSize ? new Uint8Array(alignedSize) : null;
    this.constantBufferDirty = alignedSize > 0;
  }

  /**
   * Replaces the constant mirror with a copy of already-built buffer contents and clears the dirty flag; a zero size clears the mirror instead.
   * @param size byte count to copy, defaulting to the contents' own byte length
   */
  GetSharedConstantBuffer(contents, size = contents?.byteLength ?? contents?.length ?? 0) {
    const byteSize = Math.max(0, Number(size) || 0);
    this.constantMirror = byteSize ? _Tr2MaterialStageInpu.copyBytes(contents, byteSize) : null;
    this.constantBufferDirty = false;
  }

  /**
   * Copies up to `size` bytes out of an ArrayBuffer, typed-array view or
   * array-like into a new zero-padded Uint8Array the caller owns.
   */
  static copyBytes(contents, size) {
    const out = new Uint8Array(size);
    if (contents instanceof ArrayBuffer) {
      out.set(new Uint8Array(contents, 0, Math.min(size, contents.byteLength)));
    } else if (ArrayBuffer.isView(contents)) {
      out.set(new Uint8Array(contents.buffer, contents.byteOffset, Math.min(size, contents.byteLength)));
    } else if (contents && typeof contents.length === "number") {
      out.set(Array.from(contents).slice(0, size));
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _Tr2MaterialStageInpu as Tr2MaterialStageInput };
//# sourceMappingURL=Tr2MaterialStageInput.js.map
