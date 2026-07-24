import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_gammaCurves, _init_extra_gammaCurves, _init_wrinkleMultiplier, _init_extra_wrinkleMultiplier, _init_correctionMultiplier, _init_extra_correctionMultiplier;
let _CjsCharacterFaceTwea;
class CjsCharacterFaceTweakSettings extends _CjsCharacterNode {
  static {
    ({
      e: [_init_gammaCurves, _init_extra_gammaCurves, _init_wrinkleMultiplier, _init_extra_wrinkleMultiplier, _init_correctionMultiplier, _init_extra_correctionMultiplier],
      c: [_CjsCharacterFaceTwea, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterFaceTweakSettings",
      family: "character"
    })], [[[void 0, type.map("float32"), io, io.persist], 16, "gammaCurves"], [[type, type.float32, io, io.persist], 16, "wrinkleMultiplier"], [[type, type.float32, io, io.persist], 16, "correctionMultiplier"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_correctionMultiplier(this);
  }
  gammaCurves = _init_gammaCurves(this, new Map());
  wrinkleMultiplier = (_init_extra_gammaCurves(this), _init_wrinkleMultiplier(this, 1));
  correctionMultiplier = (_init_extra_wrinkleMultiplier(this), _init_correctionMultiplier(this, 1));
  static {
    _initClass();
  }
}

export { _CjsCharacterFaceTwea as CjsCharacterFaceTweakSettings };
//# sourceMappingURL=CjsCharacterFaceTweakSettings.js.map
