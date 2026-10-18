// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Source: trinity/trinity/Controllers/Tr2TimelineController.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { meta, type, blue } from "#schema";
import { be, CcpTime, ISimTimeRebaseNotify } from "#blue";
import { EveThrottleable } from "../../eve/EveThrottleable.js";
import { ITr2Controller, ITr2ActionController } from "../ITr2Controller/index.js";
import { Tr2TimelineEntry } from "./Tr2TimelineEntry.js";
import { UnlinkReason } from "../enums.js";


/**
 * Plays a list of controller actions against a scrubbable timeline, starting and
 * stopping each action as the current time enters and leaves its authored
 * start/end range on an enabled track.
 */
@blue.define("Tr2TimelineController")
@blue.inherit(ITr2ActionController, ISimTimeRebaseNotify)
@blue.interface(ITr2Controller, ITr2ActionController)
@blue.chainTo(EveThrottleable)
export class Tr2TimelineController extends EveThrottleable
{
  @blue.persistOnly
  @type.list("ITr2ControllerAction")
  actions = [];

  @blue.persistOnly
  @type.structList("Tr2TimelineEntry")
  entries = [];

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.read
  @blue.persist
  @type.list("Tr2ControllerFloatVariable")
  variables = [];

  @blue.read
  @blue.persist
  @type.list("Tr2ControllerEventHandler")
  eventHandlers = [];

  @blue.readwrite
  @blue.persist
  @type.float32
  timeScale = 1;

  @blue.read
  @type.boolean
  isPlaying = false;

  @blue.read
  @type.boolean
  isPaused = false;

  _owner = null;

  _time = 0;

  _lastUpdateTime = 0;

  _callbacks = [];

  _updateables = new Set();

  _disabledTracks = new Set();

  _variableView = [];

  _variableData = new Float32Array(0);

  _tempArena = new ArrayBuffer(0);

  _bindingPathRoots = [];

  /** Blue property alias for the controller's runtime timeline clock. */
  @blue.property()
  @type.float32
  get time()
  {
    return this.GetTime();
  }

  /** Sets the Blue timeline-clock alias through Carbon's SetTime path. */
  set time(value)
  {
    this.SetTime(value);
  }

