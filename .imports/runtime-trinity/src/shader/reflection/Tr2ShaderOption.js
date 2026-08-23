// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

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
  @io.rebuild("pipeline")
  @io.persist
  @type.string
  name = "";

  /** value (BlueSharedString) */
  @io.rebuild("pipeline")
  @io.persist
  @type.string
  value = "";

}
