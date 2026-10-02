// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { carbon, impl, type } from "#schema";

/** Empty native IRoot blink settings record; self exposure is in EveSOFData_Blue2.cpp:137-142. */
@type.define({ className: "EveSOFDataBlink", family: "eve" })
export class EveSOFDataBlink
{

  /** Reports the empty settings shape; this convenience has no native method.
   * @returns {boolean} Always true.
   */
  @impl.custom
  IsEmpty()
  {
    return true;
  }

}

carbon.interfaceTable({ interfaces: [EveSOFDataBlink], chainTo: null })(EveSOFDataBlink);
