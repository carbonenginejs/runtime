import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ParticleSpring as _Tr2ParticleSpring } from '../../../particle/force/Tr2ParticleSpring.js';

let _initClass;

/**
 * Blue alias of Tr2ParticleSpring - Carbon registers the Eve name (from the
 * ...SpringAttractor source files) with zero attributes of its own and chains
 * the whole exposure to the Tr2 class.
 */
let _EveParticleSpring;
class EveParticleSpring extends _Tr2ParticleSpring {
  static {
    [_EveParticleSpring, _initClass] = _applyDecs2311(this, [type.define({
      className: "EveParticleSpring",
      family: "eve"
    })], [], 0, void 0, _Tr2ParticleSpring).c;
  }
  static {
    _initClass();
  }
}

export { _EveParticleSpring as EveParticleSpring };
//# sourceMappingURL=EveParticleSpring.js.map
