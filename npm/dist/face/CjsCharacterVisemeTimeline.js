import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/runtime-utils/schema';
import { CjsCharacterNode as _CjsCharacterNode } from '../CjsCharacterNode.js';
import { CjsCharacterVisemeFrame as _CjsCharacterVisemeFr } from './CjsCharacterVisemeFrame.js';
import { CjsCharacterVisemeSet as _CjsCharacterVisemeSe } from './CjsCharacterVisemeSet.js';

let _initClass, _init_id, _init_extra_id, _init_duration, _init_extra_duration, _init_loop, _init_extra_loop, _init_frames, _init_extra_frames;
let _CjsCharacterVisemeTi;
new class extends _identity {
  static [class CjsCharacterVisemeTimeline extends _CjsCharacterNode {
    static {
      ({
        e: [_init_id, _init_extra_id, _init_duration, _init_extra_duration, _init_loop, _init_extra_loop, _init_frames, _init_extra_frames],
        c: [_CjsCharacterVisemeTi, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "CjsCharacterVisemeTimeline",
        family: "character"
      })], [[[type, type.string, io, io.persist], 16, "id"], [[type, type.float32, io, io.persist], 16, "duration"], [[type, type.boolean, io, io.persist], 16, "loop"], [[void 0, type.list("CjsCharacterVisemeFrame"), io, io.persist], 16, "frames"]], 0, void 0, _CjsCharacterNode));
    }
    constructor(...args) {
      super(...args);
      _init_extra_frames(this);
    }
    id = _init_id(this, "");
    duration = (_init_extra_id(this), _init_duration(this, 0));
    loop = (_init_extra_duration(this), _init_loop(this, false));
    frames = (_init_extra_loop(this), _init_frames(this, []));

    /** Hydrates and validates a detached timeline. */
    static prepare(value, visemeSet = null) {
      const result = _CjsCharacterVisemeTi.from(value instanceof _CjsCharacterVisemeTi ? value.GetValues() : value || {});
      return _CjsCharacterVisemeTi.validate(result, visemeSet);
    }

    /** Validates one hydrated timeline without clamping or renaming controls. */
    static validate(result, visemeSet = null) {
      if (!(result instanceof _CjsCharacterVisemeTi)) {
        throw new TypeError("Character viseme timeline validation requires a CjsCharacterVisemeTimeline");
      }
      const duration = Number(result.duration);
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("Character viseme timeline duration must be finite and non-negative");
      }
      if (result.loop && duration <= 0) {
        throw new RangeError("A looping character viseme timeline requires a positive duration");
      }
      let previousTime = -Infinity;
      for (let i = 0; i < result.frames.length; i++) {
        const frame = result.frames[i];
        if (!(frame instanceof _CjsCharacterVisemeFr)) {
          throw new TypeError(`Character viseme timeline frame ${i} was not hydrated`);
        }
        const time = Number(frame.time);
        if (!Number.isFinite(time) || time < 0 || time > duration) {
          throw new RangeError(`Character viseme timeline frame ${i} is outside its duration`);
        }
        if (time <= previousTime) {
          throw new RangeError("Character viseme timeline frame times must be strictly increasing");
        }
        const weights = _CjsCharacterVisemeTi.#prepareWeights(frame.weights);
        if (visemeSet) {
          _CjsCharacterVisemeSe.validateWeights(visemeSet, weights);
        }
        frame.time = time;
        frame.weights = weights;
        previousTime = time;
      }
      result.duration = duration;
      return result;
    }

    /** Samples detached linearly interpolated weights at one timeline time. */
    static sample(value, time, {
      loop = null
    } = {}) {
      const timeline = value instanceof _CjsCharacterVisemeTi ? _CjsCharacterVisemeTi.validate(value) : _CjsCharacterVisemeTi.prepare(value);
      const frames = timeline.frames;
      const requestedTime = Number(time);
      if (!Number.isFinite(requestedTime)) {
        throw new TypeError("Character viseme sample time must be finite");
      }
      if (frames.length === 0) return new Map();
      const shouldLoop = loop === null ? timeline.loop : !!loop;
      let localTime = requestedTime;
      if (shouldLoop) {
        if (timeline.duration <= 0) {
          throw new RangeError("A looping character viseme sample requires a positive duration");
        }
        localTime = (localTime % timeline.duration + timeline.duration) % timeline.duration;
      } else {
        localTime = Math.max(0, Math.min(timeline.duration, localTime));
      }
      if (localTime <= frames[0].time) return new Map(frames[0].weights);
      const last = frames[frames.length - 1];
      if (localTime >= last.time) return new Map(last.weights);
      let rightIndex = 1;
      while (rightIndex < frames.length && frames[rightIndex].time < localTime) rightIndex++;
      const left = frames[rightIndex - 1];
      const right = frames[rightIndex];
      const span = right.time - left.time;
      const amount = span > 0 ? (localTime - left.time) / span : 0;
      return _CjsCharacterVisemeTi.#interpolateWeights(left.weights, right.weights, amount);
    }

    /** Samples a timeline and creates a normal character-control layer. */
    static createControlLayer(value, visemeSet, time, options = {}) {
      const timeline = value instanceof _CjsCharacterVisemeTi ? _CjsCharacterVisemeTi.validate(value, visemeSet) : _CjsCharacterVisemeTi.prepare(value, visemeSet);
      return _CjsCharacterVisemeSe.createControlLayer(visemeSet, _CjsCharacterVisemeTi.sample(timeline, time), options);
    }

    /**
     * Converts frame weights to a validated map while preserving exact viseme
     * IDs.
     */

    /** Linearly blends the union of two weight maps and omits zero results. */
  }];
  #prepareWeights(value) {
    const entries = value instanceof Map ? value.entries() : value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : null;
    if (!entries) {
      throw new TypeError("Character viseme frame weights must be a map or object");
    }
    const result = new Map();
    for (const [rawName, rawWeight] of entries) {
      const name = _CjsCharacterVisemeSe.normalizeID(rawName);
      const weight = Number(rawWeight);
      if (!Number.isFinite(weight)) {
        throw new TypeError(`Character viseme frame weight "${name}" must be finite`);
      }
      if (result.has(name)) {
        throw new Error(`Character viseme frame contains duplicate id "${name}"`);
      }
      result.set(name, weight);
    }
    return result;
  }
  #interpolateWeights(left, right, amount) {
    const result = new Map();
    const names = new Set([...left.keys(), ...right.keys()]);
    for (const name of names) {
      const a = left.get(name) ?? 0;
      const b = right.get(name) ?? 0;
      const weight = a + (b - a) * amount;
      if (weight !== 0) result.set(name, weight);
    }
    return result;
  }
  constructor() {
    super(_CjsCharacterVisemeTi), _initClass();
  }
}();

export { _CjsCharacterVisemeTi as CjsCharacterVisemeTimeline };
//# sourceMappingURL=CjsCharacterVisemeTimeline.js.map
