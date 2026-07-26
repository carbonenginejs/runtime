import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_path, _init_extra_path, _init_overlayName, _init_extra_overlayName, _init_targetAnotherOwner, _init_extra_targetAnotherOwner, _init_addOnStart, _init_extra_addOnStart, _init_removeOnStop, _init_extra_removeOnStop;

/**
 * Controller action that adds a named overlay effect to its owner when the
 * action starts and removes it again when the action stops.
 */
let _Tr2ActionOverlay;
new class extends _identity {
  static [class Tr2ActionOverlay extends CjsModel {
    static {
      ({
        e: [_init_path, _init_extra_path, _init_overlayName, _init_extra_overlayName, _init_targetAnotherOwner, _init_extra_targetAnotherOwner, _init_addOnStart, _init_extra_addOnStart, _init_removeOnStop, _init_extra_removeOnStop, _initProto],
        c: [_Tr2ActionOverlay, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionOverlay",
        family: "controllers"
      })], [[[io, io.persist, type, type.path], 16, "path"], [[io, io.persist, type, type.string], 16, "overlayName"], [[io, io.persist, type, type.string], 16, "targetAnotherOwner"], [[io, io.persist, type, type.boolean], 16, "addOnStart"], [[io, io.persist, type, type.boolean], 16, "removeOnStop"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"]], 0, void 0, CjsModel));
    }
    path = (_initProto(this), _init_path(this, ""));
    overlayName = (_init_extra_path(this), _init_overlayName(this, ""));
    targetAnotherOwner = (_init_extra_overlayName(this), _init_targetAnotherOwner(this, ""));
    addOnStart = (_init_extra_targetAnotherOwner(this), _init_addOnStart(this, true));
    removeOnStop = (_init_extra_addOnStart(this), _init_removeOnStop(this, true));
    #overlay = (_init_extra_removeOnStop(this), null);

    /**
     * Loads and starts the target overlay when Carbon would add it.
     */
    Start(controller) {
      const controllerOwner = ITr2ControllerAction.getOwner(controller);
      const resolved = this.#resolveOwner(controllerOwner);
      if (!resolved.owner) {
        return;
      }
      this.#loadOverlay(resolved.owner);
      if (resolved.rebind) {
        ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
      }
    }

    /**
     * Stops or removes the target overlay.
     */
    Stop(controller) {
      const overlay = this.#overlay;
      if (!overlay) {
        return;
      }
      if (this.removeOnStop) {
        const owner = this.#resolveOwner(ITr2ControllerAction.getOwner(controller)).owner;
        if (owner) {
          _Tr2ActionOverlay.#removeOverlay(owner, overlay);
        }
      }
      this.#overlay = null;
    }

    /**
     * Finds the overlay already present on the owner by name, and only when it is
     * absent and addOnStart is set loads it from the authored path, names it,
     * attaches it, and starts its controllers.
     */
    #loadOverlay(owner) {
      this.#overlay = this.overlayName ? ITr2ControllerAction.callTarget(owner, "GetOverlayEffectByName", this.overlayName) ?? _Tr2ActionOverlay.#findNamed(owner, "overlays", this.overlayName) : null;
      if (!this.#overlay && this.addOnStart && this.path) {
        const loaded = _Tr2ActionOverlay.#loadOverlayResource(owner, this.#normalizePath(owner));
        this.#overlay = loaded.overlay;
        if (this.#overlay) {
          _Tr2ActionOverlay.#setName(this.#overlay, this.overlayName);
          if (!loaded.added) {
            _Tr2ActionOverlay.#addOverlay(owner, this.#overlay);
          }
          ITr2ControllerAction.callTarget(this.#overlay, "StartControllers");
        }
      }
    }

    /**
     * Lower-cases the authored path and switches the `_skinned` suffix on or off
     * to match whether the owner is animated.
     */
    #normalizePath(owner) {
      let path = this.path.toLowerCase();
      const animated = !!ITr2ControllerAction.callTarget(owner, "IsAnimated");
      if (animated && !path.includes("_skinned")) {
        path = path.replace(/\.red$/, "_skinned.red");
      } else if (!animated && path.includes("_skinned")) {
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
    #resolveOwner(owner) {
      if (!owner) {
        return {
          owner: null,
          rebind: false
        };
      }
      if (_Tr2ActionOverlay.#isOverlayOwner(owner)) {
        return {
          owner,
          rebind: false
        };
      }
      if (!this.targetAnotherOwner) {
        return {
          owner: null,
          rebind: false
        };
      }
      const parameterOwner = ITr2ControllerAction.getParameterOwner(owner, this.targetAnotherOwner);
      if (parameterOwner && _Tr2ActionOverlay.#isOverlayOwner(parameterOwner)) {
        return {
          owner: parameterOwner,
          rebind: true
        };
      }
      const stretchOwner = _Tr2ActionOverlay.#getStretchOwner(owner, this.targetAnotherOwner);
      if (stretchOwner && _Tr2ActionOverlay.#isOverlayOwner(stretchOwner)) {
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

    /**
     * Appends a value to a named array property on the owner if it is not already
     * present.
     */

    /**
     * Finds an entry in a named array property whose GetName() or `name` matches,
     * or null.
     */

    /**
     * Resolves the `SourceSpaceObject` and `DestSpaceObject` endpoints of a
     * stretch owner, returning null for any other name.
     */

    /**
     * Checks whether an object can hold overlays, by exposing any of the overlay
     * accessor methods or a plain `overlays` array.
     */

    /**
     * Loads an overlay from a path through whichever owner loader exists,
     * reporting in `added` whether that loader already attached it to the owner.
     */

    /**
     * Removes the first occurrence of a value from a named array property on the
     * owner.
     */

    /**
     * Detaches an overlay through the owner's RemoveOverlayEffect, falling back to
     * splicing it out of a plain `overlays` array.
     */

    /**
     * Names a loaded overlay through SetName when available, otherwise by
     * assigning the `name` property; an empty name is ignored.
     */
  }];
  #addOverlay(owner, overlay) {
    if (ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect")) {
      owner.AddOverlayEffect(overlay);
      return;
    }
    this.#addToArray(owner, "overlays", overlay);
  }
  #addToArray(owner, listName, value) {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]) && !owner[listName].includes(value)) {
      owner[listName].push(value);
    }
  }
  #findNamed(owner, listName, name) {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName])) {
      return owner[listName].find(item => ITr2ControllerAction.callTarget(item, "GetName") === name || ITr2ControllerAction.hasProperty(item, "name") && item.name === name) ?? null;
    }
    return null;
  }
  #getStretchOwner(owner, name) {
    if (name === "SourceSpaceObject") {
      return ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetSourceSpaceObject") ?? ITr2ControllerAction.getProperty(owner, "sourceSpaceObject"));
    }
    if (name === "DestSpaceObject") {
      return ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetDestSpaceObject") ?? ITr2ControllerAction.getProperty(owner, "destSpaceObject"));
    }
    return null;
  }
  #isOverlayOwner(owner) {
    return !!owner && typeof owner === "object" && (ITr2ControllerAction.hasFunction(owner, "GetOverlayEffectByName") || ITr2ControllerAction.hasFunction(owner, "AddOverlayEffect") || ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect") || ITr2ControllerAction.hasProperty(owner, "overlays"));
  }
  #loadOverlayResource(owner, path) {
    const loaded = ITr2ControllerAction.callTarget(owner, "LoadOverlayEffectFromPath", path) ?? ITr2ControllerAction.callTarget(owner, "LoadOverlayEffect", path);
    if (loaded) {
      return {
        overlay: loaded,
        added: false
      };
    }
    const added = ITr2ControllerAction.callTarget(owner, "AddOverlayEffectFromPath", path);
    return {
      overlay: added,
      added: !!added
    };
  }
  #removeFromArray(owner, listName, value) {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName])) {
      const index = owner[listName].indexOf(value);
      if (index !== -1) {
        owner[listName].splice(index, 1);
      }
    }
  }
  #removeOverlay(owner, overlay) {
    if (ITr2ControllerAction.hasFunction(owner, "RemoveOverlayEffect")) {
      owner.RemoveOverlayEffect(overlay);
      return;
    }
    this.#removeFromArray(owner, "overlays", overlay);
  }
  #setName(target, name) {
    if (!name || !target || typeof target !== "object") {
      return;
    }
    if (ITr2ControllerAction.hasFunction(target, "SetName")) {
      target.SetName(name);
      return;
    }
    target.name = name;
  }
  constructor() {
    super(_Tr2ActionOverlay), _initClass();
  }
}();

export { _Tr2ActionOverlay as Tr2ActionOverlay };
//# sourceMappingURL=Tr2ActionOverlay.js.map
