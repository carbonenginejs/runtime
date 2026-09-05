// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { ITr2ControllerAction, withITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that adds a named overlay effect to its owner when the
 * action starts and removes it again when the action stops.
 */
@type.define({
  className: "Tr2ActionOverlay",
  family: "controllers"
})
export class Tr2ActionOverlay extends withITr2ControllerAction(CjsModel)
{
  @io.persist
  @type.path
  path = "";

  @io.persist
  @type.string
  overlayName = "";

  @io.persist
  @type.string
  targetAnotherOwner = "";

  @io.persist
  @type.boolean
  addOnStart = true;

  @io.persist
  @type.boolean
  removeOnStop = true;

  #overlay = null;

  /**
   * Loads and starts the target overlay when Carbon would add it.
   */
  @carbon.method
  @impl.adapted
  Start(controller)
  {
    const controllerOwner = ITr2ControllerAction.getOwner(controller);
    const resolved = this.#resolveOwner(controllerOwner);
    if (!resolved.owner)
    {
      return;
    }
    this.#loadOverlay(resolved.owner);
    if (resolved.rebind)
    {
      ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
    }
  }

  /**
   * Stops or removes the target overlay.
   */
  @carbon.method
  @impl.adapted
  Stop(controller)
  {
    const overlay = this.#overlay;
    if (!overlay)
    {
      return;
    }
    if (this.removeOnStop)
    {
      const owner = this.#resolveOwner(ITr2ControllerAction.getOwner(controller)).owner;
      if (owner)
      {
        Tr2ActionOverlay.#removeOverlay(owner, overlay);
      }
    }
    this.#overlay = null;
  }

  /**
   * Finds the overlay already present on the owner by name, and only when it is
   * absent and addOnStart is set loads it from the authored path, names it,
   * attaches it, and starts its controllers.
   */
  #loadOverlay(owner)
  {
    this.#overlay = this.overlayName ? ITr2ControllerAction.callTarget(owner, "GetOverlayEffectByName", this.overlayName) ?? Tr2ActionOverlay.#findNamed(owner, "overlays", this.overlayName) : null;
    if (!this.#overlay && this.addOnStart && this.path)
    {
      const loaded = Tr2ActionOverlay.#loadOverlayResource(owner, this.#normalizePath(owner));
      this.#overlay = loaded.overlay;
      if (this.#overlay)
      {
        Tr2ActionOverlay.#setName(this.#overlay, this.overlayName);
        if (!loaded.added)
        {
          Tr2ActionOverlay.#addOverlay(owner, this.#overlay);
        }
        ITr2ControllerAction.callTarget(this.#overlay, "StartControllers");
      }
    }
  }

  /**
   * Lower-cases the authored path and switches the `_skinned` suffix on or off
   * to match whether the owner is animated.
   */
  #normalizePath(owner)
  {
    let path = this.path.toLowerCase();
    const animated = !!ITr2ControllerAction.callTarget(owner, "IsAnimated");
    if (animated && !path.includes("_skinned"))
    {
      path = path.replace(/\.red$/, "_skinned.red");
    }
    else if (!animated && path.includes("_skinned"))
    {
      path = path.replace("_skinned", "");
    }
    return path;
  }

  /**
   * Picks the object the overlay is attached to, preferring the controller owner
   * itself and otherwise following targetAnotherOwner through a named parameter
   * or a stretch endpoint; `rebind` is set when the redirect requires the
   * controller owner to rebind.
   */
  #resolveOwner(owner)
  {
    if (!owner)
    {
      return {
        owner: null,
        rebind: false
      };
    }
    if (Tr2ActionOverlay.#isOverlayOwner(owner))
    {
      return {
        owner,
        rebind: false
      };
    }
    if (!this.targetAnotherOwner)
    {
      return {
        owner: null,
        rebind: false
      };
    }
    const parameterOwner = ITr2ControllerAction.getParameterOwner(owner, this.targetAnotherOwner);
    if (parameterOwner && Tr2ActionOverlay.#isOverlayOwner(parameterOwner))
    {
      return {
        owner: parameterOwner,
        rebind: true
      };
    }
    const stretchOwner = Tr2ActionOverlay.#getStretchOwner(owner, this.targetAnotherOwner);
    if (stretchOwner && Tr2ActionOverlay.#isOverlayOwner(stretchOwner))
    {
      return {
        owner: stretchOwner,
        rebind: true
      };
    }
    return {
      owner: null,
      rebind: false
    };
  }

  /**
   * Attaches an overlay through the owner's AddOverlayEffect, falling back to
   * pushing onto a plain `overlays` array.
   */
  static #addOverlay(owner, overlay)
  {
    if (ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect"))
    {
      owner.AddOverlayEffect(overlay);
      return;
    }
    this.#addToArray(owner, "overlays", overlay);
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
   * Finds an entry in a named array property whose GetName() or `name` matches,
   * or null.
   */
  static #findNamed(owner, listName, name)
  {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]))
    {
      return owner[listName].find(item => ITr2ControllerAction.callTarget(item, "GetName") === name || ITr2ControllerAction.hasProperty(item, "name") && item.name === name) ?? null;
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
   * Checks whether an object can hold overlays, by exposing any of the overlay
   * accessor methods or a plain `overlays` array.
   */
  static #isOverlayOwner(owner)
  {
    return !!owner && typeof owner === "object" && (ITr2ControllerAction.hasFunction(owner, "GetOverlayEffectByName") || ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect") || ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect") || ITr2ControllerAction.hasProperty(owner, "overlays"));
  }

  /**
   * Loads an overlay from a path through whichever owner loader exists,
   * reporting in `added` whether that loader already attached it to the owner.
   */
  static #loadOverlayResource(owner, path)
  {
    const loaded = ITr2ControllerAction.callTarget(owner, "LoadOverlayEffectFromPath", path) ?? ITr2ControllerAction.callTarget(owner, "LoadOverlayEffect", path);
    if (loaded)
    {
      return { overlay: loaded, added: false };
    }
    const added = ITr2ControllerAction.callTarget(owner, "AddOverlayEffectFromPath", path);
    return { overlay: added, added: !!added };
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

  /**
   * Detaches an overlay through the owner's RemoveOverlayEffect, falling back to
   * splicing it out of a plain `overlays` array.
   */
  static #removeOverlay(owner, overlay)
  {
    if (ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect"))
    {
      owner.RemoveOverlayEffect(overlay);
      return;
    }
    this.#removeFromArray(owner, "overlays", overlay);
  }

  /**
   * Names a loaded overlay through SetName when available, otherwise by
   * assigning the `name` property; an empty name is ignored.
   */
  static #setName(target, name)
  {
    if (!name || !target || typeof target !== "object")
    {
      return;
    }
    if (ITr2ControllerAction.hasFunction(target, "SetName"))
    {
      target.SetName(name);
      return;
    }
    target.name = name;
  }
}
