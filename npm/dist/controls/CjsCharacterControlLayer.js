import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';
import { CjsCharacterUniqueCharacter as _CjsCharacterUniqueCh } from '../library/CjsCharacterUniqueCharacter.js';

let _initClass, _init_id, _init_extra_id, _init_priority, _init_extra_priority, _init_enabled, _init_extra_enabled, _init_influence, _init_extra_influence, _init_blendMode, _init_extra_blendMode, _init_morphs, _init_extra_morphs, _init_parameters, _init_extra_parameters, _init_boneOffsets, _init_extra_boneOffsets, _init_activePose, _init_extra_activePose;
let _CjsCharacterControlL;
class CjsCharacterControlLayer extends _CjsCharacterNode {
  static {
    ({
      e: [_init_id, _init_extra_id, _init_priority, _init_extra_priority, _init_enabled, _init_extra_enabled, _init_influence, _init_extra_influence, _init_blendMode, _init_extra_blendMode, _init_morphs, _init_extra_morphs, _init_parameters, _init_extra_parameters, _init_boneOffsets, _init_extra_boneOffsets, _init_activePose, _init_extra_activePose],
      c: [_CjsCharacterControlL, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterControlLayer",
      family: "character"
    })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.int32, io, io.persist], 16, "priority"], [[type, type.boolean, io, io.persist], 16, "enabled"], [[type, type.float32, io, io.persist], 16, "influence"], [[type, type.string, io, io.persist], 16, "blendMode"], [[void 0, type.map("float32"), io, io.persist], 16, "morphs"], [[void 0, type.map("float32"), io, io.persist], 16, "parameters"], [[void 0, type.map("vec3"), io, io.persist], 16, "boneOffsets"], [[type, type.string, io, io.persist], 16, "activePose"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_activePose(this);
  }
  /** Converts authored unique-character morphs and translation offsets into a neutral layer. */
  static fromUniqueCharacter(value, {
    id = null,
    priority = 0,
    enabled = true,
    influence = 1,
    blendMode = "replace"
  } = {}) {
    const character = value instanceof _CjsCharacterUniqueCh ? value : _CjsCharacterUniqueCh.from(value || {});
    return _CjsCharacterControlL.from({
      id: id ?? character.id,
      priority,
      enabled,
      influence,
      blendMode,
      morphs: new Map(character.blendshapeWeights),
      boneOffsets: new Map(character.animationOffsets)
    });
  }
  id = _init_id(this, "");
  priority = (_init_extra_id(this), _init_priority(this, 0));
  enabled = (_init_extra_priority(this), _init_enabled(this, true));
  influence = (_init_extra_enabled(this), _init_influence(this, 1));
  blendMode = (_init_extra_influence(this), _init_blendMode(this, "replace"));
  morphs = (_init_extra_blendMode(this), _init_morphs(this, new Map()));
  parameters = (_init_extra_morphs(this), _init_parameters(this, new Map()));
  boneOffsets = (_init_extra_parameters(this), _init_boneOffsets(this, new Map()));
  activePose = (_init_extra_boneOffsets(this), _init_activePose(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterControlL as CjsCharacterControlLayer };
//# sourceMappingURL=CjsCharacterControlLayer.js.map
