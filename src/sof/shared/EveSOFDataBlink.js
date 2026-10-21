import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { blue } from "#schema";

/** Empty native IRoot blink settings record; self exposure is in EveSOFData_Blue2.cpp:137-142. */
@be.define("EveSOFDataBlink")
@blue.inherit(IRoot)

export class EveSOFDataBlink
{

  /** Reports the empty settings shape; this convenience has no native method.
   * @returns {boolean} Always true.
   */
  IsEmpty()
  {
    return true;
  }

}

