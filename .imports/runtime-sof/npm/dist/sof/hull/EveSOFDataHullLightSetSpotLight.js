import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { EveSOFDataHullLightSetItem as _EveSOFDataHullLightS$1 } from './EveSOFDataHullLightSetItem.js';

let _initClass, _init_rotation, _init_extra_rotation, _init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle;

/** EveSOFDataHullLightSetSpotLight (eve) - generated from schema shapeHash ce169196.... */
// Carbon derives this from EveSOFDataHullLightSetItem (EveSOFData.h:
// 1422-1429) and maps the full base surface (including lightColor) plus
// rotation, innerAngle, and outerAngle (EveSOFData_Blue.cpp:1096-1114).
let _EveSOFDataHullLightS;
class EveSOFDataHullLightSetSpotLight extends _EveSOFDataHullLightS$1 {
  static {
    ({
      e: [_init_rotation, _init_extra_rotation, _init_innerAngle, _init_extra_innerAngle, _init_outerAngle, _init_extra_outerAngle],
      c: [_EveSOFDataHullLightS, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullLightSetSpotLight",
      family: "eve"
    })], [[[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.float32], 16, "innerAngle"], [[io, io.persist, type, type.float32], 16, "outerAngle"]], 0, void 0, _EveSOFDataHullLightS$1));
  }
  constructor(...args) {
    super(...args);
    _init_extra_outerAngle(this);
  }
  /** m_data.rotation (Quaternion) [READWRITE, PERSIST] */
  rotation = _init_rotation(this, quat.create());

  /** m_data.innerAngle (float) [READWRITE, PERSIST] */
  innerAngle = (_init_extra_rotation(this), _init_innerAngle(this, 0));

  /** m_data.outerAngle (float) [READWRITE, PERSIST] */
  outerAngle = (_init_extra_innerAngle(this), _init_outerAngle(this, 0));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullLightS as EveSOFDataHullLightSetSpotLight };
//# sourceMappingURL=EveSOFDataHullLightSetSpotLight.js.map
