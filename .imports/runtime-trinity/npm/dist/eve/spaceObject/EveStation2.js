import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { EveSpaceObject2 as _EveSpaceObject } from './EveSpaceObject2.js';

let _initClass;

/**
 * Concrete station space-object root. Carbon adds no Blue fields; its only
 * overrides are renderer-owned: GetBatches forwards to the base accumulator
 * and PrepareShaderData scales the ship shader data's y component by
 * activationStrength. Both stay with the per-object-data/render adapters.
 */
let _EveStation;
class EveStation2 extends _EveSpaceObject {
  static {
    [_EveStation, _initClass] = _applyDecs2311(this, [type.define({
      className: "EveStation2",
      family: "eve/spaceObject"
    })], [], 0, void 0, _EveSpaceObject).c;
  }
  static {
    _initClass();
  }
}

export { _EveStation as EveStation2 };
//# sourceMappingURL=EveStation2.js.map
