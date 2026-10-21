import { IRoot } from "../../../global/blue/IRoot.js";
import { ITr2EffectValue } from "./ITr2EffectValue.js";
// Source: trinity/trinity/Include/ITriEffectParameter.h:10-23
//
// The contract every shader parameter carries. Carbon casts to it -
// `ITriEffectParameterPtr param = ITriEffectParameterPtr( BlueCastPtr(
// paramAsEffectValue ) )` (Tr2Effect.cpp:1930) - so the brand here is contract
// semantics rather than capability discovery.
//
// WHY IT WAS MISSING, and what that cost. The port gave the family two invented
// bases instead - a universal values hierarchy -
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

import { CjsSchema, blue } from "#schema";


/** Contract for a shader parameter: its name, its effect handles and its content hash. */
export class ITriEffectParameter extends IRoot
{

  /** The authored parameter name the effect binds by. */
  GetParameterName() {}

  /** Re-resolves this parameter's handles against a shader's reflection. */
  RebuildEffectHandles(_effectRes) {}

  /** Folds this parameter's content into a running FNV1 hash. */
  GetHashValue(_startingHash) {}

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


CjsSchema.blue.inherit(ITr2EffectValue)(ITriEffectParameter);
CjsSchema.decorateMethod(ITriEffectParameter, "GetParameterName", blue.abstract);
CjsSchema.decorateMethod(ITriEffectParameter, "RebuildEffectHandles", blue.abstract);
CjsSchema.decorateMethod(ITriEffectParameter, "GetHashValue", blue.abstract);
CjsSchema.decorateMethod(ITriEffectParameter, "SupportsDirtyNotification", blue.method);
CjsSchema.exposure.interface("ITriEffectParameter")(ITriEffectParameter);
