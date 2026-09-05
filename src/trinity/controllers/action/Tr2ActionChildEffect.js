// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction, withITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that attaches a child effect loaded from a resource path to
 * its owner on start and detaches it on stop.
 */
@type.define({
  className: "Tr2ActionChildEffect",
  family: "controllers"
})
export class Tr2ActionChildEffect extends withITr2ControllerAction(CjsModel)
{
  static #resourcePrefetcher = null;

  /** Registers the runtime-owned child-effect prefetch callback. */
  static registerResourcePrefetcher(prefetcher)
  {
    const previous = this.#resourcePrefetcher;
    this.#resourcePrefetcher = prefetcher;
    return previous;
  }

  /** Clears the runtime-owned child-effect prefetch callback. */
  static clearResourcePrefetcher()
  {
    this.#resourcePrefetcher = null;
  }

  /** Requests prefetch without taking ownership of the resource lifecycle. */
  static prefetchResource(path, owner = null)
  {
    if (path && this.#resourcePrefetcher)
    {
      this.#resourcePrefetcher(path, owner);
    }
  }

  @io.persist
  @type.boolean
  addOnStart = true;

  @io.persist
  @type.string
  targetAnotherOwner = "";

  @io.persist
  @type.string
  childName = "";

  @io.persist
  @type.path
  path = "";

  @io.persist
  @type.boolean
  removeOnStop = true;

  #child = null;

  /**
   * Carbon prefetches the resource here; JS keeps this as an explicit no-op.
   */
  @carbon.method
  @impl.noop
  Link(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    Tr2ActionChildEffect.prefetchResource(this.path, owner);
  }

  /**
   * Adds the target child effect when Carbon would load it on action start.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const controllerOwner = ITr2ControllerAction.getOwner(controller);
    const resolved = this.#resolveOwner(controllerOwner);
    const owner = resolved.owner;
    if (!owner)
    {
      return;
    }
    this.#child = this.FindChild(owner);
    if (this.#child || !this.addOnStart || !this.path)
    {
      return;
    }
    this.#child = this.CreateChild(owner);
    if (!this.#child)
    {
      return;
    }
    ITr2ControllerAction.callTarget(this.#child, "StartControllers");
    if (resolved.rebind)
    {
      ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
    }
  }

  /**
   * Stops or removes the target child effect.
   */
  @carbon.method
  @impl.adapted
  Stop(controller)
  {
    const child = this.#child;
    if (!child)
    {
      return;
    }
    if (this.removeOnStop)
    {
      const owner = this.#resolveOwner(ITr2ControllerAction.getOwner(controller)).owner;
      if (owner)
      {
        Tr2ActionChildEffect.#removeChildFromOwner(owner, child);
      }
    }
    this.#child = null;
  }

  /**
   * Resolves the object the child effect is attached to, following
   * targetAnotherOwner when set.
   */
  ResolveOwner(owner)
  {
    return this.#resolveOwner(owner).owner;
  }

  /**
   * Looks up an already-present child by childName on the owner, returning null
   * when childName is empty or no match exists.
   */
  FindChild(owner)
  {
    return (this.childName ? ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.childName) ?? Tr2ActionChildEffect.#findNamed(owner, this.childName) : null) ?? null;
  }

  /**
   * Creates the child through the owner's AddChildFromPath, and when the owner
   * has no loader falls back to attaching a plain `{ name, path }` placeholder
   * record so the binding still resolves.
   */
  CreateChild(owner)
  {
    const childFromOwner = ITr2ControllerAction.callTarget(owner, "AddChildFromPath", this.path, this.childName);
    if (childFromOwner)
    {
      Tr2ActionChildEffect.#setChildName(childFromOwner, this.childName);
      return childFromOwner;
    }
    const child = {
      name: this.childName,
      path: this.path
    };
    Tr2ActionChildEffect.#setChildName(child, this.childName);
    Tr2ActionChildEffect.#addChildToOwner(owner, child);
    return child;
  }

  /**
   * Redirects the action to another owner named by targetAnotherOwner, trying a
   * named effect child, then a named parameter, then a stretch endpoint;
   * `rebind` is set when the redirect requires the controller owner to rebind.
   */
  #resolveOwner(owner)
  {
    if (!owner || !this.targetAnotherOwner)
    {
      return {
        owner,
        rebind: false
      };
    }
    const childOwner = ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.targetAnotherOwner) ?? Tr2ActionChildEffect.#findNamed(owner, this.targetAnotherOwner));
    if (childOwner)
    {
      return {
        owner: childOwner,
        rebind: false
      };
    }
    const parameterOwner = ITr2ControllerAction.getParameterOwner(owner, this.targetAnotherOwner);
    if (parameterOwner)
    {
      return {
        owner: parameterOwner,
        rebind: true
      };
    }
    const stretchOwner = Tr2ActionChildEffect.#getStretchOwner(owner, this.targetAnotherOwner);
    return {
      owner: stretchOwner,
      rebind: !!stretchOwner
    };
  }

