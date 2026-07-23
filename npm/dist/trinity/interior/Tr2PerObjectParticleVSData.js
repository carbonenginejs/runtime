import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { mat4 } from '@carbonenginejs/core-math/mat4';

let _initClass, _init_WorldMat, _init_extra_WorldMat, _init_InvViewMat, _init_extra_InvViewMat;

/** Tr2PerObjectParticleVSData (interior) - generated from schema shapeHash b787b555.... */
let _Tr2PerObjectParticle;
class Tr2PerObjectParticleVSData extends CjsModel {
  static {
    ({
      e: [_init_WorldMat, _init_extra_WorldMat, _init_InvViewMat, _init_extra_InvViewMat],
      c: [_Tr2PerObjectParticle, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PerObjectParticleVSData",
      family: "interior"
    })], [[[type, type.mat4], 16, "WorldMat"], [[type, type.mat4], 16, "InvViewMat"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_InvViewMat(this);
  }
  /** WorldMat (Matrix) */
  WorldMat = _init_WorldMat(this, mat4.create());

  /** InvViewMat (Matrix) */
  InvViewMat = (_init_extra_WorldMat(this), _init_InvViewMat(this, mat4.create()));
  static {
    _initClass();
  }
}

export { _Tr2PerObjectParticle as Tr2PerObjectParticleVSData };
//# sourceMappingURL=Tr2PerObjectParticleVSData.js.map
