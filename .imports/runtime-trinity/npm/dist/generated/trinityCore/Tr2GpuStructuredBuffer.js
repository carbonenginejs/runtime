import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_creationFlags, _init_extra_creationFlags, _init_count, _init_extra_count, _init_stride, _init_extra_stride;

/** Tr2GpuStructuredBuffer (trinityCore) - generated from schema shapeHash f559bb97.... */
let _Tr2GpuStructuredBuff;
class Tr2GpuStructuredBuffer extends CjsModel {
  static {
    ({
      e: [_init_creationFlags, _init_extra_creationFlags, _init_count, _init_extra_count, _init_stride, _init_extra_stride, _initProto],
      c: [_Tr2GpuStructuredBuff, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2GpuStructuredBuffer",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.uint32], 16, "creationFlags"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "count"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "stride"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "DebugGetData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_stride(this);
  }
  /** m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY] */
  creationFlags = (_initProto(this), _init_creationFlags(this, 0));

  /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  count = (_init_extra_creationFlags(this), _init_count(this, 0));

  /** m_stride (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  stride = (_init_extra_count(this), _init_stride(this, 0));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(...args) {
    throw new Error("Tr2GpuStructuredBuffer.__init__ is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DebugGetData -> PyGetData (MAP_METHOD). */
  DebugGetData(...args) {
    throw new Error("Tr2GpuStructuredBuffer.DebugGetData is not implemented in CarbonEngineJS.");
  }
  static {
    _initClass();
  }
}

export { _Tr2GpuStructuredBuff as Tr2GpuStructuredBuffer };
//# sourceMappingURL=Tr2GpuStructuredBuffer.js.map
