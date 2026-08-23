// Source: trinity/trinity/Controllers/Tr2Controller.h
// Source: trinity/trinity/Controllers/Tr2Controller.cpp
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { UnlinkReason } from "./enums.js";
import { BELIST_EVENTMASK, BELIST_INSERTED, BELIST_REMOVED, GetControllerActualTimeSeconds, GetControllerFrameTimeSeconds, GetControllerTimeSeconds, TR2_DIRTY_ALL } from "./contracts.js";
import { CjsEveThrottleableState } from "../eve/CjsEveThrottleableState.js";
import { Tr2ControllerEventHandler } from "./Tr2ControllerEventHandler.js";


/**
 * Owns a set of state machines, float variables and event handlers, driving them
 * against a linked owner object on a throttled update.
 */
@type.define({
  className: "Tr2Controller",
  family: "controllers"
})
export class Tr2Controller extends CjsModel
{
  @io.persist
  @type.list("Tr2StateMachine")
  stateMachines = [];

  @io.persist
  @type.list("Tr2ControllerFloatVariable")
  variables = [];

  @io.persist
  @type.list("Tr2ControllerEventHandler")
  eventHandlers = [];

  @io.read
  @type.boolean
  isPlaying = false;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  isShared = false;

  currentUpdateFrequency = 10;

  updateThrottle = true;

  maxUpdateFrequency = 20;

  minUpdateFrequency = 2;

  #throttle = new CjsEveThrottleableState();

  #updateables = new Set();

  #callbacks = [];

  #variableView = [];

  #variableData = new Float32Array(0);

  #tempArena = new ArrayBuffer(0);

