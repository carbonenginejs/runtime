import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_bindPoses, _init_extra_bindPoses, _init_animation, _init_extra_animation, _init_controls, _init_extra_controls, _init_tweakSettings, _init_extra_tweakSettings;
let _CjsCharacterFaceSetu;
class CjsCharacterFaceSetup extends _CjsCharacterNode {
  static {
    ({
      e: [_init_bindPoses, _init_extra_bindPoses, _init_animation, _init_extra_animation, _init_controls, _init_extra_controls, _init_tweakSettings, _init_extra_tweakSettings],
      c: [_CjsCharacterFaceSetu, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterFaceSetup",
      family: "character"
    })], [[[void 0, type.map("CjsCharacterPose"), io, io.persist], 16, "bindPoses"], [[void 0, type.map("CjsCharacterFaceAnimationProfile"), io, io.persist], 16, "animation"], [[void 0, type.objectRef("CjsCharacterFaceControls"), io, io.persist], 16, "controls"], [[void 0, type.objectRef("CjsCharacterFaceTweakSettings"), io, io.persist], 16, "tweakSettings"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_tweakSettings(this);
  }
  bindPoses = _init_bindPoses(this, new Map());
  animation = (_init_extra_bindPoses(this), _init_animation(this, new Map()));
  controls = (_init_extra_animation(this), _init_controls(this, null));
  tweakSettings = (_init_extra_controls(this), _init_tweakSettings(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterFaceSetu as CjsCharacterFaceSetup };
//# sourceMappingURL=CjsCharacterFaceSetup.js.map
