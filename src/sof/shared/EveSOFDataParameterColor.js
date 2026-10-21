import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterColor, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Color shader parameter: passes the four components through unchanged. */
@be.define("EveSOFDataParameterColor")
@be.mapInterface(EveSOFDataParameter)
export class EveSOFDataParameterColor extends EveSOFDataParameter
{
  /**
   * Owned RGBA shader value; GetValue returns an independent four-component copy.
   * Native m_value (Color) replaces the base vector in authored values.
   * @type {Float32Array}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  value = vec4.create();

  /** Returns a copy of the four-component color value. */
  @meta.implemented

  GetValue()
  {
    return vec4.clone(this.value);
  }
}

