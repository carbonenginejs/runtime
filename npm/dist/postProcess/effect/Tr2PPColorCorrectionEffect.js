import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_whiteTint, _init_extra_whiteTint, _init_colorSaturation, _init_extra_colorSaturation, _init_colorContrast, _init_extra_colorContrast, _init_colorGamma, _init_extra_colorGamma, _init_colorGain, _init_extra_colorGain, _init_colorOffset, _init_extra_colorOffset, _init_whiteTemperature, _init_extra_whiteTemperature;

/** Tr2PPColorCorrectionEffect (postProcess) - generated from schema shapeHash c6c9f3ca.... */
let _Tr2PPColorCorrection;
class Tr2PPColorCorrectionEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_whiteTint, _init_extra_whiteTint, _init_colorSaturation, _init_extra_colorSaturation, _init_colorContrast, _init_extra_colorContrast, _init_colorGamma, _init_extra_colorGamma, _init_colorGain, _init_extra_colorGain, _init_colorOffset, _init_extra_colorOffset, _init_whiteTemperature, _init_extra_whiteTemperature],
      c: [_Tr2PPColorCorrection, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPColorCorrectionEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "whiteTint"], [[io, io.persist, type, type.float32], 16, "colorSaturation"], [[io, io.persist, type, type.float32], 16, "colorContrast"], [[io, io.persist, type, type.float32], 16, "colorGamma"], [[io, io.persist, type, type.vec3], 16, "colorGain"], [[io, io.persist, type, type.vec3], 16, "colorOffset"], [[io, io.persist, type, type.float32], 16, "whiteTemperature"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_whiteTemperature(this);
  }
  /** m_whiteTint (float) [READWRITE, PERSIST] */
  whiteTint = _init_whiteTint(this, 0);

  /** m_colorSaturation (float) [READWRITE, PERSIST] */
  colorSaturation = (_init_extra_whiteTint(this), _init_colorSaturation(this, 1));

  /** m_colorContrast (float) [READWRITE, PERSIST] */
  colorContrast = (_init_extra_colorSaturation(this), _init_colorContrast(this, 1));

  /** m_colorGamma (float) [READWRITE, PERSIST] */
  colorGamma = (_init_extra_colorContrast(this), _init_colorGamma(this, 1));

  /** m_colorGain (Vector3) [READWRITE, PERSIST] */
  colorGain = (_init_extra_colorGamma(this), _init_colorGain(this, vec3.fromValues(1, 1, 1)));

  /** m_colorOffset (Vector3) [READWRITE, PERSIST] */
  colorOffset = (_init_extra_colorGain(this), _init_colorOffset(this, vec3.create()));

  /** m_whiteTemperature (float) [READWRITE, PERSIST] */
  whiteTemperature = (_init_extra_colorOffset(this), _init_whiteTemperature(this, 6500));
  static {
    _initClass();
  }
}

export { _Tr2PPColorCorrection as Tr2PPColorCorrectionEffect };
//# sourceMappingURL=Tr2PPColorCorrectionEffect.js.map
