// Source: audio/src/AudioCurveSetDriver.h
// Source: audio/src/AudioCurveSetDriver.cpp
// Source: audio/src/AudioCurveSetDriver_Blue.cpp
import { meta } from "#schema";
import { ICurveSetDriver } from "#blue/ICurveSetDriver";
import { IInitialize } from "#blue/IInitialize";
import { AudGameObjResource } from "./AudGameObjResource.js";

/**
 * Drives a curve set's time from a monitored global audio parameter or fallback curve.
 * Blue readers initialize after writing stored members; explicit callers initialize
 * after configuration. The audio system adopts, retries initialization when enabled,
 * and disposes drivers. Construction alone installs no manager or audio backend.
 */
@meta.define({ className: "AudioCurveSetDriver", family: "audio" })
@meta.blue.inherit(IInitialize)
export class AudioCurveSetDriver extends ICurveSetDriver
{
  /** m_name: authored display name, stored as std::wstring. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.wstring
  name = "";

  /** m_audioParameterName: persistence bypasses the live registration setter. */
  @meta.member("audioParameterName")
  @meta.blue.persistOnly
  @meta.type.wstring
  _audioParameterName = "";

  /** Live parameter name; assigning it transfers the monitored registration. */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.wstring
  @meta.implemented
  get audioParameterName()
  {
    return this.GetAudioParameterName();
  }

  /** @param {string} name Global audio parameter name. */
  @meta.implemented
  set audioParameterName(name)
  {
    this.SetAudioParameterName(name);
  }

  /** m_audioParameterValue: cached float, retained when no parameter record exists. */
  @meta.blue.read
  @meta.type.float32
  audioParameterValue = 0;

  /** Whether the current manager and monitored parameter can drive the curve set. */
  @meta.property()
  @meta.blue.read
  @meta.type.boolean
  @meta.implemented
  get isValid()
  {
    return this.IsValid();
  }

  /** m_fallbackCurve: sampled at the caller's unmodified time when audio is invalid. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("ITriScalarFunction")
  fallbackCurve = null;

  /** m_audioParameterExists: the last monitored record's existence flag. */
  _audioParameterExists = false;

  /** CJS lifetime adaptation: manager that owns the acquired watcher. */
  _registeredManager = null;

  /** CJS lifetime adaptation: name acquired from the owning manager. */
  _registeredParameterName = "";

  /**
   * Samples the manager's cached parameter record, then the fallback if invalid.
   * Adapted: a null manager is the silent headless state; native assumes one here.
   * A missing record retains the cached value and existence flag, as in Carbon.
   *
   * @param {number} time Time forwarded unchanged to the fallback function.
   * @returns {number} Fallback sample or cached audio parameter value.
   */
  @meta.blue.method
  @meta.adapted
  GetCurveSetTime(time)
  {
    const manager = AudGameObjResource.manager;
    const parameterInfo = manager === null ? null : manager.GetParameterInfo(this._audioParameterName);
    if (parameterInfo !== null)
    {
      this.audioParameterValue = parameterInfo.parameterValue;
      this._audioParameterExists = parameterInfo.parameterExists;
    }
    if (!this.IsValid() && this.fallbackCurve !== null)
    {
      return this.fallbackCurve.GetValueAt(time);
    }
    return this.audioParameterValue;
  }

  /** @returns {boolean} Whether audio is enabled and the named parameter exists. */
  @meta.blue.method
  @meta.implemented
  IsValid()
  {
    const manager = AudGameObjResource.manager;
    return manager !== null && manager.enabled && this._audioParameterName !== "" && this._audioParameterExists;
  }

  /** @returns {string} The stored global audio parameter name. */
  @meta.blue.method
  @meta.implemented
  GetAudioParameterName()
  {
    return this._audioParameterName;
  }

  /**
   * Acquires one watcher once the manager can register it.
   * Adapted: no manager or an uninitialized manager defers registration; the
   * audio system retries on enable. Repeated initialization owns one watcher,
   * unlike Carbon's repeated increments, to support reader plus system adoption.
   * A copy into an existing driver may replace stored data without its live
   * setter; release any differently named watcher before acquiring that data.
   *
   * @returns {boolean} Always true; a silent uncomposed driver remains usable.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    if (this._registeredManager !== null && this._registeredParameterName !== this._audioParameterName)
    {
      this._registeredManager.UnregisterParameter(this._registeredParameterName);
      this._registeredManager = null;
      this._registeredParameterName = "";
    }
    const manager = AudGameObjResource.manager;
    if (this._audioParameterName !== "" && this._registeredManager === null
      && manager !== null && manager.GetState() !== "uninitialized")
    {
      manager.RegisterParameter(this._audioParameterName);
      this._registeredManager = manager;
      this._registeredParameterName = this._audioParameterName;
    }
    return true;
  }

  /**
   * Releases the old watcher and acquires the new parameter when a manager is ready.
   * Adapted: releases through the original owner, tolerates the null headless
   * manager, and leaves empty names unregistered. Carbon uses the global manager
   * unconditionally and its destructor supplies release instead of Dispose.
   *
   * @param {string} name New global parameter name; an empty string detaches it.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetAudioParameterName(name)
  {
    if (this._registeredManager !== null)
    {
      this._registeredManager.UnregisterParameter(this._registeredParameterName);
      this._registeredManager = null;
      this._registeredParameterName = "";
    }
    this._audioParameterName = name;
    this.Initialize();
  }

  /**
   * Releases the acquired watcher through its original manager exactly once.
   * Custom: JavaScript has no deterministic destructor; the audio system releases
   * adopted drivers, and explicit owners release their own drivers. An owner
   * must remain available through release even if the global manager changes.
   *
   * @returns {void}
   */
  @meta.ours
  Dispose()
  {
    if (this._registeredManager === null) return;
    this._registeredManager.UnregisterParameter(this._registeredParameterName);
    this._registeredManager = null;
    this._registeredParameterName = "";
    this._audioParameterExists = false;
  }
}

// EXPOSURE_BEGIN adds concrete self; EXPOSURE_END has no exposure parent.
meta.blue.interfaceTable({
  interfaces: [ AudioCurveSetDriver, ICurveSetDriver, IInitialize ],
  chainTo: null
})(AudioCurveSetDriver, { kind: "class" });
