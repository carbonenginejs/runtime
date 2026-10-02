// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterColor, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Color shader parameter: passes the four components through unchanged. */
@meta.define({ className: "EveSOFDataParameterColor", family: "eve" })
export class EveSOFDataParameterColor extends EveSOFDataParameter
{
  /**
   * Owned RGBA shader value; GetValue returns an independent four-component copy.
   * Native m_value (Color) replaces the base vector in authored values.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  value = vec4.create();

  /** Returns a copy of the four-component color value. */
  @meta.implemented
  GetValue()
  {
    return vec4.clone(this.value);
  }
}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataParameterColor, EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameterColor);
