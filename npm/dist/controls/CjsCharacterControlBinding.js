import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsCharacterControlState as _CjsCharacterControlS } from './CjsCharacterControlState.js';

/** Stateful full-snapshot binding from neutral character controls to a structural sink. */
class CjsCharacterControlBinding {
  #activePose = "";
  #boneOffsets = new Map();
  #morphs = new Map();
  #parameters = new Map();
  #sink;
  constructor(sink) {
    if (!sink || typeof sink !== "object" && typeof sink !== "function") {
      throw new TypeError("Character control binding requires a sink object");
    }
    this.#sink = sink;
  }

  /** Applies a complete desired snapshot and resets controls omitted since the prior call. */
  Apply(state) {
    const next = PrepareState(state);
    this.#ValidateCapabilities(next);
    let changed = false;
    changed = this.#ApplyScalarChannel("Morph", this.#morphs, next.morphs) || changed;
    changed = this.#ApplyScalarChannel("Parameter", this.#parameters, next.parameters) || changed;
    changed = this.#ApplyBoneOffsets(next.boneOffsets) || changed;
    changed = this.#ApplyPose(next.activePose) || changed;
    return changed;
  }

  /** Resets every override successfully applied by this binding. */
  Reset() {
    this.#ValidateCapabilities({
      morphs: new Map(),
      parameters: new Map(),
      boneOffsets: new Map(),
      activePose: ""
    });
    let changed = false;
    changed = this.#ResetScalarChannel("Morph", this.#morphs) || changed;
    changed = this.#ResetScalarChannel("Parameter", this.#parameters) || changed;
    changed = this.#ResetBoneOffsets() || changed;
    if (this.#activePose) {
      const name = this.#activePose;
      this.#sink.ResetActivePose(name);
      this.#activePose = "";
      changed = true;
    }
    return changed;
  }
  #ApplyScalarChannel(channel, current, next) {
    if (current.size === 0 && next.size === 0) {
      return false;
    }
    let changed = this.#ResetRemoved(channel, current, next);
    const set = this.#sink[`Set${channel}`].bind(this.#sink);
    for (const [name, value] of next) {
      if (Object.is(current.get(name), value)) {
        continue;
      }
      set(name, value);
      current.set(name, value);
      changed = true;
    }
    return changed;
  }
  #ApplyBoneOffsets(next) {
    if (this.#boneOffsets.size === 0 && next.size === 0) {
      return false;
    }
    let changed = this.#ResetRemoved("BoneOffset", this.#boneOffsets, next);
    const set = this.#sink.SetBoneOffset.bind(this.#sink);
    for (const [name, value] of next) {
      const current = this.#boneOffsets.get(name);
      if (current && VectorEquals(current, value)) {
        continue;
      }
      set(name, vec3.clone(value));
      this.#boneOffsets.set(name, vec3.clone(value));
      changed = true;
    }
    return changed;
  }
  #ApplyPose(next) {
    if (next === this.#activePose) {
      return false;
    }
    if (this.#activePose) {
      const previous = this.#activePose;
      this.#sink.ResetActivePose(previous);
      this.#activePose = "";
    }
    if (next) {
      this.#sink.SetActivePose(next);
      this.#activePose = next;
    }
    return true;
  }
  #ResetBoneOffsets() {
    return this.#ResetScalarChannel("BoneOffset", this.#boneOffsets);
  }
  #ResetRemoved(channel, current, next) {
    const reset = this.#sink[`Reset${channel}`].bind(this.#sink);
    let changed = false;
    for (const name of [...current.keys()].filter(value => !next.has(value)).sort(Compare)) {
      reset(name);
      current.delete(name);
      changed = true;
    }
    return changed;
  }
  #ResetScalarChannel(channel, current) {
    if (current.size === 0) {
      return false;
    }
    const reset = this.#sink[`Reset${channel}`].bind(this.#sink);
    let changed = false;
    for (const name of [...current.keys()].sort(Compare)) {
      reset(name);
      current.delete(name);
      changed = true;
    }
    return changed;
  }
  #ValidateCapabilities(next) {
    ValidateChannel(this.#sink, "Morph", this.#morphs.size || next.morphs.size);
    ValidateChannel(this.#sink, "Parameter", this.#parameters.size || next.parameters.size);
    ValidateChannel(this.#sink, "BoneOffset", this.#boneOffsets.size || next.boneOffsets.size);
    ValidateChannel(this.#sink, "ActivePose", this.#activePose || next.activePose);
  }
}
function PrepareState(state) {
  if (!(state instanceof _CjsCharacterControlS)) {
    throw new TypeError("Character control binding requires a CjsCharacterControlState");
  }
  return {
    morphs: new Map(ReadScalarEntries(state.morphs, "morph")),
    parameters: new Map(ReadScalarEntries(state.parameters, "parameter")),
    boneOffsets: new Map(ReadVectorEntries(state.boneOffsets)),
    activePose: ValidatePose(state.activePose)
  };
}
function ReadEntries(value, channel) {
  const entries = value instanceof Map ? [...value.entries()] : value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : null;
  if (!entries) {
    throw new TypeError(`Character control ${channel}s must be a map or object`);
  }
  const names = new Set();
  return entries.map(([name, value]) => {
    const normalizedName = ValidateName(name, channel);
    if (names.has(normalizedName)) {
      throw new Error(`Character control ${channel}s contain duplicate name "${normalizedName}"`);
    }
    names.add(normalizedName);
    return [normalizedName, value];
  }).sort(([left], [right]) => Compare(left, right));
}
function ReadScalarEntries(value, channel) {
  return ReadEntries(value, channel).map(([name, value]) => {
    const result = Number(value);
    if (!Number.isFinite(result)) {
      throw new TypeError(`Character control ${channel} "${name}" must be finite`);
    }
    return [name, result];
  });
}
function ReadVectorEntries(value) {
  return ReadEntries(value, "bone offset").map(([name, value]) => {
    if (!value || value.length !== 3) {
      throw new TypeError(`Character control bone offset "${name}" must contain three components`);
    }
    const result = vec3.fromValues(Number(value[0]), Number(value[1]), Number(value[2]));
    if (!VectorIsFinite(result)) {
      throw new TypeError(`Character control bone offset "${name}" must be finite`);
    }
    return [name, result];
  });
}
function ValidateChannel(sink, channel, used) {
  if (!used) {
    return;
  }
  const setter = `Set${channel}`;
  const resetter = `Reset${channel}`;
  if (typeof sink[setter] !== "function" || typeof sink[resetter] !== "function") {
    throw new TypeError(`Character control sink requires paired ${setter} and ${resetter} methods`);
  }
}
function ValidateName(value, channel) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`Character control ${channel} name must be a non-empty string`);
  }
  return value.trim();
}
function ValidatePose(value) {
  if (typeof value !== "string") {
    throw new TypeError("Character control active pose must be a string");
  }
  return value;
}
function VectorEquals(left, right) {
  return Object.is(left[0], right[0]) && Object.is(left[1], right[1]) && Object.is(left[2], right[2]);
}
function VectorIsFinite(value) {
  return Number.isFinite(value[0]) && Number.isFinite(value[1]) && Number.isFinite(value[2]);
}
function Compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true
  });
}

export { CjsCharacterControlBinding };
//# sourceMappingURL=CjsCharacterControlBinding.js.map
