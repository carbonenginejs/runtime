import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_weight, _init_extra_weight;

/** Tr2SerializedMorphAnimation (trinityCore) - generated from schema shapeHash 58cefc7b.... */
let _Tr2SerializedMorphAn;
class Tr2SerializedMorphAnimation extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_weight, _init_extra_weight],
      c: [_Tr2SerializedMorphAn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2SerializedMorphAnimation",
      family: "trinityCore"
    })], [[[io, io.persistOnly, type, type.string], 16, "name"], [[io, io.persistOnly, type, type.float32], 16, "weight"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_weight(this);
  }
  /** m_name (std::string) [PERSISTONLY] */
  name = _init_name(this, "");

  /** m_weight (float) [PERSISTONLY] */
  weight = (_init_extra_name(this), _init_weight(this, 0));
  static {
    _initClass();
  }
}

export { _Tr2SerializedMorphAn as Tr2SerializedMorphAnimation };
//# sourceMappingURL=Tr2SerializedMorphAnimation.js.map
