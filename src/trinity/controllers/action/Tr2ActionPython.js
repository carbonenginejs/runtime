// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython_Blue.cpp
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";
import { meta, types } from "#schema";
import { blue, TimeAsFloat, INotify, IInitialize, ICustomPersist } from "#blue";
import { ContinueOnMainThread } from "../../core/continueOnMainThread.js";


/**
 * Controller action that delegates to a host-provided scripted action instance,
 * forwarding link, start, stop and update callbacks and persisting the
 * instance's own opaque state bytes.
 * Adapted: a registered JavaScript factory replaces Python import/instantiation.
 * Optional host hooks remain a caller-supplied extension, not engine methods.
 * Host/factory errors propagate; no Python exception reporting is reproduced.
 * Queued callbacks retain their selected JS instance, unlike native callbacks
 * that capture self and consult its current callback table when the queue drains.
 * State remains the existing persisted Uint8Array plus explicit buffer adapter;
 * this class does not install native custom-binary dispatch in shared readers.
 */
@meta.define({
  className: "Tr2ActionPython",
  family: "controllers"
})
@meta.carbon.inherit(ITr2Updateable, INotify, IInitialize, ICustomPersist)
export class Tr2ActionPython extends ITr2ControllerAction
{
  static _factory = null;

  /**
   * Registers the JavaScript factory used to adapt Carbon Python actions.
   * Custom: injection replaces the native Python module importer; returns the
   * previous factory so a caller can restore its own host registration.
   * @param {Function|null} factory Host instance factory.
   * @returns {Function|null} Previous factory.
   */
  @meta.impl.custom
  static registerFactory(factory)
  {
    const previous = this._factory;
    this._factory = factory;
    return previous;
  }

  /** Clears the injected JavaScript factory; existing instances remain alive.
   * Custom: host registration has no native Python-import counterpart.
   */
  @meta.impl.custom
  static clearFactory()
  {
    this._factory = null;
  }

  /**
   * Creates a host action instance for a configured Carbon module and class.
   * Custom: the injected factory receives this action as an additional argument.
   * Missing registration returns null; factory exceptions propagate to the caller.
   * @param {string} moduleName Host module name.
   * @param {string} className Host class name.
   * @param {Tr2ActionPython} action Requesting action.
   * @returns {object|null} The factory result, or null when unavailable.
   */
  @meta.impl.custom
  static createInstance(moduleName, className, action)
  {
    if (!moduleName || !className || !this._factory)
    {
      return null;
    }
    return this._factory(moduleName, className, action) ?? null;
  }

  /**
   * Copies host persistence output into an owned byte buffer.
   * Custom: accepts strings, arrays and buffers in addition to byte views;
   * native OnSave accepts Python bytes. Unsupported output becomes null.
   * @param {*} value Host persistence output.
   * @returns {Uint8Array|null} An independent byte buffer, or null.
   */
  @meta.impl.custom
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

  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  module = "";

  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  className = "";

  /**
   * Adapted state storage for the existing JavaScript reader/copy path.
   * Native state is MAP_ATTRIBUTE_AS_CUSTOM_BINARY_BLOCK, not ordinary storage.
   * Keeping this field does not make DictWriter call OnSave automatically.
   */
  @meta.edit.persistOnly
  @types.typedArray("Uint8Array")
  state = new Uint8Array(0);

  _controller = null;

  _instance = null;

  _loadedState = null;

  _isPlaying = false;

  _prevRealTime = 0;

  _prevSimTime = 0;

