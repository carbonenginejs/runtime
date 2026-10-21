// Source: trinity/trinity/Include/ITriEffectParameter.h:34-40
//
// The third interface in that header, and the one TriTextureParameter actually
// derives from - it reaches ITriEffectResourceParameter and ITriEffectParameter
// through this, not directly.
//
// TriTextureParameter_Blue.cpp:17 exposes this interface, and Tr2Material
// stores texture parameters through it. The declaration provides its three
// pure methods and the static UV-set count for schema and parity tools.
//
// Carbon's spelling of "Loding" is kept. It is the donor's method name.

import { CjsSchema, blue } from "#schema";
import { ITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";


/** A resource parameter whose texture takes part in screen-size LOD selection. */
export class ITriEffectTextureParameter extends ITriEffectResourceParameter
{
  /**
   * `UV_SET_MAX_COUNT` - the length of the density-scale array
   * `EnableTextureLoding` takes. `static const size_t` in the donor, so a
   * static here; the generated shell had it as an instance field.
   */
  static UV_SET_MAX_COUNT = 8;


  /** Reports the on-screen size this texture is drawn at, and returns the LOD that demands. */
  @blue.abstract
  UsedWithScreenSize(_screenSize, _worldRadius, _uvDensities) {}

  /** Turns mip selection on, against one density scale per UV set. */
  @blue.abstract
  EnableTextureLoding(_uvDensityScale) {}

  /** Turns mip selection off. */
  @blue.abstract
  DisableTextureLoding() {}
}


CjsSchema.exposure.interface("ITriEffectTextureParameter")(ITriEffectTextureParameter);
