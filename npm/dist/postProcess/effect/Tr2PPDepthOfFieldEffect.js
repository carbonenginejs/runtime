import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, schema } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';

let _initClass, _init_bokehShape, _init_extra_bokehShape, _init_scale, _init_extra_scale, _init_cocScale, _init_extra_cocScale, _init_useTAAFriendlyBokeh, _init_extra_useTAAFriendlyBokeh, _init_focalLength, _init_extra_focalLength, _init_foregroundBlurNeeded, _init_extra_foregroundBlurNeeded, _init_focalDistance, _init_extra_focalDistance;

/**
 * Depth-of-field parameters - focal distance and length, circle-of-confusion and
 * blur scale, bokeh shape - plus the process-wide switch that enables the effect
 * at all.
 */
let _Tr2PPDepthOfFieldEff;
new class extends _identity {
  static [class Tr2PPDepthOfFieldEffect extends _Tr2PPEffect {
    static {
      ({
        e: [_init_bokehShape, _init_extra_bokehShape, _init_scale, _init_extra_scale, _init_cocScale, _init_extra_cocScale, _init_useTAAFriendlyBokeh, _init_extra_useTAAFriendlyBokeh, _init_focalLength, _init_extra_focalLength, _init_foregroundBlurNeeded, _init_extra_foregroundBlurNeeded, _init_focalDistance, _init_extra_focalDistance],
        c: [_Tr2PPDepthOfFieldEff, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PPDepthOfFieldEffect",
        family: "postProcess"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Shape")], 16, "bokehShape"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.readwrite, type, type.float32], 16, "cocScale"], [[io, io.readwrite, type, type.boolean], 16, "useTAAFriendlyBokeh"], [[io, io.persist, type, type.float32], 16, "focalLength"], [[io, io.persist, type, type.boolean], 16, "foregroundBlurNeeded"], [[io, io.persist, type, type.float32], 16, "focalDistance"]], 0, void 0, _Tr2PPEffect));
    }
    constructor(...args) {
      super(...args);
      _init_extra_focalDistance(this);
    }
    bokehShape = _init_bokehShape(this, _Tr2PPDepthOfFieldEff.Disk);
    scale = (_init_extra_bokehShape(this), _init_scale(this, 0));
    cocScale = (_init_extra_scale(this), _init_cocScale(this, 1));
    useTAAFriendlyBokeh = (_init_extra_cocScale(this), _init_useTAAFriendlyBokeh(this, true));
    focalLength = (_init_extra_useTAAFriendlyBokeh(this), _init_focalLength(this, 0));
    foregroundBlurNeeded = (_init_extra_focalLength(this), _init_foregroundBlurNeeded(this, true));
    focalDistance = (_init_extra_foregroundBlurNeeded(this), _init_focalDistance(this, 0));

    /**
     * Returns the shader define name for the selected bokeh shape, falling back to
     * the disk shape for an unknown value.
     */
    GetBokehShapeString() {
      return _Tr2PPDepthOfFieldEff.BokehShapeStrings[this.bokehShape] ?? _Tr2PPDepthOfFieldEff.BokehShapeStrings[_Tr2PPDepthOfFieldEff.Disk];
    }

    /**
     * Reports depth of field as contributing only when the process-wide switch is
     * on, the effect is displayed, and its blur scale is positive.
     */
    IsActive() {
      return _Tr2PPDepthOfFieldEff.PostProcessDofEnabled && this.display !== false && Number(this.scale) > 0;
    }
  }];
  PostProcessDofEnabled = false;
  Shape = Object.freeze({
    Disk: 0,
    Triangle: 1,
    Rectangle: 2,
    Pentagon: 3,
    Hexagon: 4,
    Heart: 5
  });
  Disk = 0;
  Triangle = 1;
  Rectangle = 2;
  Pentagon = 3;
  Hexagon = 4;
  Heart = 5;
  BokehShapeStrings = Object.freeze(["BOKEH_SHAPE_DISK", "BOKEH_SHAPE_TRIANGLE", "BOKEH_SHAPE_RECTANGLE", "BOKEH_SHAPE_PENTAGON", "BOKEH_SHAPE_HEXAGON", "BOKEH_SHAPE_HEART"]);
  constructor() {
    super(_Tr2PPDepthOfFieldEff), _initClass();
  }
}();

export { _Tr2PPDepthOfFieldEff as Tr2PPDepthOfFieldEffect };
//# sourceMappingURL=Tr2PPDepthOfFieldEffect.js.map