  /**
   * Attaches a child through AddToEffectChildrenList or AddChild, falling back
   * to pushing onto plain `effectChildren` and `children` arrays.
   */
  static #addChildToOwner(owner, child)
  {
    if (ITr2ControllerAction.hasFunction(owner, "AddToEffectChildrenList"))
    {
      owner.AddToEffectChildrenList(child);
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "AddChild"))
    {
      owner.AddChild(child);
      return;
    }
    this.#addToArray(owner, "effectChildren", child);
    this.#addToArray(owner, "children", child);
  }

  /**
   * Searches the owner's `effectChildren`, `children` and `items` arrays for an
   * entry whose GetName() or `name` matches.
   */
  static #findNamed(owner, name)
  {
    for (const listName of ["effectChildren", "children", "items"])
    {
      if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]))
      {
        const found = owner[listName].find(item => ITr2ControllerAction.callTarget(item, "GetName") === name || ITr2ControllerAction.hasProperty(item, "name") && item.name === name);
        if (found)
        {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Resolves the `SourceSpaceObject` and `DestSpaceObject` endpoints of a
   * stretch owner, returning null for any other name.
   */
  static #getStretchOwner(owner, name)
  {
    if (name === "SourceSpaceObject")
    {
      return ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetSourceSpaceObject") ?? ITr2ControllerAction.getProperty(owner, "sourceSpaceObject"));
    }
    if (name === "DestSpaceObject")
    {
      return ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetDestSpaceObject") ?? ITr2ControllerAction.getProperty(owner, "destSpaceObject"));
    }
    return null;
  }

  /**
   * Detaches a child through RemoveFromEffectChildrenList or RemoveChild,
   * falling back to splicing it out of plain `effectChildren` and `children`
   * arrays.
   */
  static #removeChildFromOwner(owner, child)
  {
    if (ITr2ControllerAction.hasFunction(owner, "RemoveFromEffectChildrenList"))
    {
      owner.RemoveFromEffectChildrenList(child);
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "RemoveChild"))
    {
      owner.RemoveChild(child);
      return;
    }
    this.#removeFromArray(owner, "effectChildren", child);
    this.#removeFromArray(owner, "children", child);
  }

  /**
   * Names a created child through SetName when available, otherwise by assigning
   * the `name` property; an empty name is ignored.
   */
  static #setChildName(child, name)
  {
    if (!name || !child || typeof child !== "object")
    {
      return;
    }
    if (ITr2ControllerAction.hasFunction(child, "SetName"))
    {
      child.SetName(name);
      return;
    }
    child.name = name;
  }

  /**
   * Appends a value to a named array property on the owner if it is not already
   * present.
   */
  static #addToArray(owner, listName, value)
  {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]) && !owner[listName].includes(value))
    {
      owner[listName].push(value);
    }
  }

  /**
   * Removes the first occurrence of a value from a named array property on the
   * owner.
   */
  static #removeFromArray(owner, listName, value)
  {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]))
    {
      const index = owner[listName].indexOf(value);
      if (index !== -1)
      {
        owner[listName].splice(index, 1);
      }
    }
  }
}
