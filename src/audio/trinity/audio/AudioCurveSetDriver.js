// Source: audio/src/AudioCurveSetDriver.h + AudioCurveSetDriver.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudioCurveSetDriver.json.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** Drives a curve set's time from a live RTPC value, with a fallback curve. */
@type.define({ className: "AudioCurveSetDriver", family: "audio" })
export class AudioCurveSetDriver extends CjsModel
{

  /** m_fallbackCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.model("ITriScalarFunction")
  fallbackCurve = null;

  /** m_name (std::wstring) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_audioParameterValue (float) [READ] */
  @edit.read
  @type.float32
  audioParameterValue = 0;

  /** m_audioParameterName (std::wstring) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.string
  audioParameterName = "";

  // C++ m_audioParameterExists - runtime, refreshed from the manager.
  _audioParameterExists = false;

  // JavaScript adaptation of Carbon's deterministic destructor ownership.
  _registeredManager = null;

  _registeredParameterName = "";

  /**
   * Refreshes the cached RTPC value and samples the fallback curve when invalid.
   *
   * Adapted: Carbon unconditionally queries g_audioManager
   * (audio/src/AudioCurveSetDriver.cpp:37-54). JavaScript tolerates an absent
   * manager or GetParameterInfo method and retains the cached value and existence
   * flag when no information is returned.
   *
   * @param {number} time Time passed unchanged to the fallback curve.
   * @returns {number} The fallback sample or cached audio parameter value.
   */
  @carbon.method
  @impl.adapted
  GetCurveSetTime(time)
  {
    const parameterInfo = AudGameObjResource.manager?.GetParameterInfo?.(this.audioParameterName);
    if (parameterInfo)
    {
      this.audioParameterValue = parameterInfo.parameterValue;
      this._audioParameterExists = !!parameterInfo.parameterExists;
    }
    if (!this.IsValid() && this.fallbackCurve)
    {
      return this.fallbackCurve.GetValueAt(time);
    }
    return this.audioParameterValue;
  }

  /**
   * Reports whether the manager is enabled and the named parameter was last found.
   *
   * @returns {boolean} Whether the monitored parameter is currently usable.
   */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return !!AudGameObjResource.manager?.enabled && this.audioParameterName !== "" && this._audioParameterExists;
  }

  /**
   * Returns the monitored parameter name.
   *
   * @returns {string} Parameter name.
   */
  @carbon.method
  @impl.implemented
  GetAudioParameterName()
  {
    return this.audioParameterName;
  }

  /**
   * Registers the named parameter once and remembers its owning manager.
   *
   * Adapted: Carbon registers on every Initialize call when the name is nonempty
   * (audio/src/AudioCurveSetDriver.cpp:27-35). JavaScript tracks one registration
   * for explicit disposal and skips registration when the manager is absent,
   * uninitialized, or lacks RegisterParameter.
   *
   * @returns {boolean} Always true.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.audioParameterName && !this._registeredManager)
    {
      const manager = AudGameObjResource.manager;

      if (typeof manager?.RegisterParameter === "function"
        && manager.GetState?.() !== "uninitialized")
      {
        manager.RegisterParameter(this.audioParameterName);
        this._registeredManager = manager;
        this._registeredParameterName = this.audioParameterName;
      }
    }
    return true;
  }

  /**
   * Releases the tracked registration and registers the new name when available.
   *
   * Adapted: Carbon unconditionally unregisters and registers through the current
   * global manager (audio/src/AudioCurveSetDriver.cpp:67-72). JavaScript releases
   * through the original manager, skips empty names or unavailable/uninitialized
   * registration services, and tracks the new registration for explicit disposal.
   *
   * @param {string} name New parameter name; an empty name leaves it unregistered.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  SetAudioParameterName(name)
  {
    const manager = AudGameObjResource.manager;
    if (this._registeredManager)
    {
      this._registeredManager.UnregisterParameter?.(
        this._registeredParameterName,
      );
      this._registeredManager = null;
      this._registeredParameterName = "";
    }
    this.audioParameterName = String(name ?? "");
    if (this.audioParameterName
      && typeof manager?.RegisterParameter === "function"
      && manager.GetState?.() !== "uninitialized")
    {
      manager.RegisterParameter(this.audioParameterName);
      this._registeredManager = manager;
      this._registeredParameterName = this.audioParameterName;
    }
  }

  /**
   * When registered, releases the watcher and clears the cached existence flag.
   * Repeated disposal has no effect.
   *
   * Custom: JavaScript has no deterministic destructor. Owners call this method
   * to release through the manager that registered the parameter, rather than
   * Carbon's destructor using the current global manager and parameter name
   * (audio/src/AudioCurveSetDriver.cpp:19-25). Missing unregister methods are skipped.
   *
   * @returns {void}
   */
  @impl.custom
  Dispose()
  {
    if (!this._registeredManager)
    {
      return;
    }

    this._registeredManager.UnregisterParameter?.(
      this._registeredParameterName,
    );
    this._registeredManager = null;
    this._registeredParameterName = "";
    this._audioParameterExists = false;
  }

}
