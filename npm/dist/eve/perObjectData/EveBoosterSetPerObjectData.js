import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_shipMatrix, _init_extra_shipMatrix, _init_boosterIntensity, _init_extra_boosterIntensity, _init_shipSpeed, _init_extra_shipSpeed, _init_maxBoosterSize, _init_extra_maxBoosterSize, _init_padding, _init_extra_padding, _init_trailsControlPositions, _init_extra_trailsControlPositions, _init_trailsControlNormals, _init_extra_trailsControlNormals, _init_trailIntensity, _init_extra_trailIntensity, _init_warpIntensity, _init_extra_warpIntensity, _init_padding2, _init_extra_padding2, _init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData;

/** EveBoosterSetPerObjectData (eve/perObjectData) - generated from schema shapeHash 4810dc0a.... */
let _EveBoosterSetPerObje;
class EveBoosterSetPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_shipMatrix, _init_extra_shipMatrix, _init_boosterIntensity, _init_extra_boosterIntensity, _init_shipSpeed, _init_extra_shipSpeed, _init_maxBoosterSize, _init_extra_maxBoosterSize, _init_padding, _init_extra_padding, _init_trailsControlPositions, _init_extra_trailsControlPositions, _init_trailsControlNormals, _init_extra_trailsControlNormals, _init_trailIntensity, _init_extra_trailIntensity, _init_warpIntensity, _init_extra_warpIntensity, _init_padding2, _init_extra_padding2, _init_vsData, _init_extra_vsData, _init_psData, _init_extra_psData],
      c: [_EveBoosterSetPerObje, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveBoosterSetPerObjectData",
      family: "eve/perObjectData"
    })], [[[type, type.mat4], 16, "shipMatrix"], [[type, type.float32], 16, "boosterIntensity"], [[type, type.float32], 16, "shipSpeed"], [[type, type.float32], 16, "maxBoosterSize"], [[type, type.float32], 16, "padding"], [[type, type.vec4], 16, "trailsControlPositions"], [[type, type.vec4], 16, "trailsControlNormals"], [[type, type.float32], 16, "trailIntensity"], [[type, type.float32], 16, "warpIntensity"], [[type, type.float32], 16, "padding2"], [type.rawStruct("VertexShaderData"), 0, "vsData"], [type.rawStruct("PixelShaderData"), 0, "psData"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_psData(this);
  }
  /** shipMatrix (Matrix) */
  shipMatrix = _init_shipMatrix(this, mat4.create());

  /** boosterIntensity (float) */
  boosterIntensity = (_init_extra_shipMatrix(this), _init_boosterIntensity(this, 0));

  /** shipSpeed (float) */
  shipSpeed = (_init_extra_boosterIntensity(this), _init_shipSpeed(this, 0));

  /** maxBoosterSize (float) */
  maxBoosterSize = (_init_extra_shipSpeed(this), _init_maxBoosterSize(this, 0));

  /** padding (float) */
  padding = (_init_extra_maxBoosterSize(this), _init_padding(this, 0));

  /** trailsControlPositions (Vector4) */
  trailsControlPositions = (_init_extra_padding(this), _init_trailsControlPositions(this, vec4.create()));

  /** trailsControlNormals (Vector4) */
  trailsControlNormals = (_init_extra_trailsControlPositions(this), _init_trailsControlNormals(this, vec4.create()));

  /** trailIntensity (float) */
  trailIntensity = (_init_extra_trailsControlNormals(this), _init_trailIntensity(this, 0));

  /** warpIntensity (float) */
  warpIntensity = (_init_extra_trailIntensity(this), _init_warpIntensity(this, 0));

  /** padding2 (float) */
  padding2 = (_init_extra_warpIntensity(this), _init_padding2(this, 0));

  /** m_vsData (VertexShaderData) */
  vsData = (_init_extra_padding2(this), _init_vsData(this, null));

  /** m_psData (PixelShaderData) */
  psData = (_init_extra_vsData(this), _init_psData(this, null));
  static {
    _initClass();
  }
}

export { _EveBoosterSetPerObje as EveBoosterSetPerObjectData };
//# sourceMappingURL=EveBoosterSetPerObjectData.js.map
