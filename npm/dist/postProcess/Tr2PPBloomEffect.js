import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_directionalWeight, _init_extra_directionalWeight, _init_steps, _init_extra_steps, _init_sizeScale, _init_extra_sizeScale, _init_step1Size, _init_extra_step1Size, _init_step1Tint, _init_extra_step1Tint, _init_step2Size, _init_extra_step2Size, _init_step2Tint, _init_extra_step2Tint, _init_step3Size, _init_extra_step3Size, _init_step3Tint, _init_extra_step3Tint, _init_step4Size, _init_extra_step4Size, _init_step4Tint, _init_extra_step4Tint, _init_step5Size, _init_extra_step5Size, _init_step5Tint, _init_extra_step5Tint, _init_step6Size, _init_extra_step6Size, _init_step6Tint, _init_extra_step6Tint, _init_brightness, _init_extra_brightness, _init_exposureDependency, _init_extra_exposureDependency, _init_grimePath, _init_extra_grimePath, _init_grimeWeight, _init_extra_grimeWeight, _init_luminanceScale, _init_extra_luminanceScale, _init_luminanceThreshold, _init_extra_luminanceThreshold;

/**
 * Six-step bloom parameters: per-step blur size and tint, overall brightness and
 * size scale, luminance thresholding, and the grime texture overlaid on the
 * result.
 */
let _Tr2PPBloomEffect;
class Tr2PPBloomEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_directionalWeight, _init_extra_directionalWeight, _init_steps, _init_extra_steps, _init_sizeScale, _init_extra_sizeScale, _init_step1Size, _init_extra_step1Size, _init_step1Tint, _init_extra_step1Tint, _init_step2Size, _init_extra_step2Size, _init_step2Tint, _init_extra_step2Tint, _init_step3Size, _init_extra_step3Size, _init_step3Tint, _init_extra_step3Tint, _init_step4Size, _init_extra_step4Size, _init_step4Tint, _init_extra_step4Tint, _init_step5Size, _init_extra_step5Size, _init_step5Tint, _init_extra_step5Tint, _init_step6Size, _init_extra_step6Size, _init_step6Tint, _init_extra_step6Tint, _init_brightness, _init_extra_brightness, _init_exposureDependency, _init_extra_exposureDependency, _init_grimePath, _init_extra_grimePath, _init_grimeWeight, _init_extra_grimeWeight, _init_luminanceScale, _init_extra_luminanceScale, _init_luminanceThreshold, _init_extra_luminanceThreshold],
      c: [_Tr2PPBloomEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPBloomEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "directionalWeight"], [[io, io.notify, io, io.readwrite, type, type.int32], 16, "steps"], [[io, io.persist, type, type.float32], 16, "sizeScale"], [[io, io.persist, type, type.float32], 16, "step1Size"], [[io, io.persist, type, type.color], 16, "step1Tint"], [[io, io.persist, type, type.float32], 16, "step2Size"], [[io, io.persist, type, type.color], 16, "step2Tint"], [[io, io.persist, type, type.float32], 16, "step3Size"], [[io, io.persist, type, type.color], 16, "step3Tint"], [[io, io.persist, type, type.float32], 16, "step4Size"], [[io, io.persist, type, type.color], 16, "step4Tint"], [[io, io.persist, type, type.float32], 16, "step5Size"], [[io, io.persist, type, type.color], 16, "step5Tint"], [[io, io.persist, type, type.float32], 16, "step6Size"], [[io, io.persist, type, type.color], 16, "step6Tint"], [[io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.boolean], 16, "exposureDependency"], [[io, io.persist, type, type.string], 16, "grimePath"], [[io, io.persist, type, type.float32], 16, "grimeWeight"], [[io, io.persist, type, type.float32], 16, "luminanceScale"], [[io, io.persist, type, type.float32], 16, "luminanceThreshold"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_luminanceThreshold(this);
  }
  directionalWeight = _init_directionalWeight(this, 0);
  steps = (_init_extra_directionalWeight(this), _init_steps(this, 6));
  sizeScale = (_init_extra_steps(this), _init_sizeScale(this, 4));
  step1Size = (_init_extra_sizeScale(this), _init_step1Size(this, 0.3));
  step1Tint = (_init_extra_step1Size(this), _init_step1Tint(this, vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465)));
  step2Size = (_init_extra_step1Tint(this), _init_step2Size(this, 1));
  step2Tint = (_init_extra_step2Size(this), _init_step2Tint(this, vec4.fromValues(0.138, 0.138, 0.138, 0.138)));
  step3Size = (_init_extra_step2Tint(this), _init_step3Size(this, 2));
  step3Tint = (_init_extra_step3Size(this), _init_step3Tint(this, vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176)));
  step4Size = (_init_extra_step3Tint(this), _init_step4Size(this, 10));
  step4Tint = (_init_extra_step4Size(this), _init_step4Tint(this, vec4.fromValues(0.066, 0.066, 0.066, 0.066)));
  step5Size = (_init_extra_step4Tint(this), _init_step5Size(this, 30));
  step5Tint = (_init_extra_step5Size(this), _init_step5Tint(this, vec4.fromValues(0.066, 0.066, 0.066, 0.066)));
  step6Size = (_init_extra_step5Tint(this), _init_step6Size(this, 64));
  step6Tint = (_init_extra_step6Size(this), _init_step6Tint(this, vec4.fromValues(0.061, 0.061, 0.061, 0.061)));
  brightness = (_init_extra_step6Tint(this), _init_brightness(this, 0.2));
  exposureDependency = (_init_extra_brightness(this), _init_exposureDependency(this, false));
  grimePath = (_init_extra_exposureDependency(this), _init_grimePath(this, "res:/texture/global/black.dds"));
  grimeWeight = (_init_extra_grimePath(this), _init_grimeWeight(this, 0));
  luminanceScale = (_init_extra_grimeWeight(this), _init_luminanceScale(this, 0.5));
  luminanceThreshold = (_init_extra_luminanceScale(this), _init_luminanceThreshold(this, -1));
  static {
    _initClass();
  }
}

export { _Tr2PPBloomEffect as Tr2PPBloomEffect };
//# sourceMappingURL=Tr2PPBloomEffect.js.map
