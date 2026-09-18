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
import { ITriEffectParameter } from "./ITriEffectParameter.js";


/** Contract for a parameter holding a resource, notified as it joins or leaves a material. */
export class ITriEffectResourceParameter extends ITriEffectParameter
{

  /** The parameter joined a material. Empty by default, as in the donor. */
  OnAddedToMaterial(_material)
  {
  }

  /** The parameter left a material. Empty by default, as in the donor. */
  OnRemovedFromMaterial(_material)
  {
  }
}


CjsSchema.define(ITriEffectResourceParameter, { className: "ITriEffectResourceParameter" });
