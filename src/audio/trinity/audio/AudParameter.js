import { exposure as be } from "#be";
// Source: audio/src/AudParameter.h
// Source: audio/src/AudParameter.cpp
// Source: audio/src/AudParameter_Blue.cpp
import { IsMatch } from "#blue";
import { meta, type, blue } from "#schema";
import { INotify } from "#blue/INotify";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** Binds a real-time parameter value to its owning audio game object. */
@be.define("AudParameter")
@be.mapInterface(INotify)
export class AudParameter extends INotify
{
  /** m_name: std::wstring, READWRITE without persistence. */
  @blue.readwrite
  @type.wstring
  name = "";

  /** m_value: float, READWRITE and NOTIFY without persistence. */
  @blue.notify
  @blue.readwrite
  @type.float32
  value = 0;

  /** m_ID: unexposed owner identifier; zero means unbound. */
  _gameObjID = 0;

  /**
   * Binds this parameter without pushing its value.
   * Custom: replaces AudGameObjResource's friendship assignment to m_ID.
   * Backends use safe Number IDs, retained without 32-bit truncation; this
   * seam does not introduce native 64-bit identifier support.
   *
   * @param {number} gameObjID Owner identifier; zero leaves the parameter unbound.
   * @returns {void}
   */
  SetGameObjectID(gameObjID)
  {
    this._gameObjID = Number(gameObjID) || 0;
  }

  /**
   * Carbon OnModified (AudParameter.cpp:17-28): a value change sets the RTPC
   * when the manager is enabled and an owner is bound.
   *
   * Adapted: Carbon calls AK::SoundEngine::SetRTPCValue; ours calls the injected
   * audio backend's SetRTPCValue.
   *
   * @param {string|null} propertyName Modified member name.
   * @returns {boolean} Always true when the calls complete.
   */
  @blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "value") && AudGameObjResource.manager !== null
      && AudGameObjResource.manager.enabled && this._gameObjID)
    {
      AudGameObjResource.backend.SetRTPCValue(this.name, this.value, this._gameObjID);
      AudGameObjResource.manager.LogSetRTPC(this._gameObjID, this.name, this.value);
    }
    return true;
  }
}

// Native maps these identities explicitly and has no exposure parent.
