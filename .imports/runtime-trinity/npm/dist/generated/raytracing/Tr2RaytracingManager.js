import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_shadowEffect, _init_extra_shadowEffect, _init_denoiser, _init_extra_denoiser, _init_applyDenoiser, _init_extra_applyDenoiser, _init_sunAngle, _init_extra_sunAngle;

/** Tr2RaytracingManager (raytracing) - generated from schema shapeHash 5e5cd620.... */
let _Tr2RaytracingManager;
class Tr2RaytracingManager extends CjsModel {
  static {
    ({
      e: [_init_shadowEffect, _init_extra_shadowEffect, _init_denoiser, _init_extra_denoiser, _init_applyDenoiser, _init_extra_applyDenoiser, _init_sunAngle, _init_extra_sunAngle],
      c: [_Tr2RaytracingManager, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2RaytracingManager",
      family: "raytracing"
    })], [[[io, io.read, void 0, type.objectRef("Tr2Effect")], 16, "shadowEffect"], [[io, io.read, void 0, type.objectRef("Tr2Denoiser")], 16, "denoiser"], [[io, io.readwrite, type, type.boolean], 16, "applyDenoiser"], [[io, io.readwrite, type, type.float32], 16, "sunAngle"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sunAngle(this);
  }
  /** m_shadowEffect (Tr2EffectPtr) [READ] */
  shadowEffect = _init_shadowEffect(this, null);

  /** m_denoiser (Tr2DenoiserPtr) [READ] */
  denoiser = (_init_extra_shadowEffect(this), _init_denoiser(this, null));

  /** m_applyDenoiser (bool) [READWRITE] */
  applyDenoiser = (_init_extra_denoiser(this), _init_applyDenoiser(this, true));

  /** m_sunAngle (float) [READWRITE] */
  sunAngle = (_init_extra_applyDenoiser(this), _init_sunAngle(this, 0.01));
  static {
    _initClass();
  }
}

export { _Tr2RaytracingManager as Tr2RaytracingManager };
//# sourceMappingURL=Tr2RaytracingManager.js.map
