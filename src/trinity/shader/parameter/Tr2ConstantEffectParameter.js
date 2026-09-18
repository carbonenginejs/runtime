// Source: trinity/trinity/Shader/Tr2Effect.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";

/**
 * One named persistent vec4 constant authored directly on an effect.
 *
 * A STRUCT IN THE DONOR, not a parameter: `struct Tr2ConstantEffectParameter
 * { BlueSharedString name; Vector4 value; }` (Tr2Effect.h:41-45), declared with
 * BLUE_DECLARE_STRUCTURE_LIST and carrying no methods and no
 * ITriEffectParameter. The value is always a Vector4 - these exist to be packed.
 *
 * It extended CjsParameter here, which gave a two-field record the whole
 * parameter surface it never had in Carbon.
 */
@type.define({ className: "Tr2ConstantEffectParameter", family: "shader" })
export class Tr2ConstantEffectParameter extends CjsModel
{

  /** name (BlueSharedString) - persisted via the constParameters structure list. */
  @edit.rebuild("bindings")
  @edit.persist
  @type.string
  name = "";

  /** value (Vector4) - persisted via the constParameters structure list. */
  @edit.rebuild("bindings")
  @edit.persist
  @type.vec4
  value = vec4.create();

}
