import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initClass, _init_baseSoundbankPath, _init_extra_baseSoundbankPath, _init_soundbankLanguage, _init_extra_soundbankLanguage, _init_spatialAudioDeviceName, _init_extra_spatialAudioDeviceName, _init_stereoAudioDeviceName, _init_extra_stereoAudioDeviceName, _init_applicationName, _init_extra_applicationName, _init_essentialPath, _init_extra_essentialPath, _init_spatialAudioEnabled, _init_extra_spatialAudioEnabled;

/** AudSettings (audio) - generated from schema shapeHash 9f163503.... */
let _AudSettings;
class AudSettings extends CjsModel {
  static {
    ({
      e: [_init_baseSoundbankPath, _init_extra_baseSoundbankPath, _init_soundbankLanguage, _init_extra_soundbankLanguage, _init_spatialAudioDeviceName, _init_extra_spatialAudioDeviceName, _init_stereoAudioDeviceName, _init_extra_stereoAudioDeviceName, _init_applicationName, _init_extra_applicationName, _init_essentialPath, _init_extra_essentialPath, _init_spatialAudioEnabled, _init_extra_spatialAudioEnabled],
      c: [_AudSettings, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudSettings",
      family: "audio"
    })], [[[io, io.readwrite, type, type.string], 16, "baseSoundbankPath"], [[io, io.readwrite, type, type.string], 16, "soundbankLanguage"], [[io, io.readwrite, type, type.string], 16, "spatialAudioDeviceName"], [[io, io.readwrite, type, type.string], 16, "stereoAudioDeviceName"], [[io, io.readwrite, type, type.string], 16, "applicationName"], [[io, io.readwrite, type, type.string], 16, "essentialPath"], [[io, io.readwrite, type, type.boolean], 16, "spatialAudioEnabled"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_spatialAudioEnabled(this);
  }
  /** m_baseSoundBankPath (std::string) [READWRITE] */
  baseSoundbankPath = _init_baseSoundbankPath(this, "res:/Audio");

  /** m_soundbankLanguage (std::string) [READWRITE] */
  soundbankLanguage = (_init_extra_baseSoundbankPath(this), _init_soundbankLanguage(this, "en"));

  /** m_spatialAudioDeviceName (std::string) [READWRITE] */
  spatialAudioDeviceName = (_init_extra_soundbankLanguage(this), _init_spatialAudioDeviceName(this, "System"));

  /** m_stereoAudioDeviceName (std::string) [READWRITE] */
  stereoAudioDeviceName = (_init_extra_spatialAudioDeviceName(this), _init_stereoAudioDeviceName(this, "System_Stereo"));

  /** m_applicationName (std::string) [READWRITE] */
  applicationName = (_init_extra_stereoAudioDeviceName(this), _init_applicationName(this, "Eve Online"));

  /** m_essentialPath (std::string) [READWRITE] */
  essentialPath = (_init_extra_applicationName(this), _init_essentialPath(this, "Essential_Media"));

  /** m_spatialAudioEnabled (bool) [READWRITE] */
  spatialAudioEnabled = (_init_extra_essentialPath(this), _init_spatialAudioEnabled(this, true));
  static {
    _initClass();
  }
}

export { _AudSettings as AudSettings };
//# sourceMappingURL=AudSettings.js.map
