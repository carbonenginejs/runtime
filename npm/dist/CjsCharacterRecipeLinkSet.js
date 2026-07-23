import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_presetID, _init_extra_presetID, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries;
let _CjsCharacterRecipeLi;
class CjsCharacterRecipeLinkSet extends _CjsCharacterNode {
  static {
    ({
      e: [_init_presetID, _init_extra_presetID, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries],
      c: [_CjsCharacterRecipeLi, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipeLinkSet",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "presetID"], [[type, type.string, io, io.persist], 16, "sex"], [[void 0, type.list("CjsCharacterRecipeLink"), io, io.persist], 16, "entries"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_entries(this);
  }
  presetID = _init_presetID(this, "");
  sex = (_init_extra_presetID(this), _init_sex(this, ""));
  entries = (_init_extra_sex(this), _init_entries(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipeLi as CjsCharacterRecipeLinkSet };
//# sourceMappingURL=CjsCharacterRecipeLinkSet.js.map
