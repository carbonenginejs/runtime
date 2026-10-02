// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterInt, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta, types } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Integer shader parameter: broadcasts the value to all four components. */
@meta.define({ className: "EveSOFDataParameterInt", family: "eve" })
export class EveSOFDataParameterInt extends EveSOFDataParameter
{
  /**
   * Authored signed integer shader value; GetValue broadcasts its float conversion.
   * Native m_value (int32_t) replaces the base vector in authored values.
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.int32
  value = 0;

  /** Returns a new vector containing the numeric value in all four components. */
  @meta.impl.implemented
  GetValue()
  {
    const scalar = Number(this.value);
    return vec4.fromValues(scalar, scalar, scalar, scalar);
  }
}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataParameterInt, EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameterInt);
