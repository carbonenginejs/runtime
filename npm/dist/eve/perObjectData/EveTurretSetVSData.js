import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_baseCutoffData, _init_extra_baseCutoffData, _init_turretSetData, _init_extra_turretSetData, _init_shipMatrix, _init_extra_shipMatrix, _init_prevShipMatrix, _init_extra_prevShipMatrix, _init_currentBoneOffset, _init_extra_currentBoneOffset, _init_prevBoneOffset, _init_extra_prevBoneOffset, _init__unused, _init_extra__unused, _init_turretTranslation, _init_extra_turretTranslation, _init_turretRotation, _init_extra_turretRotation;

/** EveTurretSetVSData (eve/attachment/turrets) - generated from schema shapeHash 9b992797.... */
let _EveTurretSetVSData;
class EveTurretSetVSData extends CjsModel {
  static {
    ({
      e: [_init_baseCutoffData, _init_extra_baseCutoffData, _init_turretSetData, _init_extra_turretSetData, _init_shipMatrix, _init_extra_shipMatrix, _init_prevShipMatrix, _init_extra_prevShipMatrix, _init_currentBoneOffset, _init_extra_currentBoneOffset, _init_prevBoneOffset, _init_extra_prevBoneOffset, _init__unused, _init_extra__unused, _init_turretTranslation, _init_extra_turretTranslation, _init_turretRotation, _init_extra_turretRotation],
      c: [_EveTurretSetVSData, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveTurretSetVSData",
      family: "eve/attachment/turrets"
    })], [[[type, type.vec4], 16, "baseCutoffData"], [[type, type.vec4], 16, "turretSetData"], [[type, type.mat4], 16, "shipMatrix"], [[type, type.mat4], 16, "prevShipMatrix"], [[type, type.uint32], 16, "currentBoneOffset"], [[type, type.uint32], 16, "prevBoneOffset"], [type.rawStruct("uint32_t[2]"), 0, "_unused"], [type.rawStruct("Vector4[24]"), 0, "turretTranslation"], [type.rawStruct("Quaternion[24]"), 0, "turretRotation"]], 0, void 0, CjsModel));
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

  /** _unused (uint32_t[2]) */
  _unused = (_init_extra_prevBoneOffset(this), _init__unused(this, new Uint32Array(2)));

  /** m_turretTranslation (Vector4[24]) */
  turretTranslation = (_init_extra__unused(this), _init_turretTranslation(this, Array.from({
    length: 24
  }, () => vec4.create())));

  /** m_turretRotation (Quaternion[24]) */
  turretRotation = (_init_extra_turretTranslation(this), _init_turretRotation(this, Array.from({
    length: 24
  }, () => quat.create())));
  static {
    _initClass();
  }
}

export { _EveTurretSetVSData as EveTurretSetVSData };
//# sourceMappingURL=EveTurretSetVSData.js.map
