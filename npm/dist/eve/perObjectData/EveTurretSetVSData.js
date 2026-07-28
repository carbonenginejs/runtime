import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_baseCutoffData, _init_extra_baseCutoffData, _init_turretSetData, _init_extra_turretSetData, _init_shipMatrix, _init_extra_shipMatrix, _init_prevShipMatrix, _init_extra_prevShipMatrix, _init_currentBoneOffset, _init_extra_currentBoneOffset, _init_prevBoneOffset, _init_extra_prevBoneOffset, _init__unused, _init_extra__unused, _init_turretTranslation, _init_extra_turretTranslation, _init_turretRotation, _init_extra_turretRotation;

/** EveTurretSetVSData (eve/attachment/turrets) - generated from schema shapeHash 9b992797.... */
let _EveTurretSetVSData;
new class extends _identity {
  static [class EveTurretSetVSData extends CjsModel {
    static {
      ({
        e: [_init_baseCutoffData, _init_extra_baseCutoffData, _init_turretSetData, _init_extra_turretSetData, _init_shipMatrix, _init_extra_shipMatrix, _init_prevShipMatrix, _init_extra_prevShipMatrix, _init_currentBoneOffset, _init_extra_currentBoneOffset, _init_prevBoneOffset, _init_extra_prevBoneOffset, _init__unused, _init_extra__unused, _init_turretTranslation, _init_extra_turretTranslation, _init_turretRotation, _init_extra_turretRotation],
        c: [_EveTurretSetVSData, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveTurretSetVSData",
        family: "eve/attachment/turrets"
      })], [[[type, type.vec4], 16, "baseCutoffData"], [[type, type.vec4], 16, "turretSetData"], [[type, type.mat4], 16, "shipMatrix"], [[type, type.mat4], 16, "prevShipMatrix"], [[type, type.uint32], 16, "currentBoneOffset"], [[type, type.uint32], 16, "prevBoneOffset"], [type.array("uint32"), 0, "_unused"], [type.array("vec4"), 0, "turretTranslation"], [type.array("quat"), 0, "turretRotation"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_turretRotation(this);
    }
    /** m_baseCutoffData (Vector4) */
    baseCutoffData = _init_baseCutoffData(this, vec4.create());

    /** m_turretSetData (Vector4) */
    turretSetData = (_init_extra_baseCutoffData(this), _init_turretSetData(this, vec4.create()));

    /** m_shipMatrix (Matrix) */
    shipMatrix = (_init_extra_turretSetData(this), _init_shipMatrix(this, mat4.create()));

    /** m_prevShipMatrix (Matrix) */
    prevShipMatrix = (_init_extra_shipMatrix(this), _init_prevShipMatrix(this, mat4.create()));

    /** m_currentBoneOffset (uint32_t) */
    currentBoneOffset = (_init_extra_prevShipMatrix(this), _init_currentBoneOffset(this, 0));

    /** m_prevBoneOffset (uint32_t) */
    prevBoneOffset = (_init_extra_currentBoneOffset(this), _init_prevBoneOffset(this, 0));

    /** _unused (uint32_t[2]) - Carbon's explicit pad; never written. */
    _unused = (_init_extra_prevBoneOffset(this), _init__unused(this, [0, 0]));

    /** m_turretTranslation (Vector4[EVE_MAX_TURRETS_PER_SET]) */
    turretTranslation = (_init_extra__unused(this), _init_turretTranslation(this, Array.from({
      length: _EveTurretSetVSData.TURRET_COUNT
    }, () => vec4.create())));

    /** m_turretRotation (Quaternion[EVE_MAX_TURRETS_PER_SET]) */
    turretRotation = (_init_extra_turretTranslation(this), _init_turretRotation(this, Array.from({
      length: _EveTurretSetVSData.TURRET_COUNT
    }, () => quat.create())));

    /** EveTurretSet.h:43 - `EVE_MAX_TURRETS_PER_SET`. */
  }];
  TURRET_COUNT = 24;
  constructor() {
    super(_EveTurretSetVSData), _initClass();
  }
}();

export { _EveTurretSetVSData as EveTurretSetVSData };
//# sourceMappingURL=EveTurretSetVSData.js.map
