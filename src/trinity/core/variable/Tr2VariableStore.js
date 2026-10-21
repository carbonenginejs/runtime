import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Tr2VariableStore.h
// Source: trinity/trinity/Tr2VariableStore.cpp
// Source: trinity/trinity/Tr2VariableStore_Blue.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/Tr2TextureAL.js";
import { Tr2TextureReference } from "../Tr2TextureReference.js";
import { TriVariable } from "./TriVariable.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";


/**
 * Named-variable collection used by the shader system for binding. All
 * stores form an acyclic graph whose root is the global store: new stores
 * parent to it by default, and lookups walk the parent chain.
 * The native TRINITYDEV cycle assertion remains unported; callers must keep
 * the parent graph acyclic. Registration states its type
 * (RegisterVariableInternal / RegisterVariableType); raw AL textures go
 * through RegisterVariable__TextureAL, the native texture-reference overload.
 */
@be.define("Tr2VariableStore")
@blue.inherit(IRoot)
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
  @be.mapProperty()
  @type.rootRef("Tr2VariableStore")
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
  @blue.method
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
  @blue.method
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
   * Registers a variable of a stated type and sets its value: Carbon's
   * RegisterVariableInternal (Tr2VariableStore.h:70-80), which every C++
   * RegisterVariable overload except the raw-texture one calls. The type is
   * the template parameter there, deduced from the C++ argument; JavaScript
   * has no static types, so the caller states it. Returns null on a type
   * conflict without setting the value, as Carbon does.
   *
   * Adapted: the template parameter is an explicit TriVariableContentType
   * argument, and the method is public. Carbon's RegisterVariable(name, value)
   * overloads, and the Python bridge that picks one from the value, are not
   * ported: JavaScript cannot tell a whole float from an int, or a colour
   * from a Vector4 (CE-53). Reserve a name with
   * RegisterVariableType(name, TRIVARIABLE_INVALID).
   * @param {string} name Local variable name.
   * @param {number} contentType TriVariableContentType of the value.
   * @param {*} value Value to store.
   * @returns {TriVariable|null} Registered variable, or null on a type conflict.
   */
  @meta.adapted
  @blue.method
  RegisterVariableInternal(name, contentType, value)
  {
    const variable = this.RegisterVariableType(name, contentType);
    if (variable) variable.SetValue(value);
    return variable;
  }

  /**
   * Carbon's RegisterVariable( name, const Tr2TextureAL& )
   * (Tr2VariableStore.cpp:219-237): wraps the texture in a texture reference,
   * reusing the one already registered under the name, and registers that.
   * Carbon quirk, reproduced: the existing variable is looked up in
   * GlobalStore even on a local store (cpp:222).
   * Adapted: explicit copy construction replaces C++ value assignment, which
   * JavaScript assignment would alias.
   * @param {string} name Local variable name.
   * @param {Tr2TextureAL} texture Texture to publish.
   * @returns {TriVariable|null} Registered variable, or null on a type conflict.
   */
  @meta.adapted
  @meta.renamed("RegisterVariable")
  RegisterVariable__TextureAL(name, texture)
  {
    const variable = Tr2VariableStore.globalStore().GetVariable(name);
    const reference = variable.GetType() === TriVariableContentType.TRIVARIABLE_TEXTURE_RES
      ? CjsSchema.cast(variable.GetValue(), Tr2TextureReference) : null;
    const target = reference || new Tr2TextureReference();
    const copy = new Tr2TextureAL({ copy: texture });
    target.texture.Destroy();
    target.texture = copy;
    if (reference) return variable;
    const registered = this.RegisterVariableInternal(name, TriVariableContentType.TRIVARIABLE_TEXTURE_RES, target);
    if (!registered) target.texture.Destroy();
    return registered;
  }

  /**
   * Carbon's Python RegisterVariable( name, value ) (Tr2VariableStore_Blue.cpp:95-150),
   * which picks a C++ overload from the value's Python type.
   * Not supported: a JavaScript value cannot say its own type - a whole float
   * reads as an int, and a colour as a Vector4 (CE-53). Callers state it:
   * RegisterVariableInternal(name, type, value), RegisterVariableType(name,
   * type) to reserve a name, or RegisterVariable__TextureAL for a raw texture.
   * @throws {TypeError} Always.
   */
  @be.mapMethod()
  @meta.notSupported
  RegisterVariable()
  {
    throw new TypeError("Tr2VariableStore.RegisterVariable cannot infer a type in JavaScript; call RegisterVariableInternal(name, type, value).");
  }

  /**
   * Unregisters a variable in this store or the first parent that has it.
   * @param {string} name Variable name to remove.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
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
  @be.mapMethodAndWrap()
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
  @be.mapMethod()
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
  @be.mapMethod()
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
  @be.mapMethod()
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
  @be.mapMethod()
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
  @be.mapMethodAndWrap()
  @meta.adapted
  GetLocalNames()
  {
    return [...this._variables.values()].map(variable => variable.GetName());
  }

  /**
   * Registers a variable of a stated type (Tr2VariableStore.cpp, private in
   * Carbon): reuses an existing local variable when its type matches or was
   * only reserved as INVALID, returns null on a hard type conflict, and
   * otherwise creates the local variable, which holds no value until SetValue.
   *
   * Adapted: public here, so a name can be reserved (TRIVARIABLE_INVALID) or
   * typed before it has a value; RegisterVariableInternal registers and sets
   * in one call.
   * The conflict result keeps Carbon's null without its log and development
   * assertion.
   * @param {string} name Local key.
   * @param {number} contentType Native TriVariableContentType.
   * @returns {TriVariable|null} Reused or created variable, or type conflict.
   */
  @meta.adapted
  @blue.method
  RegisterVariableType(name, contentType)
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


