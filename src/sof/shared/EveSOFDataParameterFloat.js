// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterFloat, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Float shader parameter: broadcasts the value to all four components. */
@meta.define({ className: "EveSOFDataParameterFloat", family: "eve" })
export class EveSOFDataParameterFloat extends EveSOFDataParameter
{
  /**
   * Authored scalar shader value; GetValue broadcasts it to all four components.
   * Native m_value (float) replaces the base vector in authored values.
   * @type {number}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** Returns a new vector containing the numeric value in all four components. */
  @meta.implemented
  GetValue()
  {
    const scalar = Number(this.value);
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataParameterFloat, EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameterFloat);
