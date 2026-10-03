// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect_Blue.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { blue } from "#blue";
import { meta, CjsSchema } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { Traverse } from "../../../global/blue/find.js";


/**
 * Controller action that attaches a child effect loaded from a resource path to
 * its owner on start and detaches it on stop.
 */
@meta.define({
  className: "Tr2ActionChildEffect",
  family: "controllers"
})
export class Tr2ActionChildEffect extends ITr2ControllerAction
{
  static _resourcePrefetcher = null;

  /** Registers the runtime-owned child-effect prefetch callback. */
  @meta.ours
  static registerResourcePrefetcher(prefetcher)
  {
    const previous = this._resourcePrefetcher;
    this._resourcePrefetcher = prefetcher;
    return previous;
  }

  /** Clears the runtime-owned child-effect prefetch callback. */
  @meta.ours
  static clearResourcePrefetcher()
  {
    this._resourcePrefetcher = null;
  }

  /** Requests prefetch without taking ownership of the resource lifecycle. */
  @meta.ours
  static prefetchResource(path, owner = null)
  {
    if (path && this._resourcePrefetcher)
    {
      this._resourcePrefetcher(path, owner);
    }
  }

  /** Native m_path: std::string with file-path editor/transport semantics. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  path = "";

  /** Native m_childName. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  childName = "";

  /** Native m_targetAnotherOwner: BlueSharedString. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  targetAnotherOwner = "";

  /** Native m_addOnStart. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  addOnStart = true;

  /** Native m_removeOnStop. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  removeOnStop = true;

  /** Native m_child: attached or preexisting child until Stop. */
  _child = null;

  /** Whether this action loaded the current child rather than borrowing it. */
  _ownsChild = false;

  /** Counts loads; a Stop or new load makes an in-flight one stale. */
  _loadRequest = 0;

  /**
   * Forwards this path and controller owner to the registered prefetch callback.
   * Adapted: native Link deduplicates paths process-wide, checks local files and
   * queues an urgent background ResFile open. The JS runtime owns those choices
   * through its callback; this action neither duplicates them nor claims parity.
   */
  @meta.blue.method
  @meta.adapted
  Link(controller)
  {
    const owner = controller.GetOwner();
    Tr2ActionChildEffect.prefetchResource(this.path, owner);
  }

  /**
   * Adds the target child effect when Carbon would load it on action start.
   * Adapted: preserves asynchronous resource loading and structural owner lookup
   * rather than native synchronous loading and concrete scene/interface casts.
   */
  @meta.blue.method
  @meta.adapted
  Start(controller)
  {
    const controllerOwner = controller.GetOwner();
    const resolved = this._resolveOwner(controllerOwner);
    const owner = resolved.owner;
    if (!owner)
    {
      return;
    }
    this._child = this.FindChild(owner);
    this._ownsChild = false;
    if (this._child || !this.addOnStart || !this.path)
    {
      return;
    }
    this._loadChild(owner, controllerOwner, resolved.rebind);
  }

  /**
   * Carbon Start's load (Tr2ActionChildEffect.cpp:115-134): LoadObject the
   * path as an EveSpaceObjectChild; only when that succeeds, name it, add it
   * to the owner and start its controllers; then rebind a redirected owner.
   * A failed load adds nothing.
   *
   * Adapted: the JS resource manager resolves asynchronously, so this runs
   * when the file arrives, and a Stop or newer load before then discards it.
   */
  @meta.adapted
  _loadChild(owner, controllerOwner, rebind)
  {
    const path = this.path;
    const request = ++this._loadRequest;
    Promise.resolve(blue.resMan.LoadObject(path)).then(object =>
    {
      if (request !== this._loadRequest)
      {
        this._ReleaseChildDeviceResources(object, owner);
        return;
      }
      const child = CjsSchema.cast(object, blue.classes.GetClassRegistration("EveSpaceObjectChild").type);
      if (child)
      {
        if (this.childName) child.SetName(this.childName);
        Tr2ActionChildEffect._addChildToOwner(owner, child);
        child.StartControllers();
        this._child = child;
        this._ownsChild = true;
      }
      else
      {
        this._ReleaseChildDeviceResources(object, owner);
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2ActionChildEffect: ${path} is not an Eve child`);
      }
      if (rebind)
      {
        ITr2ControllerAction.callTarget(controllerOwner, "Rebind", true);
      }
    }, error =>
    {
      if (request === this._loadRequest) CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2ActionChildEffect: ${path} failed to load. ${error?.message ?? error}`);
    });
  }

  /**
   * Stops or removes the target child effect.
   * Adapted: invalidates pending asynchronous loads and retains structural owner
   * resolution. Native missing MultiEffect parameters can return before clearing
   * m_child; this retained JS adapter clears its child reference.
   */
  @meta.blue.method
  @meta.adapted
  Stop(controller)
  {
    // A load still in flight belongs to this run; drop it.
    this._loadRequest++;
    const child = this._child;
    if (!child)
    {
      return;
    }
    if (this.removeOnStop)
    {
      const owner = this._resolveOwner(controller.GetOwner()).owner;
      if (owner)
      {
        Tr2ActionChildEffect._removeChildFromOwner(owner, child);
        if (this._ownsChild) this._ReleaseChildDeviceResources(child, owner);
      }
    }
    this._child = null;
    this._ownsChild = false;
  }

