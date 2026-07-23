import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';

let _initClass, _init_materialInfo, _init_extra_materialInfo;
let _CjsCharacterPartAuth;
class CjsCharacterPartAuthoring extends _CjsCharacterNode {
  static {
    ({
      e: [_init_materialInfo, _init_extra_materialInfo],
      c: [_CjsCharacterPartAuth, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterPartAuthoring",
      family: "character"
    })], [[[type, type.unknown, io, io.persist], 16, "materialInfo"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_materialInfo(this);
  }
  materialInfo = _init_materialInfo(this, null);
  static {
    _initClass();
  }
}

export { _CjsCharacterPartAuth as CjsCharacterPartAuthoring };
//# sourceMappingURL=CjsCharacterPartAuthoring.js.map
