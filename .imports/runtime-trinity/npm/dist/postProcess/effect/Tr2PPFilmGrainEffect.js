import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_colorAmount, _init_extra_colorAmount, _init_grainContrast, _init_extra_grainContrast, _init_grainDensity, _init_extra_grainDensity, _init_intensity, _init_extra_intensity, _init_grainSize, _init_extra_grainSize, _init_brightnessModifier, _init_extra_brightnessModifier, _init_colored, _init_extra_colored;

/** Tr2PPFilmGrainEffect (postProcess) - generated from schema shapeHash e2a61b5a.... */
let _Tr2PPFilmGrainEffect;
class Tr2PPFilmGrainEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_colorAmount, _init_extra_colorAmount, _init_grainContrast, _init_extra_grainContrast, _init_grainDensity, _init_extra_grainDensity, _init_intensity, _init_extra_intensity, _init_grainSize, _init_extra_grainSize, _init_brightnessModifier, _init_extra_brightnessModifier, _init_colored, _init_extra_colored],
      c: [_Tr2PPFilmGrainEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPFilmGrainEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "colorAmount"], [[io, io.persist, type, type.float32], 16, "grainContrast"], [[io, io.persist, type, type.float32], 16, "grainDensity"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.float32], 16, "grainSize"], [[io, io.persist, type, type.float32], 16, "brightnessModifier"], [[io, io.persist, type, type.boolean], 16, "colored"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_colored(this);
  }
  /** m_colorAmount (float) [READWRITE, PERSIST] */
  colorAmount = _init_colorAmount(this, 0.6);

  /** m_grainContrast (float) [READWRITE, PERSIST] */
  grainContrast = (_init_extra_colorAmount(this), _init_grainContrast(this, 4));

  /** m_grainDensity (float) [READWRITE, PERSIST] */
  grainDensity = (_init_extra_grainContrast(this), _init_grainDensity(this, 0.35));

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_grainDensity(this), _init_intensity(this, 0.0008));

  /** m_grainSize (float) [READWRITE, PERSIST] */
  grainSize = (_init_extra_intensity(this), _init_grainSize(this, 1.25));

  /** m_brightnessModifier (float) [READWRITE, PERSIST] */
  brightnessModifier = (_init_extra_grainSize(this), _init_brightnessModifier(this, -3));

  /** m_colored (bool) [READWRITE, PERSIST] */
  colored = (_init_extra_brightnessModifier(this), _init_colored(this, true));

  /** Carbon Tr2PPFilmGrainEffect::IsActive override. */
  IsActive() {
    return this.display && this.intensity > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPFilmGrainEffect as Tr2PPFilmGrainEffect };
//# sourceMappingURL=Tr2PPFilmGrainEffect.js.map
