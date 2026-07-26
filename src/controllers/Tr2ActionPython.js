// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPython.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionPython.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { GetControllerActualTimeSeconds, GetControllerFrameTimeSeconds } from "./contracts.js";


/**
 * Controller action that delegates to a host-provided scripted action instance,
 * forwarding link, start, stop and update callbacks and persisting the
 * instance's own opaque state bytes.
 */
@type.define({
  className: "Tr2ActionPython",
  family: "controllers"
})
export class Tr2ActionPython extends CjsModel
{
  static #factory = null;

  /** Registers the JavaScript factory used to adapt Carbon Python actions. */
  static registerFactory(factory)
  {
    const previous = this.#factory;
    this.#factory = factory;
    return previous;
  }

  /** Clears the registered JavaScript action factory. */
  static clearFactory()
  {
    this.#factory = null;
  }

  /** Creates a host action instance for a configured Carbon module and class. */
  static createInstance(moduleName, className, action)
  {
    if (!moduleName || !className || !this.#factory)
    {
      return null;
    }
    return this.#factory(moduleName, className, action) ?? null;
  }

  /** Copies host persistence output into an owned byte buffer. */
  static stateToBytes(value)
  {
    if (value == null)
    {
      return null;
    }
    if (typeof value === "string")
    {
      return new TextEncoder().encode(value);
    }
    if (Array.isArray(value))
    {
      return Uint8Array.from(value);
    }
    if (value instanceof ArrayBuffer)
    {
      return new Uint8Array(value.slice(0));
    }
    if (ArrayBuffer.isView(value))
    {
      const out = new Uint8Array(value.byteLength);
      out.set(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
      return out;
    }
    return null;
  }

  @io.notify
  @io.persist
  @type.string
  module = "";

  @io.notify
  @io.persist
  @type.string
  className = "";

  @io.persistOnly
  @type.typedArray("Uint8Array")
  state = null;

  #controller = null;

  #instance = null;

  #loadedState = null;

  #isPlaying = false;

  #prevRealTime = 0;

  #prevSimTime = 0;

  /**
   * Initializes the host-provided action instance.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#ensureInstance();
    return true;
  }

  /**
   * Recreates the action instance when authoring fields change.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    const controller = this.#controller;
    const wasPlaying = this.#isPlaying;
    if (controller)
    {
      if (wasPlaying)
      {
        this.Stop(controller);
      }
      this.Unlink();
    }
    this.#instance = null;
    this.#loadedState = null;
    this.#ensureInstance();
    if (controller)
    {
      this.Link(controller);
      if (wasPlaying)
      {
        this.Start(controller);
      }
    }
    return true;
  }

  /**
   * Links this action to a controller and notifies the host instance.
   */
  @carbon.method
  @impl.adapted
  Link(controller)
  {
    this.#controller = controller;
    const instance = this.#ensureInstance();
    instance?.OnLink?.(controller.GetOwner?.() ?? null, controller);
  }

  /**
   * Unlinks this action and notifies the host instance.
   */
  @carbon.method
  @impl.adapted
  Unlink()
  {
    this.#controller = null;
    this.#instance?.OnUnlink?.();
  }

  /**
   * Starts the action and registers for updates when the host instance supports them.
   */
  @carbon.method
  @impl.adapted
  Start(controller = this.#controller)
  {
    if (!controller)
    {
      return;
    }
    this.#controller = controller;
    this.#isPlaying = true;
    const instance = this.#ensureInstance();
    if (instance?.OnUpdate)
    {
      controller.RegisterUpdateable?.(this);
    }
    instance?.OnStart?.(controller.GetOwner?.() ?? null, controller);
    this.#prevRealTime = GetControllerActualTimeSeconds();
    this.#prevSimTime = GetControllerFrameTimeSeconds();
  }

  /**
   * Stops the action and unregisters updates.
   */
  @carbon.method
  @impl.adapted
  Stop(controller = this.#controller)
  {
    if (!controller)
    {
      return;
    }
    this.#isPlaying = false;
    controller.UnRegisterUpdateable?.(this);
    this.#instance?.OnStop?.(controller.GetOwner?.() ?? null, controller);
  }

  /**
   * Updates the host instance with Carbon-style real and simulation deltas.
   */
  @carbon.method
  @impl.adapted
  Update(realTime, simTime)
  {
    const controller = this.#controller;
    const instance = this.#instance;
    if (!controller || !instance?.OnUpdate)
    {
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
  @carbon.method
  @impl.adapted
  GetInstance()
  {
    return this.#instance;
  }

  /**
   * Gets custom persisted host state.
   */
  @carbon.method
  @impl.adapted
  GetWriteBufferAndSize(_memberName = "state")
  {
    const bytes = Tr2ActionPython.stateToBytes(this.#instance?.OnSave?.());
    if (bytes)
    {
      this.state = bytes;
    }
    return bytes;
  }

  /**
   * Releases a custom persistence buffer.
   */
  @carbon.method
  @impl.adapted
  ReleaseWriteBuffer(_buffer)
  {
  }

  /**
   * Allocates a custom persistence read buffer.
   */
  @carbon.method
  @impl.adapted
  AllocateReadBuffer(_memberName, bufferSize)
  {
    return new Uint8Array(bufferSize);
  }

  /**
   * Applies custom persisted host state.
   */
  @carbon.method
  @impl.adapted
  SetBufferAndSize(_memberName, buffer, bufferSize = buffer.byteLength)
  {
    this.state = buffer.slice(0, bufferSize);
    this.#loadedState = null;
    this.#ensureInstance();
  }

  /**
   * Creates the host instance on first use and replays persisted state into it
   * through OnLoad, guarding against loading the same state buffer twice.
   */
  #ensureInstance()
  {
    if (!this.#instance)
    {
      this.#instance = Tr2ActionPython.createInstance(this.module, this.className, this);
    }
    if (this.#instance && this.state && this.state !== this.#loadedState)
    {
      this.#instance.OnLoad?.(this.state);
      this.#loadedState = this.state;
    }
    return this.#instance;
  }
}
