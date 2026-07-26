// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerReference.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerReference.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { UnlinkReason } from "./enums.js";


/**
 * Stands in for a controller loaded from a resource path, forwarding the full
 * controller lifecycle to whichever controller the path resolves to.
 */
@type.define({
  className: "Tr2ControllerReference",
  family: "controllers"
})
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

  @io.read
  @type.objectRef("ITr2Controller")
  controller = null;

  @io.notify
  @io.persist
  @type.path
  path = "";

  #owner = null;

  #resolvedPath = "";

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
   * Handles path changes. Broad-safe: compares the authored path with the
   * path the current controller was resolved from, so unrelated settles keep
   * a resolved or directly attached controller.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.path !== this.#resolvedPath)
    {
      this.controller = null;
      this.ResolveController();
    }
    if (this.controller && this.#owner)
    {
      this.controller.Link?.(this.#owner);
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
    this.controller?.Link?.(owner);
  }

  /**
   * Unlinks the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    this.controller?.Unlink?.(reason);
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
    this.controller?.Start?.();
  }

  /**
   * Stops the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
    this.controller?.Stop?.();
  }

  /**
   * Updates the referenced controller.
   */
  @carbon.method
  @impl.implemented
  Update(normalizedUpdateFrequency = 0)
  {
    this.controller?.Update?.(normalizedUpdateFrequency);
  }

  /**
   * Sets a variable on the referenced controller.
   */
  @carbon.method
  @impl.implemented
  SetVariable(name, value)
  {
    this.controller?.SetVariable?.(name, value);
  }

  /**
   * Handles an event on the referenced controller.
   */
  @carbon.method
  @impl.implemented
  HandleEvent(eventName)
  {
    this.controller?.HandleEvent?.(eventName);
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
   * resolver, recording the path it resolved from so OnModified can tell a real
   * path change from an unrelated settle.
   */
  ResolveController()
  {
    this.#resolvedPath = this.path;
    if (!this.path)
    {
      this.controller = null;
      return;
    }
    this.controller = Tr2ControllerReference.resolveResource(this.path, this.#owner);
  }
}
