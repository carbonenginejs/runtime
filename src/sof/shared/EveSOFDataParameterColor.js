// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterColor, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
import { io, type } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Color shader parameter: passes the four components through unchanged. */
@type.define({ className: "EveSOFDataParameterColor", family: "eve" })
export class EveSOFDataParameterColor extends EveSOFDataParameter
{
  @io.persist
  @type.vec4
  value = vec4.create();

  /** Returns a copy of the four-component color value. */
  GetValue()
  {
    return vec4.clone(this.value);
  }
}
