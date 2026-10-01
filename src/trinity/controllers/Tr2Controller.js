// Source: trinity/trinity/Controllers/Tr2Controller.h
// Source: trinity/trinity/Controllers/Tr2Controller.cpp
// Source: trinity/trinity/Controllers/Tr2Controller_Blue.cpp
import * as CcpLog from "../../global/logging/ccpLog.js";
import { carbon, impl, edit, type } from "#schema";
import { UnlinkReason } from "./enums.js";
import { blue, BlueList, IListNotify, TimeAsDouble } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ContinueOnMainThread } from "../core/continueOnMainThread.js";
import { EveThrottleable } from "../eve/EveThrottleable.js";
import { ITr2ActionController, ITr2Controller } from "./ITr2Controller/index.js";
import { mappedInterfaces } from "../../global/compose/interface.js";
import { Tr2StateMachine } from "./state/Tr2StateMachine.js";
import { Tr2ControllerFloatVariable } from "./expression/Tr2ControllerFloatVariable.js";
import { Tr2ControllerEventHandler } from "./Tr2ControllerEventHandler.js";


/**
 * Owns a set of state machines, float variables and event handlers, driving them
 * against a linked owner object on a throttled update.
 *
 * Owns three typed BlueLists subscribed to this controller. Explicit list
 * operations apply native admission and notifications; raw array operations
 * bypass both, as in BlueList. Retained CjsModel child helpers notify explicitly.
 * Link binds the owner, variables and children; no Initialize contract is added.
 */
@type.define({
  className: "Tr2Controller",
  family: "controllers"
})
@carbon.inherit(ITr2ActionController, IListNotify)
export class Tr2Controller extends EveThrottleable
{
  @edit.read
  @edit.persist
  @type.list("Tr2StateMachine")
  stateMachines = new BlueList(Tr2StateMachine, { className: "Tr2StateMachine", listOps: 0 });

  @edit.read
  @edit.persist
  @type.list("Tr2ControllerFloatVariable")
  variables = new BlueList(Tr2ControllerFloatVariable, { className: "Tr2ControllerFloatVariable", listOps: 0 });

  @edit.read
  @edit.persist
  @type.list("Tr2ControllerEventHandler")
  eventHandlers = new BlueList(Tr2ControllerEventHandler, { className: "Tr2ControllerEventHandler", listOps: 0 });

  @edit.read
  @type.boolean
  isPlaying = false;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @edit.persist
  @type.boolean
  isShared = false;

  _updateables = new Set();

  _callbacks = [];

  _variableView = [];

  _variableData = new Float32Array(0);

  _tempArena = new ArrayBuffer(0);

  _dirtyVariables = {
    value: 0xffffffffffffffffn
  };

  _bindingPathRoots = [];

  _owner = null;

  _time = 0;

  /**
   * Subscribes the controller to its three owned native lists (cpp:21-33).
   * Adapted: explicit constructor identities/class names replace C++ list
   * template parameters and parent-lock storage; JavaScript owns references.
   */
  constructor()
  {
    super();
    this.stateMachines.SetNotify(this);
    this.variables.SetNotify(this);
    this.eventHandlers.SetNotify(this);
  }

  /**
   * Number of callbacks currently registered (native read-only size_t property).
   * JavaScript array length remains a Number, declared uint64.
   * @returns {number} Live callback count.
   */
  @edit.read
  @type.uint64
  @impl.implemented
  get callbackCount()
  {
    return this.GetCallbackCount();
  }

  /**
   * Returns the current callback-vector size (Tr2Controller.h:63-66).
   * @returns {number} Number of registered callbacks.
   */
  @carbon.method
  @impl.implemented
  GetCallbackCount()
  {
    return this._callbacks.length;
  }

