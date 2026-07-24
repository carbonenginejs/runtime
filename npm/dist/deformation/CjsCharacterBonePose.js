import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_name, _init_extra_name, _init_orientation, _init_extra_orientation, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation;
let _CjsCharacterBonePose;
class CjsCharacterBonePose extends _CjsCharacterNode {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_orientation, _init_extra_orientation, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation],
      c: [_CjsCharacterBonePose, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterBonePose",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "name"], [[type, type.vec3, io, io.persist], 16, "orientation"], [[type, type.vec3, io, io.persist], 16, "rotation"], [[type, type.vec3, io, io.persist], 16, "translation"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_translation(this);
  }
  name = _init_name(this, "");
  orientation = (_init_extra_name(this), _init_orientation(this, vec3.create()));
  rotation = (_init_extra_orientation(this), _init_rotation(this, vec3.create()));
  translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));
  static {
    _initClass();
  }
}

export { _CjsCharacterBonePose as CjsCharacterBonePose };
//# sourceMappingURL=CjsCharacterBonePose.js.map
