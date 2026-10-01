// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython_Blue.cpp
import { CjsModel } from "#model";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";
import { carbon, impl, edit, type } from "#schema";
import { blue, TimeAsFloat, INotify, IInitialize, ICustomPersist } from "#blue";
import { ContinueOnMainThread } from "../../core/continueOnMainThread.js";


/**
 * Controller action that delegates to a host-provided scripted action instance,
 * forwarding link, start, stop and update callbacks and persisting the
 * instance's own opaque state bytes.
 */
@type.define({
  className: "Tr2ActionPython",
  family: "controllers"
})
@carbon.inherit(ITr2ControllerAction, ITr2Updateable, INotify, IInitialize, ICustomPersist)
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

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  module = "";

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  className = "";

  @edit.persistOnly
  @type.typedArray("Uint8Array")
  state = new Uint8Array(0);

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
  @impl.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (propertyName !== "module" && propertyName !== "className") return true;
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
    instance?.OnLink?.(controller.GetOwner() ?? null, controller);
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
   * Starts the action and registers for updates when the host instance supports
   * them. The host OnStart is queued on the main-thread queue, and the previous
   * times are Blue's actual and frame times in ticks (`Tr2ActionPython.cpp:98-114`).
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
    if (instance?.OnStart)
    {
      const owner = controller.GetOwner() ?? null;
      ContinueOnMainThread(() =>
      {
        instance.OnStart(owner, controller);
      });
    }
    this.#prevRealTime = blue.os.GetActualTime();
    this.#prevSimTime = blue.os.GetCurrentFrameTime();
  }

  /**
   * Stops the action and unregisters updates; the host OnStop is queued on the
   * main-thread queue (`Tr2ActionPython.cpp:116-127`).
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
    const instance = this.#instance;
    if (!instance?.OnStop)
    {
      return;
    }
    const owner = controller.GetOwner() ?? null;
    ContinueOnMainThread(() =>
    {
      instance.OnStop(owner, controller);
    });
  }

  /**
   * Queues the host OnUpdate with the real and simulation deltas since the
   * previous update, converted from Blue ticks with TimeAsFloat
   * (`Tr2ActionPython.cpp:129-141`).
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
    const owner = controller.GetOwner() ?? null;
    const realDt = TimeAsFloat(realTime - this.#prevRealTime);
    const simDt = TimeAsFloat(simTime - this.#prevSimTime);
    ContinueOnMainThread(() =>
    {
      instance.OnUpdate(owner, controller, realDt, simDt);
    });
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
    if (this.#instance && this.state.length && this.state !== this.#loadedState)
    {
      this.#instance.OnLoad?.(this.state);
      this.#loadedState = this.state;
    }
    return this.#instance;
  }
}

// Native exposure ends at this concrete table (Tr2ActionPython_Blue.cpp:12-17,24).
carbon.interfaceTable({
  interfaces: [Tr2ActionPython, ITr2ControllerAction, ITr2Updateable, INotify, IInitialize, ICustomPersist],
  chainTo: null
})(Tr2ActionPython);
