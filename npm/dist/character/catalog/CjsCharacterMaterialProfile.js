import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterRecord as _CjsCharacterRecord } from '../CjsCharacterRecord.js';

let _initClass, _init_sourcePath, _init_extra_sourcePath, _init_colors, _init_extra_colors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation, _init_specularColors, _init_extra_specularColors;

/** Authored character color, pattern, and specular profile. */
let _CjsCharacterMaterial;
class CjsCharacterMaterialProfile extends _CjsCharacterRecord {
  static {
    ({
      e: [_init_sourcePath, _init_extra_sourcePath, _init_colors, _init_extra_colors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation, _init_specularColors, _init_extra_specularColors],
      c: [_CjsCharacterMaterial, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterMaterialProfile",
      family: "character"
    })], [[[io, io.readwrite, type, type.path], 16, "sourcePath"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorValue")], 16, "colors"], [[io, io.readwrite, type, type.string], 16, "pattern"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorValue")], 16, "patternColors"], [[io, io.readwrite, type, type.vec4], 16, "patternTransform"], [[io, io.readwrite, type, type.float64], 16, "patternRotation"], [[io, io.readwrite, void 0, type.list("CjsCharacterColorValue")], 16, "specularColors"]], 0, void 0, _CjsCharacterRecord));
  }
  constructor(...args) {
    super(...args);
    _init_extra_specularColors(this);
  }
  sourcePath = _init_sourcePath(this, "");
  colors = (_init_extra_sourcePath(this), _init_colors(this, []));
  pattern = (_init_extra_colors(this), _init_pattern(this, null));
  patternColors = (_init_extra_pattern(this), _init_patternColors(this, []));
  patternTransform = (_init_extra_patternColors(this), _init_patternTransform(this, [0, 0, 1, 1]));
  patternRotation = (_init_extra_patternTransform(this), _init_patternRotation(this, 0));
  specularColors = (_init_extra_patternRotation(this), _init_specularColors(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterMaterial as CjsCharacterMaterialProfile };
//# sourceMappingURL=CjsCharacterMaterialProfile.js.map
