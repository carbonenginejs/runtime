import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderJob as _TriRenderJob } from './TriRenderJob.js';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_renderingMode, _init_extra_renderingMode;

/**
 * Step that selects one of Carbon's standard rendering-mode state blocks -
 * opaque, decal, alpha, additive, depth-only, picking and so on - instead of
 * setting states individually.
 */
let _TriStepSetStdRndStat;
new class extends _identity {
  static [class TriStepSetStdRndStates extends _TriRenderStep {
    static {
      ({
        e: [_init_renderingMode, _init_extra_renderingMode, _initProto],
        c: [_TriStepSetStdRndStat, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepSetStdRndStates",
        family: "renderJob"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("RenderingMode")], 16, "renderingMode"], [[carbon, carbon.method, impl, impl.adapted], 18, "__init__"], [[carbon, carbon.method, impl, impl.implemented], 18, "Execute"]], 0, void 0, _TriRenderStep));
    }
    constructor(...args) {
      super(...args);
      _init_extra_renderingMode(this);
    }
    renderingMode = (_initProto(this), _init_renderingMode(this, _TriStepSetStdRndStat.RM_OPAQUE));

    /**
     * Sets the rendering mode when one is supplied, otherwise leaves the default
     * opaque mode in place.
     */
    __init__(state) {
      if (arguments.length && state !== undefined) this.SetState(state);
    }

    /** Sets the rendering mode, silently ignoring values at or above RM_COUNT. */
    SetState(state) {
      const value = Number(state) >>> 0;
      if (value < _TriStepSetStdRndStat.RM_COUNT) {
        this.renderingMode = value;
      }
    }

    /**
     * Asks the executor to apply the standard state block for the selected
     * rendering mode; which states that block contains is the executor's concern.
     */
    Execute(_realTime, _simTime, executor) {
      executor?.ApplyStandardStates?.(this.renderingMode);
      return _TriRenderJob.StepResult.RS_OK;
    }
  }];
  RenderingMode = Object.freeze({
    RM_ANY: 0,
    RM_OPAQUE: 1,
    RM_DECAL: 2,
    RM_DECAL_NO_DEPTH: 3,
    RM_ALPHA: 4,
    RM_ALPHA_ADDITIVE: 5,
    RM_DEPTH_ONLY: 6,
    RM_PICKING: 7,
    RM_FULLSCREEN: 8,
    RM_SPRITE2D: 9,
    RM_CULL: 10,
    RM_LIGHT: 11,
    RM_ERASE: 12,
    RM_PREPASS_COLOR: 13,
    RM_COUNT: 14
  });
  RM_ANY = 0;
  RM_OPAQUE = 1;
  RM_DECAL = 2;
  RM_DECAL_NO_DEPTH = 3;
  RM_ALPHA = 4;
  RM_ALPHA_ADDITIVE = 5;
  RM_DEPTH_ONLY = 6;
  RM_PICKING = 7;
  RM_FULLSCREEN = 8;
  RM_SPRITE2D = 9;
  RM_CULL = 10;
  RM_LIGHT = 11;
  RM_ERASE = 12;
  RM_PREPASS_COLOR = 13;
  RM_COUNT = 14;
  constructor() {
    super(_TriStepSetStdRndStat), _initClass();
  }
}();

export { _TriStepSetStdRndStat as TriStepSetStdRndStates };
//# sourceMappingURL=TriStepSetStdRndStates.js.map
