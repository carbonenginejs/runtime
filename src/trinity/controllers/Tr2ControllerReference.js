// Source: trinity/trinity/Controllers/Tr2ControllerReference.h
// Source: trinity/trinity/Controllers/Tr2ControllerReference.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
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
  static #resourceResolver = null;

  /** Registers the runtime-owned controller resource resolver. */
  static registerResourceResolver(resolver)
  {
    const previous = this.#resourceResolver;
    this.#resourceResolver = resolver;
    return previous;
  }

  /** Clears the runtime-owned controller resource resolver. */
  static clearResourceResolver()
  {
    this.#resourceResolver = null;
  }

  /** Resolves a controller resource without owning its lifecycle. */
  static resolveResource(path, owner = null)
  {
    if (!path || !this.#resourceResolver)
    {
      return null;
    }
    const resolved = this.#resourceResolver(path, owner);
    return resolved && typeof resolved === "object" ? resolved : null;
  }

  @edit.read
  @type.objectRef("ITr2Controller")
  controller = null;

  @edit.notify
  @edit.persist
  @type.path
  path = "";

  #owner = null;


  /**
   * Initializes the referenced controller when it is already assigned.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.ResolveController();
    return true;
  }

  /**
   * Handles the authored path notification by resolving and linking the controller.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (propertyName === "path")
    {
      this.controller = null;
      this.ResolveController();
      if (this.controller && this.#owner) this.controller.Link(this.#owner);
    }
    return true;
  }

  /**
   * Links the referenced controller to the same owner.
   */
  @carbon.method
  @impl.implemented
  Link(owner)
  {
    this.#owner = owner;
    this.controller?.Link(owner);
  }

  /**
   * Unlinks the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    this.controller?.Unlink(reason);
    this.#owner = null;
  }

  /**
   * Checks whether this reference is linked to an owner.
   */
  @carbon.method
  @impl.implemented
  IsLinked()
  {
    return this.#owner !== null;
  }

  /**
   * Starts the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Start()
  {
    this.controller?.Start();
  }

  /**
   * Stops the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
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
   */
  @carbon.method
  @impl.implemented
  SetVariable(name, value)
  {
    this.controller?.SetVariable(name, value);
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
    return this.#owner;
  }

  /**
   * Resolves `controller` from the authored path through the registered resource
   * resolver.
   */
  ResolveController()
  {
    if (!this.path)
    {
      this.controller = null;
      return;
    }
    this.controller = Tr2ControllerReference.resolveResource(this.path, this.#owner);
  }
}