  /**
   * Release the device resources of an action-owned child graph after its
   * removal or cancelled asynchronous load. Carbon's m_child smart pointer and
   * child graph references release these on last-owner destruction
   * (Tr2ActionChildEffect.cpp:137-198, Tr2ParticleSystem.cpp:89-101,
   * EveChildBehaviorSystem.cpp:63-65 and its two AL buffer members).
   * Adapted: JS device registration is strong, so dropping the graph alone
   * cannot call its particle/mesh/behavior-system destructors. Collect before destroying a
   * mesh, which detaches its shared instance provider. Resources still reached
   * from the owner survive, as do canonical geometry and texture resources.
   */
  @meta.ours
  _ReleaseChildDeviceResources(child, owner)
  {
    // Resolve nominal types at use time, as _loadChild does: importing the
    // renderer-backed classes here closes the controller/device module cycle.
    const particleType = CjsSchema.GetConstructor("Tr2ParticleSystem");
    const meshType = CjsSchema.GetConstructor("Tr2InstancedMesh");
    const behaviorType = CjsSchema.GetConstructor("EveChildBehaviorSystem");
    const retained = new Set();
    Traverse(owner, model => { retained.add(model); });
    // The retained structural owner adapter also accepts plain child arrays.
    for (const name of [ "children", "effectChildren", "items" ])
    {
      if (Array.isArray(owner?.[name]))
      {
        for (const root of owner[name]) Traverse(root, model => { retained.add(model); });
      }
    }
    const resources = [];
    Traverse(child, model =>
    {
      if (!retained.has(model)
        && ((particleType && CjsSchema.cast(model, particleType)) || (meshType && CjsSchema.cast(model, meshType))
          || (behaviorType && CjsSchema.cast(model, behaviorType))))
      {
        resources.push(model);
      }
    });
    for (const resource of resources) resource.Destroy();
  }

  /**
   * Resolves the object the child effect is attached to, following
   * targetAnotherOwner when set.
   */
  @meta.ours
  ResolveOwner(owner)
  {
    return this._resolveOwner(owner).owner;
  }

  /**
   * Looks up an already-present child by childName on the owner, returning null
   * when childName is empty or no match exists.
   */
  @meta.ours
  FindChild(owner)
  {
    return (this.childName ? ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.childName) ?? Tr2ActionChildEffect._findNamed(owner, this.childName) : null) ?? null;
  }

  /**
   * Redirects the action to another owner named by targetAnotherOwner, trying a
   * named effect child, then a named parameter, then a stretch endpoint;
   * `rebind` is set when the redirect requires the controller owner to rebind.
   */
  @meta.ours
  _resolveOwner(owner)
  {
    if (!owner || !this.targetAnotherOwner)
    {
      return {
        owner,
        rebind: false
      };
    }
    const childOwner = ITr2ControllerAction.asObject(ITr2ControllerAction.callTarget(owner, "GetEffectChildByName", this.targetAnotherOwner) ?? Tr2ActionChildEffect._findNamed(owner, this.targetAnotherOwner));
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
    const stretchOwner = Tr2ActionChildEffect._getStretchOwner(owner, this.targetAnotherOwner);
    return {
      owner: stretchOwner,
      rebind: !!stretchOwner
    };
  }

  /**
   * Attaches a child through AddToEffectChildrenList or AddChild, falling back
   * to pushing onto plain `effectChildren` and `children` arrays.
   */
  @meta.ours
  static _addChildToOwner(owner, child)
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
    this._addToArray(owner, "effectChildren", child);
    this._addToArray(owner, "children", child);
  }

  /**
   * Searches the owner's `effectChildren`, `children` and `items` arrays for an
   * entry whose GetName() or `name` matches.
   */
  @meta.ours
  static _findNamed(owner, name)
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
  @meta.ours
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
   * Detaches a child through RemoveFromEffectChildrenList or RemoveChild,
   * falling back to splicing it out of plain `effectChildren` and `children`
   * arrays.
   */
  @meta.ours
  static _removeChildFromOwner(owner, child)
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
    this._removeFromArray(owner, "effectChildren", child);
    this._removeFromArray(owner, "children", child);
  }

  /**
   * Appends a value to a named array property on the owner if it is not already
   * present.
   */
  @meta.ours
  static _addToArray(owner, listName, value)
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
  @meta.ours
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
}

// Native exposure ends at this concrete table (Tr2ActionChildEffect_Blue.cpp:12-13,26).
meta.blue.interfaceTable({
  interfaces: [Tr2ActionChildEffect, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionChildEffect);