  /**
   * Initializes the host-provided action instance.
   * Adapted: lazily invokes the registered JS factory and loads nonempty stored
   * state. Native Initialize instantiates Python but has no ordinary state field.
   * @returns {boolean} True after successful initialization.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Initialize()
  {
    this._ensureInstance();
    return true;
  }

  /**
   * Recreates the action instance when authoring fields change.
   * Adapted: exposed names select the native module/class notification. Existing
   * stored state is replayed into the new host; queued work keeps its old host.
   * Native swaps a callback table and does not replay an ordinary state field.
   * @param {string} propertyName Modified authored member name.
   * @returns {boolean} True after successful notification.
   */
  @meta.carbon.method
  @meta.impl.adapted
  OnModified(propertyName)
  {
    if (propertyName !== "module" && propertyName !== "className") return true;
    const controller = this._controller;
    const wasPlaying = this._isPlaying;
    if (controller)
    {
      if (wasPlaying)
      {
        this.Stop(controller);
      }
      this.Unlink();
    }
    this._instance = null;
    this._loadedState = null;
    this._ensureInstance();
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
   * Adapted: first use may create/load the host, and optional hooks are looked
   * up dynamically rather than captured in a native callable-only VTable.
   * @param {ITr2ActionController} controller The linked controller.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Link(controller)
  {
    this._controller = controller;
    const instance = this._ensureInstance();
    instance?.OnLink?.(controller.GetOwner() ?? null, controller);
  }

  /**
   * Unlinks this action and notifies the host instance.
   * Adapted: clears linkage before invoking the optional JS hook; host errors
   * propagate instead of native BlueScriptCallback exception handling.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Unlink()
  {
    this._controller = null;
    this._instance?.OnUnlink?.();
  }

  /**
   * Starts the action and registers for updates when the host instance supports
   * them. The host OnStart is queued on the main-thread queue, and the previous
   * times are Blue's actual and frame times in ticks (Tr2ActionPython.cpp:98-114).
   * Adapted: optional linked-controller invocation and lazy host creation are
   * retained. The queued closure captures the selected instance, not a mutable
   * native callback table. Host errors can abort the queue's current batch.
   * @param {ITr2ActionController} [controller] Invoking or linked controller.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._controller = controller;
    this._isPlaying = true;
    const instance = this._ensureInstance();
    if (instance?.OnUpdate)
    {
      controller.RegisterUpdateable(this);
    }
    if (instance?.OnStart)
    {
      const owner = controller.GetOwner() ?? null;
      ContinueOnMainThread(() =>
      {
        instance.OnStart(owner, controller);
      });
    }
    this._prevRealTime = blue.os.GetActualTime();
    this._prevSimTime = blue.os.GetCurrentFrameTime();
  }

  /**
   * Stops the action and unregisters updates; the host OnStop is queued on the
   * main-thread queue (Tr2ActionPython.cpp:116-127).
   * Adapted: optional linked-controller invocation and captured JS host instance
   * are retained; host errors propagate from the queue instead of native reporting.
   * @param {ITr2ActionController} [controller] Invoking or linked controller.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Stop(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._isPlaying = false;
    controller.UnRegisterUpdateable(this);
    const instance = this._instance;
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
   * (Tr2ActionPython.cpp:129-141).
   * Adapted: no linked controller/update hook means no work. Callback lookup
   * remains dynamic on the captured host; errors propagate from the queue.
   * @param {number} realTime Actual time in Blue ticks.
   * @param {number} simTime Simulation time in Blue ticks.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Update(realTime, simTime)
  {
    const controller = this._controller;
    const instance = this._instance;
    if (!controller || !instance?.OnUpdate)
    {
      return;
    }
    const owner = controller.GetOwner() ?? null;
    const realDt = TimeAsFloat(realTime - this._prevRealTime);
    const simDt = TimeAsFloat(simTime - this._prevSimTime);
    ContinueOnMainThread(() =>
    {
      instance.OnUpdate(owner, controller, realDt, simDt);
    });
    this._prevRealTime = realTime;
    this._prevSimTime = simTime;
  }

  /**
   * Gets the cached JS-side host instance without creating it.
   * Adapted: returns a JavaScript host object instead of native BluePy.
   * @returns {object|null} The cached host instance.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetInstance()
  {
    return this._instance;
  }

  /**
   * Gets custom persisted host state.
   * Adapted: returns owned bytes instead of native pointer/size output arguments
   * and updates the JS state cache. Optional OnSave is invoked only here;
   * conversion accepts the documented JS inputs and errors propagate.
   * @param {string} [_memberName="state"] Ignored native member selector.
   * @returns {Uint8Array|null} Copied host bytes, or null.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetWriteBufferAndSize(_memberName = "state")
  {
    const bytes = Tr2ActionPython.stateToBytes(this._instance?.OnSave?.());
    if (bytes)
    {
      this.state = bytes;
    }
    return bytes;
  }

  /**
   * Releases a custom persistence buffer.
   * Adapted: JavaScript owns the returned byte buffer; no delete[] is required.
   * @param {Uint8Array} _buffer Caller-owned buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  ReleaseWriteBuffer(_buffer)
  {
  }

  /**
   * Allocates a custom persistence read buffer.
   * Adapted: a Uint8Array replaces native new uint8_t[].
   * @param {string} _memberName Ignored native member selector.
   * @param {number} bufferSize Requested byte count.
   * @returns {Uint8Array} New zero-filled read buffer.
   */
  @meta.carbon.method
  @meta.impl.adapted
  AllocateReadBuffer(_memberName, bufferSize)
  {
    return new Uint8Array(bufferSize);
  }

  /**
   * Applies custom persisted host state.
   * Adapted: copies into ordinary JS state and uses the existing lazy OnLoad
   * path. Empty state is retained without invoking OnLoad, unlike native.
   * @param {string} _memberName Ignored native member selector.
   * @param {Uint8Array} buffer Input bytes.
   * @param {number} [bufferSize=buffer.byteLength] Number of bytes to copy.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetBufferAndSize(_memberName, buffer, bufferSize = buffer.byteLength)
  {
    this.state = buffer.slice(0, bufferSize);
    this._loadedState = null;
    this._ensureInstance();
  }

  /**
   * Creates the host instance on first use and replays persisted state into it
   * through OnLoad, guarding against loading the same state buffer twice.
   * Custom: lazy creation/state replay replaces native InstantiateObject and its
   * callable-only VTable. Empty state skips OnLoad; hook errors remain visible.
   * @returns {object|null} The cached host instance.
   */
  @meta.impl.custom
  _ensureInstance()
  {
    if (!this._instance)
    {
      this._instance = Tr2ActionPython.createInstance(this.module, this.className, this);
    }
    if (this._instance && this.state.length && this.state !== this._loadedState)
    {
      this._instance.OnLoad?.(this.state);
      this._loadedState = this.state;
    }
    return this._instance;
  }
}

// Native exposure ends at this concrete table (Tr2ActionPython_Blue.cpp:12-17,24).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionPython, ITr2ControllerAction, ITr2Updateable, INotify, IInitialize, ICustomPersist],
  chainTo: null
})(Tr2ActionPython);
