import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/IEveEffectChildrenOwner.h:9-15
import { meta } from "#schema";
/** Contract for an object that keeps a named list of effect children, as EveEffectRoot2 does. */
@be.interface("IEveEffectChildrenOwner")
@be.inherit(IRoot)
export class IEveEffectChildrenOwner extends IRoot
{
  /**
   * Finds an effect child by name.
   * @param {string} _name The child's name.
   * @returns {object|null} The EveSpaceObjectChild, or null when absent.
   */
  @meta.abstract
  GetEffectChildByName(_name) {}

  /**
   * Adds a child to the effect children list.
   * @param {object} _child The EveSpaceObjectChild to add.
   * @returns {void}
   */
  @meta.abstract
  AddToEffectChildrenList(_child) {}

  /**
   * Removes a child from the effect children list.
   * @param {object} _child The EveSpaceObjectChild to remove.
   * @returns {void}
   */
  @meta.abstract
  RemoveFromEffectChildrenList(_child) {}
}
