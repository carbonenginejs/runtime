// Source: trinity/trinity/PostProcess/Effects/Tr2PPGenericEffect.h
import { meta } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { Quality } from "../../generated/postProcess/enums.js";


/**
 * Post-process slot wrapping an arbitrary authored Tr2Effect together with the
 * quality level it needs before a frame will run it.
 */
@meta.define({ className: "Tr2PPGenericEffect", family: "postProcess" })
export class Tr2PPGenericEffect extends Tr2PPEffect
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.PostProcess.Quality")
  quality = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("Tr2Effect")
  effect = null;

  /** Returns the wrapped effect, which may be null when none was authored. */
  GetEffect()
  {
    return this.effect;
  }

  static Quality = Quality;

}
