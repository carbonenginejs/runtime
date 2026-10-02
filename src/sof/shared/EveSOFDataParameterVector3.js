// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterVector3, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:20-38
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:85-102
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Three-component shader parameter: zero-pads w (0, not 1). */
@meta.define({ className: "EveSOFDataParameterVector3", family: "eve" })
export class EveSOFDataParameterVector3 extends EveSOFDataParameter
{
  /**
   * Owned three-component shader value; GetValue zero-pads w.
   * Native m_value (Vector3) replaces the base vector in authored values.
   * @type {Float32Array}
   */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  value = vec3.create();

  /** Returns a new four-component vector with a zero-filled w component. */
  @meta.implemented
  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], this.value[2], 0);
  }
}

meta.blue.interfaceTable({
  interfaces: [ EveSOFDataParameterVector3, EveSOFDataParameter ],
  chainTo: null
})(EveSOFDataParameterVector3);
