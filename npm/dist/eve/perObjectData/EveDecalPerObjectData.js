import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData;

/** EveDecalPerObjectData (eve/perObjectData) - generated from schema shapeHash 8d1f094d.... */
let _EveDecalPerObjectDat;
class EveDecalPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData],
      c: [_EveDecalPerObjectDat, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveDecalPerObjectData",
      family: "eve/perObjectData"
    })], [[type.rawStruct("DecalVSPerObjectData"), 0, "vsData"], [type.rawStruct("DecalPSPerObjectData"), 0, "psData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_psData(this);
  }
  /** m_vsData (DecalVSPerObjectData) */
  vsData = _init_vsData(this, null);

  /** m_psData (DecalPSPerObjectData) */
  psData = (_init_extra_vsData(this), _init_psData(this, null));
  static {
    _initClass();
  }
}

export { _EveDecalPerObjectDat as EveDecalPerObjectData };
//# sourceMappingURL=EveDecalPerObjectData.js.map
