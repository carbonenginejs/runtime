import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { GetControllerActualTimeSeconds, GetControllerFrameTimeSeconds } from '../contracts.js';

let _initProto, _initClass, _init_module, _init_extra_module, _init_className, _init_extra_className, _init_state, _init_extra_state;

/**
 * Controller action that delegates to a host-provided scripted action instance,
 * forwarding link, start, stop and update callbacks and persisting the
 * instance's own opaque state bytes.
 */
let _Tr2ActionPython;
new class extends _identity {
  static [class Tr2ActionPython extends CjsModel {
    static {
      ({
        e: [_init_module, _init_extra_module, _init_className, _init_extra_className, _init_state, _init_extra_state, _initProto],
        c: [_Tr2ActionPython, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2ActionPython",
        family: "controllers"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "module"], [[io, io.notify, io, io.persist, type, type.string], 16, "className"], [[io, io.persistOnly, void 0, type.typedArray("Uint8Array")], 16, "state"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.adapted], 18, "Unlink"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetInstance"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetWriteBufferAndSize"], [[carbon, carbon.method, impl, impl.adapted], 18, "ReleaseWriteBuffer"], [[carbon, carbon.method, impl, impl.adapted], 18, "AllocateReadBuffer"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBufferAndSize"]], 0, void 0, CjsModel));
    }
    /** Registers the JavaScript factory used to adapt Carbon Python actions. */
    static registerFactory(factory) {
      const previous = this.#factory;
      this.#factory = factory;
      return previous;
    }

    /** Clears the registered JavaScript action factory. */
    static clearFactory() {
      this.#factory = null;
    }

    /** Creates a host action instance for a configured Carbon module and class. */
    static createInstance(moduleName, className, action) {
      if (!moduleName || !className || !this.#factory) {
        return null;
      }
      return this.#factory(moduleName, className, action) ?? null;
    }

    /** Copies host persistence output into an owned byte buffer. */
    static stateToBytes(value) {
      if (value == null) {
        return null;
      }
      if (typeof value === "string") {
        return new TextEncoder().encode(value);
      }
      if (Array.isArray(value)) {
        return Uint8Array.from(value);
      }
      if (value instanceof ArrayBuffer) {
        return new Uint8Array(value.slice(0));
      }
      if (ArrayBuffer.isView(value)) {
        const out = new Uint8Array(value.byteLength);
        out.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
        return out;
      }
      return null;
    }
    module = (_initProto(this), _init_module(this, ""));
    className = (_init_extra_module(this), _init_className(this, ""));
    state = (_init_extra_className(this), _init_state(this, null));
    #controller = (_init_extra_state(this), null);
    #instance = null;
    #loadedState = null;
    #isPlaying = false;
    #prevRealTime = 0;
    #prevSimTime = 0;

    /**
     * Initializes the host-provided action instance.
     */
    Initialize() {
      this.#ensureInstance();
      return true;
    }

    /**
     * Recreates the action instance when authoring fields change.
     */
    OnModified(_options = {}) {
      const controller = this.#controller;
      const wasPlaying = this.#isPlaying;
      if (controller) {
        if (wasPlaying) {
          this.Stop(controller);
        }
        this.Unlink();
      }
      this.#instance = null;
      this.#loadedState = null;
      this.#ensureInstance();
      if (controller) {
        this.Link(controller);
        if (wasPlaying) {
          this.Start(controller);
        }
      }
      return true;
    }

    /**
     * Links this action to a controller and notifies the host instance.
     */
    Link(controller) {
      this.#controller = controller;
      const instance = this.#ensureInstance();
      instance?.OnLink?.(controller.GetOwner?.() ?? null, controller);
    }

    /**
     * Unlinks this action and notifies the host instance.
     */
    Unlink() {
      this.#controller = null;
      this.#instance?.OnUnlink?.();
    }

    /**
     * Starts the action and registers for updates when the host instance supports them.
     */
    Start(controller = this.#controller) {
      if (!controller) {
        return;
      }
      this.#controller = controller;
      this.#isPlaying = true;
      const instance = this.#ensureInstance();
      if (instance?.OnUpdate) {
        controller.RegisterUpdateable?.(this);
      }
      instance?.OnStart?.(controller.GetOwner?.() ?? null, controller);
      this.#prevRealTime = GetControllerActualTimeSeconds();
      this.#prevSimTime = GetControllerFrameTimeSeconds();
    }

    /**
     * Stops the action and unregisters updates.
     */
    Stop(controller = this.#controller) {
      if (!controller) {
        return;
      }
      this.#isPlaying = false;
      controller.UnRegisterUpdateable?.(this);
      this.#instance?.OnStop?.(controller.GetOwner?.() ?? null, controller);
    }

    /**
     * Updates the host instance with Carbon-style real and simulation deltas.
     */
    Update(realTime, simTime) {
      const controller = this.#controller;
      const instance = this.#instance;
      if (!controller || !instance?.OnUpdate) {
        return;
      }
      const realDt = realTime - this.#prevRealTime;
      const simDt = simTime - this.#prevSimTime;
      instance.OnUpdate(controller.GetOwner?.() ?? null, controller, realDt, simDt);
      this.#prevRealTime = realTime;
      this.#prevSimTime = simTime;
    }

    /**
     * Gets the cached JS-side host instance.
     */
    GetInstance() {
      return this.#instance;
    }

    /**
     * Gets custom persisted host state.
     */
    GetWriteBufferAndSize(_memberName = "state") {
      const bytes = _Tr2ActionPython.stateToBytes(this.#instance?.OnSave?.());
      if (bytes) {
        this.state = bytes;
      }
      return bytes;
    }

    /**
     * Releases a custom persistence buffer.
     */
    ReleaseWriteBuffer(_buffer) {}

    /**
     * Allocates a custom persistence read buffer.
     */
    AllocateReadBuffer(_memberName, bufferSize) {
      return new Uint8Array(bufferSize);
    }

    /**
     * Applies custom persisted host state.
     */
    SetBufferAndSize(_memberName, buffer, bufferSize = buffer.byteLength) {
      this.state = buffer.slice(0, bufferSize);
      this.#loadedState = null;
      this.#ensureInstance();
    }

    /**
     * Creates the host instance on first use and replays persisted state into it
     * through OnLoad, guarding against loading the same state buffer twice.
     */
    #ensureInstance() {
      if (!this.#instance) {
        this.#instance = _Tr2ActionPython.createInstance(this.module, this.className, this);
      }
      if (this.#instance && this.state && this.state !== this.#loadedState) {
        this.#instance.OnLoad?.(this.state);
        this.#loadedState = this.state;
      }
      return this.#instance;
    }
  }];
  #factory = null;
  constructor() {
    super(_Tr2ActionPython), _initClass();
  }
}();

export { _Tr2ActionPython as Tr2ActionPython };
//# sourceMappingURL=Tr2ActionPython.js.map
