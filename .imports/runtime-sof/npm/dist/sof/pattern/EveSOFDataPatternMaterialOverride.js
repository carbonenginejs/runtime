import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4;

/** EveSOFDataPatternMaterialOverride (eve) - generated from schema shapeHash ce565030.... */
let _EveSOFDataPatternMat;
class EveSOFDataPatternMaterialOverride extends CjsModel {
  static {
    ({
      e: [_init_isTargetMtl, _init_extra_isTargetMtl, _init_isTargetMtl2, _init_extra_isTargetMtl2, _init_isTargetMtl3, _init_extra_isTargetMtl3, _init_isTargetMtl4, _init_extra_isTargetMtl4],
      c: [_EveSOFDataPatternMat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataPatternMaterialOverride",
      family: "eve"
    })], [[[io, io.persist, type, type.boolean], 16, "isTargetMtl1"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl2"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl3"], [[io, io.persist, type, type.boolean], 16, "isTargetMtl4"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isTargetMtl4(this);
  }
  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  isTargetMtl1 = _init_isTargetMtl(this, true);

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  isTargetMtl2 = (_init_extra_isTargetMtl(this), _init_isTargetMtl2(this, true));

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  isTargetMtl3 = (_init_extra_isTargetMtl2(this), _init_isTargetMtl3(this, true));

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  isTargetMtl4 = (_init_extra_isTargetMtl3(this), _init_isTargetMtl4(this, true));
  GetTargets(out = []) {
    out[0] = this.isTargetMtl1;
    out[1] = this.isTargetMtl2;
    out[2] = this.isTargetMtl3;
    out[3] = this.isTargetMtl4;
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveSOFDataPatternMat as EveSOFDataPatternMaterialOverride };
//# sourceMappingURL=EveSOFDataPatternMaterialOverride.js.map