  /**
   * Handles notifications from the three owned lists (cpp:36-109).
   * Only insertion/removal has an effect; unload, load, move and swap are ignored.
   * Adapted: exact mapped constructor identities represent native BlueCastPtr.
   * @param {number} event List event flags.
   * @param {number} [_key=0] Unused first key.
   * @param {number} [_key2=0] Unused second key.
   * @param {object|null} [value=null] Inserted or removed object.
   * @param {IList|null} [list=null] Emitting list identity.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list === this.stateMachines)
    {
      this._OnStateMachineListModified(event, value);
    }
    else if (list === this.eventHandlers)
    {
      this._OnEventHandlerListModified(event, value);
    }
    else if (list === this.variables)
    {
      this._OnVariableListModified(event);
    }
  }

  /**
   * Unlinks, rebuilds the variable buffer, then links children to this controller.
   * Adapted: Float32Array/index pairs and a mutable BigInt word replace native
   * float pointers and a uint64_t pointer; variable-view records include JS indices.
   * @param {object} owner Object controlled by this instance.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  Link(owner)
  {
    this.Unlink();
    this._variableView = [];
    this._variableData = new Float32Array(this.variables.length);
    for (let i = 0; i < this.variables.length; i++)
    {
      const variable = this.variables[i];
      this._variableView.push({
        name: variable.GetName(),
        index: i,
        offset: i * Float32Array.BYTES_PER_ELEMENT
      });
      variable.SetDestinationBuffer(this._variableData, i);
      if (i < 64)
      {
        variable.SetDirtyMask(this._dirtyVariables, 1n << BigInt(i));
      }
      else
      {
        variable.SetDirtyMask(null, 0);
      }
    }
    this._owner = owner;
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Link(this);
    }
    for (const handler of this.eventHandlers)
    {
      handler.Link(this);
    }
  }

  /**
   * Stops unless deleting, disconnects children and variable destinations, then drops the owner.
   * @param {number} [reason=UnlinkReason.UNLINKING] Native unlink reason.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this._owner)
    {
      return;
    }
    if (reason !== UnlinkReason.DELETING)
    {
      this.Stop();
    }
    for (const variable of this.variables)
    {
      variable.SetDestinationBuffer(null);
      variable.SetDirtyMask(null, 0);
    }
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Unlink(reason);
    }
    for (const handler of this.eventHandlers)
    {
      handler.Unlink();
    }
    this._bindingPathRoots = [];
    this._owner = null;
  }

  /**
   * Relinks the current owner when linked.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ReLink()
  {
    const owner = this._owner;
    if (owner)
    {
      this.Link(owner);
    }
  }

  /**
   * Reports whether an owner is retained.
   * @returns {boolean} Whether Link has run without a following Unlink.
   */
  @carbon.method
  @impl.implemented
  IsLinked()
  {
    return this._owner !== null;
  }

  /**
   * Stops any previous run, marks all variables dirty, then starts every state machine.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Start()
  {
    if (this.isPlaying)
    {
      this.Stop();
    }
    this._dirtyVariables.value = 0xffffffffffffffffn;
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Start();
    }
    this.isPlaying = true;
  }

  /**
   * Stops each state machine in list order when playing.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  Stop()
  {
    if (!this.isPlaying)
    {
      return;
    }
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Stop();
    }
    this.isPlaying = false;
  }

  /**
   * Updates state machines, then queues updateables in native order (cpp:230-270).
   * Adapted: the JS throttle takes actual time in seconds; queued Update receives
   * Blue actual/frame ticks. The JS expression context retains frame seconds here.
   * @param {number} [normalizedUpdateFrequency=0.5] Normalized throttle detail.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  Update(normalizedUpdateFrequency = 0.5)
  {
    if (!this.isPlaying)
    {
      return;
    }
    if (this.ShouldSkipUpdate(normalizedUpdateFrequency, TimeAsDouble(blue.os.GetActualTime())))
    {
      return;
    }
    const currentTime = blue.os.GetActualTime();
    this._time = TimeAsDouble(blue.os.GetCurrentFrameTime());
    const dirtyVariables = this._dirtyVariables.value;
    this._dirtyVariables.value = 0n;
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Update(dirtyVariables);
    }
    if (this._updateables.size)
    {
      const simTime = blue.os.GetCurrentFrameTime();
      for (const updateable of this._updateables)
      {
        ContinueOnMainThread(() =>
        {
          updateable.Update(currentTime, simTime);
        });
      }
    }
  }

  /**
   * Sets the first matching float variable, ignoring absent names.
   * @param {string} name Variable name.
   * @param {number} value New value.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  SetVariable(name, value)
  {
    this.SetVariableValue(name, value);
  }

  /**
   * Executes every matching handler in list order while playing.
   * @param {string} eventName Authored event name.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  HandleEvent(eventName)
  {
    if (!this.isPlaying)
    {
      return;
    }
    for (const handler of this.eventHandlers)
    {
      if (handler.GetName() === eventName)
      {
        handler.Execute(this);
      }
    }
  }

  /**
   * Returns the current linked owner.
   * @returns {object|null} Owner, or null when unlinked.
   */
  @carbon.method
  @impl.implemented
  GetOwner()
  {
    return this._owner;
  }

  /**
   * Returns frame seconds sampled by the last unthrottled Update.
   * Custom: the JavaScript expression evaluator consumes an explicit time context;
   * Tr2Controller.h/.cpp have no GetTime method.
   * @returns {number} Last sampled frame time in seconds.
   */
  @impl.custom
  GetTime()
  {
    return this._time;
  }

