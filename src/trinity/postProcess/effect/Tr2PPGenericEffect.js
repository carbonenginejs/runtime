// Source: trinity/trinity/PostProcess/Effects/Tr2PPGenericEffect.h
import { io, type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { Quality } from "../../generated/postProcess/enums.js";


/**
 * Post-process slot wrapping an arbitrary authored Tr2Effect together with the
 * quality level it needs before a frame will run it.
 */
@type.define({ className: "Tr2PPGenericEffect", family: "postProcess" })
export class Tr2PPGenericEffect extends Tr2PPEffect
{
  @io.persist
  @type.int32
  @type.enum("Quality")
  quality = 1;

  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  /** Returns the wrapped effect, which may be null when none was authored. */
  GetEffect()
  {
    return this.effect;
  }

  static Quality = Quality;

}
