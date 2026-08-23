import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_debug, _init_extra_debug, _init_adjustment, _init_extra_adjustment, _init_influence, _init_extra_influence, _init_minBrightness, _init_extra_minBrightness, _init_maxLuminance, _init_extra_maxLuminance, _init_maxExposure, _init_extra_maxExposure, _init_middleValue, _init_extra_middleValue, _init_minLuminance, _init_extra_minLuminance, _init_minExposure, _init_extra_minExposure, _init_decreaseSpeed, _init_extra_decreaseSpeed, _init_increaseSpeed, _init_extra_increaseSpeed, _init_maxBrightness, _init_extra_maxBrightness;

/** Tr2PPDynamicExposureEffect (postProcess) - generated from schema shapeHash a2cdf599.... */
let _Tr2PPDynamicExposure;
class Tr2PPDynamicExposureEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_debug, _init_extra_debug, _init_adjustment, _init_extra_adjustment, _init_influence, _init_extra_influence, _init_minBrightness, _init_extra_minBrightness, _init_maxLuminance, _init_extra_maxLuminance, _init_maxExposure, _init_extra_maxExposure, _init_middleValue, _init_extra_middleValue, _init_minLuminance, _init_extra_minLuminance, _init_minExposure, _init_extra_minExposure, _init_decreaseSpeed, _init_extra_decreaseSpeed, _init_increaseSpeed, _init_extra_increaseSpeed, _init_maxBrightness, _init_extra_maxBrightness],
      c: [_Tr2PPDynamicExposure, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPDynamicExposureEffect",
      family: "postProcess"
    })], [[[io, io.readwrite, type, type.boolean], 16, "debug"], [[io, io.persist, type, type.float32], 16, "adjustment"], [[io, io.persist, type, type.float32], 16, "influence"], [[io, io.persist, type, type.float32], 16, "minBrightness"], [[io, io.persist, type, type.float32], 16, "maxLuminance"], [[io, io.persist, type, type.float32], 16, "maxExposure"], [[io, io.persist, type, type.float32], 16, "middleValue"], [[io, io.persist, type, type.float32], 16, "minLuminance"], [[io, io.persist, type, type.float32], 16, "minExposure"], [[io, io.persist, type, type.float32], 16, "decreaseSpeed"], [[io, io.persist, type, type.float32], 16, "increaseSpeed"], [[io, io.persist, type, type.float32], 16, "maxBrightness"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_maxBrightness(this);
  }
  /** m_debug (bool) [READWRITE] */
  debug = _init_debug(this, false);

  /** m_adjustment (float) [READWRITE, PERSIST] */
  adjustment = (_init_extra_debug(this), _init_adjustment(this, 0));

  /** m_influence (float) [READWRITE, PERSIST] */
  influence = (_init_extra_adjustment(this), _init_influence(this, 1));

  /** m_minBrightness (float) [READWRITE, PERSIST] */
  minBrightness = (_init_extra_influence(this), _init_minBrightness(this, 0.9));

  /** m_maxLuminance (float) [READWRITE, PERSIST] */
  maxLuminance = (_init_extra_minBrightness(this), _init_maxLuminance(this, 10));

  /** m_maxExposure (float) [READWRITE, PERSIST] */
  maxExposure = (_init_extra_maxLuminance(this), _init_maxExposure(this, 10));

  /** m_middleValue (float) [READWRITE, PERSIST] */
  middleValue = (_init_extra_maxExposure(this), _init_middleValue(this, 0.55));

  /** m_minLuminance (float) [READWRITE, PERSIST] */
  minLuminance = (_init_extra_middleValue(this), _init_minLuminance(this, 0.4649));

  /** m_minExposure (float) [READWRITE, PERSIST] */
  minExposure = (_init_extra_minLuminance(this), _init_minExposure(this, -3.7));

  /** m_decreaseSpeed (float) [READWRITE, PERSIST] */
  decreaseSpeed = (_init_extra_minExposure(this), _init_decreaseSpeed(this, 1.5));

  /** m_increaseSpeed (float) [READWRITE, PERSIST] */
  increaseSpeed = (_init_extra_decreaseSpeed(this), _init_increaseSpeed(this, 2));

  /** m_maxBrightness (float) [READWRITE, PERSIST] */
  maxBrightness = (_init_extra_increaseSpeed(this), _init_maxBrightness(this, 0.98));
  static {
    _initClass();
  }
}

export { _Tr2PPDynamicExposure as Tr2PPDynamicExposureEffect };
//# sourceMappingURL=Tr2PPDynamicExposureEffect.js.map
