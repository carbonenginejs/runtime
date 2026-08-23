// Source: audio/src/AudioCurveSetDriver.h + AudioCurveSetDriver.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudioCurveSetDriver.json.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** AudioCurveSetDriver (audio) - drives a curve set's time from a live RTPC value, with a fallback curve. */
@type.define({ className: "AudioCurveSetDriver", family: "audio" })
export class AudioCurveSetDriver extends CjsModel
{

  /** m_fallbackCurve (ITriScalarFunctionPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITriScalarFunction")
  fallbackCurve = null;

  /** m_name (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_audioParameterValue (float) [READ] */
  @io.read
  @type.float32
  audioParameterValue = 0;

  /** m_audioParameterName (std::wstring) [PERSISTONLY] */
  @io.persistOnly
  @type.string
  audioParameterName = "";

  // C++ m_audioParameterExists - runtime, refreshed from the manager.
  #audioParameterExists = false;

  // JavaScript adaptation of Carbon's deterministic destructor ownership.
  #registeredManager = null;

  #registeredParameterName = "";

  /** Carbon method GetCurveSetTime: refresh from the monitored-RTPC map; fall back to the curve when invalid. */
  @carbon.method
  @impl.implemented
  GetCurveSetTime(time)
  {
    const parameterInfo = AudGameObjResource.manager?.GetParameterInfo?.(this.audioParameterName);
    if (parameterInfo)
    {
      this.audioParameterValue = parameterInfo.parameterValue;
      this.#audioParameterExists = !!parameterInfo.parameterExists;
    }
    if (!this.IsValid() && this.fallbackCurve)
    {
      return this.fallbackCurve.GetValueAt(time);
    }
    return this.audioParameterValue;
  }

  /** Carbon method IsValid: enabled manager + named + existing RTPC. */
  @carbon.method
  @impl.implemented
  IsValid()
  {
    return !!AudGameObjResource.manager?.enabled && this.audioParameterName !== "" && this.#audioParameterExists;
  }

  /** Carbon property getter GetAudioParameterName. */
  @carbon.method
  @impl.implemented
  GetAudioParameterName()
  {
    return this.audioParameterName;
  }

  /** Carbon method Initialize: registers the monitored parameter with the manager. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (this.audioParameterName && !this.#registeredManager)
    {
      const manager = AudGameObjResource.manager;

      if (typeof manager?.RegisterParameter === "function"
        && manager.GetState?.() !== "uninitialized")
      {
        manager.RegisterParameter(this.audioParameterName);
        this.#registeredManager = manager;
        this.#registeredParameterName = this.audioParameterName;
      }
    }
    return true;
  }

  /** Carbon method SetAudioParameterName: re-register under the new name. */
  @carbon.method
  @impl.implemented
  SetAudioParameterName(name)
  {
    const manager = AudGameObjResource.manager;
    if (this.#registeredManager)
    {
      this.#registeredManager.UnregisterParameter?.(
        this.#registeredParameterName,
      );
      this.#registeredManager = null;
      this.#registeredParameterName = "";
    }
    this.audioParameterName = String(name ?? "");
    if (this.audioParameterName
      && typeof manager?.RegisterParameter === "function"
      && manager.GetState?.() !== "uninitialized")
    {
      manager.RegisterParameter(this.audioParameterName);
      this.#registeredManager = manager;
      this.#registeredParameterName = this.audioParameterName;
    }
  }

  /** Releases the monitored-parameter watcher owned by this driver. */
  @impl.custom
  @impl.reason("JavaScript has no deterministic destructor; owners call Dispose to perform Carbon's destructor-time monitored-parameter release.")
  Dispose()
  {
    if (!this.#registeredManager)
    {
      return;
    }

    this.#registeredManager.UnregisterParameter?.(
      this.#registeredParameterName,
    );
    this.#registeredManager = null;
    this.#registeredParameterName = "";
    this.#audioParameterExists = false;
  }

}
