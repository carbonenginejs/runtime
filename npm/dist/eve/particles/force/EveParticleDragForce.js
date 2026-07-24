import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2ParticleDragForce as _Tr2ParticleDragForce } from '../../../particle/Tr2ParticleDragForce.js';

let _initClass;

/**
 * Blue alias of Tr2ParticleDragForce - Carbon registers the Eve name with
 * zero attributes of its own and chains the whole exposure to the Tr2 class.
 */
let _EveParticleDragForce;
class EveParticleDragForce extends _Tr2ParticleDragForce {
  static {
    [_EveParticleDragForce, _initClass] = _applyDecs2311(this, [type.define({
      className: "EveParticleDragForce",
      family: "eve"
    })], [], 0, void 0, _Tr2ParticleDragForce).c;
  }
  static {
    _initClass();
  }
}

export { _EveParticleDragForce as EveParticleDragForce };
//# sourceMappingURL=EveParticleDragForce.js.map
