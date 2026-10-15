// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterVector2, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta, type, blue } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Two-component shader parameter: zero-pads z and w. */
@blue.define("EveSOFDataParameterVector2")
@blue.interface(EveSOFDataParameter)
export class EveSOFDataParameterVector2 extends EveSOFDataParameter
{
  /**
   * Owned two-component shader value; GetValue zero-pads z and w.
   * Native m_value (Vector2) replaces the base vector in authored values.
   * @type {Float32Array}
   */
  @blue.readwrite
  @blue.persist
  @type.vec2
  value = vec2.create();

  /** Returns a new four-component vector with zero-filled z and w components. */
  @meta.implemented
  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], 0, 0);
  }
}

