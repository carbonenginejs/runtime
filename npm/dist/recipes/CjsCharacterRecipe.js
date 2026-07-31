import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries;

/**
 * Named, sex-scoped character composition preset made from authored recipe
 * entries.
 */
let _CjsCharacterRecipe;
class CjsCharacterRecipe extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_name, _init_extra_name, _init_sex, _init_extra_sex, _init_entries, _init_extra_entries],
      c: [_CjsCharacterRecipe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipe",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "name"], [[type, type.string, io, io.persist], 16, "sex"], [[void 0, type.list("CjsCharacterRecipeEntry"), io, io.persist], 16, "entries"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_entries(this);
  }
  id = _init_id(this, "");
  name = (_init_extra_id(this), _init_name(this, ""));
  sex = (_init_extra_name(this), _init_sex(this, ""));
  entries = (_init_extra_sex(this), _init_entries(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipe as CjsCharacterRecipe };
//# sourceMappingURL=CjsCharacterRecipe.js.map
