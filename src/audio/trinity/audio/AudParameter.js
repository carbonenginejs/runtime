// Source: audio/src/AudParameter.h + AudParameter.cpp
// Hand-owned since 2026-07-23 (behavior port); the generator skips this file.
// Verify against audio/AudParameter.json.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** Binds an authored real-time parameter value to its owning audio game object. */
@type.define({ className: "AudParameter", family: "audio" })
export class AudParameter extends CjsModel
{

  /** m_name (std::wstring) [READWRITE] */
  @edit.readwrite
  @type.string
  name = "";

  /** m_value (float) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.float32
  value = 0;

  _gameObjID = 0;


  /**
   * Binds this parameter to an audio game object without pushing its value.
   *
   * Custom: Carbon's owner assigns the private m_ID through friendship
   * (audio/src/AudGameObjResource.cpp:463-464). The JavaScript owner's list
   * callback uses this method instead.
   *
   * @param {number} gameObjID Owner identifier; zero leaves the parameter unbound.
   * @returns {void}
   */
  @impl.custom
  SetGameObjectID(gameObjID)
  {
    this._gameObjID = Number(gameObjID) || 0;
  }

  /**
   * Pushes a value notification to the enabled audio manager and backend.
   * Other member notifications do not push the parameter.
   *
   * Adapted: A member name replaces Carbon's field-address comparison, and
   * injected audio services replace Wwise and g_audioManager
   * (audio/src/AudParameter.cpp:17-27). The current implementation skips
   * missing backend and logging methods.
   *
   * @param {string} propertyName Modified member name.
   * @returns {boolean} Always true when the calls complete.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "value" && this._gameObjID && AudGameObjResource.manager?.enabled)
    {
      AudGameObjResource.backend?.SetRTPCValue(this.name, this.value, this._gameObjID);
      AudGameObjResource.manager.LogSetRTPC(this._gameObjID, this.name, this.value);
    }
    return true;
  }

}
