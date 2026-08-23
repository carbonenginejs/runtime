import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_intensity, _init_extra_intensity, _init_color, _init_extra_color, _init_detail1Scroll, _init_extra_detail1Scroll, _init_detail1Size, _init_extra_detail1Size, _init_detail2Scroll, _init_extra_detail2Scroll, _init_detail2Size, _init_extra_detail2Size, _init_detailPath, _init_extra_detailPath, _init_opacity, _init_extra_opacity, _init_shapePath, _init_extra_shapePath, _init_sineFrequency, _init_extra_sineFrequency, _init_sineMaximum, _init_extra_sineMaximum, _init_sineMinimum, _init_extra_sineMinimum;

/** Tr2PPVignetteEffect (postProcess) - generated from schema shapeHash 8d16cbb2.... */
let _Tr2PPVignetteEffect;
class Tr2PPVignetteEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_intensity, _init_extra_intensity, _init_color, _init_extra_color, _init_detail1Scroll, _init_extra_detail1Scroll, _init_detail1Size, _init_extra_detail1Size, _init_detail2Scroll, _init_extra_detail2Scroll, _init_detail2Size, _init_extra_detail2Size, _init_detailPath, _init_extra_detailPath, _init_opacity, _init_extra_opacity, _init_shapePath, _init_extra_shapePath, _init_sineFrequency, _init_extra_sineFrequency, _init_sineMaximum, _init_extra_sineMaximum, _init_sineMinimum, _init_extra_sineMinimum],
      c: [_Tr2PPVignetteEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPVignetteEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.vec2], 16, "detail1Scroll"], [[io, io.persist, type, type.vec2], 16, "detail1Size"], [[io, io.persist, type, type.vec2], 16, "detail2Scroll"], [[io, io.persist, type, type.vec2], 16, "detail2Size"], [[io, io.persist, type, type.string], 16, "detailPath"], [[io, io.persist, type, type.float32], 16, "opacity"], [[io, io.persist, type, type.string], 16, "shapePath"], [[io, io.persist, type, type.float32], 16, "sineFrequency"], [[io, io.persist, type, type.float32], 16, "sineMaximum"], [[io, io.persist, type, type.float32], 16, "sineMinimum"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sineMinimum(this);
  }
  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = _init_intensity(this, 0);

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_intensity(this), _init_color(this, vec4.fromValues(1, 1, 1, 1)));

  /** m_detail1Scroll (Vector2) [READWRITE, PERSIST] */
  detail1Scroll = (_init_extra_color(this), _init_detail1Scroll(this, vec2.create()));

  /** m_detail1Size (Vector2) [READWRITE, PERSIST] */
  detail1Size = (_init_extra_detail1Scroll(this), _init_detail1Size(this, vec2.fromValues(16, 16)));

  /** m_detail2Scroll (Vector2) [READWRITE, PERSIST] */
  detail2Scroll = (_init_extra_detail1Size(this), _init_detail2Scroll(this, vec2.create()));

  /** m_detail2Size (Vector2) [READWRITE, PERSIST] */
  detail2Size = (_init_extra_detail2Scroll(this), _init_detail2Size(this, vec2.fromValues(16, 16)));

  /** m_detailPath (BlueSharedString) [READWRITE, PERSIST] */
  detailPath = (_init_extra_detail2Size(this), _init_detailPath(this, "res:/texture/global/white.dds"));

  /** m_opacity (float) [READWRITE, PERSIST] */
  opacity = (_init_extra_detailPath(this), _init_opacity(this, 0));

  /** m_shapePath (BlueSharedString) [READWRITE, PERSIST] */
  shapePath = (_init_extra_opacity(this), _init_shapePath(this, "res:/texture/global/black.dds"));

  /** m_sineFrequency (float) [READWRITE, PERSIST] */
  sineFrequency = (_init_extra_shapePath(this), _init_sineFrequency(this, 1));

  /** m_sineMaximum (float) [READWRITE, PERSIST] */
  sineMaximum = (_init_extra_sineFrequency(this), _init_sineMaximum(this, 1));

  /** m_sineMinimum (float) [READWRITE, PERSIST] */
  sineMinimum = (_init_extra_sineMaximum(this), _init_sineMinimum(this, 0));

  /** Carbon Tr2PPVignetteEffect::IsActive override. */
  IsActive() {
    return this.display && this.intensity > 0 && this.opacity > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPVignetteEffect as Tr2PPVignetteEffect };
//# sourceMappingURL=Tr2PPVignetteEffect.js.map
