import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { UnlinkReason } from './enums.js';

let _initProto, _initClass, _init_controller, _init_extra_controller, _init_path, _init_extra_path;

/**
 * Stands in for a controller loaded from a resource path, forwarding the full
 * controller lifecycle to whichever controller the path resolves to.
 */
let _Tr2ControllerReferen;
new class extends _identity {
  static [class Tr2ControllerReference extends CjsModel {
    static {
      ({
        e: [_init_controller, _init_extra_controller, _init_path, _init_extra_path, _initProto],
        c: [_Tr2ControllerReferen, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ControllerReference",
        family: "controllers"
      })], [[[io, io.read, void 0, type.objectRef("ITr2Controller")], 16, "controller"], [[io, io.notify, io, io.persist, type, type.path], 16, "path"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsLinked"], [[carbon, carbon.method, impl, impl.implemented], 18, "Start"], [[carbon, carbon.method, impl, impl.implemented], 18, "Stop"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOwner"]], 0, void 0, CjsModel));
    }
    /** Registers the runtime-owned controller resource resolver. */
    static registerResourceResolver(resolver) {
      const previous = this.#resourceResolver;
      this.#resourceResolver = resolver;
      return previous;
    }

    /** Clears the runtime-owned controller resource resolver. */
    static clearResourceResolver() {
      this.#resourceResolver = null;
    }

    /** Resolves a controller resource without owning its lifecycle. */
    static resolveResource(path, owner = null) {
      if (!path || !this.#resourceResolver) {
        return null;
      }
      const resolved = this.#resourceResolver(path, owner);
      return resolved && typeof resolved === "object" ? resolved : null;
    }
    controller = (_initProto(this), _init_controller(this, null));
    path = (_init_extra_controller(this), _init_path(this, ""));
    #owner = (_init_extra_path(this), null);
    #resolvedPath = "";

    /**
     * Initializes the referenced controller when it is already assigned.
     */
    Initialize() {
      this.ResolveController();
      return true;
    }

    /**
     * Handles path changes. Broad-safe: compares the authored path with the
     * path the current controller was resolved from, so unrelated settles keep
     * a resolved or directly attached controller.
     */
    OnModified(_options = {}) {
      if (this.path !== this.#resolvedPath) {
        this.controller = null;
        this.ResolveController();
      }
      if (this.controller && this.#owner) {
        this.controller.Link?.(this.#owner);
      }
      return true;
    }

    /**
     * Links the referenced controller to the same owner.
     */
    Link(owner) {
      this.#owner = owner;
      this.controller?.Link?.(owner);
    }

    /**
     * Unlinks the referenced controller.
     */
    Unlink(reason = UnlinkReason.UNLINKING) {
      this.controller?.Unlink?.(reason);
      this.#owner = null;
    }

    /**
     * Checks whether this reference is linked to an owner.
     */
    IsLinked() {
      return this.#owner !== null;
    }

    /**
     * Starts the referenced controller.
     */
    Start() {
      this.controller?.Start?.();
    }

    /**
     * Stops the referenced controller.
     */
    Stop() {
      this.controller?.Stop?.();
    }

    /**
     * Updates the referenced controller.
     */
    Update(normalizedUpdateFrequency = 0) {
      this.controller?.Update?.(normalizedUpdateFrequency);
    }

    /**
     * Sets a variable on the referenced controller.
     */
    SetVariable(name, value) {
      this.controller?.SetVariable?.(name, value);
    }

    /**
     * Handles an event on the referenced controller.
     */
    HandleEvent(eventName) {
      this.controller?.HandleEvent?.(eventName);
    }

    /**
     * Gets the linked owner.
     */
    GetOwner() {
      return this.#owner;
    }

    /**
     * Resolves `controller` from the authored path through the registered resource
     * resolver, recording the path it resolved from so OnModified can tell a real
     * path change from an unrelated settle.
     */
    ResolveController() {
      this.#resolvedPath = this.path;
      if (!this.path) {
        this.controller = null;
        return;
      }
      this.controller = _Tr2ControllerReferen.resolveResource(this.path, this.#owner);
    }
  }];
  #resourceResolver = null;
  constructor() {
    super(_Tr2ControllerReferen), _initClass();
  }
}();

export { _Tr2ControllerReferen as Tr2ControllerReference };
//# sourceMappingURL=Tr2ControllerReference.js.map
