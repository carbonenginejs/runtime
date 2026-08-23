// Source: trinity/trinity/Shader/Tr2Effect.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { vec4 } from "#math/vec4";
import { CjsParameter } from "./CjsParameter.js";

/** Stores one named persistent vec4 constant authored directly on an effect. */
@type.define({ className: "Tr2ConstantEffectParameter", family: "shader" })
export class Tr2ConstantEffectParameter extends CjsParameter
{

  /** name (BlueSharedString) - persisted via the constParameters structure list. */
  @io.rebuild("bindings")
  @io.persist
  @type.string
  name = "";

  /** value (Vector4) - persisted via the constParameters structure list. */
  @io.rebuild("bindings")
  @io.persist
  @type.vec4
  value = vec4.create();

}
