import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveTurretSetPSData as _EveTurretSetPSData } from './EveTurretSetPSData.js';
import { EveTurretSetVSData as _EveTurretSetVSData } from './EveTurretSetVSData.js';

let _initClass, _init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData;

/** EveTurretSetPerObjectData (eve/perObjectData) - generated from schema shapeHash e35c9e2a.... */
let _EveTurretSetPerObjec;
class EveTurretSetPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData],
      c: [_EveTurretSetPerObjec, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveTurretSetPerObjectData",
      family: "eve/perObjectData"
    })], [[type.rawStruct("EveTurretSetVSData"), 0, "vsData"], [type.rawStruct("EveTurretSetPSData"), 0, "psData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_psData(this);
  }
  /** m_vsData (EveTurretSetVSData) */
  vsData = _init_vsData(this, new _EveTurretSetVSData());

  /** m_psData (EveTurretSetPSData) */
  psData = (_init_extra_vsData(this), _init_psData(this, new _EveTurretSetPSData()));
  static {
    _initClass();
  }
}

export { _EveTurretSetPerObjec as EveTurretSetPerObjectData };
//# sourceMappingURL=EveTurretSetPerObjectData.js.map
