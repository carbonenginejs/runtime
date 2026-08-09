import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';

let _initProto, _initClass, _init_shaderBuffer, _init_extra_shaderBuffer, _init_brTexCoord, _init_extra_brTexCoord, _init_effect, _init_extra_effect, _init_tlTexCoord, _init_extra_tlTexCoord;

/** A render step that draws a full-screen effect with an optional shader buffer. */
let _TriStepRenderEffect;
class TriStepRenderEffect extends _TriRenderStep {
  static {
    ({
      e: [_init_shaderBuffer, _init_extra_shaderBuffer, _init_brTexCoord, _init_extra_brTexCoord, _init_effect, _init_extra_effect, _init_tlTexCoord, _init_extra_tlTexCoord, _initProto],
      c: [_TriStepRenderEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderEffect",
      family: "renderJob"
    })], [[[io, io.readwrite, void 0, type.objectRef("Tr2ShaderBuffer")], 16, "shaderBuffer"], [[io, io.readwrite, type, type.vec2], 16, "brTexCoord"], [[io, io.readwrite, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.readwrite, type, type.vec2], 16, "tlTexCoord"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_tlTexCoord(this);
  }
  /** m_shaderBuffer (Tr2ShaderBufferPtr) [READWRITE] */
  shaderBuffer = (_initProto(this), _init_shaderBuffer(this, null));

  /** m_brTexCoord (Vector2) [READWRITE] */
  brTexCoord = (_init_extra_shaderBuffer(this), _init_brTexCoord(this, vec2.fromValues(1, 1)));

  /** m_effect (Tr2EffectPtr) [READWRITE] */
  effect = (_init_extra_brTexCoord(this), _init_effect(this, null));

  /** m_tlTexCoord (Vector2) [READWRITE] */
  tlTexCoord = (_init_extra_effect(this), _init_tlTexCoord(this, vec2.create()));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(effect = null, shaderBuffer = null) {
    this.effect = effect;
    this.shaderBuffer = shaderBuffer;
  }

  /**
   * Draws the bound effect, passing its shader buffer and texture coordinates to the executor.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.effect) {
      executor?.DrawEffect?.(this.effect, this.shaderBuffer, this.tlTexCoord, this.brTexCoord);
    }
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderEffect as TriStepRenderEffect };
//# sourceMappingURL=TriStepRenderEffect.js.map
