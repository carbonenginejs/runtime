import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { PixelFormat } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_creationFlags, _init_extra_creationFlags, _init_format, _init_extra_format, _init_count, _init_extra_count, _init_isValid, _init_extra_isValid;

/** Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45.... */
let _Tr2GpuBuffer;
new class extends _identity {
  static [class Tr2GpuBuffer extends CjsModel {
    static {
      ({
        e: [_init_creationFlags, _init_extra_creationFlags, _init_format, _init_extra_format, _init_count, _init_extra_count, _init_isValid, _init_extra_isValid, _initProto],
        c: [_Tr2GpuBuffer, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2GpuBuffer",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.persist, type, type.uint32], 16, "creationFlags"], [[io, io.notify, io, io.persist, type, type.int32, void 0, type.enum("PixelFormat")], 16, "format"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "count"], [[io, io.read, type, type.boolean], 16, "isValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "DebugGetData"]], 0, void 0, CjsModel));
    }
    /** m_creationFlags (CreationFlags) [READWRITE, PERSIST, NOTIFY] */
    creationFlags = (_initProto(this), _init_creationFlags(this, 0));

    /** m_format (Tr2RenderContextEnum::PixelFormat - enum PixelFormat) [READWRITE, ENUM, PERSIST, NOTIFY] */
    format = (_init_extra_creationFlags(this), _init_format(this, 0));

    /** m_count (uint32_t) [READWRITE, PERSIST, NOTIFY] */
    count = (_init_extra_format(this), _init_count(this, 0));
    isValid = (_init_extra_count(this), _init_isValid(this, false));

    /** m_name - debug label; not Blue-exposed. */
    #name = (_init_extra_isValid(this), "");

    /**
     * Sets the debug label, coercing null to an empty string; Carbon keeps this
     * private with no getter, so the paired GetName is a JS addition.
     */
    SetName(name) {
      this.#name = String(name ?? "");
    }

    /** JS accessor for the debug label; Carbon keeps m_name private with no getter. */
    GetName() {
      return this.#name;
    }

    /** Carbon method __init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    __init__(...args) {
      throw new Error("Tr2GpuBuffer.__init__ is not implemented in CarbonEngineJS.");
    }

    /** Carbon method DebugGetData -> PyGetData (MAP_METHOD). */
    DebugGetData(...args) {
      throw new Error("Tr2GpuBuffer.DebugGetData is not implemented in CarbonEngineJS.");
    }
  }];
  CreationFlags = Object.freeze({
    CPU_WRITABLE: 1,
    GPU_WRITABLE: 2,
    DRAW_INDIRECT: 4
  });
  PixelFormat = PixelFormat;
  constructor() {
    super(_Tr2GpuBuffer), _initClass();
  }
}();

export { _Tr2GpuBuffer as Tr2GpuBuffer };
//# sourceMappingURL=Tr2GpuBuffer.js.map
