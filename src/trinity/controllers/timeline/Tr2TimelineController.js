// Source: trinity/trinity/Controllers/Tr2TimelineController.h
// Source: trinity/trinity/Controllers/Tr2TimelineController.cpp
import { carbon, impl, edit, type } from "#schema";
import { GetControllerActualTimeSeconds, GetControllerFrameTimeSeconds } from "../contracts.js";
import { EveThrottleable } from "../../eve/EveThrottleable.js";
import { ITr2ActionController } from "../ITr2Controller/index.js";
import { Tr2TimelineEntry } from "./Tr2TimelineEntry.js";
import { UnlinkReason } from "../enums.js";


/**
 * Plays a list of controller actions against a scrubbable timeline, starting and
 * stopping each action as the current time enters and leaves its authored
 * start/end range on an enabled track.
 */
@type.define({
  className: "Tr2TimelineController",
  family: "controllers"
})
@carbon.inherit(ITr2ActionController)
export class Tr2TimelineController extends EveThrottleable
{
  @edit.persistOnly
  @type.list("ITr2ControllerAction")
  actions = [];

  @edit.persistOnly
  @type.list("Tr2TimelineEntry")
  entries = [];

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.read
  @edit.persist
  @type.list("Tr2ControllerFloatVariable")
  variables = [];

  @edit.read
  @edit.persist
  @type.list("Tr2ControllerEventHandler")
  eventHandlers = [];

  @edit.readwrite
  @edit.persist
  @type.float32
  timeScale = 1;

  @edit.read
  @type.boolean
  isPlaying = false;

  @edit.read
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  IsLinked()
  {
    return this._owner !== null;
  }

  /**
   * Starts actions already active at the current time.
   */
  @carbon.method
  @impl.adapted
  Start()
  {
    if (this.isPlaying)
    {
      this.Stop();
    }
    this.isPlaying = true;
    this._lastUpdateTime = GetControllerFrameTimeSeconds();
    for (let i = 0; i < this.actions.length; i++)
    {
      const entry = this._entryAt(i);
      if (entry && this.IsActionEnabled(i) && Tr2TimelineController._inRange(this._time, entry))
      {
        this.actions[i].Start(this);
      }
    }
  }

  /**
   * Stops currently active actions and resets timeline time.
   */
  @carbon.method
  @impl.adapted
  Stop()
  {
    if (!this.isPlaying)
    {
      return;
    }
    for (let i = 0; i < this.actions.length; i++)
    {
      const entry = this._entryAt(i);
      if (entry && this.IsActionEnabled(i) && Tr2TimelineController._inRange(this._time, entry))
      {
        this.actions[i].Stop(this);
      }
    }
    this.isPlaying = false;
    this._time = 0;
  }

  /**
   * Advances the timeline and toggles action activity.
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
    if (this.ShouldSkipUpdate(normalizedUpdateFrequency, actualTime))
    {
      return;
    }
    const frameTime = GetControllerFrameTimeSeconds();
    const dt = (frameTime - this._lastUpdateTime) * this.timeScale;
    this._lastUpdateTime = frameTime;
    if (!this.isPaused)
    {
      this._setTime(this._time + dt, true);
    }
    for (const updateable of this._updateables)
    {
      updateable.Update(actualTime, frameTime);
    }
  }

  /**
   * Sets a named variable.
   */
  @carbon.method
  @impl.implemented
  SetVariable(name, value)
  {
    this.variables.find(variable => variable.GetName() === name)?.SetValue(value);
  }

