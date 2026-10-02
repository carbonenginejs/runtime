// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { edit, type } from "#schema";

/**
 * Mutable authored option on the Tr2Effect facade.
 *
 * Tr2EffectRes accepts this plain name/value shape but does not own authored
 * option lifetime. Carbon declares a plain structure-list value with two
 * BlueSharedString slots, not an IRoot class or native query interface. The
 * JavaScript record retains persistence flags for authored dictionary options;
 * the native effect owns persistence through its options structure list.
 */
@type.define({ className: "Tr2ShaderOption", family: "shader" })
export class Tr2ShaderOption
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
