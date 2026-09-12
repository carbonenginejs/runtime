// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterFloat, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
import { io, type } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Float shader parameter: broadcasts the value to all four components. */
@type.define({ className: "EveSOFDataParameterFloat", family: "eve" })
export class EveSOFDataParameterFloat extends EveSOFDataParameter
{
  @io.persist
  @type.float32
  value = 0;

  /** Returns a new vector containing the numeric value in all four components. */
  GetValue()
  {
    const scalar = Number(this.value);
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}
