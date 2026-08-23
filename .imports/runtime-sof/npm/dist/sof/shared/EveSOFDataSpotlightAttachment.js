import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initClass, _init_saturation, _init_extra_saturation, _init_intensity, _init_extra_intensity, _init_translation, _init_extra_translation, _init_innerAngleMultiplier, _init_extra_innerAngleMultiplier, _init_outerAngleMultiplier, _init_extra_outerAngleMultiplier, _init_innerScaleMultiplier, _init_extra_innerScaleMultiplier, _init_outerScaleMultiplier, _init_extra_outerScaleMultiplier, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_lightProfilePath, _init_extra_lightProfilePath;

/** EveSOFDataSpotLightAttachment (eve) - generated from schema shapeHash ace3b68a.... */
let _EveSOFDataSpotLightA;
class EveSOFDataSpotLightAttachment extends CjsModel {
  static {
    ({
      e: [_init_saturation, _init_extra_saturation, _init_intensity, _init_extra_intensity, _init_translation, _init_extra_translation, _init_innerAngleMultiplier, _init_extra_innerAngleMultiplier, _init_outerAngleMultiplier, _init_extra_outerAngleMultiplier, _init_innerScaleMultiplier, _init_extra_innerScaleMultiplier, _init_outerScaleMultiplier, _init_extra_outerScaleMultiplier, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiseOctaves, _init_extra_noiseOctaves, _init_lightProfilePath, _init_extra_lightProfilePath],
      c: [_EveSOFDataSpotLightA, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataSpotLightAttachment",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.float32], 16, "innerAngleMultiplier"], [[io, io.persist, type, type.float32], 16, "outerAngleMultiplier"], [[io, io.persist, type, type.float32], 16, "innerScaleMultiplier"], [[io, io.persist, type, type.float32], 16, "outerScaleMultiplier"], [[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.int32], 16, "noiseOctaves"], [[io, io.persist, type, type.string], 16, "lightProfilePath"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lightProfilePath(this);
  }
  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = _init_saturation(this, 1);

  /** m_intensity (float) [READWRITE, PERSIST] */
  intensity = (_init_extra_saturation(this), _init_intensity(this, 1));

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  translation = (_init_extra_intensity(this), _init_translation(this, vec3.create()));

  /** m_innerAngleMultiplier (float) [READWRITE, PERSIST] */
  innerAngleMultiplier = (_init_extra_translation(this), _init_innerAngleMultiplier(this, 0.5));

  /** m_outerAngleMultiplier (float) [READWRITE, PERSIST] */
  outerAngleMultiplier = (_init_extra_innerAngleMultiplier(this), _init_outerAngleMultiplier(this, 1));

  /** m_innerScaleMultiplier (float) [READWRITE, PERSIST] */
  innerScaleMultiplier = (_init_extra_outerAngleMultiplier(this), _init_innerScaleMultiplier(this, 1));

  /** m_outerScaleMultiplier (float) [READWRITE, PERSIST] */
  outerScaleMultiplier = (_init_extra_innerScaleMultiplier(this), _init_outerScaleMultiplier(this, 1));

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  noiseAmplitude = (_init_extra_outerScaleMultiplier(this), _init_noiseAmplitude(this, 0));

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));

  /** m_noiseOctaves (int32_t) [READWRITE, PERSIST] */
  noiseOctaves = (_init_extra_noiseFrequency(this), _init_noiseOctaves(this, 1));

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST] */
  lightProfilePath = (_init_extra_noiseOctaves(this), _init_lightProfilePath(this, ""));
  static {
    _initClass();
  }
}

export { _EveSOFDataSpotLightA as EveSOFDataSpotLightAttachment };
//# sourceMappingURL=EveSOFDataSpotlightAttachment.js.map
