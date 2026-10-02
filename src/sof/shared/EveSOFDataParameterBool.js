// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterBool, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Boolean shader parameter: broadcasts 1/0 to all four components. */
@meta.define({ className: "EveSOFDataParameterBool", family: "eve" })
export class EveSOFDataParameterBool extends EveSOFDataParameter
{
  /**
   * Authored boolean shader value; GetValue broadcasts zero or one to all components.
   * Native m_value (bool) replaces the base vector in authored values.
   * @type {boolean}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  value = false;

  /**
   * Returns a new vector containing the boolean value as four identical
   * zero-or-one components.
   */
  @meta.implemented
  GetValue()
  {
    const scalar = this.value ? 1 : 0;
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataParameterBool, EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameterBool);
