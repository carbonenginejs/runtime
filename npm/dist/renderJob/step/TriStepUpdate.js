import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_object, _init_extra_object;

/** A render step that ticks one updateable object with the frame times. */
let _TriStepUpdate;
class TriStepUpdate extends _TriRenderStep {
  static {
    ({
      e: [_init_object, _init_extra_object, _initProto],
      c: [_TriStepUpdate, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepUpdate",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("ITr2Updateable")], 16, "object"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_object(this);
  }
  /** m_object (ITr2UpdateablePtr) [READWRITE] */
  object = (_initProto(this), _init_object(this, null));

  /** Carbon method __init__ -> SetUpdateable (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(object = null) {
    this.object = object;
  }

  /**
   * Ticks the bound updateable object with the frame times.
   */
  Execute(realTime, simTime, _executor) {
    this.object?.Update?.(realTime, simTime);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepUpdate as TriStepUpdate };
//# sourceMappingURL=TriStepUpdate.js.map
