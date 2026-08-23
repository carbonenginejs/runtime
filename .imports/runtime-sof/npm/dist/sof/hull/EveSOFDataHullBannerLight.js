import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_brightness, _init_extra_brightness, _init_innerRadiusMultiplier, _init_extra_innerRadiusMultiplier, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiceOctaves, _init_extra_noiceOctaves, _init_saturation, _init_extra_saturation, _init_radiusMultiplier, _init_extra_radiusMultiplier;

/** EveSOFDataHullBannerLight (eve) - generated from schema shapeHash a442806d.... */
let _EveSOFDataHullBanner;
class EveSOFDataHullBannerLight extends CjsModel {
  static {
    ({
      e: [_init_brightness, _init_extra_brightness, _init_innerRadiusMultiplier, _init_extra_innerRadiusMultiplier, _init_noiseAmplitude, _init_extra_noiseAmplitude, _init_noiseFrequency, _init_extra_noiseFrequency, _init_noiceOctaves, _init_extra_noiceOctaves, _init_saturation, _init_extra_saturation, _init_radiusMultiplier, _init_extra_radiusMultiplier],
      c: [_EveSOFDataHullBanner, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataHullBannerLight",
      family: "eve"
    })], [[[io, io.persist, type, type.float32], 16, "brightness"], [[io, io.persist, type, type.float32], 16, "innerRadiusMultiplier"], [[io, io.persist, type, type.float32], 16, "noiseAmplitude"], [[io, io.persist, type, type.float32], 16, "noiseFrequency"], [[io, io.persist, type, type.int32], 16, "noiceOctaves"], [[io, io.persist, type, type.float32], 16, "saturation"], [[io, io.persist, type, type.float32], 16, "radiusMultiplier"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_radiusMultiplier(this);
  }
  /** m_brightness (float) [READWRITE, PERSIST] */
  brightness = _init_brightness(this, 1);

  /** m_innerRadiusMultiplier (float) [READWRITE, PERSIST] */
  innerRadiusMultiplier = (_init_extra_brightness(this), _init_innerRadiusMultiplier(this, 0.3));

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  noiseAmplitude = (_init_extra_innerRadiusMultiplier(this), _init_noiseAmplitude(this, 0));

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  noiseFrequency = (_init_extra_noiseAmplitude(this), _init_noiseFrequency(this, 1));

  /** m_noiseOctaves (int32_t) [READWRITE, PERSIST] */
  noiceOctaves = (_init_extra_noiseFrequency(this), _init_noiceOctaves(this, 1));

  /** m_saturation (float) [READWRITE, PERSIST] */
  saturation = (_init_extra_noiceOctaves(this), _init_saturation(this, 1));

  /** m_radiusMultiplier (float) [READWRITE, PERSIST] */
  radiusMultiplier = (_init_extra_saturation(this), _init_radiusMultiplier(this, 1));
  static {
    _initClass();
  }
}

export { _EveSOFDataHullBanner as EveSOFDataHullBannerLight };
//# sourceMappingURL=EveSOFDataHullBannerLight.js.map
