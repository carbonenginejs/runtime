// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { meta } from "#schema";

/** Empty native IRoot blink settings record; self exposure is in EveSOFData_Blue2.cpp:137-142. */
@meta.define({ className: "EveSOFDataBlink", family: "eve" })
export class EveSOFDataBlink
{

  /** Reports the empty settings shape; this convenience has no native method.
   * @returns {boolean} Always true.
   */
  @meta.ours
  IsEmpty()
  {
    return true;
  }

}

meta.blue.interfaceTable({ interfaces: [EveSOFDataBlink], chainTo: null })(EveSOFDataBlink);
