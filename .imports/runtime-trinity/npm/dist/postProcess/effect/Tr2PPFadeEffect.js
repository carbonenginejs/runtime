import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_color, _init_extra_color, _init_intensity, _init_extra_intensity;

/** Tr2PPFadeEffect (postProcess) - generated from schema shapeHash 4a4789e6.... */
let _Tr2PPFadeEffect;
class Tr2PPFadeEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_color, _init_extra_color, _init_intensity, _init_extra_intensity],
      c: [_Tr2PPFadeEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPFadeEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.float32], 16, "intensity"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_intensity(this);
  }
  /** m_color (Color) [READWRITE, PERSIST] */
  color = _init_color(this, vec4.create());

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_color(this), _init_intensity(this, 0));

  /** Carbon Tr2PPFadeEffect::IsActive override. */
  IsActive() {
    return this.display && this.intensity > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPFadeEffect as Tr2PPFadeEffect };
//# sourceMappingURL=Tr2PPFadeEffect.js.map
