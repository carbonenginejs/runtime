// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   audio/src/AudParameter.h + AudParameter.cpp
// Hand-owned since 2026-07-23 (behavior port); the generator skips this file.
// Verify against audio/AudParameter.json.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { AudGameObjResource } from "./AudGameObjResource.js";

/** AudParameter (audio) - generated from schema shapeHash daad2621.... */
@type.define({ className: "AudParameter", family: "audio" })
export class AudParameter extends CjsModel
{

  /** m_name (std::wstring) [READWRITE] */
  @io.readwrite
  @type.string
  name = "";

  /** m_value (float) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.float32
  value = 0;

  #gameObjID = 0;

  #settledValue = 0;

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
  @impl.reason("CjsModel hooks are property-agnostic, so a cached value reproduces Carbon's m_value-only notification branch.")
  OnModified(options = {})
  {
    const next = Number(this.value);
    const changed = !Object.is(next, this.#settledValue);
    this.#settledValue = next;
    if (changed && this.#gameObjID && AudGameObjResource.manager?.enabled)
    {
      AudGameObjResource.backend?.SetRTPCValue?.(this.name, next, this.#gameObjID);
      AudGameObjResource.manager.LogSetRTPC?.(
        this.#gameObjID,
        this.name,
        next,
      );
    }
    return super.OnModified(options);
  }

}
