import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_shipData, _init_extra_shipData, _init_clipData, _init_extra_clipData, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_unused, _init_extra_unused, _init_shLightingCoefficients, _init_extra_shLightingCoefficients;

/** EveTurretSetPSData (eve/attachment/turrets) - generated from schema shapeHash 564e83a6.... */
let _EveTurretSetPSData;
class EveTurretSetPSData extends CjsModel {
  static {
    ({
      e: [_init_shipData, _init_extra_shipData, _init_clipData, _init_extra_clipData, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_unused, _init_extra_unused, _init_shLightingCoefficients, _init_extra_shLightingCoefficients],
      c: [_EveTurretSetPSData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveTurretSetPSData",
      family: "eve/attachment/turrets"
    })], [[[type, type.vec4], 16, "shipData"], [[type, type.vec4], 16, "clipData1"], [[type, type.float32], 16, "clipRadius2Sq"], [[type, type.vec3], 16, "unused"], [type.rawStruct("Vector4[7]"), 0, "shLightingCoefficients"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_shLightingCoefficients(this);
  }
  /** m_shipData (Vector4) */
  shipData = _init_shipData(this, vec4.create());

  /** m_clipData1 (Vector4) */
  clipData1 = (_init_extra_shipData(this), _init_clipData(this, vec4.create()));

  /** m_clipRadius2Sq (float) */
  clipRadius2Sq = (_init_extra_clipData(this), _init_clipRadius2Sq(this, 0));

  /** m_unused (Vector3) */
  unused = (_init_extra_clipRadius2Sq(this), _init_unused(this, vec3.create()));

  /** m_shLightingCoefficients (Vector4[7]) */
  shLightingCoefficients = (_init_extra_unused(this), _init_shLightingCoefficients(this, Array.from({
    length: 7
  }, () => vec4.create())));
  static {
    _initClass();
  }
}

export { _EveTurretSetPSData as EveTurretSetPSData };
//# sourceMappingURL=EveTurretSetPSData.js.map
