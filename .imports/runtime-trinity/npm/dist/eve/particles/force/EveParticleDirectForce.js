import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ParticleDirectForce as _Tr2ParticleDirectFor } from '../../../particle/force/Tr2ParticleDirectForce.js';

let _initClass;

/**
 * Blue alias of Tr2ParticleDirectForce - Carbon registers the Eve name with
 * zero attributes of its own and chains the whole exposure to the Tr2 class.
 */
let _EveParticleDirectFor;
class EveParticleDirectForce extends _Tr2ParticleDirectFor {
  static {
    [_EveParticleDirectFor, _initClass] = _applyDecs2311(this, [type.define({
      className: "EveParticleDirectForce",
      family: "eve"
    })], [], 0, void 0, _Tr2ParticleDirectFor).c;
  }
  static {
    _initClass();
  }
}

export { _EveParticleDirectFor as EveParticleDirectForce };
//# sourceMappingURL=EveParticleDirectForce.js.map
