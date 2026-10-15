// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { blue } from "#schema";

/** Empty native IRoot blink settings record; self exposure is in EveSOFData_Blue2.cpp:137-142. */
@blue.define("EveSOFDataBlink")
@blue.interface()
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

