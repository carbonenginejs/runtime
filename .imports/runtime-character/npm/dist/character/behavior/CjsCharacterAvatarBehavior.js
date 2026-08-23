import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_name, _init_extra_name, _init_resPathList, _init_extra_resPathList, _init_resGender, _init_extra_resGender;

/** Named avatar-behavior resource record with its authored gender selector. */
let _CjsCharacterAvatarBe;
class CjsCharacterAvatarBehavior extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_resPathList, _init_extra_resPathList, _init_resGender, _init_extra_resGender],
      c: [_CjsCharacterAvatarBe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterAvatarBehavior",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "name"], [[io, io.readwrite, void 0, type.list("string")], 16, "resPathList"], [[io, io.readwrite, type, type.uint8], 16, "resGender"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_resGender(this);
  }
  name = _init_name(this, "");
  resPathList = (_init_extra_name(this), _init_resPathList(this, []));
  resGender = (_init_extra_resPathList(this), _init_resGender(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterAvatarBe as CjsCharacterAvatarBehavior };
//# sourceMappingURL=CjsCharacterAvatarBehavior.js.map
