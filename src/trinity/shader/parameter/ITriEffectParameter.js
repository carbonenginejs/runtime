// Source: trinity/trinity/Include/ITriEffectParameter.h:10-23
//
// The contract every shader parameter carries. Carbon casts to it -
// `ITriEffectParameterPtr param = ITriEffectParameterPtr( BlueCastPtr(
// paramAsEffectValue ) )` (Tr2Effect.cpp:1930) - so the brand here is contract
// semantics rather than capability discovery.
//
// WHY IT WAS MISSING, and what that cost. The port gave the family two invented
// bases instead - `CjsVectorParameter extends CjsParameter extends CjsModel` -
// carrying the same methods under names Carbon does not have. The methods
// therefore worked and the CONTRACT did not exist, so nothing could ask for it:
// `Tr2MaterialParameterStore.parameters` declares `@type.map(
// "ITriEffectParameter" )` (Tr2MaterialParameterStore.js:30, Carbon's
// `PITriEffectParameterDict`) and that name resolved to null.
//
// Carbon derives this from ITr2EffectValue, whose module here carries only its
// ResourceFlags word - the interface itself has no members we need. The three
// methods below are ITriEffectParameter's own. `SupportsDirtyNotification` is
// the one Carbon DEFAULTS rather than leaving pure, so it defaults here too.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../../controllers/ITr2Controller/index.js";


const ITRI_EFFECT_PARAMETER = Symbol.for("carbonenginejs.contract.ITriEffectParameter");

// Pure in the donor - an implementor must supply them.
const PARAMETER_ABSTRACTS = [ "GetParameterName", "RebuildEffectHandles", "GetHashValue" ];

// Every member the contract carries. Adopt fills only what a class does not
// already have, so a parameter keeps its own and inherits the defaulted one.
const PARAMETER_MEMBERS = [ ...PARAMETER_ABSTRACTS, "SupportsDirtyNotification" ];


/** Contract for a shader parameter: its name, its effect handles and its content hash. */
export class ITriEffectParameter
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITRI_EFFECT_PARAMETER] === true;
  }

  /** The authored parameter name the effect binds by. */
  GetParameterName()
  {
    throw new Error("ITriEffectParameter.GetParameterName must be implemented by a parameter.");
  }

  /** Re-resolves this parameter's handles against a shader's reflection. */
  RebuildEffectHandles(_effectRes)
  {
    throw new Error("ITriEffectParameter.RebuildEffectHandles must be implemented by a parameter.");
  }

  /** Folds this parameter's content into a running FNV1 hash. */
  GetHashValue(_startingHash)
  {
    throw new Error("ITriEffectParameter.GetHashValue must be implemented by a parameter.");
  }

  /**
   * Whether writes to this parameter notify their destination.
   *
   * DEFAULTED, not pure, in the donor (ITriEffectParameter.h:19-22): most
   * parameters do not notify, and the ones that do say so.
   */
  SupportsDirtyNotification()
  {
    return false;
  }
}


Brand(ITriEffectParameter, ITRI_EFFECT_PARAMETER, [], PARAMETER_ABSTRACTS);
CjsSchema.define(ITriEffectParameter, { className: "ITriEffectParameter" });


/**
 * Adds the ITriEffectParameter contract without replacing an existing base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withITriEffectParameter(Base)
{
  const Parameter = Adopt(Base, ITriEffectParameter, PARAMETER_MEMBERS);

  Brand(Parameter, ITRI_EFFECT_PARAMETER, [], PARAMETER_ABSTRACTS);

  return Parameter;
}
