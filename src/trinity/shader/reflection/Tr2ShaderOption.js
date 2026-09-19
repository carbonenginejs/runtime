// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Mutable authored option on the Tr2Effect facade.
 *
 * Tr2EffectRes accepts this plain name/value shape but does not own authored
 * option lifetime.
 */
@type.define({ className: "Tr2ShaderOption", family: "shader" })
export class Tr2ShaderOption extends CjsModel
{

  /** name (BlueSharedString) */

  @edit.persist
  @type.string
  name = "";

  /** value (BlueSharedString) */

  @edit.persist
  @type.string
  value = "";

}
