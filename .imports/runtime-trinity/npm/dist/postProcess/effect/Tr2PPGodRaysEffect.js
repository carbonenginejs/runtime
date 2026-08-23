import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_godRayColor, _init_extra_godRayColor, _init_intensity, _init_extra_intensity, _init_noiseTexturePath, _init_extra_noiseTexturePath;

/** Tr2PPGodRaysEffect (postProcess) - generated from schema shapeHash 14c380e1.... */
let _Tr2PPGodRaysEffect;
class Tr2PPGodRaysEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_godRayColor, _init_extra_godRayColor, _init_intensity, _init_extra_intensity, _init_noiseTexturePath, _init_extra_noiseTexturePath],
      c: [_Tr2PPGodRaysEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPGodRaysEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.color], 16, "godRayColor"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.string], 16, "noiseTexturePath"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_noiseTexturePath(this);
  }
  /** m_godRayColor (Color) [READWRITE, PERSIST] */
  godRayColor = _init_godRayColor(this, vec4.fromValues(1, 1, 1, 1));

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_godRayColor(this), _init_intensity(this, 0));

  /** m_noiseTexturePath (BlueSharedString) [READWRITE, PERSIST] */
  noiseTexturePath = (_init_extra_intensity(this), _init_noiseTexturePath(this, "res:/Texture/Global/noise.dds"));

  /** Carbon Tr2PPGodRaysEffect::IsActive override. */
  IsActive() {
    return this.display && this.intensity > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPGodRaysEffect as Tr2PPGodRaysEffect };
//# sourceMappingURL=Tr2PPGodRaysEffect.js.map
