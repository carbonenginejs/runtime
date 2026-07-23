/** Structural morph-control sink that restores each target's captured authored weights. */
class CjsCharacterMorphTargetSink {
  #baselines = new Map();
  #targets;
  constructor(targets) {
    const values = Array.isArray(targets) ? targets : [targets];
    if (!values.length) {
      throw new TypeError("Character morph target sink requires at least one target");
    }
    this.#targets = [...new Set(values)].map((target, index) => {
      if (!target || typeof target !== "object") {
        throw new TypeError(`Character morph target ${index} must be an object`);
      }
      for (const method of ["GetMorphTargetNames", "GetMorphTargetWeight", "SetMorphTargetWeight"]) {
        if (typeof target[method] !== "function") {
          throw new TypeError(`Character morph target ${index} requires ${method}`);
        }
      }
      return target;
    });
  }

  /** Sets an exact named morph on every target that exposes it. */
  SetMorph(name, value) {
    const key = ValidateName(name);
    const weight = Number(value);
    if (!Number.isFinite(weight)) {
      throw new TypeError(`Character morph target "${key}" weight must be finite`);
    }
    const targets = this.#FindTargets(key);
    if (!targets.length) {
      throw new RangeError(`Character morph target "${key}" is unavailable`);
    }
    const previous = this.#baselines.get(key);
    const baselines = new Map(previous || []);
    for (const target of targets) {
      if (baselines.has(target)) {
        continue;
      }
      const baseline = Number(target.GetMorphTargetWeight(key));
      if (!Number.isFinite(baseline)) {
        throw new TypeError(`Character morph target "${key}" baseline must be finite`);
      }
      baselines.set(target, baseline);
    }
    const applied = [];
    try {
      for (const target of targets) {
        const result = target.SetMorphTargetWeight(key, weight);
        if (result === false) {
          throw new Error(`Character morph target "${key}" rejected its weight`);
        }
        applied.push(target);
      }
    } catch (error) {
      const rollbackErrors = [];
      for (const target of applied.reverse()) {
        try {
          target.SetMorphTargetWeight(key, baselines.get(target));
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length) {
        this.#baselines.set(key, baselines);
        throw new AggregateError([error, ...rollbackErrors], `Character morph target "${key}" failed and could not be fully restored`);
      }
      throw error;
    }
    this.#baselines.set(key, baselines);
  }

  /** Restores every target captured when an exact named morph was first set. */
  ResetMorph(name) {
    const key = ValidateName(name);
    const baselines = this.#baselines.get(key);
    if (!baselines) {
      return false;
    }
    const errors = [];
    for (const [target, value] of baselines) {
      try {
        const result = target.SetMorphTargetWeight(key, value);
        if (result === false) {
          throw new Error(`Character morph target "${key}" rejected its baseline`);
        }
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      throw new AggregateError(errors, `Character morph target "${key}" could not be fully reset`);
    }
    this.#baselines.delete(key);
    return true;
  }

  /** Restores every morph override owned by this sink. */
  Reset() {
    let changed = false;
    for (const name of [...this.#baselines.keys()].sort(Compare)) {
      changed = this.ResetMorph(name) || changed;
    }
    return changed;
  }
  #FindTargets(name) {
    return this.#targets.filter((target, index) => {
      const names = target.GetMorphTargetNames();
      if (!Array.isArray(names)) {
        throw new TypeError(`Character morph target ${index} names must be an array`);
      }
      const matches = names.filter(value => value === name).length;
      if (matches > 1) {
        throw new Error(`Character morph target ${index} contains duplicate name "${name}"`);
      }
      return matches === 1;
    });
  }
}
function ValidateName(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Character morph target name must be a non-empty string");
  }
  return value.trim();
}
function Compare(left, right) {
  return String(left).localeCompare(String(right), "en", {
    numeric: true
  });
}

export { CjsCharacterMorphTargetSink };
//# sourceMappingURL=CjsCharacterMorphTargetSink.js.map
