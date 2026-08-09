import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { Tr2PPEffect as _Tr2PPEffect } from './Tr2PPEffect.js';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initClass, _init_intensity, _init_extra_intensity, _init_totalAmount, _init_extra_totalAmount, _init_totalPower, _init_extra_totalPower, _init_backgroundOcclusion, _init_extra_backgroundOcclusion, _init_brightnessThreshold, _init_extra_brightnessThreshold, _init_brightnessThreshold2, _init_extra_brightnessThreshold2, _init_brightnessAdjustmentAmount, _init_extra_brightnessAdjustmentAmount, _init_blendDistance, _init_extra_blendDistance, _init_blendBias, _init_extra_blendBias, _init_blendAmount, _init_extra_blendAmount, _init_blendPower, _init_extra_blendPower, _init_blendDistance2, _init_extra_blendDistance2, _init_blendBias2, _init_extra_blendBias2, _init_blendAmount2, _init_extra_blendAmount2, _init_blendPower2, _init_extra_blendPower2, _init_blendDistance3, _init_extra_blendDistance3, _init_blendBias3, _init_extra_blendBias3, _init_blendAmount3, _init_extra_blendAmount3, _init_blendPower3, _init_extra_blendPower3, _init_areaSize, _init_extra_areaSize, _init_areaScale, _init_extra_areaScale, _init_areaCenter, _init_extra_areaCenter, _init_colorInfluence, _init_extra_colorInfluence, _init_color, _init_extra_color, _init_nebulaInfluence, _init_extra_nebulaInfluence, _init_nebulaBlur, _init_extra_nebulaBlur, _init_originalBrightenOnly, _init_extra_originalBrightenOnly;

