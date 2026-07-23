import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_recipe, _init_extra_recipe, _init_parts, _init_extra_parts, _init_rules, _init_extra_rules, _init_morphs, _init_extra_morphs, _init_materialIDs, _init_extra_materialIDs, _init_issues, _init_extra_issues, _init_complete, _init_extra_complete;
let _CjsCharacterRecipeRe;
class CjsCharacterRecipeResolution extends _CjsCharacterNode {
  static {
    ({
      e: [_init_recipe, _init_extra_recipe, _init_parts, _init_extra_parts, _init_rules, _init_extra_rules, _init_morphs, _init_extra_morphs, _init_materialIDs, _init_extra_materialIDs, _init_issues, _init_extra_issues, _init_complete, _init_extra_complete],
      c: [_CjsCharacterRecipeRe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipeResolution",
      family: "character"
    })], [[[void 0, type.struct("CjsCharacterRecipe"), io, io.persist], 16, "recipe"], [[void 0, type.list("CjsCharacterResolvedPart"), io, io.persist], 16, "parts"], [[void 0, type.list("CjsCharacterResolvedRule"), io, io.persist], 16, "rules"], [[void 0, type.map("float32"), io, io.persist], 16, "morphs"], [[void 0, type.list("string"), io, io.persist], 16, "materialIDs"], [[void 0, type.list("CjsCharacterResolutionIssue"), io, io.persist], 16, "issues"], [[type, type.boolean, io, io.persist], 16, "complete"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_complete(this);
  }
  recipe = _init_recipe(this, null);
  parts = (_init_extra_recipe(this), _init_parts(this, []));
  rules = (_init_extra_parts(this), _init_rules(this, []));
  morphs = (_init_extra_rules(this), _init_morphs(this, new Map()));
  materialIDs = (_init_extra_morphs(this), _init_materialIDs(this, []));
  issues = (_init_extra_materialIDs(this), _init_issues(this, []));
  complete = (_init_extra_issues(this), _init_complete(this, false));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipeRe as CjsCharacterRecipeResolution };
//# sourceMappingURL=CjsCharacterRecipeResolution.js.map
