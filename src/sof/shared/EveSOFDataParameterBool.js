// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterBool, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Boolean shader parameter: broadcasts 1/0 to all four components. */
@blue.define("EveSOFDataParameterBool")
@blue.interface(EveSOFDataParameter)
export class EveSOFDataParameterBool extends EveSOFDataParameter
{
  /**
   * Authored boolean shader value; GetValue broadcasts zero or one to all components.
   * Native m_value (bool) replaces the base vector in authored values.
   * @type {boolean}
   */
  @blue.readwrite
  @blue.persist
  @type.boolean
  value = false;

  /**
   * Returns a new vector containing the boolean value as four identical
   * zero-or-one components.
   */
  @meta.implemented
  @blue.method
  GetValue()
  {
    const scalar = this.value ? 1 : 0;
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

