// Source: trinity/trinity/Tr2VariableStore.h
// Source: trinity/trinity/Tr2VariableStore.cpp
// Source: trinity/trinity/Tr2VariableStore_Blue.cpp
import { meta } from "#schema";
import { TriVariable } from "./TriVariable.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";


/**
 * Named-variable collection used by the shader system for binding. All
 * stores form an acyclic graph whose root is the global store: new stores
 * parent to it by default, and lookups walk the parent chain.
 * The native TRINITYDEV cycle assertion remains unported; callers must keep
 * the parent graph acyclic. JavaScript registrations return TriVariable
 * handles rather than Python-unwrapped values and retain the existing value
 * classifier; the native raw-AL-texture overload is not added by this pass.
 */
@meta.define({
  className: "Tr2VariableStore",
  family: "trinityCore"
})
export class Tr2VariableStore
{
  /**
   * Native parent pointer backing the live parentStore property; not persisted.
   * @type {Tr2VariableStore|null}
   */
  parentVariableStore = null;

  /**
   * Native local variable map; runtime state is not persisted by Blue.
   * @type {Map<string, TriVariable>}
   */
  _variables = new Map();

  /**
   * Native live parent property; uses the existing root-protection setter.
   * @returns {Tr2VariableStore|null} Parent searched after local lookup.
   */
  @meta.property()
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2VariableStore")
  @meta.implemented
  get parentStore()
  {
    return this.GetParentVariableStore();
  }

  /**
   * Assigns the native live parent property through the root-protection rule.
   * @param {Tr2VariableStore|null} value New parent store.
   * @returns {void}
   */
  @meta.implemented
  set parentStore(value)
  {
    this.SetParentVariableStore(value);
  }

  /**
   * Parents the new store to the global store, except while the global store
   * itself is being constructed.
   */
  constructor()
  {
    if (!Tr2VariableStore._creatingGlobalStore)
    {
      this.parentVariableStore = Tr2VariableStore.globalStore();
    }
  }

  /**
   * The store searched next when a lookup misses here; null on the global store,
   * which is the root.
   * @returns {Tr2VariableStore|null} Current parent.
   */
  @meta.blue.method
  @meta.implemented
  GetParentVariableStore()
  {
    return this.parentVariableStore;
  }

  /**
   * Assigns the parent used during variable search. The global store keeps
   * no parent, as Carbon enforces.
   * Adapted: nullish input becomes null. The native development-only cycle
   * assertion remains a held gap; this method does not validate the graph.
   * @param {Tr2VariableStore|null} variableStore Next store searched.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetParentVariableStore(variableStore)
  {
    if (this === Tr2VariableStore.globalStore())
    {
      return;
    }
    this.parentVariableStore = variableStore ?? null;
  }

  /**
   * Registers a variable. Without a value (or with null, the script
   * bridge's None) the name is reserved with the INVALID type. Otherwise
   * the content type is derived the way the script bridge does and the
   * value stored. An unsupported value shape registers nothing and returns
   * null, matching the Python bridge falling through every extractor; a
   * type conflict also returns null, as Carbon does after logging.
   * Adapted: returns a TriVariable handle, retaining JavaScript value-shape
   * inference and Boolean conversion instead of Python argument extraction.
   * @param {string} name Local variable name.
   * @param {*} [value] Optional script value; nullish values reserve the name.
   * @returns {TriVariable|null} Registered variable, or unsupported type/conflict.
   */
  @meta.blue.method
  @meta.adapted
  RegisterVariable(name, value = undefined)
  {
    if (value === undefined || value === null)
    {
      return this._RegisterVariableType(name, TriVariableContentType.TRIVARIABLE_INVALID);
    }
    const contentType = TriVariable.getVariableType(value);
    if (contentType === TriVariableContentType.TRIVARIABLE_INVALID)
    {
      return null;
    }
    const variable = this._RegisterVariableType(name, contentType);
    variable?.SetValue(typeof value === "boolean" ? Number(value) : value);
    return variable;
  }

  /**
   * Unregisters a variable in this store or the first parent that has it.
   * @param {string} name Variable name to remove.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  UnregisterVariable(name)
  {
    let store = this;
    while (store)
    {
      if (store.UnregisterLocalVariable(name))
      {
        return;
      }
      store = store.GetParentVariableStore();
    }
  }

  /**
   * Unregisters a variable in this store only; the removed variable is
   * invalidated so existing references stop binding.
   * Adapted: existing JavaScript nullish names address the empty-string key;
   * native null names return false without looking up an entry.
   * @param {string|null} name Local key to remove.
   * @returns {boolean} Whether an entry was removed.
   */
  @meta.blue.method
  @meta.adapted
  UnregisterLocalVariable(name)
  {
    const key = String(name ?? "");
    const variable = this._variables.get(key);
    if (!variable)
    {
      return false;
    }
    variable.Invalidate();
    this._variables.delete(key);
    return true;
  }

  /**
   * Searches this store and its parents; null when not found.
   * @param {string} name Variable name to search.
   * @returns {TriVariable|null} First matching local or ancestor variable.
   */
  @meta.blue.method
  @meta.implemented
  FindVariable(name)
  {
    let store = this;
    while (store)
    {
      const variable = store.FindLocalVariable(name);
      if (variable)
      {
        return variable;
      }
      store = store.GetParentVariableStore();
    }
    return null;
  }

