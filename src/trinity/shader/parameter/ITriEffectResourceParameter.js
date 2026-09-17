// Source: trinity/trinity/Include/ITriEffectParameter.h:28-32
//
// A parameter that holds a RESOURCE, and therefore has something to say when it
// joins or leaves a material. Carbon derives it from ITriEffectParameter and
// gives both hooks EMPTY bodies rather than leaving them pure - a resource
// parameter that needs no notification simply inherits the nothing.
//
// Three classes here implement both hooks already - TriTextureParameter,
// Tr2RuntimeTextureParameter and Tr2TextureAnimationParameter - so the
// behaviour was ported and only the contract was missing. The donor's third
// interface in this header, ITriEffectTextureParameter, is quarantined in
// src/trinity/dropped.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../../controllers/ITr2Controller/index.js";
import { ITriEffectParameter, withITriEffectParameter } from "./ITriEffectParameter.js";


const ITRI_EFFECT_RESOURCE_PARAMETER = Symbol.for("carbonenginejs.contract.ITriEffectResourceParameter");

// Both are DEFAULTED in the donor, so neither is abstract here.
const RESOURCE_PARAMETER_MEMBERS = [ "OnAddedToMaterial", "OnRemovedFromMaterial" ];


/** Contract for a parameter holding a resource, notified as it joins or leaves a material. */
export class ITriEffectResourceParameter extends ITriEffectParameter
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITRI_EFFECT_RESOURCE_PARAMETER] === true;
  }

  /** The parameter joined a material. Empty by default, as in the donor. */
  OnAddedToMaterial(_material)
  {
  }

  /** The parameter left a material. Empty by default, as in the donor. */
  OnRemovedFromMaterial(_material)
  {
  }
}


Brand(ITriEffectResourceParameter, ITRI_EFFECT_RESOURCE_PARAMETER, RESOURCE_PARAMETER_MEMBERS, []);
CjsSchema.define(ITriEffectResourceParameter, { className: "ITriEffectResourceParameter" });


/**
 * Adds the ITriEffectResourceParameter contract without replacing an existing
 * base. The donor derives this interface FROM ITriEffectParameter, so a class
 * taking this takes both brands - `Tr2Effect` casts to either one and must find
 * a resource parameter under both.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying both contracts.
 */
export function withITriEffectResourceParameter(Base)
{
  const Parameter = Adopt(withITriEffectParameter(Base), ITriEffectResourceParameter, RESOURCE_PARAMETER_MEMBERS);

  Brand(Parameter, ITRI_EFFECT_RESOURCE_PARAMETER, RESOURCE_PARAMETER_MEMBERS, []);

  return Parameter;
}
