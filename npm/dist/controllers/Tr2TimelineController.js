import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { GetControllerFrameTimeSeconds, GetControllerActualTimeSeconds } from './contracts.js';
import { CjsEveThrottleableState } from '../eve/CjsEveThrottleableState.js';
import { Tr2TimelineEntry as _Tr2TimelineEntry } from './Tr2TimelineEntry.js';
import { UnlinkReason } from './enums.js';

let _initProto, _initClass, _init_actions, _init_extra_actions, _init_entries, _init_extra_entries, _init_name, _init_extra_name, _init_variables, _init_extra_variables, _init_eventHandlers, _init_extra_eventHandlers, _init_timeScale, _init_extra_timeScale, _init_isPlaying, _init_extra_isPlaying, _init_isPaused, _init_extra_isPaused;

/**
 * Plays a list of controller actions against a scrubbable timeline, starting and
 * stopping each action as the current time enters and leaves its authored
 * start/end range on an enabled track.
 */
let _Tr2TimelineControlle;
new class extends _identity {
  static [class Tr2TimelineController extends CjsModel {
    static {
      ({
        e: [_init_actions, _init_extra_actions, _init_entries, _init_extra_entries, _init_name, _init_extra_name, _init_variables, _init_extra_variables, _init_eventHandlers, _init_extra_eventHandlers, _init_timeScale, _init_extra_timeScale, _init_isPlaying, _init_extra_isPlaying, _init_isPaused, _init_extra_isPaused, _initProto],
        c: [_Tr2TimelineControlle, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2TimelineController",
        family: "controllers"
      })], [[[io, io.persistOnly, void 0, type.list("ITr2ControllerAction")], 16, "actions"], [[io, io.persistOnly, void 0, type.list("Tr2TimelineEntry")], 16, "entries"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("Tr2ControllerFloatVariable")], 16, "variables"], [[io, io.persist, void 0, type.list("Tr2ControllerEventHandler")], 16, "eventHandlers"], [[io, io.persist, type, type.float32], 16, "timeScale"], [[io, io.read, type, type.boolean], 16, "isPlaying"], [[io, io.read, type, type.boolean], 16, "isPaused"], [[carbon, carbon.method, impl, impl.adapted], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsLinked"], [[carbon, carbon.method, impl, impl.adapted], 18, "Start"], [[carbon, carbon.method, impl, impl.adapted], 18, "Stop"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetOwner"], [[carbon, carbon.method, impl, impl.adapted], 18, "Callback"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterUpdateable"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterUpdateable"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBindingPathRoots"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFloatVariableByName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetExpressionTermInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVariableView"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVariableBuffer"], [[carbon, carbon.method, impl, impl.implemented], 18, "EnsureTempArenaSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTempArena"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnSimClockRebase"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActionCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetAction"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActionStartTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActionEndTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetActionTrackID"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetActionStartTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetActionEndTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetActionTrackID"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddAction"], [[carbon, carbon.method, impl, impl.adapted], 18, "RemoveAction"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsActionEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsTrackEnabled"], [[carbon, carbon.method, impl, impl.adapted], 18, "EnableTrack"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearCallbacks"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTime"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetTime"], [[carbon, carbon.method, impl, impl.implemented], 18, "Pause"], [[carbon, carbon.method, impl, impl.implemented], 18, "Resume"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReLink"]], 0, void 0, CjsModel));
    }
    actions = (_initProto(this), _init_actions(this, []));
    entries = (_init_extra_actions(this), _init_entries(this, []));
    name = (_init_extra_entries(this), _init_name(this, ""));
    variables = (_init_extra_name(this), _init_variables(this, []));
    eventHandlers = (_init_extra_variables(this), _init_eventHandlers(this, []));
    timeScale = (_init_extra_eventHandlers(this), _init_timeScale(this, 1));
    isPlaying = (_init_extra_timeScale(this), _init_isPlaying(this, false));
    isPaused = (_init_extra_isPlaying(this), _init_isPaused(this, false));
    currentUpdateFrequency = (_init_extra_isPaused(this), 10);
    updateThrottle = true;
    maxUpdateFrequency = 20;
    minUpdateFrequency = 2;
    #throttle = new CjsEveThrottleableState();
    #owner = null;
    #time = 0;
    #lastUpdateTime = 0;
    #callbacks = [];
    #updateables = new Set();
    #disabledTracks = new Set();
    #variableView = [];
    #variableData = new Float32Array(0);
    #tempArena = new ArrayBuffer(0);
    #bindingPathRoots = [];

    /**
     * Links actions, variables, and event handlers to an owner.
     */
    Link(owner) {
      this.Unlink();
      this.#owner = owner;
      this.#variableView = [];
      this.#variableData = new Float32Array(this.variables.length);
      for (let i = 0; i < this.variables.length; i++) {
        const variable = this.variables[i];
        this.#variableView.push({
          name: variable.GetName(),
          index: i,
          offset: i * Float32Array.BYTES_PER_ELEMENT
        });
        variable.SetDestinationBuffer(this.#variableData, i);
        variable.SetDirtyMask(null, 0);
      }
      for (const action of this.actions) {
        action.Link?.(this);
      }
      for (const handler of this.eventHandlers) {
        handler.Link(this);
      }
    }

    /**
     * Unlinks runtime children and clears owner state.
     */
    Unlink(reason = UnlinkReason.UNLINKING) {
      if (!this.#owner) {
        return;
      }
      if (reason !== UnlinkReason.DELETING) {
        this.Stop();
      }
      for (const variable of this.variables) {
        variable.SetDestinationBuffer(null);
        variable.SetDirtyMask(null, 0);
      }
      for (const action of this.actions) {
        action.Unlink?.();
      }
      for (const handler of this.eventHandlers) {
        handler.Unlink();
      }
      this.#bindingPathRoots = [];
      this.#owner = null;
    }

    /**
     * Checks whether this timeline is linked.
     */
    IsLinked() {
      return this.#owner !== null;
    }

    /**
     * Starts actions already active at the current time.
     */
    Start() {
      if (this.isPlaying) {
        this.Stop();
      }
      this.isPlaying = true;
      this.#lastUpdateTime = GetControllerFrameTimeSeconds();
      for (let i = 0; i < this.actions.length; i++) {
        const entry = this.#entryAt(i);
        if (entry && this.IsActionEnabled(i) && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
          this.actions[i].Start?.(this);
        }
      }
    }

    /**
     * Stops currently active actions and resets timeline time.
     */
    Stop() {
      if (!this.isPlaying) {
        return;
      }
      for (let i = 0; i < this.actions.length; i++) {
        const entry = this.#entryAt(i);
        if (entry && this.IsActionEnabled(i) && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
          this.actions[i].Stop?.(this);
        }
      }
      this.isPlaying = false;
      this.#time = 0;
    }

    /**
     * Advances the timeline and toggles action activity.
     */
    Update(normalizedUpdateFrequency = 0.5) {
      if (!this.isPlaying) {
        return;
      }
      const actualTime = GetControllerActualTimeSeconds();
      if (this.#throttle.ShouldSkipUpdate(this, normalizedUpdateFrequency, actualTime)) {
        return;
      }
      const frameTime = GetControllerFrameTimeSeconds();
      const dt = (frameTime - this.#lastUpdateTime) * this.timeScale;
      this.#lastUpdateTime = frameTime;
      if (!this.isPaused) {
        this.#setTime(this.#time + dt, true);
      }
      for (const updateable of this.#updateables) {
        updateable.Update?.(actualTime, frameTime);
      }
    }

    /**
     * Sets a named variable.
     */
    SetVariable(name, value) {
      this.variables.find(variable => variable.GetName() === name)?.SetValue(value);
    }

    /**
     * Handles a named event.
     */
    HandleEvent(eventName) {
      if (!this.isPlaying) {
        return;
      }
      for (const handler of this.eventHandlers) {
        if (handler.GetName() === eventName) {
          handler.Execute(this);
        }
      }
    }

    /**
     * Gets the linked owner.
     */
    GetOwner() {
      return this.#owner;
    }

    /**
     * Invokes callbacks registered for a name.
     */
    Callback(callbackName) {
      if (!this.isPlaying) {
        return false;
      }
      let called = false;
      for (const entry of this.#callbacks) {
        if (entry.name === callbackName) {
          entry.callback();
          called = true;
        }
      }
      return called;
    }

    /**
     * Registers an updateable object.
     */
    RegisterUpdateable(updateable) {
      this.#updateables.add(updateable);
    }

    /**
     * Unregisters an updateable object.
     */
    UnRegisterUpdateable(updateable) {
      this.#updateables.delete(updateable);
    }

    /**
     * Gets named roots for controller binding paths.
     */
    GetBindingPathRoots() {
      if (!this.#bindingPathRoots.length) {
        if (this.#owner) {
          this.#bindingPathRoots.push(["Owner", this.#owner]);
        }
        for (const variable of this.variables) {
          this.#bindingPathRoots.push([variable.GetName(), variable]);
        }
      }
      return this.#bindingPathRoots;
    }

    /**
     * Gets a float variable by name.
     */
    GetFloatVariableByName(name) {
      return this.variables.find(variable => variable.GetName() === name)?.GetValue();
    }

    /**
     * Appends expression metadata for variables.
     */
    GetExpressionTermInfo(out) {
      for (const variable of this.variables) {
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
    GetVariableView() {
      return this.#variableView;
    }

    /**
     * Gets expression variable data.
     */
    GetVariableBuffer() {
      return this.#variableData;
    }

    /**
     * Ensures the expression temporary arena is large enough.
     */
    EnsureTempArenaSize(size) {
      if (this.#tempArena.byteLength < size) {
        this.#tempArena = new ArrayBuffer(size);
      }
    }

    /**
     * Gets the expression temporary arena.
     */
    GetTempArena() {
      return this.#tempArena;
    }

    /**
     * Rebases action sim time.
     */
    OnSimClockRebase(oldTime, newTime) {
      const diff = newTime - oldTime;
      this.#lastUpdateTime += diff;
      for (const action of this.actions) {
        action.RebaseSimTime?.(diff);
      }
    }

    /**
     * Gets action count.
     */
    GetActionCount() {
      return this.actions.length;
    }

    /**
     * Gets an action by index.
     */
    GetAction(index) {
      return this.actions[index] ?? null;
    }

    /**
     * Gets the timeline start time in seconds of the action at an index, or 0 when
     * the index has no entry.
     */
    GetActionStartTime(index) {
      return this.#entryAt(index)?.startTime ?? 0;
    }

    /**
     * Gets the timeline end time in seconds of the action at an index, or 0 when
     * the index has no entry.
     */
    GetActionEndTime(index) {
      return this.#entryAt(index)?.endTime ?? 0;
    }

    /**
     * Gets the track the action at an index belongs to, or 0 when the index has no
     * entry.
     */
    GetActionTrackID(index) {
      return this.#entryAt(index)?.trackID ?? 0;
    }

    /**
     * Moves an action's start time, starting or stopping the action immediately
     * when the edit changes whether it covers the current time; returns false for
     * an out-of-range index.
     */
    SetActionStartTime(index, startTime) {
      if (index < 0 || index >= this.actions.length) {
        return false;
      }
      const entry = this.#entryAt(index);
      if (!entry) {
        return false;
      }
      if (this.isPlaying && this.IsActionEnabled(index)) {
        const wasActive = _Tr2TimelineControlle.#inRange(this.#time, entry);
        const isActive = _Tr2TimelineControlle.#inRange(this.#time, {
          startTime,
          endTime: entry.endTime
        });
        if (wasActive && !isActive) {
          this.actions[index].Stop?.(this);
        } else if (!wasActive && isActive) {
          this.actions[index].Start?.(this);
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
    SetActionEndTime(index, endTime) {
      if (index < 0 || index >= this.actions.length) {
        return false;
      }
      const entry = this.#entryAt(index);
      if (!entry) {
        return false;
      }
      if (this.isPlaying && this.IsActionEnabled(index)) {
        const wasActive = _Tr2TimelineControlle.#inRange(this.#time, entry);
        const isActive = _Tr2TimelineControlle.#inRange(this.#time, {
          startTime: entry.startTime,
          endTime
        });
        if (wasActive && !isActive) {
          this.actions[index].Stop?.(this);
        } else if (!wasActive && isActive) {
          this.actions[index].Start?.(this);
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
    SetActionTrackID(index, trackID) {
      if (index < 0 || index >= this.actions.length) {
        return false;
      }
      const wasEnabled = this.IsActionEnabled(index);
      const entry = this.#entryAt(index);
      if (!entry) {
        return false;
      }
      entry.trackID = trackID;
      const isEnabled = this.IsActionEnabled(index);
      if (this.isPlaying && wasEnabled !== isEnabled && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
        if (isEnabled) {
          this.actions[index].Start?.(this);
        } else {
          this.actions[index].Stop?.(this);
        }
      }
      return true;
    }

    /**
     * Adds an action and entry.
     */
    AddAction(action, startTime, endTime, trackID = 0) {
      if (!action) {
        return;
      }
      this.actions.push(action);
      const entry = new _Tr2TimelineEntry();
      entry.startTime = startTime;
      entry.endTime = endTime;
      entry.trackID = trackID;
      this.entries.push(entry);
      if (this.#owner) {
        action.Link?.(this);
      }
      if (this.isPlaying && this.IsActionEnabled(this.actions.length - 1) && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
        action.Start?.(this);
      }
    }

    /**
     * Removes an action by index.
     */
    RemoveAction(index) {
      if (index < 0 || index >= this.actions.length) {
        return false;
      }
      const action = this.actions[index];
      const entry = this.#entryAt(index);
      if (entry && this.isPlaying && this.IsActionEnabled(index) && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
        action.Stop?.(this);
      }
      if (this.#owner) {
        action.Unlink?.();
      }
      this.actions.splice(index, 1);
      this.entries.splice(index, 1);
      return true;
    }

    /**
     * Checks whether the action's track is enabled.
     */
    IsActionEnabled(index) {
      const entry = this.#entryAt(index);
      return !!entry && !this.#disabledTracks.has(entry.trackID);
    }

    /**
     * Checks whether a track is enabled.
     */
    IsTrackEnabled(trackID) {
      return !this.#disabledTracks.has(trackID);
    }

    /**
     * Enables or disables a track.
     */
    EnableTrack(trackID, enable) {
      const wasEnabled = this.IsTrackEnabled(trackID);
      if (enable) {
        this.#disabledTracks.delete(trackID);
      } else {
        this.#disabledTracks.add(trackID);
      }
      if (this.isPlaying && wasEnabled !== enable) {
        for (let i = 0; i < this.actions.length; i++) {
          const entry = this.#entryAt(i);
          if (entry && entry.trackID === trackID && _Tr2TimelineControlle.#inRange(this.#time, entry)) {
            if (enable) {
              this.actions[i].Start?.(this);
            } else {
              this.actions[i].Stop?.(this);
            }
          }
        }
      }
    }

    /**
     * Registers a callback.
     */
    RegisterCallback(name, callback) {
      this.#callbacks.push({
        name,
        callback
      });
    }

    /**
     * Clears callbacks.
     */
    ClearCallbacks() {
      this.#callbacks = [];
    }

    /**
     * Gets current timeline time.
     */
    GetTime() {
      return this.#time;
    }

    /**
     * Gets the current frame simulation time for JS action adapters.
     */
    CjsGetCurrentFrameTime() {
      return this.#lastUpdateTime || GetControllerFrameTimeSeconds();
    }

    /**
     * Sets current timeline time and toggles action activity.
     */
    SetTime(time) {
      if (!this.isPlaying || time === this.#time) {
        return;
      }
      this.#setTime(time, false);
    }

    /**
     * Sets the current time and reconciles every enabled action against the new
     * time; when includePassedActions is set, an action whose whole range was
     * skipped over in one step is started and stopped back to back so it is not
     * silently missed.
     */
    #setTime(time, includePassedActions) {
      const oldTime = this.#time;
      this.#time = time;
      for (let i = 0; i < this.actions.length; i++) {
        if (!this.IsActionEnabled(i)) {
          continue;
        }
        const entry = this.#entryAt(i);
        if (!entry) {
          continue;
        }
        const wasActive = _Tr2TimelineControlle.#inRange(oldTime, entry);
        const isActive = _Tr2TimelineControlle.#inRange(this.#time, entry);
        if (wasActive && !isActive) {
          this.actions[i].Stop?.(this);
        } else if (!wasActive && isActive) {
          this.actions[i].Start?.(this);
        } else if (includePassedActions && _Tr2TimelineControlle.#crossedRange(oldTime, this.#time, entry)) {
          this.actions[i].Start?.(this);
          this.actions[i].Stop?.(this);
        }
      }
    }

    /**
     * Pauses time progression.
     */
    Pause() {
      this.isPaused = true;
    }

    /**
     * Resumes time progression.
     */
    Resume() {
      this.isPaused = false;
    }

    /**
     * Relinks to the current owner.
     */
    ReLink() {
      const owner = this.#owner;
      if (owner) {
        this.Link(owner);
      }
    }

    /**
     * Gets the timeline entry parallel to the action at an index, or null when the
     * lists are not the same length.
     */
    #entryAt(index) {
      return this.entries[index] ?? null;
    }

    /**
     * Checks whether a time falls in an entry's range; the start is inclusive and
     * the end exclusive.
     */

    /**
     * Checks whether an entry's whole range fell inside a single update step,
     * meaning the action was never observed active.
     */
  }];
  #inRange(time, entry) {
    return time >= entry.startTime && time < entry.endTime;
  }
  #crossedRange(oldTime, newTime, entry) {
    const updateRange = {
      startTime: oldTime,
      endTime: newTime
    };
    return _Tr2TimelineControlle.#inRange(entry.startTime, updateRange) && _Tr2TimelineControlle.#inRange(entry.endTime, updateRange);
  }
  constructor() {
    super(_Tr2TimelineControlle), _initClass();
  }
}();

export { _Tr2TimelineControlle as Tr2TimelineController };
//# sourceMappingURL=Tr2TimelineController.js.map