  /**
   * Handles a named event.
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
    return this._owner;
  }

  /**
   * Invokes callbacks registered for a name.
   */
  @carbon.method
  @impl.adapted
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
        entry.callback();
        called = true;
      }
    }
    return called;
  }

  /**
   * Registers an updateable object.
   */
  @carbon.method
  @impl.implemented
  RegisterUpdateable(updateable)
  {
    this._updateables.add(updateable);
  }

  /**
   * Unregisters an updateable object.
   */
  @carbon.method
  @impl.implemented
  UnRegisterUpdateable(updateable)
  {
    this._updateables.delete(updateable);
  }

  /**
   * Gets named roots for controller binding paths.
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
   * Gets a float variable by name.
   */
  @carbon.method
  @impl.implemented
  GetFloatVariableByName(name)
  {
    return this.variables.find(variable => variable.GetName() === name)?.GetValue();
  }

  /**
   * Appends expression metadata for variables.
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
   * Gets expression variable metadata.
   */
  @carbon.method
  @impl.implemented
  GetVariableView()
  {
    return this._variableView;
  }

  /**
   * Gets expression variable data.
   */
  @carbon.method
  @impl.implemented
  GetVariableBuffer()
  {
    return this._variableData;
  }

  /**
   * Ensures the expression temporary arena is large enough.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetTempArena()
  {
    return this._tempArena;
  }

  /**
   * Rebases action sim time.
   */
  @carbon.method
  @impl.adapted
  OnSimClockRebase(oldTime, newTime)
  {
    const diff = newTime - oldTime;
    this._lastUpdateTime += diff;
    for (const action of this.actions)
    {
      action.RebaseSimTime?.(diff);
    }
  }

  /**
   * Gets action count.
   */
  @carbon.method
  @impl.implemented
  GetActionCount()
  {
    return this.actions.length;
  }

  /**
   * Gets an action by index.
   */
  @carbon.method
  @impl.adapted
  GetAction(index)
  {
    return this.actions[index] ?? null;
  }

  /**
   * Gets the timeline start time in seconds of the action at an index, or 0 when
   * the index has no entry.
   */
  @carbon.method
  @impl.implemented
  GetActionStartTime(index)
  {
    return this._entryAt(index)?.startTime ?? 0;
  }

  /**
   * Gets the timeline end time in seconds of the action at an index, or 0 when
   * the index has no entry.
   */
  @carbon.method
  @impl.implemented
  GetActionEndTime(index)
  {
    return this._entryAt(index)?.endTime ?? 0;
  }

  /**
   * Gets the track the action at an index belongs to, or 0 when the index has no
   * entry.
   */
  @carbon.method
  @impl.implemented
  GetActionTrackID(index)
  {
    return this._entryAt(index)?.trackID ?? 0;
  }

  /**
   * Moves an action's start time, starting or stopping the action immediately
   * when the edit changes whether it covers the current time; returns false for
   * an out-of-range index.
   */
  @carbon.method
  @impl.adapted
  SetActionStartTime(index, startTime)
  {
    if (index < 0 || index >= this.actions.length)
    {
      return false;
    }
    const entry = this._entryAt(index);
    if (!entry)
    {
      return false;
    }
    if (this.isPlaying && this.IsActionEnabled(index))
    {
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
    entry.startTime = startTime;
    return true;
  }

  /**
   * Moves an action's end time, starting or stopping the action immediately when
   * the edit changes whether it covers the current time; returns false for an
   * out-of-range index.
   */
  @carbon.method
  @impl.adapted
  SetActionEndTime(index, endTime)
  {
    if (index < 0 || index >= this.actions.length)
    {
      return false;
    }
    const entry = this._entryAt(index);
    if (!entry)
    {
      return false;
    }
    if (this.isPlaying && this.IsActionEnabled(index))
    {
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
    entry.endTime = endTime;
    return true;
  }

  /**
   * Reassigns an action to another track, starting or stopping it when the move
   * changes whether its track is enabled while the action covers the current
   * time.
   */
  @carbon.method
  @impl.adapted
  SetActionTrackID(index, trackID)
  {
    if (index < 0 || index >= this.actions.length)
    {
      return false;
    }
    const wasEnabled = this.IsActionEnabled(index);
    const entry = this._entryAt(index);
    if (!entry)
    {
      return false;
    }
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
    return true;
  }

  /**
   * Appends the action, links it when owned, then appends its timeline entry.
   * Starts it immediately when playback covers its enabled range.
   *
   * Adapted: Stores a Tr2TimelineEntry object in place of Carbon's value struct.
   */
  @carbon.method
  @impl.adapted
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
   * Removes an action and its entry, stopping and unlinking only when owned.
   *
   * Adapted: Returns false for an invalid index instead of a BlueStdResult error.
   */
  @carbon.method
  @impl.adapted
  RemoveAction(index)
  {
    if (index < 0 || index >= this.actions.length)
    {
      return false;
    }
    const action = this.actions[index];
    const entry = this._entryAt(index);
    if (this._owner && entry && this.isPlaying && this.IsActionEnabled(index) && Tr2TimelineController._inRange(this._time, entry))
    {
      action.Stop(this);
    }
    if (this._owner)
    {
      action.Unlink();
    }
    this.actions.splice(index, 1);
    this.entries.splice(index, 1);
    return true;
  }

  /**
   * Checks whether the action's track is enabled.
   */
  @carbon.method
  @impl.implemented
  IsActionEnabled(index)
  {
    const entry = this._entryAt(index);
    return !!entry && !this._disabledTracks.has(entry.trackID);
  }

  /**
   * Checks whether a track is enabled.
   */
  @carbon.method
  @impl.implemented
  IsTrackEnabled(trackID)
  {
    return !this._disabledTracks.has(trackID);
  }

  /**
   * Enables or disables a track.
   */
  @carbon.method
  @impl.adapted
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
        if (entry && entry.trackID === trackID && Tr2TimelineController._inRange(this._time, entry))
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
  ClearCallbacks()
  {
    this._callbacks = [];
  }

  /**
   * Gets current timeline time.
   */
  @carbon.method
  @impl.implemented
  GetTime()
  {
    return this._time;
  }

  /**
   * Gets the current frame simulation time for JS action adapters.
   */
  CjsGetCurrentFrameTime()
  {
    return this._lastUpdateTime || GetControllerFrameTimeSeconds();
  }

  /**
   * Sets current timeline time and toggles action activity.
   */
  @carbon.method
  @impl.adapted
  SetTime(time)
  {
    if (!this.isPlaying || time === this._time)
    {
      return;
    }
    this._setTime(time, false);
  }

  /**
   * Sets the current time and reconciles every enabled action against the new
   * time; when includePassedActions is set, an action whose whole range was
   * skipped over in one step is started and stopped back to back so it is not
   * silently missed.
   */
  _setTime(time, includePassedActions)
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
      if (!entry)
      {
        continue;
      }
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
  @carbon.method
  @impl.implemented
  Pause()
  {
    this.isPaused = true;
  }

  /**
   * Resumes time progression.
   */
  @carbon.method
  @impl.implemented
  Resume()
  {
    this.isPaused = false;
  }

  /**
   * Relinks to the current owner.
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
   * Gets the timeline entry parallel to the action at an index, or null when the
   * lists are not the same length.
   */
  _entryAt(index)
  {
    return this.entries[index] ?? null;
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
