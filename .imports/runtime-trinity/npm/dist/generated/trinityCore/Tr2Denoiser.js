import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_bypass, _init_extra_bypass, _init_depthWeight, _init_extra_depthWeight, _init_normalWeight, _init_extra_normalWeight, _init_planeWeight, _init_extra_planeWeight, _init_radius, _init_extra_radius, _init_stepSize, _init_extra_stepSize;

/** Tr2Denoiser (trinityCore) - generated from schema shapeHash b7eba500.... */
let _Tr2Denoiser;
class Tr2Denoiser extends CjsModel {
  static {
    ({
      e: [_init_bypass, _init_extra_bypass, _init_depthWeight, _init_extra_depthWeight, _init_normalWeight, _init_extra_normalWeight, _init_planeWeight, _init_extra_planeWeight, _init_radius, _init_extra_radius, _init_stepSize, _init_extra_stepSize],
      c: [_Tr2Denoiser, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Denoiser",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.boolean], 16, "bypass"], [[io, io.notify, io, io.persist, type, type.float32], 16, "depthWeight"], [[io, io.notify, io, io.persist, type, type.float32], 16, "normalWeight"], [[io, io.notify, io, io.persist, type, type.float32], 16, "planeWeight"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "radius"], [[io, io.notify, io, io.persist, type, type.uint32], 16, "stepSize"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_stepSize(this);
  }
  /** m_bypass (bool) [READWRITE, PERSIST, NOTIFY] */
  bypass = _init_bypass(this, false);

  /** m_depthWeight (float) [READWRITE, PERSIST, NOTIFY] */
  depthWeight = (_init_extra_bypass(this), _init_depthWeight(this, 100));

  /** m_normalWeight (float) [READWRITE, PERSIST, NOTIFY] */
  normalWeight = (_init_extra_depthWeight(this), _init_normalWeight(this, 1.5));

  /** m_planeWeight (float) [READWRITE, PERSIST, NOTIFY] */
  planeWeight = (_init_extra_normalWeight(this), _init_planeWeight(this, 0));

  /** m_radius (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  radius = (_init_extra_planeWeight(this), _init_radius(this, 5));

  /** m_stepSize (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  stepSize = (_init_extra_radius(this), _init_stepSize(this, 1));
  static {
    _initClass();
  }
}

export { _Tr2Denoiser as Tr2Denoiser };
//# sourceMappingURL=Tr2Denoiser.js.map
