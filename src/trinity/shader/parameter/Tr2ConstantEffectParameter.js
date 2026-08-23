// Source: trinity/trinity/Shader/Tr2Effect.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { vec4 } from "#math/vec4";
import { CjsParameter } from "./CjsParameter.js";

/** Tr2ConstantEffectParameter (shader) - generated from schema shapeHash b4e14ee0.... */
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
