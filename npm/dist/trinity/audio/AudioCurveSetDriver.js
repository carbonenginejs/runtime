import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { AudGameObjResource as _AudGameObjResource } from './AudGameObjResource.js';

let _initProto, _initClass, _init_fallbackCurve, _init_extra_fallbackCurve, _init_name, _init_extra_name, _init_audioParameterValue, _init_extra_audioParameterValue, _init_audioParameterName, _init_extra_audioParameterName;

/** AudioCurveSetDriver (audio) - drives a curve set's time from a live RTPC value, with a fallback curve. */
let _AudioCurveSetDriver;
class AudioCurveSetDriver extends CjsModel {
  static {
    ({
      e: [_init_fallbackCurve, _init_extra_fallbackCurve, _init_name, _init_extra_name, _init_audioParameterValue, _init_extra_audioParameterValue, _init_audioParameterName, _init_extra_audioParameterName, _initProto],
      c: [_AudioCurveSetDriver, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "AudioCurveSetDriver",
      family: "audio"
    })], [[[io, io.persist, void 0, type.model("ITriScalarFunction")], 16, "fallbackCurve"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.float32], 16, "audioParameterValue"], [[io, io.persistOnly, type, type.string], 16, "audioParameterName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAudioParameterName"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetAudioParameterName"]], 0, void 0, CjsModel));
  }
  /** m_fallbackCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
  fallbackCurve = (_initProto(this), _init_fallbackCurve(this, null));

  /** m_name (std::wstring) [READWRITE, PERSIST] */
  name = (_init_extra_fallbackCurve(this), _init_name(this, ""));

  /** m_audioParameterValue (float) [READ] */
  audioParameterValue = (_init_extra_name(this), _init_audioParameterValue(this, 0));

  /** m_audioParameterName (std::wstring) [PERSISTONLY] */
  audioParameterName = (_init_extra_audioParameterValue(this), _init_audioParameterName(this, ""));

  // C++ m_audioParameterExists - runtime, refreshed from the manager.
  #audioParameterExists = (_init_extra_audioParameterName(this), false);

  /** Carbon method GetCurveSetTime: refresh from the monitored-RTPC map; fall back to the curve when invalid. */
  GetCurveSetTime(time) {
    const parameterInfo = _AudGameObjResource.manager?.GetParameterInfo?.(this.audioParameterName);
    if (parameterInfo) {
      this.audioParameterValue = parameterInfo.parameterValue;
      this.#audioParameterExists = !!parameterInfo.parameterExists;
    }
    if (!this.IsValid() && this.fallbackCurve) {
      return this.fallbackCurve.GetValueAt(time);
    }
    return this.audioParameterValue;
  }

  /** Carbon method IsValid: enabled manager + named + existing RTPC. */
  IsValid() {
    return !!_AudGameObjResource.manager?.enabled && this.audioParameterName !== "" && this.#audioParameterExists;
  }

  /** Carbon property getter GetAudioParameterName. */
  GetAudioParameterName() {
    return this.audioParameterName;
  }

  /** Carbon method Initialize: registers the monitored parameter with the manager. */
  Initialize() {
    if (this.audioParameterName) {
      _AudGameObjResource.manager?.RegisterParameter?.(this.audioParameterName);
    }
    return true;
  }

  /** Carbon method SetAudioParameterName: re-register under the new name. */
  SetAudioParameterName(name) {
    const manager = _AudGameObjResource.manager;
    if (this.audioParameterName) {
      manager?.UnregisterParameter?.(this.audioParameterName);
    }
    this.audioParameterName = String(name ?? "");
    if (this.audioParameterName) {
      manager?.RegisterParameter?.(this.audioParameterName);
    }
  }
  static {
    _initClass();
  }
}

export { _AudioCurveSetDriver as AudioCurveSetDriver };
//# sourceMappingURL=AudioCurveSetDriver.js.map