  /**
   * Finds the first variable with the exact authored name.
   * @param {string} name Variable name.
   * @returns {Tr2ControllerFloatVariable|null} Matching variable or null.
   */
  @carbon.method
  @impl.implemented
  GetVariableByName(name)
  {
    return this.variables.find(variable => variable.GetName() === name) ?? null;
  }

  /**
   * Reads the first matching variable.
   * Adapted: undefined represents native std::optional<float> absence.
   * @param {string} name Variable name.
   * @returns {number|undefined} Value, or undefined when absent.
   */
  @carbon.method
  @impl.adapted
  GetFloatVariableByName(name)
  {
    const variable = this.GetVariableByName(name);
    return variable ? variable.GetValue() : undefined;
  }

  /**
   * Reads a variable value with the existing JavaScript fallback behavior.
   * Custom: Tr2Controller.h/.cpp provide optional GetFloatVariableByName; this
   * retained JS convenience additionally accepts a fallback for absent/null values.
   * @param {string} name Variable name.
   * @param {*} [fallback=0] Result when the variable or its value is absent.
   * @returns {*} Variable value or fallback.
   */
  @impl.custom
  GetVariableValue(name, fallback = 0)
  {
    const variable = this.GetVariableByName(name);
    if (!variable) return fallback;
    return variable.GetValue() ?? fallback;
  }

  /**
   * Sets a named variable and reports whether it exists.
   * Custom: Carbon SetVariable returns void; this retained JS convenience returns
   * a success boolean and supplies the existing SetVariable implementation.
   * @param {string} name Variable name.
   * @param {number} value New value.
   * @returns {boolean} Whether a matching variable was found.
   */
  @impl.custom
  SetVariableValue(name, value)
  {
    const variable = this.GetVariableByName(name);
    if (!variable)
    {
      return false;
    }
    variable.SetValue(value);
    return true;
  }

  /**
   * Appends one expression term per variable in list order.
   * Adapted: plain JS term records replace Tr2ExpressionTermInfo objects.
   * @param {Array<object>} out Caller-owned term collection.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  GetExpressionTermInfo(out)
  {
    for (const variable of this.variables)
    {
      out.push({
        group: "Variables",
        name: variable.GetName(),
        description: "controller variable",
        kind: "variable"
      });
    }
  }

  /**
   * Returns the owned variable list as borrowed storage.
   * @returns {BlueList} Configured variable list.
   */
  @carbon.method
  @impl.implemented
  GetVariables()
  {
    return this.variables;
  }

  /**
   * Returns the parser-facing layout of the current variable buffer.
   * Adapted: JS records expose both element index and byte offset.
   * @returns {Array<object>} Borrowed variable layout records.
   */
  @carbon.method
  @impl.adapted
  GetVariableView()
  {
    return this._variableView;
  }

  /**
   * Returns the packed variable buffer.
   * Adapted: Float32Array replaces the native untyped buffer pointer.
   * @returns {Float32Array} Borrowed variable storage.
   */
  @carbon.method
  @impl.adapted
  GetVariableBuffer()
  {
    return this._variableData;
  }

  /**
   * Grows the temporary expression arena when needed.
   * Adapted: ArrayBuffer replaces native CcpMallocBuffer scratch storage.
   * @param {number} size Required byte capacity.
   * @returns {void}
   */
  @carbon.method
  @impl.adapted
  EnsureTempArenaSize(size)
  {
    if (this._tempArena.byteLength < size)
    {
      this._tempArena = new ArrayBuffer(size);
    }
  }

  /**
   * Returns the current temporary expression arena.
   * Adapted: ArrayBuffer replaces the native untyped arena pointer.
   * @returns {ArrayBuffer} Borrowed scratch storage.
   */
  @carbon.method
  @impl.adapted
  GetTempArena()
  {
    return this._tempArena;
  }

  /**
   * Lazily collects the owner and variables as named binding roots.
   * Adapted: JS references and two-item arrays replace native IRoot pointers/pairs.
   * @returns {Array<Array>} Borrowed name/object pairs.
   */
  @carbon.method
  @impl.adapted
  GetBindingPathRoots()
  {
    if (!this._bindingPathRoots.length)
    {
      if (this._owner)
      {
        this._bindingPathRoots.push(["Owner", this._owner]);
      }
      for (const variable of this.variables)
      {
        this._bindingPathRoots.push([variable.GetName(), variable]);
      }
    }
    return this._bindingPathRoots;
  }

