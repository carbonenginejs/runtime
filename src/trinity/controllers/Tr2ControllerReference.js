// Source: trinity/trinity/Controllers/Tr2ControllerReference.h
// Source: trinity/trinity/Controllers/Tr2ControllerReference.cpp
import { CjsModel } from "#model";
import { blue } from "#blue";
import * as CcpLog from "../../global/logging/ccpLog.js";
import { carbon, impl, edit, type, CjsSchema } from "#schema";
import { UnlinkReason } from "./enums.js";
import { ITr2Controller } from "./ITr2Controller/index.js";


/**
 * Stands in for a controller loaded from a resource path, forwarding the full
 * controller lifecycle to whichever controller the path resolves to.
 */
@type.define({
  className: "Tr2ControllerReference",
  family: "controllers"
})
@carbon.inherit(ITr2Controller)
export class Tr2ControllerReference extends CjsModel
{
  @edit.read
  @type.objectRef("ITr2Controller")
  controller = null;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.path
  path = "";

  _owner = null;

  /** Async load generation; superseded completions cannot replace the controller. */
  _loadRequest = 0;

  /** Start/Stop intent retained while Carbon's synchronous load is pending in JS. */
  _isActive = false;

  /** Latest variable values delivered before the asynchronous controller arrives. */
  _pendingVariables = new Map();


  /**
   * Resolves a nonempty resource path, preserving an assigned controller otherwise.
   *
   * Adapted: BeResMan is blue.resMan; its LoadObject completes asynchronously.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.path)
    {
      this.ResolveController();
    }
    return true;
  }

  /**
   * Handles the authored path notification by resolving and linking the controller.
   *
   * Adapted: exposed property names replace native addresses; LoadObject links
   * the current owner when its asynchronous result arrives.
   */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "path")
    {
      this.ResolveController();
    }
    return true;
  }

  /**
   * Links the referenced controller to the same owner.
   * Adapted: pending variables and start intent belong to one owner; reattachment
   * clears them as the loaded controller would unlink before rebinding.
   */
  @carbon.method
  @impl.adapted
  Link(owner)
  {
    if (this._owner !== owner)
    {
      if (this._owner) this._isActive = false;
      this._pendingVariables.clear();
    }
    this._owner = owner;
    this.controller?.Link(owner);
  }

  /**
   * Unlinks the referenced controller.
   * Adapted: discard pending owner variables and start intent so a late load
   * cannot restart an owner that has already detached.
   */
  @carbon.method
  @impl.adapted
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    this._owner = null;
    this._isActive = false;
    this._pendingVariables.clear();
    this.controller?.Unlink(reason);
  }

  /**
   * Checks whether this reference is linked to an owner.
   */
  @carbon.method
  @impl.implemented
  IsLinked()
  {
    return this._owner !== null;
  }

  /**
   * Starts the referenced controller.
   * Adapted: retain start intent until the asynchronous load is linked.
   */
  @carbon.method
  @impl.adapted
  Start()
  {
    this._isActive = true;
    this.controller?.Start();
  }

  /**
   * Stops the referenced controller.
   * Adapted: cancel pending start intent before the asynchronous load completes.
   */
  @carbon.method
  @impl.adapted
  Stop()
  {
    this._isActive = false;
    this.controller?.Stop();
  }

  /**
   * Updates the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Update(normalizedUpdateFrequency = 0)
  {
    this.controller?.Update(normalizedUpdateFrequency);
  }

  /**
   * Sets a variable on the referenced controller.
   * Adapted: retain the latest pending value and replay it after Link, before
   * Start can execute one-shot actions on the asynchronously loaded controller.
   */
  @carbon.method
  @impl.adapted
  SetVariable(name, value)
  {
    if (this.controller) this.controller.SetVariable(name, value);
    else this._pendingVariables.set(name, value);
  }

  /**
   * Handles an event on the referenced controller.
   */
  @carbon.method
  @impl.implemented
  HandleEvent(eventName)
  {
    this.controller?.HandleEvent(eventName);
  }

  /**
   * Gets the linked owner.
   */
  @carbon.method
  @impl.implemented
  GetOwner()
  {
    return this._owner;
  }

  /**
   * Performs Initialize/OnModified's typed LoadObject and delayed attachment.
   * Custom: Carbon loads synchronously (Tr2ControllerReference.cpp:12-36).
   * JavaScript must discard stale completions and replay pending variables and
   * start intent after linking. Explicit Unlink retires the previous controller
   * because assigning null cannot destroy a reference-counted object in JS.
   * Load failures leave the reference empty and are reported through CcpLog.
   *
   * @returns {Promise<ITr2Controller|null>} The current loaded controller, or null.
   */
  @impl.custom
  async ResolveController()
  {
    const path = this.path;
    const request = ++this._loadRequest;
    this.controller?.Unlink();
    this.controller = null;
    if (!path)
    {
      this._pendingVariables.clear();
      return null;
    }

    let object;
    try
    {
      object = await blue.resMan.LoadObject(path);
    }
    catch (error)
    {
      if (request === this._loadRequest)
      {
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Controller ${path} failed to load: ${error?.message ?? error}`);
      }
      return null;
    }
    if (request !== this._loadRequest || path !== this.path) return null;
    const controller = CjsSchema.cast(object, ITr2Controller);
    if (!controller)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s", `Resource ${path} is not an ITr2Controller.`);
      return null;
    }
    this.controller = controller;
    if (this._owner)
    {
      controller.Link(this._owner);
      for (const [ name, value ] of this._pendingVariables) controller.SetVariable(name, value);
      this._pendingVariables.clear();
      if (this._isActive) controller.Start();
    }
    return controller;
  }
}
