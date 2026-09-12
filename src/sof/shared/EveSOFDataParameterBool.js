// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterBool, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
import { io, type } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Boolean shader parameter: broadcasts 1/0 to all four components. */
@type.define({ className: "EveSOFDataParameterBool", family: "eve" })
export class EveSOFDataParameterBool extends EveSOFDataParameter
{
  @io.persist
  @type.boolean
  value = false;

  /**
   * Returns a new vector containing the boolean value as four identical
   * zero-or-one components.
   */
  GetValue()
  {
    const scalar = this.value ? 1 : 0;
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}