/** Tr2PPFogEffect (postProcess) - generated from schema shapeHash e09c106e.... */
let _Tr2PPFogEffect;
class Tr2PPFogEffect extends _Tr2PPEffect {
  static {
    ({
      e: [_init_intensity, _init_extra_intensity, _init_totalAmount, _init_extra_totalAmount, _init_totalPower, _init_extra_totalPower, _init_backgroundOcclusion, _init_extra_backgroundOcclusion, _init_brightnessThreshold, _init_extra_brightnessThreshold, _init_brightnessThreshold2, _init_extra_brightnessThreshold2, _init_brightnessAdjustmentAmount, _init_extra_brightnessAdjustmentAmount, _init_blendDistance, _init_extra_blendDistance, _init_blendBias, _init_extra_blendBias, _init_blendAmount, _init_extra_blendAmount, _init_blendPower, _init_extra_blendPower, _init_blendDistance2, _init_extra_blendDistance2, _init_blendBias2, _init_extra_blendBias2, _init_blendAmount2, _init_extra_blendAmount2, _init_blendPower2, _init_extra_blendPower2, _init_blendDistance3, _init_extra_blendDistance3, _init_blendBias3, _init_extra_blendBias3, _init_blendAmount3, _init_extra_blendAmount3, _init_blendPower3, _init_extra_blendPower3, _init_areaSize, _init_extra_areaSize, _init_areaScale, _init_extra_areaScale, _init_areaCenter, _init_extra_areaCenter, _init_colorInfluence, _init_extra_colorInfluence, _init_color, _init_extra_color, _init_nebulaInfluence, _init_extra_nebulaInfluence, _init_nebulaBlur, _init_extra_nebulaBlur, _init_originalBrightenOnly, _init_extra_originalBrightenOnly],
      c: [_Tr2PPFogEffect, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PPFogEffect",
      family: "postProcess"
    })], [[[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.float32], 16, "totalAmount"], [[io, io.persist, type, type.float32], 16, "totalPower"], [[io, io.persist, type, type.float32], 16, "backgroundOcclusion"], [[io, io.persist, type, type.float32], 16, "brightnessThreshold0"], [[io, io.persist, type, type.float32], 16, "brightnessThreshold1"], [[io, io.persist, type, type.float32], 16, "brightnessAdjustmentAmount"], [[io, io.persist, type, type.float32], 16, "blendDistance0"], [[io, io.persist, type, type.float32], 16, "blendBias0"], [[io, io.persist, type, type.float32], 16, "blendAmount0"], [[io, io.persist, type, type.float32], 16, "blendPower0"], [[io, io.persist, type, type.float32], 16, "blendDistance1"], [[io, io.persist, type, type.float32], 16, "blendBias1"], [[io, io.persist, type, type.float32], 16, "blendAmount1"], [[io, io.persist, type, type.float32], 16, "blendPower1"], [[io, io.persist, type, type.float32], 16, "blendDistance2"], [[io, io.persist, type, type.float32], 16, "blendBias2"], [[io, io.persist, type, type.float32], 16, "blendAmount2"], [[io, io.persist, type, type.float32], 16, "blendPower2"], [[io, io.persist, type, type.vec3], 16, "areaSize"], [[io, io.persist, type, type.vec2], 16, "areaScale"], [[io, io.persist, type, type.vec3], 16, "areaCenter"], [[io, io.persist, type, type.float32], 16, "colorInfluence"], [[io, io.persist, type, type.color], 16, "color"], [[io, io.persist, type, type.float32], 16, "nebulaInfluence"], [[io, io.persist, type, type.float32], 16, "nebulaBlur"], [[io, io.persist, type, type.float32], 16, "originalBrightenOnly"]], 0, void 0, _Tr2PPEffect));
  }
  constructor(...args) {
    super(...args);
    _init_extra_originalBrightenOnly(this);
  }
  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = _init_intensity(this, 1);

  /** m_totalAmount (float) [READWRITE, PERSIST] */
  totalAmount = (_init_extra_intensity(this), _init_totalAmount(this, 0));

  /** m_totalPower (float) [READWRITE, PERSIST] */
  totalPower = (_init_extra_totalAmount(this), _init_totalPower(this, 1));

  /** m_backgroundOcclusion (float) [READWRITE, PERSIST] */
  backgroundOcclusion = (_init_extra_totalPower(this), _init_backgroundOcclusion(this, 1));

  /** m_brightnessThreshold0 (float) [READWRITE, PERSIST] */
  brightnessThreshold0 = (_init_extra_backgroundOcclusion(this), _init_brightnessThreshold(this, 0));

  /** m_brightnessThreshold1 (float) [READWRITE, PERSIST] */
  brightnessThreshold1 = (_init_extra_brightnessThreshold(this), _init_brightnessThreshold2(this, 0.5));

  /** m_brightnessAdjustmentAmount (float) [READWRITE, PERSIST] */
  brightnessAdjustmentAmount = (_init_extra_brightnessThreshold2(this), _init_brightnessAdjustmentAmount(this, 1));

  /** m_blendDistance0 (float) [READWRITE, PERSIST] */
  blendDistance0 = (_init_extra_brightnessAdjustmentAmount(this), _init_blendDistance(this, 2000));

  /** m_blendBias0 (float) [READWRITE, PERSIST] */
  blendBias0 = (_init_extra_blendDistance(this), _init_blendBias(this, 0));

  /** m_blendAmount0 (float) [READWRITE, PERSIST] */
  blendAmount0 = (_init_extra_blendBias(this), _init_blendAmount(this, 0.2));

  /** m_blendPower0 (float) [READWRITE, PERSIST] */
  blendPower0 = (_init_extra_blendAmount(this), _init_blendPower(this, 2));

  /** m_blendDistance1 (float) [READWRITE, PERSIST] */
  blendDistance1 = (_init_extra_blendPower(this), _init_blendDistance2(this, 25000));

  /** m_blendBias1 (float) [READWRITE, PERSIST] */
  blendBias1 = (_init_extra_blendDistance2(this), _init_blendBias2(this, 0.6));

  /** m_blendAmount1 (float) [READWRITE, PERSIST] */
  blendAmount1 = (_init_extra_blendBias2(this), _init_blendAmount2(this, 0.35));

  /** m_blendPower1 (float) [READWRITE, PERSIST] */
  blendPower1 = (_init_extra_blendAmount2(this), _init_blendPower2(this, 1));

  /** m_blendDistance2 (float) [READWRITE, PERSIST] */
  blendDistance2 = (_init_extra_blendPower2(this), _init_blendDistance3(this, 120000));

  /** m_blendBias2 (float) [READWRITE, PERSIST] */
  blendBias2 = (_init_extra_blendDistance3(this), _init_blendBias3(this, 1));

  /** m_blendAmount2 (float) [READWRITE, PERSIST] */
  blendAmount2 = (_init_extra_blendBias3(this), _init_blendAmount3(this, 0.5));

  /** m_blendPower2 (float) [READWRITE, PERSIST] */
  blendPower2 = (_init_extra_blendAmount3(this), _init_blendPower3(this, 0.2));

  /** m_areaSize (Vector3) [READWRITE, PERSIST] */
  areaSize = (_init_extra_blendPower3(this), _init_areaSize(this, vec3.fromValues(69142.0859375, 13828.4169922, 66337.203125)));

  /** m_areaScale (Vector2) [READWRITE, PERSIST] */
  areaScale = (_init_extra_areaSize(this), _init_areaScale(this, vec2.fromValues(30, 20)));

  /** m_areaCenter (Vector3) [READWRITE, PERSIST] */
  areaCenter = (_init_extra_areaScale(this), _init_areaCenter(this, vec3.fromValues(-27042.2988281, -633.4446411, 11896.0957031)));

  /** m_colorInfluence (float) [READWRITE, PERSIST] */
  colorInfluence = (_init_extra_areaCenter(this), _init_colorInfluence(this, 0.125));

  /** m_color (Color) [READWRITE, PERSIST] */
  color = (_init_extra_colorInfluence(this), _init_color(this, vec4.fromValues(1, 0.4235294, 0, 1)));

  /** m_nebulaInfluence (float) [READWRITE, PERSIST] */
  nebulaInfluence = (_init_extra_color(this), _init_nebulaInfluence(this, 0.5));

  /** m_nebulaBlur (float) [READWRITE, PERSIST] */
  nebulaBlur = (_init_extra_nebulaInfluence(this), _init_nebulaBlur(this, 7));

  /** m_originalBrightenOnly (float) [READWRITE, PERSIST] */
  originalBrightenOnly = (_init_extra_nebulaBlur(this), _init_originalBrightenOnly(this, 0.5));

  /** Carbon Tr2PPFogEffect::IsActive override. */
  IsActive() {
    return this.display && this.intensity > 0;
  }
  static {
    _initClass();
  }
}

export { _Tr2PPFogEffect as Tr2PPFogEffect };
//# sourceMappingURL=Tr2PPFogEffect.js.map
