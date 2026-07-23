import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_female, _init_extra_female, _init_male, _init_extra_male;
let _CjsCharacterFaceAnim;
class CjsCharacterFaceAnimationProfile extends _CjsCharacterNode {
  static {
    ({
      e: [_init_female, _init_extra_female, _init_male, _init_extra_male],
      c: [_CjsCharacterFaceAnim, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterFaceAnimationProfile",
      family: "character"
    })], [[[void 0, type.objectRef("CjsCharacterFaceAnimationSetting"), io, io.persist], 16, "female"], [[void 0, type.objectRef("CjsCharacterFaceAnimationSetting"), io, io.persist], 16, "male"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_male(this);
  }
  female = _init_female(this, null);
  male = (_init_extra_female(this), _init_male(this, null));
  static {
    _initClass();
  }
}

export { _CjsCharacterFaceAnim as CjsCharacterFaceAnimationProfile };
//# sourceMappingURL=CjsCharacterFaceAnimationProfile.js.map
