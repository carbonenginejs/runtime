// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
//   SOF_PARAM_DECLARE( EveSOFDataParameterVector2, ... ) - Carbon declares the six typed
//   parameters through one macro beside their base.
import { io, type } from "#schema";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { EveSOFDataParameter } from "./EveSOFDataParameter.js";

/** Two-component shader parameter: zero-pads z and w. */
@type.define({ className: "EveSOFDataParameterVector2", family: "eve" })
export class EveSOFDataParameterVector2 extends EveSOFDataParameter
{
  @io.persist
  @type.vec2
  value = vec2.create();

  /** Returns a new four-component vector with zero-filled z and w components. */
  GetValue()
  {
    return vec4.fromValues(this.value[0], this.value[1], 0, 0);
  }
}
