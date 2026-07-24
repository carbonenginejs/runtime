import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_morphs, _init_extra_morphs, _init_parameters, _init_extra_parameters, _init_boneOffsets, _init_extra_boneOffsets, _init_activePose, _init_extra_activePose, _init_appliedLayerIDs, _init_extra_appliedLayerIDs;
let _CjsCharacterControlS;
class CjsCharacterControlState extends _CjsCharacterNode {
  static {
    ({
      e: [_init_morphs, _init_extra_morphs, _init_parameters, _init_extra_parameters, _init_boneOffsets, _init_extra_boneOffsets, _init_activePose, _init_extra_activePose, _init_appliedLayerIDs, _init_extra_appliedLayerIDs],
      c: [_CjsCharacterControlS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterControlState",
      family: "character"
    })], [[[void 0, type.map("float32"), io, io.persist], 16, "morphs"], [[void 0, type.map("float32"), io, io.persist], 16, "parameters"], [[void 0, type.map("vec3"), io, io.persist], 16, "boneOffsets"], [[type, type.string, io, io.persist], 16, "activePose"], [[void 0, type.list("string"), io, io.persist], 16, "appliedLayerIDs"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_appliedLayerIDs(this);
  }
  morphs = _init_morphs(this, new Map());
  parameters = (_init_extra_morphs(this), _init_parameters(this, new Map()));
  boneOffsets = (_init_extra_parameters(this), _init_boneOffsets(this, new Map()));
  activePose = (_init_extra_boneOffsets(this), _init_activePose(this, ""));
  appliedLayerIDs = (_init_extra_activePose(this), _init_appliedLayerIDs(this, []));
  static {
    _initClass();
  }
}

export { _CjsCharacterControlS as CjsCharacterControlState };
//# sourceMappingURL=CjsCharacterControlState.js.map