  /**
   * Searches this store only; null when not found.
   * Adapted: existing JavaScript nullish names address the empty-string key;
   * native null names return null without looking up an entry.
   * @param {string|null} name Local key to search.
   * @returns {TriVariable|null} Existing local variable.
   */
  @meta.blue.method
  @meta.adapted
  FindLocalVariable(name)
  {
    return this._variables.get(String(name ?? "")) ?? null;
  }

  /**
   * Searches this store and its parents; a miss reserves the name in THIS
   * store with the INVALID type.
   * @param {string} name Variable name to find or reserve.
   * @returns {TriVariable} Matching variable or a new local reservation.
   */
  @meta.blue.method
  @meta.implemented
  GetVariable(name)
  {
    const found = this.FindVariable(name);
    if (found)
    {
      return found;
    }
    return this._CreateReserved(name);
  }

  /**
   * Searches this store only; a miss reserves the name here with the
   * INVALID type.
   * Adapted: the existing JavaScript empty-key normalization also reserves a
   * nullish name, whereas native null names return null without reservation.
   * @param {string|null} name Local key to find or reserve.
   * @returns {TriVariable} Existing or reserved local variable.
   */
  @meta.blue.method
  @meta.adapted
  GetLocalVariable(name)
  {
    return this.FindLocalVariable(name) ?? this._CreateReserved(name);
  }

  /**
   * Gets the names of the variables held locally by this store.
   * Adapted: JavaScript Map enumeration uses insertion order rather than the
   * native unordered-map iteration order.
   * @returns {string[]} Local names in insertion order.
   */
  @meta.blue.method
  @meta.adapted
  GetLocalNames()
  {
    return [...this._variables.values()].map(variable => variable.GetName());
  }

  // Carbon RegisterVariableType: reuse an existing local variable when the
  // type matches or was only reserved; a hard type conflict returns null.

  /**
   * Reuses an existing local variable when its type matches or was only reserved
   * as INVALID, returns null on a hard type conflict, and otherwise creates the
   * local variable.
   * Adapted: preserves the existing conflict result without Carbon's log and
   * development assertion; diagnostic parity remains a held gap.
   * @param {string} name Local key.
   * @param {number} contentType Native TriVariableContentType.
   * @returns {TriVariable|null} Reused or created variable, or type conflict.
   */
  @meta.adapted
  _RegisterVariableType(name, contentType)
  {
    const existing = this.FindLocalVariable(name);
    if (existing)
    {
      const existingType = existing.GetType();
      if (existingType === TriVariableContentType.TRIVARIABLE_INVALID)
      {
        existing.contentType = contentType;
      }
      else if (contentType !== TriVariableContentType.TRIVARIABLE_INVALID && contentType !== existingType)
      {
        return null;
      }
      return existing;
    }
    return this._CreateLocal(name, contentType);
  }

  /**
   * Creates a local variable holding only the reserved INVALID type, so the name
   * is claimed before a value is known.
   * @param {string} name Local key to reserve.
   * @returns {TriVariable} Newly reserved variable.
   */
  @meta.ours
  _CreateReserved(name)
  {
    return this._CreateLocal(name, TriVariableContentType.TRIVARIABLE_INVALID);
  }

  /**
   * Creates a variable with the given name and content type and stores it in
   * this store.
   * Custom: consolidates native creation sites and retains JavaScript string
   * coercion, including nullish names becoming the empty-string key.
   * @param {string|null} name Local key before string normalization.
   * @param {number} contentType Native TriVariableContentType.
   * @returns {TriVariable} Newly created local variable.
   */
  @meta.ours
  _CreateLocal(name, contentType)
  {
    const variable = new TriVariable();
    variable.name = String(name ?? "");
    variable.contentType = contentType;
    this._variables.set(variable.name, variable);
    return variable;
  }

  /**
   * Process-wide root corresponding to native GlobalStore's retained singleton.
   * @type {Tr2VariableStore|null}
   */
  static _global = null;

  /**
   * Suppresses parent assignment while constructing the global root itself.
   * @type {boolean}
   */
  static _creatingGlobalStore = false;

  /**
   * Replaces the root of the store graph, returning the new root.
   *
   * Carbon has no such call - its global store is created once and lives for
   * the process. This exists so a test can isolate itself from whatever the
   * rest of the suite has registered, and so a host can reset between scenes.
   * Nothing in a frame should call it.
   *
   * @param {Tr2VariableStore} [store] The new root; a fresh store when omitted.
   * @returns {Tr2VariableStore} The store now acting as the root.
   */
  @meta.ours
  static setGlobalStore(store = null)
  {
    if (store)
    {
      // The root keeps no parent, as Carbon enforces for the global store.
      store.parentVariableStore = null;
      Tr2VariableStore._global = store;

      return store;
    }

    Tr2VariableStore._global = null;

    return Tr2VariableStore.globalStore();
  }

  /**
   * The root of the variable-store graph (Carbon's free GlobalStore function).
   * Adapted: a static entry and construction guard preserve the native singleton
   * without the protected-constructor overload.
   * @returns {Tr2VariableStore} Process-global store.
   */
  @meta.adapted
  static globalStore()
  {
    if (!Tr2VariableStore._global)
    {
      Tr2VariableStore._creatingGlobalStore = true;
      try
      {
        Tr2VariableStore._global = new Tr2VariableStore();
      }
      finally
      {
        Tr2VariableStore._creatingGlobalStore = false;
      }
    }
    return Tr2VariableStore._global;
  }
}

meta.blue.interfaceTable({ interfaces: [Tr2VariableStore], chainTo: null })(Tr2VariableStore);
