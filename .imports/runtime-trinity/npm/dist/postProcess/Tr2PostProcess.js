import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_stages, _init_extra_stages;

/**
 * Post-process described as a flat ordered list of Tr2Effect stages, in contrast
 * to Tr2PostProcess2's named effect slots.
 */
let _Tr2PostProcess;
class Tr2PostProcess extends CjsModel {
  static {
    ({
      e: [_init_stages, _init_extra_stages, _initProto],
      c: [_Tr2PostProcess, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PostProcess",
      family: "postProcess"
    })], [[[io, io.persist, void 0, type.list("Tr2Effect")], 16, "stages"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_stages(this);
  }
  stages = (_initProto(this), _init_stages(this, []));

  /**
   * Accepts the authored stage graph; Carbon performs no additional setup.
   */
  Initialize() {
    return true;
  }
  static {
    _initClass();
  }
}

export { _Tr2PostProcess as Tr2PostProcess };
//# sourceMappingURL=Tr2PostProcess.js.map
