// Source: trinity/trinity/Include/ITriEffectParameter.h:34-40
//
// The third interface in that header, and the one TriTextureParameter actually
// derives from - it reaches ITriEffectResourceParameter and ITriEffectParameter
// through this, not directly.
//
// WHY IT WAS QUARANTINED, AND WHY IT IS BACK. A generated shell of it sat in
// `trinity/dropped` carrying `UV_SET_MAX_COUNT` as an INSTANCE field, extending
// CjsModel, and declaring none of the three pure methods - so the disposition
// "superseded by maintained concrete texture-parameter graph classes" was
// judging the shell, not the interface. Meanwhile `TriTextureParameter_Blue.cpp:17`
// maps it, so Carbon casts to it; `Tr2Material.js:62` declares
// `@type.list("ITriEffectTextureParameter")`, a live schema reference to a
// quarantined name; and all three methods were already implemented on
// TriTextureParameter. A used interface cannot be dropped.
//
// The methods carry decorator syntax rather than the imperative
// `CjsSchema.decorateMethod` its two siblings use, because the parity audit
// reads SOURCE TEXT for `@carbon.method` - an imperative call is invisible to
// it, and this class is audited now that it has left quarantine.
//
// Carbon's spelling of "Loding" is kept. It is the donor's method name.

import { carbon, CjsSchema, impl } from "#schema";
import { Adopt, DefineInterface } from "../../controllers/ITr2Controller/index.js";
import { ITriEffectResourceParameter, withITriEffectResourceParameter } from "./ITriEffectResourceParameter.js";


const ITRI_EFFECT_TEXTURE_PARAMETER = Symbol.for("carbonenginejs.interface.ITriEffectTextureParameter");

// All three are pure in the donor.
const TEXTURE_PARAMETER_ABSTRACTS = [ "UsedWithScreenSize", "EnableTextureLoding", "DisableTextureLoding" ];


/** A resource parameter whose texture takes part in screen-size LOD selection. */
export class ITriEffectTextureParameter extends ITriEffectResourceParameter
{
  /**
   * `UV_SET_MAX_COUNT` - the length of the density-scale array
   * `EnableTextureLoding` takes. `static const size_t` in the donor, so a
   * static here; the generated shell had it as an instance field.
   */
  static UV_SET_MAX_COUNT = 8;

  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITRI_EFFECT_TEXTURE_PARAMETER] === true;
  }

  /** Reports the on-screen size this texture is drawn at, and returns the LOD that demands. */
  @carbon.method
  @impl.abstract
  UsedWithScreenSize(_screenSize, _worldRadius, _uvDensities)
  {
    throw new Error("ITriEffectTextureParameter.UsedWithScreenSize must be implemented.");
  }

  /** Turns mip selection on, against one density scale per UV set. */
  @carbon.method
  @impl.abstract
  EnableTextureLoding(_uvDensityScale)
  {
    throw new Error("ITriEffectTextureParameter.EnableTextureLoding must be implemented.");
  }

  /** Turns mip selection off. */
  @carbon.method
  @impl.abstract
  DisableTextureLoding()
  {
    throw new Error("ITriEffectTextureParameter.DisableTextureLoding must be implemented.");
  }
}


// Empty lists: the decorators above already carry the abstract marking.
DefineInterface(ITriEffectTextureParameter, ITRI_EFFECT_TEXTURE_PARAMETER, [], []);
CjsSchema.define(ITriEffectTextureParameter, { className: "ITriEffectTextureParameter" });


/**
 * Adds this interface, and the two it derives from, without replacing a base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying all three.
 */
export function withITriEffectTextureParameter(Base)
{
  const Parameter = Adopt(withITriEffectResourceParameter(Base), ITriEffectTextureParameter, TEXTURE_PARAMETER_ABSTRACTS);

  DefineInterface(Parameter, ITRI_EFFECT_TEXTURE_PARAMETER, [], []);

  return Parameter;
}