  /**
   * Adds an updateable to the controller set.
   * @param {ITr2Updateable} updateable Object updated after state machines.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  RegisterUpdateable(updateable)
  {
    this._updateables.add(updateable);
  }

  /**
   * Removes an updateable from the controller set.
   * @param {ITr2Updateable} updateable Previously registered object.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  UnRegisterUpdateable(updateable)
  {
    this._updateables.delete(updateable);
  }

  /**
   * Runs matching callbacks while playing, continuing after reported exceptions.
   * Adapted: JS functions and CcpLog replace BlueScriptCallback; the retained JS
   * return reports whether a match ran, whereas Carbon returns void.
   * @param {string} callbackName Callback name.
   * @returns {boolean} Whether a matching callback was invoked.
   */
  @carbon.method
  @impl.adapted
  Callback(callbackName)
  {
    if (!this.isPlaying || !this._callbacks.length)
    {
      return false;
    }
    let called = false;
    for (const entry of this._callbacks)
    {
      if (entry.name === callbackName)
      {
        try
        {
          entry.callback();
        }
        catch (error)
        {
          // Carbon CallVoid().ReportException() reports and continues dispatch.
          CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s %s %s", "Controller callback failed", callbackName, error);
        }
        called = true;
      }
    }
    return called;
  }

  /**
   * Appends a named callback, including an empty name.
   * Adapted: stores a JS function instead of BlueScriptCallback and preserves the
   * existing true return; Carbon returns void.
   * @param {string} callbackName Callback name.
   * @param {Function} callback Function called without arguments.
   * @returns {boolean} Always true after registration.
   */
  @carbon.method
  @impl.adapted
  RegisterCallback(callbackName, callback)
  {
    this._callbacks.push({
      name: callbackName,
      callback
    });
    return true;
  }

  /**
   * Clears every registered callback.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  ClearCallbacks()
  {
    this._callbacks = [];
  }

  /**
   * Creates the context consumed by the JavaScript expression evaluator.
   * Custom: Tr2Controller.h/.cpp do not expose this JS evaluator context record.
   * @param {object|null} [owner=this._owner] Expression owner.
   * @param {Tr2StateMachine|null} [stateMachine=null] Expression state machine.
   * @param {object} [extra={}] Additional expression inputs.
   * @returns {object} New context with controller, owner, state machine and time.
   */
  @impl.custom
  GetExpressionContext(owner = this._owner, stateMachine = null, extra = {})
  {
    return {
      ...extra,
      controller: this,
      owner,
      stateMachine,
      time: this._time
    };
  }

  /**
   * Dispatches native state-machine insertion/removal handling (cpp:38-68).
   * Custom: factors OnListModified into a local helper; exact mappings implement
   * BlueCastPtr without admitting a merely similar JavaScript object.
   * @param {number} event List event flags.
   * @param {object|null} value Event object.
   * @returns {void}
   */
  @impl.custom
  _OnStateMachineListModified(event, value)
  {
    const stateMachine = value && mappedInterfaces(value.constructor).has(Tr2StateMachine) ? value : null;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._owner && stateMachine)
        {
          stateMachine.Link(this);
          if (this.isPlaying)
          {
            stateMachine.Start();
          }
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (stateMachine)
        {
          if (this.isPlaying)
          {
            stateMachine.Stop();
          }
          stateMachine.Unlink();
        }
        break;
    }
  }

  /**
   * Dispatches native event-handler insertion/removal handling (cpp:69-91).
   * Custom: factors OnListModified into a local helper and checks exact exposure.
   * @param {number} event List event flags.
   * @param {object|null} value Event object.
   * @returns {void}
   */
  @impl.custom
  _OnEventHandlerListModified(event, value)
  {
    const handler = value && mappedInterfaces(value.constructor).has(Tr2ControllerEventHandler) ? value : null;
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (this._owner && handler)
        {
          handler.Link(this);
        }
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (handler) handler.Unlink();
        break;
    }
  }

  /**
   * Stops and relinks on variable insertion/removal (cpp:92-108).
   * Custom: factors this native OnListModified branch into a local helper.
   * Relinking rebuilds index-based destinations; it does not restart playback.
   * @param {number} event List event flags.
   * @returns {void}
   */
  @impl.custom
  _OnVariableListModified(event)
  {
    const maskedEvent = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if (maskedEvent !== BLUELISTEVENT.BELIST_INSERTED && maskedEvent !== BLUELISTEVENT.BELIST_REMOVED)
    {
      return;
    }
    const owner = this._owner;
    if (owner)
    {
      this.Unlink();
      this.Link(owner);
    }
  }
}

// Tr2Controller_Blue.cpp:15-19,65 maps this table and chains EveThrottleable.
carbon.interfaceTable({
  interfaces: [Tr2Controller, ITr2Controller, ITr2ActionController, IListNotify],
  chainTo: EveThrottleable
})(Tr2Controller, { kind: "class" });