  /**
   * Links actions, variables, and event handlers to an owner.
   */
  @blue.method
  @meta.adapted
  Link(owner)
  {
    this.Unlink();
    this._owner = owner;
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
      variable.SetDirtyMask(null, 0);
    }
    for (const action of this.actions)
    {
      action.Link(this);
    }
    for (const handler of this.eventHandlers)
    {
      handler.Link(this);
    }
  }

  /**
   * Unlinks runtime children and clears owner state.
   */
  @blue.method
  @meta.implemented
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
    for (const action of this.actions)
    {
      action.Unlink();
    }
    for (const handler of this.eventHandlers)
    {
      handler.Unlink();
    }
    this._bindingPathRoots = [];
    this._owner = null;
  }

  /**
   * Checks whether this timeline is linked.
   */
  @blue.method
  @meta.implemented
  IsLinked()
  {
    return this._owner !== null;
  }

  /**
   * Starts actions already active at the current time.
   */
  @blue.method
  @meta.adapted
  Start()
  {
    if (this.isPlaying)
    {
      this.Stop();
    }
    this.isPlaying = true;
    this._lastUpdateTime = be.os.GetCurrentFrameTime();
    for (let i = 0; i < this.actions.length; i++)
    {
      const entry = this._entryAt(i);
      if (this.IsActionEnabled(i) && Tr2TimelineController._inRange(this._time, entry))
      {
        this.actions[i].Start(this);
      }
    }
  }

  /**
   * Stops currently active actions and resets timeline time.
   */
  @blue.method
  @meta.adapted
  Stop()
  {
    if (!this.isPlaying)
    {
      return;
    }
    for (let i = 0; i < this.actions.length; i++)
    {
      const entry = this._entryAt(i);
      if (this.IsActionEnabled(i) && Tr2TimelineController._inRange(this._time, entry))
      {
        this.actions[i].Stop(this);
      }
    }
    this.isPlaying = false;
    this._time = 0;
  }

  /**
   * Advances the timeline by Blue's frame-time delta, converted from ticks with
   * TimeAsFloat, and toggles action activity; updateables receive Blue's
   * actual and frame times in ticks (`Tr2TimelineController.cpp:171-235`).
   *
   * Adapted: the action range toggling runs through `_SetTime`, and the
   * controller mutex and stats scopes are omitted (one JavaScript thread).
   */
  @blue.method
  @meta.adapted
  Update(normalizedUpdateFrequency = 0.5)
  {
    if (!this.isPlaying)
    {
      return;
    }
    if (this.ShouldSkipUpdate(normalizedUpdateFrequency))
    {
      return;
    }
    const simTime = be.os.GetCurrentFrameTime();
    const dt = CcpTime.timeAsFloat(simTime - this._lastUpdateTime) * this.timeScale;
    this._lastUpdateTime = simTime;
    if (!this.isPaused)
    {
      this._SetTime(this._time + dt, true);
    }
    if (this._updateables.size)
    {
      const realTime = be.os.GetActualTime();
      for (const updateable of this._updateables)
      {
        updateable.Update(realTime, simTime);
      }
    }
  }

  /**
   * Sets a named variable.
   */
  @blue.method
  @meta.implemented
  SetVariable(name, value)
  {
    this.variables.find(variable => variable.GetName() === name)?.SetValue(value);
  }

  /**
   * Handles a named event.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetOwner()
  {
    return this._owner;
  }

  /**
   * Invokes callbacks registered for a name.
   *
   * Adapted: Invokes stored JavaScript functions and reports exceptions through
   * CcpLog, preserving Carbon's continuation after a failed callback.
   * Returns whether a matching callback was invoked; native returns void.
   */
  @blue.method
  @meta.adapted
  Callback(callbackName)
  {
    if (!this.isPlaying)
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
   * Registers an updateable object.
   */
  @blue.method
  @meta.implemented
  RegisterUpdateable(updateable)
  {
    this._updateables.add(updateable);
  }

  /**
   * Unregisters an updateable object.
   */
  @blue.method
  @meta.implemented
  UnRegisterUpdateable(updateable)
  {
    this._updateables.delete(updateable);
  }

  /**
   * Gets named roots for controller binding paths.
   */
  @blue.method
  @meta.adapted
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
   * Gets a float variable by name.
   */
  @blue.method
  @meta.implemented
  GetFloatVariableByName(name)
  {
    return this.variables.find(variable => variable.GetName() === name)?.GetValue();
  }

  /**
   * Appends expression metadata for variables.
   */
  @blue.method
  @meta.implemented
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
   * Gets expression variable metadata.
   */
  @blue.method
  @meta.implemented
  GetVariableView()
  {
    return this._variableView;
  }

  /**
   * Gets expression variable data.
   */
  @blue.method
  @meta.implemented
  GetVariableBuffer()
  {
    return this._variableData;
  }

  /**
   * Ensures the expression temporary arena is large enough.
   */
  @blue.method
  @meta.implemented
  EnsureTempArenaSize(size)
  {
    if (this._tempArena.byteLength < size)
    {
      this._tempArena = new ArrayBuffer(size);
    }
  }

  /**
   * Gets the expression temporary arena.
   */
  @blue.method
  @meta.implemented
  GetTempArena()
  {
    return this._tempArena;
  }

  /**
   * Rebases action sim time.
   * Source: trinity/trinity/Controllers/Tr2TimelineController.cpp:366-375
   * Adapted: JavaScript numeric timestamps represent native Be::Time values.
   */
  @blue.method
  @meta.adapted
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this._lastUpdateTime += diff;
    for (const action of this.actions)
    {
      action.RebaseSimTime(diff);
    }
  }

  /**
   * Gets action count.
   */
  @blue.method
  @meta.implemented
  GetActionCount()
  {
    return this.actions.length;
  }

  /**
   * Gets an action by index (Tr2TimelineController.cpp:382-390).
   *
   * Adapted: Carbon's output reference comes back as the return value.
   *
   * @param {number} index Action index.
   * @returns {ITr2ControllerAction} The action.
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  GetAction(index)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    return this.actions[index];
  }

  /**
   * Gets the timeline start time in seconds of the action at an index
   * (Tr2TimelineController.cpp:392-400).
   *
   * Adapted: Carbon's output reference comes back as the return value.
   *
   * @param {number} index Action index.
   * @returns {number} Start time.
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  GetActionStartTime(index)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    return this._entryAt(index).startTime;
  }

  /**
   * Gets the timeline end time in seconds of the action at an index
   * (Tr2TimelineController.cpp:402-410).
   *
   * Adapted: Carbon's output reference comes back as the return value.
   *
   * @param {number} index Action index.
   * @returns {number} End time.
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  GetActionEndTime(index)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    return this._entryAt(index).endTime;
  }

  /**
   * Gets the track the action at an index belongs to
   * (Tr2TimelineController.cpp:412-420).
   *
   * Adapted: Carbon's output reference comes back as the return value.
   *
   * @param {number} index Action index.
   * @returns {number} Track ID.
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  GetActionTrackID(index)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    return this._entryAt(index).trackID;
  }

  /**
   * Moves an action's start time, starting or stopping the action immediately
   * when the edit changes whether it covers the current time
   * (Tr2TimelineController.cpp:422-447).
   *
   * Adapted: no controller mutex; JavaScript runs actions on one thread.
   *
   * @param {number} index Action index.
   * @param {number} startTime New start time.
   * @returns {void}
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  SetActionStartTime(index, startTime)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    if (this.isPlaying && this.IsActionEnabled(index))
    {
      const entry = this._entryAt(index);
      const wasActive = Tr2TimelineController._inRange(this._time, entry);
      const isActive = Tr2TimelineController._inRange(this._time, {
        startTime,
        endTime: entry.endTime
      });
      if (wasActive && !isActive)
      {
        this.actions[index].Stop(this);
      }
      else if (!wasActive && isActive)
      {
        this.actions[index].Start(this);
      }
    }
    this._entryAt(index).startTime = startTime;
  }

  /**
   * Moves an action's end time, starting or stopping the action immediately when
   * the edit changes whether it covers the current time
   * (Tr2TimelineController.cpp:449-473).
   *
   * Adapted: no controller mutex; JavaScript runs actions on one thread.
   *
   * @param {number} index Action index.
   * @param {number} endTime New end time.
   * @returns {void}
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  SetActionEndTime(index, endTime)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    if (this.isPlaying && this.IsActionEnabled(index))
    {
      const entry = this._entryAt(index);
      const wasActive = Tr2TimelineController._inRange(this._time, entry);
      const isActive = Tr2TimelineController._inRange(this._time, {
        startTime: entry.startTime,
        endTime
      });
      if (wasActive && !isActive)
      {
        this.actions[index].Stop(this);
      }
      else if (!wasActive && isActive)
      {
        this.actions[index].Start(this);
      }
    }
    this._entryAt(index).endTime = endTime;
  }

  /**
   * Reassigns an action to another track, starting or stopping it when the move
   * changes whether its track is enabled while the action covers the current
   * time (Tr2TimelineController.cpp:475-502).
   *
   * Adapted: no controller mutex; JavaScript runs actions on one thread.
   *
   * @param {number} index Action index.
   * @param {number} trackID New track ID.
   * @returns {void}
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  SetActionTrackID(index, trackID)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    const wasEnabled = this.IsActionEnabled(index);
    const entry = this._entryAt(index);
    entry.trackID = trackID;
    const isEnabled = this.IsActionEnabled(index);
    if (this.isPlaying && wasEnabled !== isEnabled && Tr2TimelineController._inRange(this._time, entry))
    {
      if (isEnabled)
      {
        this.actions[index].Start(this);
      }
      else
      {
        this.actions[index].Stop(this);
      }
    }
  }

  /**
   * Appends the action, links it when owned, then appends its timeline entry.
   * Starts it immediately when playback covers its enabled range.
   *
   * Adapted: Stores a Tr2TimelineEntry object in place of Carbon's value struct.
   */
  @blue.method
  @meta.adapted
  AddAction(action, startTime, endTime, trackID = 0)
  {
    if (!action)
    {
      return;
    }
    this.actions.push(action);
    if (this._owner)
    {
      action.Link(this);
    }
    const entry = new Tr2TimelineEntry();
    entry.startTime = startTime;
    entry.endTime = endTime;
    entry.trackID = trackID;
    this.entries.push(entry);
    if (this.isPlaying && this.IsActionEnabled(this.actions.length - 1) && Tr2TimelineController._inRange(this._time, entry))
    {
      action.Start(this);
    }
  }

  /**
   * Removes an action and its entry, stopping and unlinking only when owned
   * (Tr2TimelineController.cpp:530-553).
   *
   * Adapted: no controller mutex; JavaScript runs actions on one thread.
   *
   * @param {number} index Action index.
   * @returns {void}
   * @throws {RangeError} "Index out of range", Carbon's BlueStdResult value error.
   */
  @blue.method
  @meta.adapted
  RemoveAction(index)
  {
    if (!(Number.isInteger(index) && index >= 0 && index < this.actions.length))
    {
      throw new RangeError("Index out of range");
    }
    const action = this.actions[index];
    if (this._owner)
    {
      if (this.isPlaying && this.IsActionEnabled(index) && Tr2TimelineController._inRange(this._time, this._entryAt(index)))
      {
        action.Stop(this);
      }
      action.Unlink();
    }
    this.actions.splice(index, 1);
    this.entries.splice(index, 1);
  }

  /**
   * Checks whether the action's track is enabled
   * (Tr2TimelineController.cpp:555-558). Carbon indexes m_entries unchecked.
   *
   * @param {number} index Action index.
   * @returns {boolean} Whether the entry's track is enabled.
   * @throws {RangeError} When no entry exists at index (ruling 11).
   */
  @blue.method
  @meta.implemented
  IsActionEnabled(index)
  {
    return !this._disabledTracks.has(this._entryAt(index).trackID);
  }

  /**
   * Checks whether a track is enabled.
   */
  @blue.method
  @meta.implemented
  IsTrackEnabled(trackID)
  {
    return !this._disabledTracks.has(trackID);
  }

  /**
   * Enables or disables a track.
   */
  @blue.method
  @meta.adapted
  EnableTrack(trackID, enable)
  {
    const wasEnabled = this.IsTrackEnabled(trackID);
    if (enable)
    {
      this._disabledTracks.delete(trackID);
    }
    else
    {
      this._disabledTracks.add(trackID);
    }
    if (this.isPlaying && wasEnabled !== enable)
    {
      for (let i = 0; i < this.actions.length; i++)
      {
        const entry = this._entryAt(i);
        if (Tr2TimelineController._inRange(this._time, entry) && entry.trackID === trackID)
        {
          if (enable)
          {
            this.actions[i].Start(this);
          }
          else
          {
            this.actions[i].Stop(this);
          }
        }
      }
    }
  }

  /**
   * Registers a callback.
   */
  @blue.method
  @meta.adapted
  RegisterCallback(name, callback)
  {
    this._callbacks.push({
      name,
      callback
    });
  }

  /**
   * Clears callbacks.
   */
  @blue.method
  @meta.implemented
  ClearCallbacks()
  {
    this._callbacks = [];
  }

  /**
   * Gets current timeline time.
   */
  @blue.method
  @meta.implemented
  GetTime()
  {
    return this._time;
  }

  /**
   * Sets current timeline time and toggles action activity.
   */
  @blue.method
  @meta.adapted
  SetTime(time)
  {
    if (!this.isPlaying || time === this._time)
    {
      return;
    }
    this._SetTime(time, false);
  }

  /**
   * Sets the current time and reconciles every enabled action against the new
   * time; when includePassedActions is set, an action whose whole range was
   * skipped over in one step is started and stopped back to back so it is not
   * silently missed.
   */
  _SetTime(time, includePassedActions)
  {
    const oldTime = this._time;
    this._time = time;
    for (let i = 0; i < this.actions.length; i++)
    {
      if (!this.IsActionEnabled(i))
      {
        continue;
      }
      const entry = this._entryAt(i);
      const wasActive = Tr2TimelineController._inRange(oldTime, entry);
      const isActive = Tr2TimelineController._inRange(this._time, entry);
      if (wasActive && !isActive)
      {
        this.actions[i].Stop(this);
      }
      else if (!wasActive && isActive)
      {
        this.actions[i].Start(this);
      }
      else if (includePassedActions && Tr2TimelineController._crossedRange(oldTime, this._time, entry))
      {
        this.actions[i].Start(this);
        this.actions[i].Stop(this);
      }
    }
  }

  /**
   * Pauses time progression.
   */
  @blue.method
  @meta.implemented
  Pause()
  {
    this.isPaused = true;
  }

  /**
   * Resumes time progression.
   */
  @blue.method
  @meta.implemented
  Resume()
  {
    this.isPaused = false;
  }

  /**
   * Relinks to the current owner.
   */
  @blue.method
  @meta.implemented
  ReLink()
  {
    const owner = this._owner;
    if (owner)
    {
      this.Link(owner);
    }
  }

  /**
   * Reads m_entries[index], which Carbon indexes unchecked
   * (BlueStructureList.h:235-238 over std::vector::operator[]). An index with
   * no entry throws instead of reading undefined (ruling 11).
   *
   * @param {number} index Entry index.
   * @returns {Tr2TimelineEntry} The entry parallel to the action at index.
   * @throws {RangeError} When no entry exists at index.
   */
  _entryAt(index)
  {
    const entry = this.entries[index];
    if (entry === undefined)
    {
      throw new RangeError(`Tr2TimelineController: no entry at index ${index}, size is ${this.entries.length}.`);
    }
    return entry;
  }

  /**
   * Checks whether a time falls in an entry's range; the start is inclusive and
   * the end exclusive.
   */
  static _inRange(time, entry)
  {
    return time >= entry.startTime && time < entry.endTime;
  }

  /**
   * Checks whether an entry's whole range fell inside a single update step,
   * meaning the action was never observed active.
   */
  static _crossedRange(oldTime, newTime, entry)
  {
    const updateRange = { startTime: oldTime, endTime: newTime };
    return Tr2TimelineController._inRange(entry.startTime, updateRange) && Tr2TimelineController._inRange(entry.endTime, updateRange);
  }
}

// Tr2TimelineController_Blue.cpp exposes no initialization or list-notify contract.
