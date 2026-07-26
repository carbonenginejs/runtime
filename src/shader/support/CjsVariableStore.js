/**
 * A named-variable table that TriVariableParameter values resolve against, plus
 * the lazily created process-wide global instance effects fall back to.
 */
export class CjsVariableStore
{

  static #global = null;

  #variables = new Map();

  /**
   * Creates an empty store, optionally seeded.
   * @param values optional name-to-value Map or object routed through SetValues
   */
  constructor(values = null)
  {
    if (values)
    {
      this.SetValues(values);
    }
  }

  /** Short alias for SetVariable. */
  Set(name, value, Type = null)
  {
    return this.SetVariable(name, value, Type);
  }

  /** Short alias for GetVariable - returns the variable object, not its value. */
  Get(name)
  {
    return this.GetVariable(name);
  }

  /** Short alias for HasVariable. */
  Has(name)
  {
    return this.HasVariable(name);
  }

  /**
   * Seeds many variables at once from a Map or plain object; returns this store
   * for chaining.
   */
  SetValues(values)
  {
    const entries = values instanceof Map ? values.entries() : Object.entries(values);
    for (const [name, value] of entries)
    {
      this.SetVariable(name, value);
    }
    return this;
  }

  /**
   * Stores a value under a name, wrapping raw values in a CjsStoredVariable and
   * naming an unnamed variable object after its key. Values that already
   * implement the variable protocol are stored by reference, not copied.
   */
  SetVariable(name, value, Type = null)
  {
    const key = String(name);
    const variable = CjsVariableStore.isVariable(value) ? value : this.CreateVariable(key, value, Type);
    if (variable && typeof variable === "object" && "name" in variable && !variable.name)
    {
      variable.name = key;
    }
    this.#variables.set(key, variable);
    return variable;
  }

  /**
   * Constructs the wrapper object for a name/value pair, using the supplied
   * constructor when one is given and CjsStoredVariable otherwise.
   */
  CreateVariable(name, value = undefined, Type = null)
  {
    if (typeof Type === "function")
    {
      return new Type(name, value);
    }
    return new CjsStoredVariable(name, value, Type);
  }

  /**
   * The stored variable object, or null; parameters hold on to this reference
   * until they re-Initialize.
   */
  GetVariable(name)
  {
    return this.#variables.get(String(name)) ?? null;
  }

  /**
   * camelCase alias for GetVariable, accepted because parameters probe both
   * spellings.
   */
  getVariable(name)
  {
    return this.GetVariable(name);
  }

  /** Whether a variable is stored under this name. */
  HasVariable(name)
  {
    return this.#variables.has(String(name));
  }

  /** camelCase alias for HasVariable. */
  hasVariable(name)
  {
    return this.HasVariable(name);
  }

  /**
   * Removes the named variable; returns whether it was present. Parameters
   * already holding the variable keep working until they re-Initialize.
   */
  DeleteVariable(name)
  {
    return this.#variables.delete(String(name));
  }

  /**
   * Empties the table; parameters already holding a variable reference keep it
   * until they re-Initialize.
   */
  Clear()
  {
    this.#variables.clear();
  }

  /**
   * The variable's current value, or undefined when the name is unknown.
   * @param out optional array the variable may fill in instead of returning its own storage
   */
  GetVariableValue(name, out = undefined)
  {
    const variable = this.GetVariable(name);
    return variable?.GetValue?.(out) ?? variable?.getValue?.(out) ?? variable?.value ?? undefined;
  }

  /** camelCase alias for GetVariableValue. */
  getVariableValue(name, out = undefined)
  {
    return this.GetVariableValue(name, out);
  }

  /**
   * Writes a value through the named variable, creating the variable when absent
   * and assigning `.value` directly for holders with no setter; returns the
   * variable.
   */
  SetVariableValue(name, value, options = undefined)
  {
    const variable = this.GetVariable(name) ?? this.SetVariable(name, value);
    variable?.SetValue?.(value, options) ?? variable?.setValue?.(value, options);
    if (variable && typeof variable === "object" && !variable.SetValue && !variable.setValue)
    {
      variable.value = value;
    }
    return variable;
  }

  /** camelCase alias for SetVariableValue. */
  setVariableValue(name, value, options = undefined)
  {
    return this.SetVariableValue(name, value, options);
  }

