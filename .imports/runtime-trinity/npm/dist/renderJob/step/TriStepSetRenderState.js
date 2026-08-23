import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { RenderState } from '@carbonenginejs/runtime-utils/render-context';

let _initProto, _initClass, _init_state, _init_extra_state, _init_value, _init_extra_value;

/**
 * Step that sets a single render state to a single value for the steps that
 * follow.
 */
let _TriStepSetRenderStat;
new class extends _identity {
  static [class TriStepSetRenderState extends _TriRenderStep {
    static {
      ({
        e: [_init_state, _init_extra_state, _init_value, _init_extra_value, _initProto],
        c: [_TriStepSetRenderStat, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepSetRenderState",
        family: "renderJob"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("RenderState")], 16, "state"], [[io, io.persist, type, type.uint32], 16, "value"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_value(this);
    }
    state = (_initProto(this), _init_state(this, 0));
    value = (_init_extra_state(this), _init_value(this, 0));

    /**
     * Accepts either no arguments or both a state and a value; supplying only one
     * of the pair throws.
     */
    __init__(state, value) {
      const hasState = arguments.length > 0 && state !== undefined;
      const hasValue = arguments.length > 1 && value !== undefined;
      if (hasState !== hasValue) {
        throw new Error("You must set both the state and the value.");
      }
      if (hasState) {
        this.SetStateAndValue(state, value);
      }
    }

    /**
     * Sets the state selector and its value together, both coerced to unsigned
     * 32-bit.
     */
    SetStateAndValue(state, value) {
      this.state = Number(state) >>> 0;
      this.value = Number(value) >>> 0;
    }

    /**
     * Forwards the state/value pair to the executor, which owns the mapping onto
     * real pipeline state.
     */
    Execute(_realTime, _simTime, executor) {
      executor?.SetRenderState?.(this.state, this.value);
      return _TriRenderJob.StepResult.RS_OK;
    }
  }];
  RenderState = RenderState;
  constructor() {
    super(_TriStepSetRenderStat), _initClass();
  }
}();

export { _TriStepSetRenderStat as TriStepSetRenderState };
//# sourceMappingURL=TriStepSetRenderState.js.map
