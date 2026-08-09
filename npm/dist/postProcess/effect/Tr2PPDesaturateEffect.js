import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_intensity, _init_extra_intensity;

/** Tr2PPDesaturateEffect (postProcess) - generated from schema shapeHash 9546fd03.... */
let _Tr2PPDesaturateEffec;
class Tr2PPDesaturateEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_intensity, _init_extra_intensity],
      c: [_Tr2PPDesaturateEffec, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPDesaturateEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "intensity"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_intensity(this);
  }
  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = _init_intensity(this, 1);
  static {
    _initClass();
  }
}

export { _Tr2PPDesaturateEffec as Tr2PPDesaturateEffect };
//# sourceMappingURL=Tr2PPDesaturateEffect.js.map
