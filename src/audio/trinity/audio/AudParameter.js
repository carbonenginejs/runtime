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

  #gameObjID = 0;


  /**
   * Carbon's parent-list callback assigns the private game-object id when this
   * parameter is inserted. Binding alone does not push its current value.
   */
  @impl.custom
  @impl.reason("Carbon assigns AudParameter::m_ID through AudGameObjResource friendship; CarbonEngineJS exposes the narrow owner-binding seam needed by its cooperative list pipeline.")
  SetGameObjectID(gameObjID)
  {
    this.#gameObjID = Number(gameObjID) || 0;
  }

  /** Carbon INotify consequence: only a value change pushes the object RTPC. */
  @carbon.method
  @impl.adapted
  @impl.reason("JS uses the exposed member name and the injected audio manager/backend instead of native field addresses and Wwise globals.")
  OnModified(propertyName)
  {
    if (propertyName === "value" && this.#gameObjID && AudGameObjResource.manager?.enabled)
    {
      AudGameObjResource.backend?.SetRTPCValue?.(this.name, this.value, this.#gameObjID);
      AudGameObjResource.manager.LogSetRTPC?.(this.#gameObjID, this.name, this.value);
    }
    return true;
  }

}
