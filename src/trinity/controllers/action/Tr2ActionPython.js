import { exposure as be } from "#be";
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionPython_Blue.cpp
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";
import { ITr2Updateable } from "../../core/ITr2Updateable.js";
import { meta, type, blue as legacyBlue } from "#schema";
import { IsMatch, blue, INotify, IInitialize, ICustomPersist, CcpTime } from "#blue";
import { ContinueOnMainThread } from "../../core/continueOnMainThread.js";


/**
 * Controller action that delegates to a host-provided scripted action instance,
 * forwarding link, start, stop and update callbacks and persisting the
 * instance's own opaque state bytes.
 * Adapted: a registered JavaScript factory replaces Python import/instantiation.
 * The host's hooks are Carbon's VTable: callables extracted once per instance,
 * each slot empty when the host has none (Tr2ActionPython.cpp:147-181).
 * Host/factory errors propagate; no Python exception reporting is reproduced.
 * Owner getter results pass directly to hooks (Tr2ActionPython.cpp:79-141).
 * Queued callbacks retain the hook selected when they were queued, unlike native
 * callbacks that capture self and consult its current table when the queue drains.
 * State is Carbon's custom binary block: readers move its bytes through this
 * class's ICustomPersist methods.
 */
@be.define("Tr2ActionPython")
@legacyBlue.inherit(ITr2Updateable, INotify, IInitialize, ICustomPersist)
@be.mapInterface(ITr2ControllerAction)
@be.mapInterface(ITr2Updateable)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
@be.mapInterface(ICustomPersist)
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
  static registerFactory(factory)
  {
    const previous = this._factory;
    this._factory = factory;
    return previous;
  }

  /** Clears the injected JavaScript factory; existing instances remain alive.
   * Custom: host registration has no native Python-import counterpart.
   */
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
  static createInstance(moduleName, className, action)
  {
    if (!moduleName || !className || !this._factory)
    {
      return null;
    }
    return this._factory(moduleName, className, action) ?? null;
  }

  /**
   * Carbon's VTable value-initialized (`m_vtable = {}`, Tr2ActionPython.cpp:149):
   * every slot empty.
   * @returns {{onLink: Function|null, onUnlink: Function|null, onStart: Function|null, onStop: Function|null, onUpdate: Function|null, onLoad: Function|null, onSave: Function|null}} An empty table.
   */
  static emptyVTable()
  {
    return { onLink: null, onUnlink: null, onStart: null, onStop: null, onUpdate: null, onLoad: null, onSave: null };
  }

  /**
   * Copies host persistence output into an owned byte buffer.
   * Custom: accepts strings, arrays and buffers in addition to byte views;
   * native OnSave accepts Python bytes. Unsupported output becomes null.
   * @param {*} value Host persistence output.
   * @returns {Uint8Array|null} An independent byte buffer, or null.
   */
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

  /**
   * Native Python module import path, forwarded to the registered JavaScript action factory.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  module = "";

  /**
   * Implementation class name passed with module to the registered action factory.
   * @type {string}
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.string
  className = "";

  /**
   * The Python instance's saved state, Carbon's custom binary block "state"
   * (Tr2ActionPython_Blue.cpp:22). Readers hand its bytes to
   * AllocateReadBuffer and SetBufferAndSize.
   * Not supported: the state belongs to a Python object, and the browser runs
   * no Python; a JavaScript host receives the bytes through OnLoad as they are.
   * @type {Uint8Array}
   */
  @legacyBlue.persistOnly
  @type.binary
  @type.uint8Array
  @meta.notSupported
  state = new Uint8Array(0);

  _controller = null;

  _instance = null;

  /**
   * Carbon's m_vtable (Tr2ActionPython.h:40-58): the instance's hook
   * callables, each null when the instance has none.
   */
  _vtable = Tr2ActionPython.emptyVTable();

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

  @meta.adapted
  Initialize()
  {
    this._ensureInstance();
    return true;
  }

  /**
   * Carbon OnModified (Tr2ActionPython.cpp:52-77): a module or class change
   * stops and unlinks the action, instantiates the new class, then relinks and
   * restarts it. Queued work keeps its old host.
   * @param {string} propertyName Modified authored member name.
   * @returns {boolean} True after successful notification.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (!IsMatch(propertyName, "module") && !IsMatch(propertyName, "className")) return true;
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
    // Carbon InstantiateObject (cpp:147-181) drops the old instance, then only
    // creates the new one; the saved state is not replayed into it, now or later.
    this._loadedState = this.state;
    this._InstantiateObject();
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
   * Adapted: first use may create/load the host.
   * @param {ITr2ActionController} controller The linked controller.
   */

  @meta.adapted
  Link(controller)
  {
    this._controller = controller;
    this._ensureInstance();
    if (!this._vtable.onLink) return;
    this._vtable.onLink(controller.GetOwner(), controller);
  }

  /**
   * Unlinks this action and notifies the host instance.
   * Adapted: clears linkage before invoking the optional JS hook; host errors
   * propagate instead of native BlueScriptCallback exception handling.
   */

  @meta.adapted
  Unlink()
  {
    this._controller = null;
    if (!this._vtable.onUnlink) return;
    this._vtable.onUnlink();
  }

  /**
   * Starts the action and registers for updates when the host instance supports
   * them. The host OnStart is queued on the main-thread queue, and the previous
   * times are Blue's actual and frame times in ticks (Tr2ActionPython.cpp:98-114).
   * Adapted: optional linked-controller invocation and lazy host creation are
   * retained. The queued closure captures the selected hook, not the mutable
   * callback table. Host errors can abort the queue's current batch.
   * @param {ITr2ActionController} [controller] Invoking or linked controller.
   */

  @meta.adapted
  Start(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._controller = controller;
    this._isPlaying = true;
    this._ensureInstance();
    if (this._vtable.onUpdate)
    {
      controller.RegisterUpdateable(this);
    }
    const onStart = this._vtable.onStart;
    if (onStart)
    {
      const owner = controller.GetOwner();
      ContinueOnMainThread(() =>
      {
        onStart(owner, controller);
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

  @meta.adapted
  Stop(controller = this._controller)
  {
    if (!controller)
    {
      return;
    }
    this._isPlaying = false;
    controller.UnRegisterUpdateable(this);
    const onStop = this._vtable.onStop;
    if (!onStop)
    {
      return;
    }
    const owner = controller.GetOwner();
    ContinueOnMainThread(() =>
    {
      onStop(owner, controller);
    });
  }

  /**
   * Queues the host OnUpdate with the real and simulation deltas since the
   * previous update, converted from Blue ticks with TimeAsFloat
   * (Tr2ActionPython.cpp:129-141).
   * Adapted: no linked controller/update hook means no work. The queued
   * closure captures the selected hook; errors propagate from the queue.
   * @param {number} realTime Actual time in Blue ticks.
   * @param {number} simTime Simulation time in Blue ticks.
   */

  @meta.adapted
  Update(realTime, simTime)
  {
    const controller = this._controller;
    const onUpdate = this._vtable.onUpdate;
    if (!controller || !onUpdate)
    {
      return;
    }
    const owner = controller.GetOwner();
    const realDt = CcpTime.timeAsFloat(realTime - this._prevRealTime);
    const simDt = CcpTime.timeAsFloat(simTime - this._prevSimTime);
    ContinueOnMainThread(() =>
    {
      onUpdate(owner, controller, realDt, simDt);
    });
    this._prevRealTime = realTime;
    this._prevSimTime = simTime;
  }

  /**
   * Gets the cached JS-side host instance without creating it.
   * Adapted: returns a JavaScript host object instead of native BluePy.
   * @returns {object|null} The cached host instance.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
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

  @meta.adapted
  GetWriteBufferAndSize(_memberName = "state")
  {
    const bytes = this._vtable.onSave ? Tr2ActionPython.stateToBytes(this._vtable.onSave()) : null;
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

  @meta.adapted
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

  @meta.adapted
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

  @meta.adapted
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
  _ensureInstance()
  {
    if (!this._instance)
    {
      this._InstantiateObject();
    }
    if (this._instance && this.state.length && this.state !== this._loadedState)
    {
      if (this._vtable.onLoad) this._vtable.onLoad(this.state);
      this._loadedState = this.state;
    }
    return this._instance;
  }

  /**
   * Carbon InstantiateObject (Tr2ActionPython.cpp:147-181): clears the table
   * and the instance, creates the instance, then extracts each hook.
   * ExtractMethod keeps an attribute only when it is callable
   * (`PyCallable_Check`, cpp:167); the host is a caller-supplied object, so
   * that test is Carbon's, not a hedge on a method of ours. Bound here because
   * a BlueScriptCallback carries its instance.
   * Adapted: the registered JS factory replaces the Python import.
   */
  @meta.adapted
  _InstantiateObject()
  {
    this._vtable = Tr2ActionPython.emptyVTable();
    this._instance = null;
    this._instance = Tr2ActionPython.createInstance(this.module, this.className, this);
    const instance = this._instance;
    if (!instance) return;
    const extractMethod = methodName =>
    {
      const method = instance[methodName];
      return typeof method === "function" ? method.bind(instance) : null;
    };
    this._vtable.onLink = extractMethod("OnLink");
    this._vtable.onUnlink = extractMethod("OnUnlink");
    this._vtable.onStart = extractMethod("OnStart");
    this._vtable.onStop = extractMethod("OnStop");
    this._vtable.onUpdate = extractMethod("OnUpdate");
    this._vtable.onLoad = extractMethod("OnLoad");
    this._vtable.onSave = extractMethod("OnSave");
  }
}

// Native exposure ends at this concrete table (Tr2ActionPython_Blue.cpp:12-17,24).
