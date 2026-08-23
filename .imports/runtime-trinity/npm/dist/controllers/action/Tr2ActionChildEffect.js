import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { ITr2ControllerAction } from './ITr2ControllerAction.js';

let _initProto, _initClass, _init_addOnStart, _init_extra_addOnStart, _init_targetAnotherOwner, _init_extra_targetAnotherOwner, _init_childName, _init_extra_childName, _init_path, _init_extra_path, _init_removeOnStop, _init_extra_removeOnStop;

/**
 * Controller action that attaches a child effect loaded from a resource path to
 * its owner on start and detaches it on stop.
 */
let _Tr2ActionChildEffect;
new class extends _identity {
  static [class Tr2ActionChildEffect extends CjsModel {
    static {
      ({
        e: [_init_addOnStart, _init_extra_addOnStart, _init_targetAnotherOwner, _init_extra_targetAnotherOwner, _init_childName, _init_extra_childName, _init_path, _init_extra_path, _init_removeOnStop, _init_extra_removeOnStop, _initProto],
        c: [_Tr2ActionChildEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionChildEffect",
        family: "controllers"
      })], [[[io, io.persist, type, type.boolean], 16, "addOnStart"], [[io, io.persist, type, type.string], 16, "targetAnotherOwner"], [[io, io.persist, type, type.string], 16, "childName"], [[io, io.persist, type, type.path], 16, "path"], [[io, io.persist, type, type.boolean], 16, "removeOnStop"], [[carbon, carbon.method, impl, impl.noop], 18, "Link"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"]], 0, void 0, CjsModel));
    }
    /** Registers the runtime-owned child-effect prefetch callback. */
    static registerResourcePrefetcher(prefetcher) {
      const previous = this.#resourcePrefetcher;
      this.#resourcePrefetcher = prefetcher;
      return previous;
    }

    /** Clears the runtime-owned child-effect prefetch callback. */
    static clearResourcePrefetcher() {
      this.#resourcePrefetcher = null;
    }

    /** Requests prefetch without taking ownership of the resource lifecycle. */
    static prefetchResource(path, owner = null) {
      if (path && this.#resourcePrefetcher) {
        this.#resourcePrefetcher(path, owner);
      }
    }
    addOnStart = (_initProto(this), _init_addOnStart(this, true));
    targetAnotherOwner = (_init_extra_addOnStart(this), _init_targetAnotherOwner(this, ""));
    childName = (_init_extra_targetAnotherOwner(this), _init_childName(this, ""));
    path = (_init_extra_childName(this), _init_path(this, ""));
    removeOnStop = (_init_extra_path(this), _init_removeOnStop(this, true));
    #child = (_init_extra_removeOnStop(this), null);

    /**
     * Carbon prefetches the resource here; JS keeps this as an explicit no-op.
     */
    Link(controller) {
      const owner = ITr2ControllerAction.getOwner(controller);
      _Tr2ActionChildEffect.prefetchResource(this.path, owner);
    }

    /**
     * Adds the target child effect when Carbon would load it on action start.
     */
    Start(controller) {
      const controllerOwner = ITr2ControllerAction.getOwner(controller);
      const resolved = this.#resolveOwner(controllerOwner);
      const owner = resolved.owner;
      if (!owner) {
        return;
      }
      this.#child = this.FindChild(owner);
      if (this.#child || !this.addOnStart || !this.path) {
        return;
      }
      this.#child = this.CreateChild(owner);
      if (!this.#child) {
        return;
      }
      ITr2ControllerAction.callTarget(this.#child, "StartControllers");
      if (resolved.rebind) {
        ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
      }
    }

    /**
     * Stops or removes the target child effect.
     */
    Stop(controller) {
      const child = this.#child;
      if (!child) {
        return;
      }
      if (this.removeOnStop) {
        const owner = this.#resolveOwner(ITr2ControllerAction.getOwner(controller)).owner;
        if (owner) {
          _Tr2ActionChildEffect.#removeChildFromOwner(owner, child);
        }
      }
      this.#child = null;
    }

    /**
     * Resolves the object the child effect is attached to, following
     * targetAnotherOwner when set.
     */
    ResolveOwner(owner) {
      return this.#resolveOwner(owner).owner;
    }

    /**
     * Looks up an already-present child by childName on the owner, returning null
     * when childName is empty or no match exists.
     */
    FindChild(owner) {
      return (this.childName ? ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.childName) ?? _Tr2ActionChildEffect.#findNamed(owner, this.childName) : null) ?? null;
    }

    /**
     * Creates the child through the owner's AddChildFromPath, and when the owner
     * has no loader falls back to attaching a plain `{ name, path }` placeholder
     * record so the binding still resolves.
     */
    CreateChild(owner) {
      const childFromOwner = ITr2ControllerAction.callTarget(owner, "AddChildFromPath", this.path, this.childName);
      if (childFromOwner) {
        _Tr2ActionChildEffect.#setChildName(childFromOwner, this.childName);
        return childFromOwner;
      }
      const child = {
        name: this.childName,
        path: this.path
      };
      _Tr2ActionChildEffect.#setChildName(child, this.childName);
      _Tr2ActionChildEffect.#addChildToOwner(owner, child);
      return child;
    }

    /**
     * Redirects the action to another owner named by targetAnotherOwner, trying a
     * named effect child, then a named parameter, then a stretch endpoint;
     * `rebind` is set when the redirect requires the controller owner to rebind.
     */
    #resolveOwner(owner) {
      if (!owner || !this.targetAnotherOwner) {
        return {
          owner,
          rebind: false
        };
      }
      const childOwner = ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.targetAnotherOwner) ?? _Tr2ActionChildEffect.#findNamed(owner, this.targetAnotherOwner));
      if (childOwner) {
        return {
          owner: childOwner,
          rebind: false
        };
      }
      const parameterOwner = ITr2ControllerAction.getParameterOwner(owner, this.targetAnotherOwner);
      if (parameterOwner) {
        return {
          owner: parameterOwner,
          rebind: true
        };
      }
      const stretchOwner = _Tr2ActionChildEffect.#getStretchOwner(owner, this.targetAnotherOwner);
      return {
        owner: stretchOwner,
        rebind: !!stretchOwner
      };
    }

    /**
     * Attaches a child through AddToEffectChildrenList or AddChild, falling back
     * to pushing onto plain `effectChildren` and `children` arrays.
     */

    /**
     * Searches the owner's `effectChildren`, `children` and `items` arrays for an
     * entry whose GetName() or `name` matches.
     */

    /**
     * Resolves the `SourceSpaceObject` and `DestSpaceObject` endpoints of a
     * stretch owner, returning null for any other name.
     */

    /**
     * Detaches a child through RemoveFromEffectChildrenList or RemoveChild,
     * falling back to splicing it out of plain `effectChildren` and `children`
     * arrays.
     */

    /**
     * Names a created child through SetName when available, otherwise by assigning
     * the `name` property; an empty name is ignored.
     */

    /**
     * Appends a value to a named array property on the owner if it is not already
     * present.
     */

    /**
     * Removes the first occurrence of a value from a named array property on the
     * owner.
     */
  }];
  #resourcePrefetcher = null;
  #addChildToOwner(owner, child) {
    if (ITr2ControllerAction.hasFunction(owner, "AddToEffectChildrenList")) {
      owner.AddToEffectChildrenList(child);
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "AddChild")) {
      owner.AddChild(child);
      return;
    }
    this.#addToArray(owner, "effectChildren", child);
    this.#addToArray(owner, "children", child);
  }
  #findNamed(owner, name) {
    for (const listName of ["effectChildren", "children", "items"]) {
      if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName])) {
        const found = owner[listName].find(item => ITr2ControllerAction.callTarget(item, "GetName") === name || ITr2ControllerAction.hasProperty(item, "name") && item.name === name);
        if (found) {
          return found;
        }
      }
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
  #removeChildFromOwner(owner, child) {
    if (ITr2ControllerAction.hasFunction(owner, "RemoveFromEffectChildrenList")) {
      owner.RemoveFromEffectChildrenList(child);
      return;
    }
    if (ITr2ControllerAction.hasFunction(owner, "RemoveChild")) {
      owner.RemoveChild(child);
      return;
    }
    this.#removeFromArray(owner, "effectChildren", child);
    this.#removeFromArray(owner, "children", child);
  }
  #setChildName(child, name) {
    if (!name || !child || typeof child !== "object") {
      return;
    }
    if (ITr2ControllerAction.hasFunction(child, "SetName")) {
      child.SetName(name);
      return;
    }
    child.name = name;
  }
  #addToArray(owner, listName, value) {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName]) && !owner[listName].includes(value)) {
      owner[listName].push(value);
    }
  }
  #removeFromArray(owner, listName, value) {
    if (ITr2ControllerAction.hasProperty(owner, listName) && Array.isArray(owner[listName])) {
      const index = owner[listName].indexOf(value);
      if (index !== -1) {
        owner[listName].splice(index, 1);
      }
    }
  }
  constructor() {
    super(_Tr2ActionChildEffect), _initClass();
  }
}();

export { _Tr2ActionChildEffect as Tr2ActionChildEffect };
//# sourceMappingURL=Tr2ActionChildEffect.js.map
