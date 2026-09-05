// Source: trinity/trinity/Eve/SpaceObject/Children/IEveInheritPropertiesOwner.h
//
// The capability a child must CARRY to receive inherited faction colours.
// Carbon never calls SetInheritProperties on a bare child or light: every
// distribution loop gates on BlueCastPtr<IEveInheritPropertiesOwner>
// (EveSpaceObject2.cpp:4431,4439; EveChildContainer.cpp:1021,1029) and skips
// anything that is not an owner. Until this contract existed the JS port
// expressed that cast as `child?.SetInheritProperties?.()` - which is not the
// same thing: the hedge called ANY object carrying the method name, where
// Carbon calls only the five classes that opted in.
//
// The gate at the call sites is `instanceof IEveInheritPropertiesOwner`,
// exactly as BehaviorGroup.SetPlayFXBehavior ports its dynamic_cast.

import { CjsSchema } from "#schema";
import { Adopt, Brand } from "../controllers/ITr2Controller.js";


const IEVE_INHERIT_PROPERTIES_OWNER = Symbol.for("carbonenginejs.contract.IEveInheritPropertiesOwner");

const OWNER_ABSTRACTS = [ "SetInheritProperties" ];


/** Contract for an object that accepts inherited faction colour properties. */
export class IEveInheritPropertiesOwner
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[IEVE_INHERIT_PROPERTIES_OWNER] === true;
  }

  /**
   * Receives the owner's inherited colour set.
   *
   * THE ONLY METHOD, AND CARBON MAKES IT PURE VIRTUAL: an owner exists
   * precisely to accept the colours, so there is no sensible default.
   *
   * @param {Array} _colorSet The inherited colour properties.
   */
  SetInheritProperties(_colorSet)
  {
    throw new Error("IEveInheritPropertiesOwner.SetInheritProperties must be implemented by an owner.");
  }
}


Brand(IEveInheritPropertiesOwner, IEVE_INHERIT_PROPERTIES_OWNER, [], OWNER_ABSTRACTS);
CjsSchema.define(IEveInheritPropertiesOwner, { className: "IEveInheritPropertiesOwner" });


/**
 * Adds the IEveInheritPropertiesOwner contract without replacing an existing
 * model base.
 *
 * @param {Function} Base The class to extend.
 * @returns {Function} A subclass carrying the contract.
 */
export function withIEveInheritPropertiesOwner(Base)
{
  const Owner = Adopt(Base, IEveInheritPropertiesOwner, OWNER_ABSTRACTS);

  Brand(Owner, IEVE_INHERIT_PROPERTIES_OWNER, [], OWNER_ABSTRACTS);

  return Owner;
}
