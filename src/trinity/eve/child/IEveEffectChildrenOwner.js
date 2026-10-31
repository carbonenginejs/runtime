import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/IEveEffectChildrenOwner.h:9-15

/** Contract for an object that keeps a named list of effect children, as EveEffectRoot2 does. */
@be.interface("IEveEffectChildrenOwner")
@be.inherit(IRoot)
export class IEveEffectChildrenOwner extends IRoot
{
  /**
   * Finds an effect child by name.
   *
   * @abstract
   * @param {string} _name The child's name.
   * @returns {object|null} The EveSpaceObjectChild, or null when absent.
   */
  @be.abstract
  GetEffectChildByName(name) {}

  /**
   * Adds a child to the effect children list.
   *
   * @abstract
   * @param {object} _child The EveSpaceObjectChild to add.
   * @returns {void}
   */
  @be.abstract
  AddToEffectChildrenList(child) {}

  /**
   * Removes a child from the effect children list.
   *
   * @abstract
   * @param {object} _child The EveSpaceObjectChild to remove.
   * @returns {void}
   */
  @be.abstract
  RemoveFromEffectChildrenList(child) {}
}
