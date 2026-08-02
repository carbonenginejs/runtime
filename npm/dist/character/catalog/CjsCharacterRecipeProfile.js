import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries;

/** One authored character recipe folded into the combined catalog. */
let _CjsCharacterRecipePr;
class CjsCharacterRecipeProfile extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries],
      c: [_CjsCharacterRecipePr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipeProfile",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, type, type.string], 16, "sex"], [[io, io.readwrite, void 0, type.list("CjsCharacterRecipeEntry")], 16, "entries"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_entries(this);
  }
  sourcePath = _init_sourcePath(this, "");
  sex = (_init_extra_sourcePath(this), _init_sex(this, ""));
  entries = (_init_extra_sex(this), _init_entries(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipePr as CjsCharacterRecipeProfile };
//# sourceMappingURL=CjsCharacterRecipeProfile.js.map
