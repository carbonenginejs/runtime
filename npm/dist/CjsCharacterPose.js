import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_name, _init_extra_name, _init_bones, _init_extra_bones;
let _CjsCharacterPose;
class CjsCharacterPose extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_name, _init_extra_name, _init_bones, _init_extra_bones],
      c: [_CjsCharacterPose, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPose",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "name"], [[void 0, type.list("CjsCharacterBonePose"), io, io.persist], 16, "bones"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_bones(this);
  }
  id = _init_id(this, "");
  name = (_init_extra_id(this), _init_name(this, ""));
  bones = (_init_extra_name(this), _init_bones(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterPose as CjsCharacterPose };
//# sourceMappingURL=CjsCharacterPose.js.map
