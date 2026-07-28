import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_name, _init_extra_name, _init_value, _init_extra_value;

/** Effect compile define retained as source metadata. */
let _Tr2EffectDefine;
class Tr2EffectDefine extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_value, _init_extra_value],
      c: [_Tr2EffectDefine, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2EffectDefine",
      family: "shader"
    })], [[[type, type.string], 16, "name"], [[type, type.string], 16, "value"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_value(this);
  }
  /** name (const char*) */
  name = _init_name(this, "");

  /** value (const char*) */
  value = (_init_extra_name(this), _init_value(this, ""));
  static {
    _initClass();
  }
}

export { _Tr2EffectDefine as Tr2EffectDefine };
//# sourceMappingURL=Tr2EffectDefine.js.map
