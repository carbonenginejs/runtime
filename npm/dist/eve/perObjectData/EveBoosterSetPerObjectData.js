import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveBoosterSetPSData as _EveBoosterSetPSData } from './EveBoosterSetPSData.js';
import { EveBoosterSetVSData as _EveBoosterSetVSData } from './EveBoosterSetVSData.js';

let _initClass, _init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData;

/**
 * Carbon `EveBoosterSetPerObjectData` - a pure composite of the two stage
 * structs, exactly as Carbon declares it (`VertexShaderData m_vsData;
 * PixelShaderData m_psData;`, EveBoosterSet2.h:73-74).
 *
 * This class previously FLATTENED both stages into one record, which lost the
 * two trail arrays' `[EVE_MAX_CONTROL_POINT_COUNT]` bound, dropped the pixel
 * stage's `boosterIntensity` to a name collision with the vertex stage's, and
 * left the record at 124 bytes - not a multiple of Vector4, which Carbon
 * static_asserts (Tr2PerObjectData.h:57).
 */
let _EveBoosterSetPerObje;
class EveBoosterSetPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData],
      c: [_EveBoosterSetPerObje, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveBoosterSetPerObjectData",
      family: "eve/perObjectData"
    })], [[type.rawStruct("EveBoosterSetVSData"), 0, "vsData"], [type.rawStruct("EveBoosterSetPSData"), 0, "psData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_psData(this);
  }
  /** m_vsData (VertexShaderData) */
  vsData = _init_vsData(this, new _EveBoosterSetVSData());

  /** m_psData (PixelShaderData) */
  psData = (_init_extra_vsData(this), _init_psData(this, new _EveBoosterSetPSData()));
  static {
    _initClass();
  }
}

export { _EveBoosterSetPerObje as EveBoosterSetPerObjectData };
//# sourceMappingURL=EveBoosterSetPerObjectData.js.map
