import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_groupDimX, _init_extra_groupDimX, _init_groupDimY, _init_extra_groupDimY, _init_groupDimZ, _init_extra_groupDimZ, _init_effect, _init_extra_effect, _init_indirectionBuffer, _init_extra_indirectionBuffer, _init_offsetForArgs, _init_extra_offsetForArgs;

/** A render step that dispatches a compute shader over its configured group dimensions. */
let _TriStepRunComputeSha;
class TriStepRunComputeShader extends _TriRenderStep {
  static {
    ({
      e: [_init_groupDimX, _init_extra_groupDimX, _init_groupDimY, _init_extra_groupDimY, _init_groupDimZ, _init_extra_groupDimZ, _init_effect, _init_extra_effect, _init_indirectionBuffer, _init_extra_indirectionBuffer, _init_offsetForArgs, _init_extra_offsetForArgs, _initProto],
      c: [_TriStepRunComputeSha, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRunComputeShader",
      family: "renderJob"
    })], [[[io, io.readwrite, type, type.uint32], 16, "groupDimX"], [[io, io.readwrite, type, type.uint32], 16, "groupDimY"], [[io, io.readwrite, type, type.uint32], 16, "groupDimZ"], [[io, io.readwrite, void 0, type.objectRef("Tr2Material")], 16, "effect"], [[io, io.readwrite, void 0, type.objectRef("ITr2GpuBuffer")], 16, "indirectionBuffer"], [[io, io.readwrite, type, type.uint32], 16, "offsetForArgs"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_offsetForArgs(this);
  }
  /** m_groupDimX (unsigned) [READWRITE] */
  groupDimX = (_initProto(this), _init_groupDimX(this, 1));

  /** m_groupDimY (unsigned) [READWRITE] */
  groupDimY = (_init_extra_groupDimX(this), _init_groupDimY(this, 1));

  /** m_groupDimZ (unsigned) [READWRITE] */
  groupDimZ = (_init_extra_groupDimY(this), _init_groupDimZ(this, 1));

  /** m_effect (Tr2MaterialPtr) [READWRITE] */
  effect = (_init_extra_groupDimZ(this), _init_effect(this, null));

  /** m_indirectionBuffer (ITr2GpuBufferPtr) [READWRITE] */
  indirectionBuffer = (_init_extra_effect(this), _init_indirectionBuffer(this, null));

  /** m_offsetForArgs (uint32_t) [READWRITE] */
  offsetForArgs = (_init_extra_indirectionBuffer(this), _init_offsetForArgs(this, 0));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(effect = null, groupDimX = 1, groupDimY = 1, groupDimZ = 1) {
    this.effect = effect;
    this.groupDimX = Number(groupDimX) >>> 0;
    this.groupDimY = Number(groupDimY) >>> 0;
    this.groupDimZ = Number(groupDimZ) >>> 0;
  }

  /**
   * Dispatches the compute shader over its configured group dimensions, indirectly when an argument buffer is bound.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.indirectionBuffer) {
      executor?.RunComputeShaderIndirect?.(this.effect, this.indirectionBuffer, this.offsetForArgs);
    } else {
      executor?.RunComputeShader?.(this.effect, this.groupDimX, this.groupDimY, this.groupDimZ);
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRunComputeSha as TriStepRunComputeShader };
//# sourceMappingURL=TriStepRunComputeShader.js.map
