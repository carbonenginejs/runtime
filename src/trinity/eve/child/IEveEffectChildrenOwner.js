import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/IEveEffectChildrenOwner.h:9-15
import { CjsSchema, blue } from "#schema";


/** Contract for an object that keeps a named list of effect children, as EveEffectRoot2 does. */
export class IEveEffectChildrenOwner
{
  /**
   * Finds an effect child by name.
   * @param {string} _name The child's name.
   * @returns {object|null} The EveSpaceObjectChild, or null when absent.
   */
  GetEffectChildByName(_name) {}

  /**
   * Adds a child to the effect children list.
   * @param {object} _child The EveSpaceObjectChild to add.
   * @returns {void}
   */
  AddToEffectChildrenList(_child) {}

  /**
   * Removes a child from the effect children list.
   * @param {object} _child The EveSpaceObjectChild to remove.
   * @returns {void}
   */
  RemoveFromEffectChildrenList(_child) {}
}

for (const method of [ "GetEffectChildByName", "AddToEffectChildrenList", "RemoveFromEffectChildrenList" ])
{
  CjsSchema.decorateMethod(IEveEffectChildrenOwner, method, blue.abstract);
}
CjsSchema.blue.inherit(IRoot)(IEveEffectChildrenOwner);
CjsSchema.exposure.interface("IEveEffectChildrenOwner")(IEveEffectChildrenOwner);
