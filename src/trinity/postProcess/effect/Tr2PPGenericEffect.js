import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPGenericEffect.h
import { type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { Quality } from "../../generated/postProcess/enums.js";


/**
 * Post-process slot wrapping an arbitrary authored Tr2Effect together with the
 * quality level it needs before a frame will run it.
 */
@be.define("Tr2PPGenericEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPGenericEffect extends Tr2PPEffect
{
  /** Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/PostProcess/Effects/Tr2PPGenericEffect_Blue.cpp:13); chooser PostProcessQualityChooser (trinity/trinity/PostProcess/Effects/Tr2PPEffect_Blue.cpp:7). */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.PostProcess.Quality")
  @type.int32
  @type.enum("trinity.PostProcess.Quality")
  quality = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2Effect")
  effect = null;

  /** Returns the wrapped effect, which may be null when none was authored. */

  GetEffect()
  {
    return this.effect;
  }

  static Quality = Quality;

}
