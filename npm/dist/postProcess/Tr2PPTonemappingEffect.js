import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_method, _init_extra_method, _init_toe, _init_extra_toe, _init_shoulder, _init_extra_shoulder, _init_blackClip, _init_extra_blackClip, _init_whiteClip, _init_extra_whiteClip, _init_blueCorrection, _init_extra_blueCorrection, _init_slope, _init_extra_slope, _init_scale, _init_extra_scale, _init_useSweeteners, _init_extra_useSweeteners, _init_shoulderStrength, _init_extra_shoulderStrength, _init_linearStrength, _init_extra_linearStrength, _init_linearAngle, _init_extra_linearAngle, _init_toeStrength, _init_extra_toeStrength, _init_toeNumerator, _init_extra_toeNumerator, _init_toeDenominator, _init_extra_toeDenominator, _init_whiteScale, _init_extra_whiteScale;

/**
 * Tonemapping curve selection - Uncharted2, ACES or AgX - together with the toe,
 * shoulder and clipping parameters that shape it.
 */
let _Tr2PPTonemappingEffe;
new class extends _identity {
  static [class Tr2PPTonemappingEffect extends _Tr2PPEffect {
    static {
      ({
        e: [_init_method, _init_extra_method, _init_toe, _init_extra_toe, _init_shoulder, _init_extra_shoulder, _init_blackClip, _init_extra_blackClip, _init_whiteClip, _init_extra_whiteClip, _init_blueCorrection, _init_extra_blueCorrection, _init_slope, _init_extra_slope, _init_scale, _init_extra_scale, _init_useSweeteners, _init_extra_useSweeteners, _init_shoulderStrength, _init_extra_shoulderStrength, _init_linearStrength, _init_extra_linearStrength, _init_linearAngle, _init_extra_linearAngle, _init_toeStrength, _init_extra_toeStrength, _init_toeNumerator, _init_extra_toeNumerator, _init_toeDenominator, _init_extra_toeDenominator, _init_whiteScale, _init_extra_whiteScale],
        c: [_Tr2PPTonemappingEffe, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PPTonemappingEffect",
        family: "postProcess"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Method")], 16, "method"], [[io, io.persist, type, type.float32], 16, "toe"], [[io, io.persist, type, type.float32], 16, "shoulder"], [[io, io.persist, type, type.float32], 16, "blackClip"], [[io, io.persist, type, type.float32], 16, "whiteClip"], [[io, io.persist, type, type.float32], 16, "blueCorrection"], [[io, io.persist, type, type.float32], 16, "slope"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.persist, type, type.boolean], 16, "useSweeteners"], [[io, io.persist, type, type.float32], 16, "shoulderStrength"], [[io, io.persist, type, type.float32], 16, "linearStrength"], [[io, io.persist, type, type.float32], 16, "linearAngle"], [[io, io.persist, type, type.float32], 16, "toeStrength"], [[io, io.persist, type, type.float32], 16, "toeNumerator"], [[io, io.persist, type, type.float32], 16, "toeDenominator"], [[io, io.persist, type, type.float32], 16, "whiteScale"]], 0, void 0, _Tr2PPEffect));
    }
    constructor(...args) {
      super(...args);
      _init_extra_whiteScale(this);
    }
    method = _init_method(this, _Tr2PPTonemappingEffe.Aces);
    toe = (_init_extra_method(this), _init_toe(this, 0.55));
    shoulder = (_init_extra_toe(this), _init_shoulder(this, 0.26));
    blackClip = (_init_extra_shoulder(this), _init_blackClip(this, 0));
    whiteClip = (_init_extra_blackClip(this), _init_whiteClip(this, 0.04));
    blueCorrection = (_init_extra_whiteClip(this), _init_blueCorrection(this, 0));
    slope = (_init_extra_blueCorrection(this), _init_slope(this, 0.88));
    scale = (_init_extra_slope(this), _init_scale(this, 1));
    useSweeteners = (_init_extra_scale(this), _init_useSweeteners(this, true));
    shoulderStrength = (_init_extra_useSweeteners(this), _init_shoulderStrength(this, 0.125));
    linearStrength = (_init_extra_shoulderStrength(this), _init_linearStrength(this, 0.25));
    linearAngle = (_init_extra_linearStrength(this), _init_linearAngle(this, 0.1));
    toeStrength = (_init_extra_linearAngle(this), _init_toeStrength(this, 0.15));
    toeNumerator = (_init_extra_toeStrength(this), _init_toeNumerator(this, 0.021));
    toeDenominator = (_init_extra_toeNumerator(this), _init_toeDenominator(this, 0.3));
    whiteScale = (_init_extra_toeDenominator(this), _init_whiteScale(this, 2.5));
  }];
  Method = Object.freeze({
    Uncharted2: 0,
    Aces: 1,
    AgX: 2
  });
  Uncharted2 = 0;
  Aces = 1;
  AgX = 2;
  constructor() {
    super(_Tr2PPTonemappingEffe), _initClass();
  }
}();

export { _Tr2PPTonemappingEffe as Tr2PPTonemappingEffect };
//# sourceMappingURL=Tr2PPTonemappingEffect.js.map
