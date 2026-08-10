import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_debug, _init_extra_debug, _init_quality, _init_extra_quality, _init_earlyOutThreshold, _init_extra_earlyOutThreshold;

/**
 * Temporal anti-aliasing settings: quality level, the early-out threshold below
 * which pixels are left alone, and the debug visualization selector.
 */
let _Tr2PPTaaEffect;
new class extends _identity {
  static [class Tr2PPTaaEffect extends _Tr2PPEffect {
    static {
      ({
        e: [_init_debug, _init_extra_debug, _init_quality, _init_extra_quality, _init_earlyOutThreshold, _init_extra_earlyOutThreshold],
        c: [_Tr2PPTaaEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PPTaaEffect",
        family: "postProcess"
      })], [[[io, io.readwrite, type, type.int32, void 0, type.enum("Debug")], 16, "debug"], [[io, io.readwrite, type, type.int32, void 0, type.enum("Quality")], 16, "quality"], [[io, io.readwrite, type, type.float32], 16, "earlyOutThreshold"]], 0, void 0, _Tr2PPEffect));
    }
    constructor(...args) {
      super(...args);
      _init_extra_earlyOutThreshold(this);
    }
    debug = _init_debug(this, _Tr2PPTaaEffect.TAA_DEBUG_OFF);
    quality = (_init_extra_debug(this), _init_quality(this, _Tr2PPTaaEffect.TAA_HIGH));
    earlyOutThreshold = (_init_extra_quality(this), _init_earlyOutThreshold(this, 0.001));

    /**
     * Reports TAA as contributing whenever it is displayed; unlike the other
     * effects it has no intensity or scale to gate on.
     */
    IsActive() {
      return this.display !== false;
    }
  }];
  Quality = Object.freeze({
    TAA_LOW: 1,
    TAA_MEDIUM: 2,
    TAA_HIGH: 3
  });
  Debug = Object.freeze({
    TAA_DEBUG_OFF: 0,
    TAA_DEBUG_MOTION_VECTORS: 1,
    TAA_DEBUG_EARLY_OUT_MASK: 2
  });
  TAA_LOW = 1;
  TAA_MEDIUM = 2;
  TAA_HIGH = 3;
  TAA_DEBUG_OFF = 0;
  TAA_DEBUG_MOTION_VECTORS = 1;
  TAA_DEBUG_EARLY_OUT_MASK = 2;
  constructor() {
    super(_Tr2PPTaaEffect), _initClass();
  }
}();

export { _Tr2PPTaaEffect as Tr2PPTaaEffect };
//# sourceMappingURL=Tr2PPTaaEffect.js.map
