import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_strength, _init_extra_strength;

/** Tr2PPSignalLossEffect (postProcess) - generated from schema shapeHash 87c0f0bf.... */
let _Tr2PPSignalLossEffec;
class Tr2PPSignalLossEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_strength, _init_extra_strength],
      c: [_Tr2PPSignalLossEffec, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPSignalLossEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "strength"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_strength(this);
  }
  /** m_strength (float) [READWRITE, PERSIST] */
  strength = _init_strength(this, 0);

  /** Carbon Tr2PPSignalLossEffect::IsActive override. */
  IsActive() {
    return this.display && this.strength > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPSignalLossEffec as Tr2PPSignalLossEffect };
//# sourceMappingURL=Tr2PPSignalLossEffect.js.map
