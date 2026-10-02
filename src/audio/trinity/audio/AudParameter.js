import { IsMatch } from "#blue";
// Source: audio/src/AudParameter.h
// Source: audio/src/AudParameter.cpp
// Source: audio/src/AudParameter_Blue.cpp
import { meta } from "#schema";
import { INotify } from "#blue/INotify";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** Binds a real-time parameter value to its owning audio game object. */
@meta.define({ className: "AudParameter", family: "audio" })
export class AudParameter extends INotify
{
  /** m_name: std::wstring, READWRITE without persistence. */
  @meta.blue.readwrite
  @meta.type.wstring
  name = "";

  /** m_value: float, READWRITE and NOTIFY without persistence. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
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
  @meta.ours
  SetGameObjectID(gameObjID)
  {
    this._gameObjID = Number(gameObjID) || 0;
  }

  /**
   * Pushes only value notifications when the manager is enabled and an owner is bound.
   * Adapted: the exposed member name replaces Carbon's field-address comparison;
   * the injected backend replaces Wwise. As in Carbon, the enabled manager and
   * its backend remain valid throughout the backend call and following log call.
   *
   * @param {string|null} propertyName Modified member name.
   * @returns {boolean} Always true when the calls complete.
   */
  @meta.blue.method
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
meta.blue.interfaceTable({
  interfaces: [ INotify, AudParameter ],
  chainTo: null
})(AudParameter, { kind: "class" });
