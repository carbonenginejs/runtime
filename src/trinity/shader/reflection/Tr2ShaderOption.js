// Source: trinity/trinity/Shader/Tr2EffectDescription.h
import { meta, edit, type } from "#schema";

/**
 * Mutable authored option on the Tr2Effect facade.
 *
 * Tr2EffectRes accepts this plain name/value shape but does not own authored
 * option lifetime. Carbon declares a plain structure-list value with two
 * BlueSharedString slots, not an IRoot class or native query interface. The
 * JavaScript record retains persistence flags for authored dictionary options;
 * the native effect owns persistence through its options structure list.
 * Native 64-bit size 16; offsets and storage types: trinity/trinity/
 * Shader/Tr2EffectDescription.h:272-276; Shader/Tr2Effect.cpp:110-114.
 */
@type.define({ className: "Tr2ShaderOption", family: "shader" })
@meta.struct.define({ size: 16 })
export class Tr2ShaderOption
{

  /** name (BlueSharedString) */

  @edit.persist
  @meta.struct.SHAREDSTRING_1(0)
  name = "";

  /** value (BlueSharedString) */

  @edit.persist
  @meta.struct.SHAREDSTRING_1(8)
  value = "";

}