  /**
   * Snapshot array of [name, variable] pairs; mutating the array does not affect
   * the store.
   */
  Entries()
  {
    return [...this.#variables.entries()];
  }

  /**
   * Snapshot array of the stored variable objects; the objects themselves are
   * live references.
   */
  Values()
  {
    return [...this.#variables.values()];
  }

  /**
   * Whether a value already implements the variable protocol - any of GetValue,
   * SetValue, CopyValueToEffect, CopyToResourceSet or ApplyUav - and so should
   * be stored unwrapped.
   */
  static isVariable(value)
  {
    return !!value && typeof value === "object" && (typeof value.GetValue === "function" || typeof value.SetValue === "function" || typeof value.CopyValueToEffect === "function" || typeof value.CopyToResourceSet === "function" || typeof value.ApplyUav === "function");
  }

  /**
   * The process-wide fallback store, created on first use; effects with no store
   * of their own read through it.
   */
  static GetGlobalStore()
  {
    if (!CjsVariableStore.#global)
    {
      CjsVariableStore.#global = new CjsVariableStore();
    }
    return CjsVariableStore.#global;
  }

  /**
   * Replaces the global store, installing a fresh empty one when passed null;
   * existing effects see the swap because they resolve the global at call time
   * rather than capturing it.
   */
  static SetGlobalStore(store)
  {
    CjsVariableStore.#global = store ?? new CjsVariableStore();
    return CjsVariableStore.#global;
  }

}


/**
 * The default variable wrapper: a name, a value and an inferred type tag, able
 * to copy itself into an effect constant destination.
 */
export class CjsStoredVariable
{

  name = "";

  value = undefined;

  type = "value";

  /**
   * Creates a variable holding a raw value.
   * @param type overrides the type tag that would otherwise be inferred from the value
   */
  constructor(name = "", value = undefined, type = null)
  {
    this.name = String(name);
    this.value = value;
    this.type = type ?? CjsStoredVariable.inferType(value);
  }

  /**
   * The variable's name, which the store fills in from the key when it was
   * constructed without one.
   */
  GetName()
  {
    return this.name;
  }

  /**
   * The type tag TriVariableParameter uses to decide whether the name binds to a
   * shader constant or a shader resource.
   */
  GetType()
  {
    return this.type;
  }

  /**
   * Reads the value.
   * @param out optional array filled with min(out.length, value.length) components
   * @returns `out` when it was filled, otherwise the variable's own value by reference
   */
  GetValue(out = undefined)
  {
    if (out && this.value && typeof this.value.length === "number" && typeof out.length === "number")
    {
      const count = Math.min(out.length, this.value.length);
      for (let i = 0; i < count; i++)
      {
        out[i] = this.value[i];
      }
      return out;
    }
    return this.value;
  }

  /**
   * Replaces the value by reference and re-infers the type tag; always returns
   * true.
   */
  SetValue(value)
  {
    this.value = value;
    this.type = CjsStoredVariable.inferType(value);
    return true;
  }

  /**
   * Copies the value into an effect constant destination, clamped to the destination length, the source length and `size` bytes at four bytes per float; a scalar value writes one component.
   * @param size byte budget in the destination, not a component count
   * @returns {boolean} whether anything was written
   */
  CopyValueToEffect(_inputType, destination, size = Number.POSITIVE_INFINITY)
  {
    if (!destination || typeof destination.length !== "number")
    {
      return false;
    }
    const source = this.value;
    if (typeof source === "number")
    {
      destination[0] = source;
      return true;
    }
    if (!source || typeof source.length !== "number")
    {
      return false;
    }
    const byteLimit = Number.isFinite(size) ? Math.max(0, size) : Infinity;
    const count = Math.min(destination.length, source.length, Math.floor(byteLimit / 4));
    for (let i = 0; i < count; i++)
    {
      destination[i] = source[i];
    }
    return count > 0;
  }

  /**
   * Derives a type tag from a raw value: numbers are float, strings texture,
   * 16-length array-likes matrix4, other array-likes vectorN, everything else
   * value.
   */
  static inferType(value)
  {
    if (typeof value === "number")
    {
      return "float";
    }
    if (typeof value === "string")
    {
      return "texture";
    }
    if (value && typeof value.length === "number")
    {
      return value.length === 16 ? "matrix4" : `vector${value.length}`;
    }
    return "value";
  }

}
