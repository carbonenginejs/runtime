// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterVector3, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
import { io, type } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Three-component shader parameter: zero-pads w (0, not 1). */
@type.define({ className: "EveSOFDataParameterVector3", family: "eve" })
export class EveSOFDataParameterVector3 extends EveSOFDataParameter
{
  @io.persist
  @type.vec3
  value = vec3.create();

  /** Returns a new four-component vector with a zero-filled w component. */
  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], this.value[2], 0);
  }
}
