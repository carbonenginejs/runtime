// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionChildEffect_Blue.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { be, CjsBlueClasses } from "#blue";
import { meta, CjsSchema, type, blue } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Carbon's BlueCastPtr: a silent QueryInterface for a class asked of Blue by
 * its Carbon name (BlueSmartPtr.h:289-301), so the controllers do not import
 * Eve; null for a null object. An unregistered class throws: Carbon's cast
 * target always exists.
 */
function CastTo(value, className)
{
  const registration = be.classes.GetClassRegistration(className);
  if (!registration) throw new Error(`Tr2ActionChildEffect: class ${className} is not registered with Blue`);
  if (!value || typeof value !== "object") return null;
  return be.classes.QueryThisInterface(value, registration.type, value.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT);
}


/**
 * Controller action that attaches a child effect loaded from a resource path to
 * its owner on start and detaches it on stop.
 */
@blue.define("Tr2ActionChildEffect")
export class Tr2ActionChildEffect extends ITr2ControllerAction
{
  static _resourcePrefetcher = null;

  /** Registers the runtime-owned child-effect prefetch callback. */
  static registerResourcePrefetcher(prefetcher)
  {
    const previous = this._resourcePrefetcher;
    this._resourcePrefetcher = prefetcher;
    return previous;
  }

  /** Clears the runtime-owned child-effect prefetch callback. */
  static clearResourcePrefetcher()
  {
    this._resourcePrefetcher = null;
  }

  /** Requests prefetch without taking ownership of the resource lifecycle. */
  static prefetchResource(path, owner = null)
  {
    if (path && this._resourcePrefetcher)
    {
      this._resourcePrefetcher(path, owner);
    }
  }

  /** Native m_path: std::string with file-path editor/transport semantics. */
  @blue.readwrite
  @blue.persist
  @type.path("object")
  path = "";

  /** Native m_childName. */
  @blue.readwrite
  @blue.persist
  @type.string
  childName = "";

  /** Native m_targetAnotherOwner: BlueSharedString. */
  @blue.readwrite
  @blue.persist
  @type.string
  targetAnotherOwner = "";

  /** Native m_addOnStart. */
  @blue.readwrite
  @blue.persist
  @type.boolean
  addOnStart = true;

  /** Native m_removeOnStop. */
  @blue.readwrite
  @blue.persist
  @type.boolean
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
  @blue.method
  @meta.adapted
  Link(controller)
  {
    const owner = controller.GetOwner();
    Tr2ActionChildEffect.prefetchResource(this.path, owner);
  }

  /**
   * Carbon Start (Tr2ActionChildEffect.cpp:68-135): resolve the owner, look
   * up a child of childName on it, and load the path when there is none.
   *
   * Adapted: the load is asynchronous (see _loadChild).
   */
  @blue.method
  @meta.adapted
  Start(controller)
  {
    const resolved = this._ResolveOwner(controller);
    if (!resolved) return;
    const owner = resolved.owner;
    this._child = this.childName ? owner.GetEffectChildByName(this.childName) : null;
    this._ownsChild = false;
    if (!this.addOnStart || this._child || !this.path) return;
    this._loadChild(owner, controller.GetOwner(), resolved.rebind);
  }

  /**
   * Carbon Start's owner (Tr2ActionChildEffect.cpp:70-108): the controller
   * owner as an IEveEffectChildrenOwner, redirected to its effect child named
   * targetAnotherOwner. When that finds nothing and a target is named, a
   * multi-effect's parameter object or a stretch's source or destination
   * space object stands in, and the multi-effect is rebound once the child
   * is added.
   *
   * @param {object} controller The action controller.
   * @returns {{owner: object, rebind: boolean}|null} The owner, or null.
   */
  _ResolveOwner(controller)
  {
    const controllerOwner = controller.GetOwner();
    let owner = CastTo(controllerOwner, "IEveEffectChildrenOwner");
    if (owner && this.targetAnotherOwner)
    {
      owner = CastTo(owner.GetEffectChildByName(this.targetAnotherOwner), "IEveEffectChildrenOwner");
    }
    if (owner) return { owner, rebind: false };
    if (this.targetAnotherOwner)
    {
      owner = this._GetRedirectedOwner(controllerOwner);
    }
    return owner ? { owner, rebind: true } : null;
  }

