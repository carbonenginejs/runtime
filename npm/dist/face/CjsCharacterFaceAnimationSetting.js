import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_blinkMultiplier, _init_extra_blinkMultiplier;
let _CjsCharacterFaceAnim;
class CjsCharacterFaceAnimationSetting extends _CjsCharacterNode {
  static {
    ({
      e: [_init_blinkMultiplier, _init_extra_blinkMultiplier],
      c: [_CjsCharacterFaceAnim, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterFaceAnimationSetting",
      family: "character"
    })], [[[type, type.float32, io, io.persist], 16, "blinkMultiplier"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_blinkMultiplier(this);
  }
  blinkMultiplier = _init_blinkMultiplier(this, 1);
  static {
    _initClass();
  }
}

export { _CjsCharacterFaceAnim as CjsCharacterFaceAnimationSetting };
//# sourceMappingURL=CjsCharacterFaceAnimationSetting.js.map