  #dirtyVariables = {
    value: TR2_DIRTY_ALL
  };
  #bindingPathRoots = [];

  #owner = null;

  #time = 0;

  #currentFrameTime = 0;

  #callbackCount = 0;

  /**
   * Number of named callbacks currently registered; kept as a field so schema
   * consumers can observe registration without walking the private list.
   */
  get callbackCount()
  {
    return this.#callbackCount;
  }

  /**
   * Number of named callbacks currently registered; mirrored as a field so
   * consumers can observe registration without walking the private callback
   * list.
   */
  set callbackCount(value)
  {
    this.#callbackCount = value;
  }

  /**
   * Handles Carbon list notifications for controller child lists.
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list === this.stateMachines)
    {
      this.#onStateMachineListModified(event, value);
    }
    else if (list === this.eventHandlers)
    {
      this.#onEventHandlerListModified(event, value);
    }
    else if (list === this.variables)
    {
      this.#onVariableListModified(event);
    }
  }

  /**
   * Links the controller to an owner and prepares the variable buffer.
   */
  @carbon.method
  @impl.implemented
  Link(owner)
  {
    this.Unlink();
    this.#variableView = [];
    this.#variableData = new Float32Array(this.variables.length);
    for (let i = 0; i < this.variables.length; i++)
    {
      const variable = this.variables[i];
      this.#variableView.push({
        name: variable.GetName(),
        index: i,
        offset: i * Float32Array.BYTES_PER_ELEMENT
      });
      variable.SetDestinationBuffer(this.#variableData, i);
      if (i < 64)
      {
        variable.SetDirtyMask(this.#dirtyVariables, 1n << BigInt(i));
      }
      else
      {
        variable.SetDirtyMask(null, 0);
      }
    }
    this.#owner = owner;
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Link?.(this);
    }
    for (const handler of this.eventHandlers)
    {
      handler.Link(this);
    }
  }

  /**
   * Unlinks from the owner and clears runtime bindings.
   */
  @carbon.method
  @impl.implemented
  Unlink(reason = UnlinkReason.UNLINKING)
  {
    if (!this.#owner)
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
      stateMachine.Unlink?.(reason);
    }
    for (const handler of this.eventHandlers)
    {
      handler.Unlink();
    }
    this.#bindingPathRoots = [];
    this.#owner = null;
  }

  /**
   * Relinks the controller to its current owner.
   */
  @carbon.method
  @impl.implemented
  ReLink()
  {
    const owner = this.#owner;
    if (owner)
    {
      this.Link(owner);
    }
  }

  /**
   * Checks whether this controller is linked to an owner.
   */
  @carbon.method
  @impl.implemented
  IsLinked()
  {
    return this.#owner !== null;
  }

  /**
   * Starts all state machines.
   */
  @carbon.method
  @impl.implemented
  Start()
  {
    if (this.isPlaying)
    {
      this.Stop();
    }
    this.#dirtyVariables.value = TR2_DIRTY_ALL;
    this.#currentFrameTime = GetControllerFrameTimeSeconds();
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Start?.();
    }
    this.isPlaying = true;
  }

  /**
   * Stops all active state machines.
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
      stateMachine.Stop?.();
    }
    this.isPlaying = false;
  }

  /**
   * Updates state machines and registered updateables.
   */
  @carbon.method
  @impl.adapted
  Update(normalizedUpdateFrequency = 0.5)
  {
    if (!this.isPlaying)
    {
      return;
    }
    const actualTime = GetControllerActualTimeSeconds();
    if (this.#throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, actualTime))
    {
      return;
    }
    this.#currentFrameTime = GetControllerFrameTimeSeconds();
    this.#time = this.#currentFrameTime;
    const dirtyVariables = this.#dirtyVariables.value;
    this.#dirtyVariables.value = 0n;
    for (const stateMachine of this.stateMachines)
    {
      stateMachine.Update?.(dirtyVariables);
    }
    if (this.#updateables.size)
    {
      for (const updateable of this.#updateables)
      {
        updateable.Update?.(actualTime, this.#currentFrameTime);
      }
    }
  }

  /**
   * Sets a named float variable.
   */
  @carbon.method
  @impl.implemented
  SetVariable(name, value)
  {
    this.SetVariableValue(name, value);
  }

  /**
   * Executes event handlers matching a named event.
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
   * Gets the linked owner.
   */
  @carbon.method
  @impl.implemented
  GetOwner()
  {
    return this.#owner;
  }

  /**
   * Gets elapsed controller time in seconds.
   */
  GetTime()
  {
    return this.#time;
  }

  /**
   * Gets the current frame simulation time for JS action adapters.
   */
  CjsGetCurrentFrameTime()
  {
    return this.#currentFrameTime || GetControllerTimeSeconds();
  }

  /**
   * Gets a controller variable by name.
   */
  @carbon.method
  @impl.implemented
  GetVariableByName(name)
  {
    return this.variables.find(variable => variable.GetName() === name) ?? null;
  }

  /**
   * Gets a named float variable value.
   */
  @carbon.method
  @impl.implemented
  GetFloatVariableByName(name)
  {
    return this.GetVariableByName(name)?.GetValue();
  }

  /**
   * Gets a named variable value, or a fallback when absent.
   */
  GetVariableValue(name, fallback = 0)
  {
    return this.GetVariableByName(name)?.GetValue() ?? fallback;
  }

  /**
   * Sets a named variable value.
   */
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
   * Appends expression metadata for controller variables.
   */
  @carbon.method
  @impl.implemented
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
   * Gets the controller variable list.
   */
  @carbon.method
  @impl.implemented
  GetVariables()
  {
    return this.variables;
  }

  /**
   * Gets parser-facing variable metadata.
   */
  @carbon.method
  @impl.implemented
  GetVariableView()
  {
    return this.#variableView;
  }

  /**
   * Gets the parser-facing variable buffer.
   */
  @carbon.method
  @impl.implemented
  GetVariableBuffer()
  {
    return this.#variableData;
  }

  /**
   * Ensures the temporary expression arena has at least the supplied byte size.
   */
  @carbon.method
  @impl.implemented
  EnsureTempArenaSize(size)
  {
    if (this.#tempArena.byteLength < size)
    {
      this.#tempArena = new ArrayBuffer(size);
    }
  }

  /**
   * Gets the temporary expression arena.
   */
  @carbon.method
  @impl.implemented
  GetTempArena()
  {
    return this.#tempArena;
  }

  /**
   * Gets dynamic binding path roots.
   */
  @carbon.method
  @impl.adapted
  GetBindingPathRoots()
  {
    if (!this.#bindingPathRoots.length)
    {
      if (this.#owner)
      {
        this.#bindingPathRoots.push(["Owner", this.#owner]);
      }
      for (const variable of this.variables)
      {
        this.#bindingPathRoots.push([variable.GetName(), variable]);
      }
    }
    return this.#bindingPathRoots;
  }

  /**
   * Registers an updateable object.
   */
  @carbon.method
  @impl.implemented
  RegisterUpdateable(updateable)
  {
    this.#updateables.add(updateable);
  }

  /**
   * Unregisters an updateable object.
   */
  @carbon.method
  @impl.implemented
  UnRegisterUpdateable(updateable)
  {
    this.#updateables.delete(updateable);
  }

  /**
   * Runs callbacks registered for a named callback.
   */
  @carbon.method
  @impl.adapted
  Callback(callbackName)
  {
    if (!this.isPlaying || !this.#callbacks.length)
    {
      return false;
    }
    let called = false;
    for (const entry of this.#callbacks)
    {
      if (entry.name === callbackName)
      {
        entry.callback();
        called = true;
      }
    }
    return called;
  }

  /**
   * Registers a named callback.
   */
  @carbon.method
  @impl.adapted
  RegisterCallback(callbackName, callback)
  {
    if (!callbackName)
    {
      return false;
    }
    this.#callbacks.push({
      name: callbackName,
      callback
    });
    this.callbackCount = this.#callbacks.length;
    return true;
  }

  /**
   * Clears all registered callbacks.
   */
  @carbon.method
  @impl.implemented
  ClearCallbacks()
  {
    this.#callbacks = [];
    this.callbackCount = 0;
  }

  /**
   * Gets expression evaluation context.
   */
  GetExpressionContext(owner = this.#owner, stateMachine = null, extra = {})
  {
    return {
      ...extra,
      controller: this,
      owner,
      stateMachine,
      time: this.#time
    };
  }

  /**
   * Links and starts an inserted state machine, or stops and unlinks a removed
   * one, so list edits stay consistent with the controller's play state.
   */
  #onStateMachineListModified(event, value)
  {
    const stateMachine = Tr2Controller.#asStateMachine(value);
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this.#owner && stateMachine)
        {
          stateMachine.Link?.(this);
          if (this.isPlaying)
          {
            stateMachine.Start?.();
          }
        }
        break;
      case BELIST_REMOVED:
        if (stateMachine)
        {
          if (this.isPlaying)
          {
            stateMachine.Stop?.();
          }
          stateMachine.Unlink?.();
        }
        break;
    }
  }

  /**
   * Links an inserted event handler to this controller and unlinks a removed
   * one.
   */
  #onEventHandlerListModified(event, value)
  {
    const handler = value instanceof Tr2ControllerEventHandler ? value : null;
    switch (event & BELIST_EVENTMASK)
    {
      case BELIST_INSERTED:
        if (this.#owner && handler)
        {
          handler.Link(this);
        }
        break;
      case BELIST_REMOVED:
        handler?.Unlink();
        break;
    }
  }

  /**
   * Relinks the whole controller when a variable is inserted or removed, because
   * the variable buffer and per-variable dirty bits are index-based and must be
   * rebuilt.
   */
  #onVariableListModified(event)
  {
    const maskedEvent = event & BELIST_EVENTMASK;
    if (maskedEvent !== BELIST_INSERTED && maskedEvent !== BELIST_REMOVED)
    {
      return;
    }
    const owner = this.#owner;
    if (owner)
    {
      this.Unlink();
      this.Link(owner);
    }
  }

  /**
   * Narrows a list payload to an object reference before it is treated as a
   * state machine.
   */
  static #asStateMachine(value)
  {
    return value && typeof value === "object" ? value : null;
  }
}