  /**
   * The owner a named target redirects to when no effect child carries the
   * name (Tr2ActionChildEffect.cpp:79-102, :156-192): a multi-effect's
   * parameter object, or a stretch's source or destination space object.
   * Returns undefined, not null, when a multi-effect has no such parameter,
   * so Stop can return early as Carbon's does (cpp:161-164).
   *
   * @param {object} controllerOwner The controller's owner.
   * @returns {object|null|undefined} The owner as an IEveEffectChildrenOwner.
   */
  _GetRedirectedOwner(controllerOwner)
  {
    const multiEffect = CastTo(controllerOwner, "EveMultiEffect");
    if (multiEffect)
    {
      const parameter = multiEffect.GetParameterByName(this.targetAnotherOwner);
      if (!parameter) return undefined;
      return CastTo(parameter.GetParameterObject(), "IEveEffectChildrenOwner");
    }
    const stretch = CastTo(controllerOwner, "EveStretch3");
    if (!stretch) return null;
    if (this.targetAnotherOwner === "SourceSpaceObject") return CastTo(stretch.GetSourceSpaceObject(), "IEveEffectChildrenOwner");
    if (this.targetAnotherOwner === "DestSpaceObject") return CastTo(stretch.GetDestSpaceObject(), "IEveEffectChildrenOwner");
    return null;
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
    Promise.resolve(be.resMan.LoadObject(path)).then(object =>
    {
      if (request !== this._loadRequest)
      {
        this._ReleaseChildDeviceResources(object, owner);
        return;
      }
      const child = CastTo(object, "EveSpaceObjectChild");
      if (child)
      {
        if (this.childName) child.SetName(this.childName);
        owner.AddToEffectChildrenList(child);
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
        const effect = CastTo(controllerOwner, "EveMultiEffect");
        if (effect) effect.Rebind(true);
      }
    }, error =>
    {
      if (request === this._loadRequest) CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Tr2ActionChildEffect: ${path} failed to load. ${error?.message ?? error}`);
    });
  }

  /**
   * Carbon Stop (Tr2ActionChildEffect.cpp:138-199): with removeOnStop, remove
   * the child from the owner Start would resolve; a multi-effect without the
   * named parameter returns before the child is forgotten, as Carbon's does.
   *
   * Adapted: invalidates a pending asynchronous load, and releases the device
   * resources of a child this action loaded.
   */
  @blue.method
  @meta.adapted
  Stop(controller)
  {
    // A load still in flight belongs to this run; drop it.
    this._loadRequest++;
    const child = this._child;
    if (child && this.removeOnStop)
    {
      const controllerOwner = controller.GetOwner();
      let owner = CastTo(controllerOwner, "IEveEffectChildrenOwner");
      if (owner && this.targetAnotherOwner)
      {
        owner = CastTo(owner.GetEffectChildByName(this.targetAnotherOwner), "IEveEffectChildrenOwner");
      }
      if (!owner && this.targetAnotherOwner)
      {
        owner = this._GetRedirectedOwner(controllerOwner);
        if (owner === undefined) return;
      }
      if (owner)
      {
        owner.RemoveFromEffectChildrenList(child);
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
   * Reachability is the walk of Carbon's Find functions (Find.cpp:352-396):
   * an explicit stack, each object once, children from be.EnumerateChildren.
   */
  _ReleaseChildDeviceResources(child, owner)
  {
    // Resolve nominal types at use time, as _loadChild does: importing the
    // renderer-backed classes here closes the controller/device module cycle.
    const particleType = CjsSchema.getConstructor("Tr2ParticleSystem");
    const meshType = CjsSchema.getConstructor("Tr2InstancedMesh");
    const behaviorType = CjsSchema.getConstructor("EveChildBehaviorSystem");
    const reach = (root, seen) =>
    {
      if (!root) return;
      const stack = [ root ];
      while (stack.length)
      {
        const obj = stack.pop();
        if (seen.has(obj)) continue;
        seen.add(obj);
        be.EnumerateChildren(obj, next => stack.push(next));
      }
    };
    const retained = new Set();
    reach(owner, retained);
    const reachable = new Set();
    reach(child, reachable);
    const resources = [];
    for (const model of reachable)
    {
      if (!retained.has(model)
        && ((particleType && CjsSchema.cast(model, particleType)) || (meshType && CjsSchema.cast(model, meshType))
          || (behaviorType && CjsSchema.cast(model, behaviorType))))
      {
        resources.push(model);
      }
    }
    for (const resource of resources) resource.Destruct();
  }
}

// Native exposure ends at this concrete table (Tr2ActionChildEffect_Blue.cpp:12-13,26).
blue.interface(ITr2ControllerAction)(Tr2ActionChildEffect);
