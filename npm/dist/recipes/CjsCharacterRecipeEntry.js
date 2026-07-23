import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { vec4 } from '@carbonenginejs/core-math/vec4';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_category, _init_extra_category, _init_path, _init_extra_path, _init_weight, _init_extra_weight, _init_colorVariation, _init_extra_colorVariation, _init_colors, _init_extra_colors, _init_specularColors, _init_extra_specularColors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation;
let _CjsCharacterRecipeEn;
class CjsCharacterRecipeEntry extends _CjsCharacterNode {
  static {
    ({
      e: [_init_category, _init_extra_category, _init_path, _init_extra_path, _init_weight, _init_extra_weight, _init_colorVariation, _init_extra_colorVariation, _init_colors, _init_extra_colors, _init_specularColors, _init_extra_specularColors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation],
      c: [_CjsCharacterRecipeEn, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterRecipeEntry",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "category"], [[type, type.string, io, io.persist], 16, "path"], [[type, type.float32, io, io.persist], 16, "weight"], [[type, type.string, io, io.persist], 16, "colorVariation"], [[void 0, type.list("color"), io, io.persist], 16, "colors"], [[void 0, type.list("color"), io, io.persist], 16, "specularColors"], [[type, type.string, io, io.persist], 16, "pattern"], [[void 0, type.list("color"), io, io.persist], 16, "patternColors"], [[type, type.vec4, io, io.persist], 16, "patternTransform"], [[type, type.float32, io, io.persist], 16, "patternRotation"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_patternRotation(this);
  }
  category = _init_category(this, "");
  path = (_init_extra_category(this), _init_path(this, ""));
  weight = (_init_extra_path(this), _init_weight(this, 1));
  colorVariation = (_init_extra_weight(this), _init_colorVariation(this, null));
  colors = (_init_extra_colorVariation(this), _init_colors(this, []));
  specularColors = (_init_extra_colors(this), _init_specularColors(this, []));
  pattern = (_init_extra_specularColors(this), _init_pattern(this, null));
  patternColors = (_init_extra_pattern(this), _init_patternColors(this, []));
  patternTransform = (_init_extra_patternColors(this), _init_patternTransform(this, vec4.fromValues(0, 0, 1, 1)));
  patternRotation = (_init_extra_patternTransform(this), _init_patternRotation(this, 0));
  static {
    _initClass();
  }
}

export { _CjsCharacterRecipeEn as CjsCharacterRecipeEntry };
//# sourceMappingURL=CjsCharacterRecipeEntry.js.map
