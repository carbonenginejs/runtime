import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { vec4 } from '@carbonenginejs/core-math/vec4';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_slot, _init_extra_slot, _init_colors, _init_extra_colors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation, _init_specularColors, _init_extra_specularColors, _init_parameters, _init_extra_parameters, _init_resourcePaths, _init_extra_resourcePaths;
let _CjsCharacterMaterial;
class CjsCharacterMaterial extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_slot, _init_extra_slot, _init_colors, _init_extra_colors, _init_pattern, _init_extra_pattern, _init_patternColors, _init_extra_patternColors, _init_patternTransform, _init_extra_patternTransform, _init_patternRotation, _init_extra_patternRotation, _init_specularColors, _init_extra_specularColors, _init_parameters, _init_extra_parameters, _init_resourcePaths, _init_extra_resourcePaths],
      c: [_CjsCharacterMaterial, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterMaterial",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "slot"], [[void 0, type.list("color"), io, io.persist], 16, "colors"], [[type, type.string, io, io.persist], 16, "pattern"], [[void 0, type.list("color"), io, io.persist], 16, "patternColors"], [[type, type.vec4, io, io.persist], 16, "patternTransform"], [[type, type.float32, io, io.persist], 16, "patternRotation"], [[void 0, type.list("color"), io, io.persist], 16, "specularColors"], [[type, type.unknown, io, io.persist], 16, "parameters"], [[void 0, type.list("path"), io, io.persist], 16, "resourcePaths"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_resourcePaths(this);
  }
  id = _init_id(this, "");
  slot = (_init_extra_id(this), _init_slot(this, ""));
  colors = (_init_extra_slot(this), _init_colors(this, []));
  pattern = (_init_extra_colors(this), _init_pattern(this, null));
  patternColors = (_init_extra_pattern(this), _init_patternColors(this, []));
  patternTransform = (_init_extra_patternColors(this), _init_patternTransform(this, vec4.fromValues(0, 0, 1, 1)));
  patternRotation = (_init_extra_patternTransform(this), _init_patternRotation(this, 0));
  specularColors = (_init_extra_patternRotation(this), _init_specularColors(this, []));
  parameters = (_init_extra_specularColors(this), _init_parameters(this, {}));
  resourcePaths = (_init_extra_parameters(this), _init_resourcePaths(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterMaterial as CjsCharacterMaterial };
//# sourceMappingURL=CjsCharacterMaterial.js.map
