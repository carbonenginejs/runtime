// Source: trinity/trinity/Eve/SpaceObject/Children/IEveEffectChildrenOwner.h:9-15
import { CjsSchema, meta, blue } from "#schema";


/** Contract for an object that keeps a named list of effect children, as EveEffectRoot2 does. */
export class IEveEffectChildrenOwner
{
  /**
   * Finds an effect child by name.
   * @param {string} _name The child's name.
   * @returns {object|null} The EveSpaceObjectChild, or null when absent.
   */
  GetEffectChildByName(_name)
  {
    throw new Error("IEveEffectChildrenOwner.GetEffectChildByName must be implemented by an effect-children owner.");
  }

  /**
   * Adds a child to the effect children list.
   * @param {object} _child The EveSpaceObjectChild to add.
   * @returns {void}
   */
  AddToEffectChildrenList(_child)
  {
    throw new Error("IEveEffectChildrenOwner.AddToEffectChildrenList must be implemented by an effect-children owner.");
  }

  /**
   * Removes a child from the effect children list.
   * @param {object} _child The EveSpaceObjectChild to remove.
   * @returns {void}
   */
  RemoveFromEffectChildrenList(_child)
  {
    throw new Error("IEveEffectChildrenOwner.RemoveFromEffectChildrenList must be implemented by an effect-children owner.");
  }
}

for (const method of [ "GetEffectChildByName", "AddToEffectChildrenList", "RemoveFromEffectChildrenList" ])
{
  CjsSchema.decorateMethod(IEveEffectChildrenOwner, method, blue.method, meta.abstract);
}
CjsSchema.blue.define(IEveEffectChildrenOwner, { className: "IEveEffectChildrenOwner" });
