// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type } from "#schema";
import { CjsModel } from "#model";

/** Provides the empty Carbon-compatible base shape for blink settings. */
@type.define({ className: "EveSOFDataBlink", family: "eve" })
export class EveSOFDataBlink extends CjsModel
{

  /** Carbon currently exposes an empty SOF blink value shape. */
  IsEmpty()
  {
    return true;
  }

}
