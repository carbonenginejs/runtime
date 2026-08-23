// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

@type.define({ className: "EveSOFDataBlink", family: "eve" })
export class EveSOFDataBlink extends CjsModel
{

  /** Carbon currently exposes an empty SOF blink value shape. */
  IsEmpty()
  {
    return true;
  }

}
