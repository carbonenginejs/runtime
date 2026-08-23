import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from '../TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_color, _init_extra_color, _init_depth, _init_extra_depth, _init_stencil, _init_extra_stencil, _init_isColorCleared, _init_extra_isColorCleared, _init_isDepthCleared, _init_extra_isDepthCleared, _init_isStencilCleared, _init_extra_isStencilCleared;

/**
 * Step that clears the bound colour, depth and stencil attachments, each
 * independently enabled with its own clear value.
 */
let _TriStepClear;
new class extends _identity {
  static [class TriStepClear extends _TriRenderStep {
    static {
      ({
        e: [_init_color, _init_extra_color, _init_depth, _init_extra_depth, _init_stencil, _init_extra_stencil, _init_isColorCleared, _init_extra_isColorCleared, _init_isDepthCleared, _init_extra_isDepthCleared, _init_isStencilCleared, _init_extra_isStencilCleared, _initProto],
        c: [_TriStepClear, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepClear",
        family: "renderJob"
      })], [[[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.float32], 16, "depth"], [[io, io.persist, type, type.uint32], 16, "stencil"], [[io, io.persist, type, type.boolean], 16, "isColorCleared"], [[io, io.persist, type, type.boolean], 16, "isDepthCleared"], [[io, io.persist, type, type.boolean], 16, "isStencilCleared"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isStencilCleared(this);
    }
    color = (_initProto(this), _init_color(this, vec4.fromValues(0, 0, 0, 1)));
    depth = (_init_extra_color(this), _init_depth(this, 1));
    stencil = (_init_extra_depth(this), _init_stencil(this, 0));
    isColorCleared = (_init_extra_stencil(this), _init_isColorCleared(this, true));
    isDepthCleared = (_init_extra_isColorCleared(this), _init_isDepthCleared(this, true));
    isStencilCleared = (_init_extra_isDepthCleared(this), _init_isStencilCleared(this, false));

    /**
     * Enables each clear channel according to whether its argument was supplied
     * and non-null, so constructing with a colour alone clears colour only.
     */
    __init__(color, depth, stencil) {
      this.isColorCleared = arguments.length >= 1 && color != null;
      this.isDepthCleared = arguments.length >= 2 && depth != null;
      this.isStencilCleared = arguments.length >= 3 && stencil != null;
      if (this.isColorCleared) vec4.copy(this.color, color);
      if (this.isDepthCleared) this.depth = Number(depth) || 0;
      if (this.isStencilCleared) this.stencil = Number(stencil) >>> 0;
    }

    /**
     * Hands the executor a clear description with the colour clamped to 0..1 and
     * one enable flag per channel; which attachments those apply to is the
     * executor's decision.
     */
    Execute(_realTime, _simTime, executor) {
      executor?.Clear?.({
        color: Array.from(this.color, _TriStepClear.#clampColor),
        depth: this.depth,
        stencil: this.stencil,
        clearColor: this.isColorCleared,
        clearDepth: this.isDepthCleared,
        clearStencil: this.isStencilCleared
      });
      return _TriRenderJob.StepResult.RS_OK;
    }

    /** Clamps one colour component into 0..1, mapping non-numeric values to 0. */
  }];
  #clampColor(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }
  constructor() {
    super(_TriStepClear), _initClass();
  }
}();

export { _TriStepClear as TriStepClear };
//# sourceMappingURL=TriStepClear.js.map
