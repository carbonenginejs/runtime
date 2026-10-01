// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionOverlay_Blue.cpp
import { meta, types } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that adds a named overlay effect to its owner when the
 * action starts and removes it again when the action stops.
 */
@meta.define({
  className: "Tr2ActionOverlay",
  family: "controllers"
})
export class Tr2ActionOverlay extends ITr2ControllerAction
{
  @meta.edit.readwrite
  @meta.edit.persist
  @types.path
  path = "";

  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  overlayName = "";

  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  targetAnotherOwner = "";

  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  addOnStart = true;

  @meta.edit.readwrite
  @meta.edit.persist
  @types.boolean
  removeOnStop = true;

  /** Native m_overlay: retained loaded or preexisting overlay until Stop. */
  _overlay = null;

  /**
   * Loads and starts the target overlay through the retained JS owner adapter.
   * Adapted: native casts to EveSpaceObject2, EveMultiEffect and EveStretch3.
   * The current scene owners lack the complete overlay accessor/loading API,
   * so this action retains its existing injected-owner and plain-array protocol.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller)
  {
    const controllerOwner = controller.GetOwner();
    const resolved = this._resolveOwner(controllerOwner);
    if (!resolved.owner)
    {
      return;
    }
    this._loadOverlay(resolved.owner);
    if (resolved.rebind)
    {
      ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
    }
  }

  /**
   * Stops or removes the target overlay.
   * Adapted: resolves and removes through the same injected-owner/array protocol
   * as Start; the concrete native scene-owner API remains an external gap.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Stop(controller)
  {
    const overlay = this._overlay;
    if (!overlay)
    {
      return;
    }
    if (this.removeOnStop)
    {
      const owner = this._resolveOwner(controller.GetOwner()).owner;
      if (owner)
      {
        Tr2ActionOverlay._removeOverlay(owner, overlay);
      }
    }
    this._overlay = null;
  }

  /**
   * Finds the overlay already present on the owner by name, and only when it is
   * absent and addOnStart is set loads it from the authored path, names it,
   * attaches it, and starts its controllers.
   * Adapted from native LoadOverlay: the injected owner loader substitutes for
   * BeResMan urgent synchronous LoadObject<EveMeshOverlayEffect>. Urgency and
   * nominal resource/owner contracts are not implemented by this adapter.
   */
  @meta.impl.adapted
  _loadOverlay(owner)
  {
    this._overlay = this.overlayName ? ITr2ControllerAction.callTarget(owner, "GetOverlayEffectByName", this.overlayName) ?? Tr2ActionOverlay._findNamed(owner, "overlays", this.overlayName) : null;
    if (!this._overlay && this.addOnStart && this.path)
    {
      const loaded = Tr2ActionOverlay._loadOverlayResource(owner, this._normalizePath(owner));
      this._overlay = loaded.overlay;
      if (this._overlay)
      {
        Tr2ActionOverlay._setName(this._overlay, this.overlayName);
        if (!loaded.added)
        {
          Tr2ActionOverlay._addOverlay(owner, this._overlay);
        }
        ITr2ControllerAction.callTarget(this._overlay, "StartControllers");
      }
    }
  }

  /**
   * Lower-cases the authored path and switches the `_skinned` suffix on or off
   * to match whether the owner is animated.
   * Adapted: keeps the existing owner adapter and JS suffix string operations.
   */
  @meta.impl.adapted
  _normalizePath(owner)
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
   * Adapted: preserves the existing parameter/endpoint shape lookup instead of
   * native concrete scene casts until those owners supply the required methods.
   */
  @meta.impl.adapted
  _resolveOwner(owner)
  {
    if (!owner)
    {
      return {
        owner: null,
        rebind: false
      };
    }
    if (Tr2ActionOverlay._isOverlayOwner(owner))
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
    if (parameterOwner && Tr2ActionOverlay._isOverlayOwner(parameterOwner))
    {
      return {
        owner: parameterOwner,
        rebind: true
      };
    }
    const stretchOwner = Tr2ActionOverlay._getStretchOwner(owner, this.targetAnotherOwner);
    if (stretchOwner && Tr2ActionOverlay._isOverlayOwner(stretchOwner))
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
  @meta.impl.custom
  static _addOverlay(owner, overlay)
  {
    if (ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect"))
    {
      owner.AddOverlayEffect(overlay);
      return;
    }
    this._addToArray(owner, "overlays", overlay);
  }

  /**
   * Appends a value to a named array property on the owner if it is not already
   * present.
   */
  @meta.impl.custom
  static _addToArray(owner, listName, value)
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
  @meta.impl.custom
  static _findNamed(owner, listName, name)
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
  @meta.impl.custom
  static _getStretchOwner(owner, name)
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
  @meta.impl.custom
  static _isOverlayOwner(owner)
  {
    return !!owner && typeof owner === "object" && (ITr2ControllerAction.hasFunction(owner, "GetOverlayEffectByName") || ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect") || ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect") || ITr2ControllerAction.hasProperty(owner, "overlays"));
  }

  /**
   * Loads an overlay from a path through whichever owner loader exists,
   * reporting in `added` whether that loader already attached it to the owner.
   */
  @meta.impl.custom
  static _loadOverlayResource(owner, path)
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
  @meta.impl.custom
  static _removeFromArray(owner, listName, value)
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
  @meta.impl.custom
  static _removeOverlay(owner, overlay)
  {
    if (ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect"))
    {
      owner.RemoveOverlayEffect(overlay);
      return;
    }
    this._removeFromArray(owner, "overlays", overlay);
  }

  /**
   * Names a loaded overlay through SetName when available, otherwise by
   * assigning the `name` property; an empty name is ignored.
   */
  @meta.impl.custom
  static _setName(target, name)
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

// Native exposure ends at this concrete table (Tr2ActionOverlay_Blue.cpp:12-13,37).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionOverlay, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionOverlay);
