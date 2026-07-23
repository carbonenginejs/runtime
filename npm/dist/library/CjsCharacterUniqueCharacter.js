import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_resources, _init_extra_resources, _init_blendshapeWeights, _init_extra_blendshapeWeights, _init_animationOffsets, _init_extra_animationOffsets;
let _CjsCharacterUniqueCh;
class CjsCharacterUniqueCharacter extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_sex, _init_extra_sex, _init_resources, _init_extra_resources, _init_blendshapeWeights, _init_extra_blendshapeWeights, _init_animationOffsets, _init_extra_animationOffsets],
      c: [_CjsCharacterUniqueCh, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterUniqueCharacter",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.string, io, io.persist], 16, "sex"], [[void 0, type.objectRef("CjsCharacterResourceSet"), io, io.persist], 16, "resources"], [[void 0, type.map("float32"), io, io.persist], 16, "blendshapeWeights"], [[void 0, type.map("vec3"), io, io.persist], 16, "animationOffsets"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_animationOffsets(this);
  }
  id = _init_id(this, "");
  sex = (_init_extra_id(this), _init_sex(this, null));
  resources = (_init_extra_sex(this), _init_resources(this, null));
  blendshapeWeights = (_init_extra_resources(this), _init_blendshapeWeights(this, new Map()));
  animationOffsets = (_init_extra_blendshapeWeights(this), _init_animationOffsets(this, new Map()));
  static {
    _initClass();
  }
}

export { _CjsCharacterUniqueCh as CjsCharacterUniqueCharacter };
//# sourceMappingURL=CjsCharacterUniqueCharacter.js.map
