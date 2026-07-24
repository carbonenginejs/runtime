import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_parameterName, _init_extra_parameterName, _init_animationName, _init_extra_animationName, _init_resourcePath, _init_extra_resourcePath, _init_minimum, _init_extra_minimum, _init_maximum, _init_extra_maximum, _init_defaultValue, _init_extra_defaultValue;
let _CjsCharacterViseme;
class CjsCharacterViseme extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_parameterName, _init_extra_parameterName, _init_animationName, _init_extra_animationName, _init_resourcePath, _init_extra_resourcePath, _init_minimum, _init_extra_minimum, _init_maximum, _init_extra_maximum, _init_defaultValue, _init_extra_defaultValue],
      c: [_CjsCharacterViseme, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterViseme",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "parameterName"], [[type, type.string, io, io.persist], 16, "animationName"], [[type, type.path, io, io.persist], 16, "resourcePath"], [[type, type.float32, io, io.persist], 16, "minimum"], [[type, type.float32, io, io.persist], 16, "maximum"], [[type, type.float32, io, io.persist], 16, "defaultValue"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_defaultValue(this);
  }
  id = _init_id(this, "");
  parameterName = (_init_extra_id(this), _init_parameterName(this, ""));
  animationName = (_init_extra_parameterName(this), _init_animationName(this, null));
  resourcePath = (_init_extra_animationName(this), _init_resourcePath(this, null));
  minimum = (_init_extra_resourcePath(this), _init_minimum(this, 0));
  maximum = (_init_extra_minimum(this), _init_maximum(this, 1));
  defaultValue = (_init_extra_maximum(this), _init_defaultValue(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterViseme as CjsCharacterViseme };
//# sourceMappingURL=CjsCharacterViseme.js.map
