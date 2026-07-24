import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_name, _init_extra_name, _init_obbMin, _init_extra_obbMin, _init_obbMax, _init_extra_obbMax;

/** TriJointBinding (resources) - maintained from schema shapeHash 8459bced.... */
let _TriJointBinding;
class TriJointBinding extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_obbMin, _init_extra_obbMin, _init_obbMax, _init_extra_obbMax],
      c: [_TriJointBinding, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriJointBinding",
      family: "resources"
    })], [[[type, type.string], 16, "name"], [[type, type.vec3], 16, "obbMin"], [[type, type.vec3], 16, "obbMax"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_obbMax(this);
  }
  /** m_name (std::string) */
  name = _init_name(this, "");

  /** m_obbMin (Vector3) */
  obbMin = (_init_extra_name(this), _init_obbMin(this, vec3.create()));

  /** m_obbMax (Vector3) */
  obbMax = (_init_extra_obbMin(this), _init_obbMax(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _TriJointBinding as TriJointBinding };
//# sourceMappingURL=TriJointBinding.js.map
