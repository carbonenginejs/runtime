import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriVariable as _TriVariable } from './TriVariable.js';
import { TriVariableContentType } from '../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_parentVariableStore, _init_extra_parentVariableStore;

/**
 * Named-variable collection used by the shader system for binding. All
 * stores form an acyclic graph whose root is the global store: new stores
 * parent to it by default, and lookups walk the parent chain.
 */
let _Tr2VariableStore;
new class extends _identity {
  static [class Tr2VariableStore extends CjsModel {
    static {
      ({
        e: [_init_parentVariableStore, _init_extra_parentVariableStore, _initProto],
        c: [_Tr2VariableStore, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2VariableStore",
        family: "trinityCore"
      })], [[type.objectRef("Tr2VariableStore"), 0, "parentVariableStore"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParentVariableStore"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParentVariableStore"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnregisterLocalVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "FindLocalVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalNames"]], 0, void 0, CjsModel));
    }
    /** m_parentVariableStore (Tr2VariableStorePtr) */
    parentVariableStore = (_initProto(this), _init_parentVariableStore(this, null));
    #variables = (_init_extra_parentVariableStore(this), new Map());

    /**
     * Parents the new store to the global store, except while the global store
     * itself is being constructed.
     */
    constructor() {
      super();
      if (!_Tr2VariableStore.#creatingGlobalStore) {
        this.parentVariableStore = _Tr2VariableStore.GlobalStore();
      }
    }

    /**
     * The store searched next when a lookup misses here; null on the global store,
     * which is the root.
     */
    GetParentVariableStore() {
      return this.parentVariableStore;
    }

    /**
     * Assigns the parent used during variable search. The global store keeps
     * no parent, as Carbon enforces.
     */
    SetParentVariableStore(variableStore) {
      if (this === _Tr2VariableStore.GlobalStore()) {
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
     */
    RegisterVariable(name, value = undefined) {
      if (value === undefined || value === null) {
        return this.#RegisterVariableType(name, TriVariableContentType.TRIVARIABLE_INVALID);
      }
      const contentType = _TriVariable.getVariableType(value);
      if (contentType === TriVariableContentType.TRIVARIABLE_INVALID) {
        return null;
      }
      const variable = this.#RegisterVariableType(name, contentType);
      variable?.SetValue(typeof value === "boolean" ? Number(value) : value);
      return variable;
    }

    /**
     * Unregisters a variable in this store or the first parent that has it.
     */
    UnregisterVariable(name) {
      let store = this;
      while (store) {
        if (store.UnregisterLocalVariable(name)) {
          return;
        }
        store = store.GetParentVariableStore();
      }
    }

    /**
     * Unregisters a variable in this store only; the removed variable is
     * invalidated so existing references stop binding.
     */
    UnregisterLocalVariable(name) {
      const key = String(name ?? "");
      const variable = this.#variables.get(key);
      if (!variable) {
        return false;
      }
      variable.Invalidate();
      this.#variables.delete(key);
      return true;
    }

    /**
     * Searches this store and its parents; null when not found.
     */
    FindVariable(name) {
      let store = this;
      while (store) {
        const variable = store.FindLocalVariable(name);
        if (variable) {
          return variable;
        }
        store = store.GetParentVariableStore();
      }
      return null;
    }

    /**
     * Searches this store only; null when not found.
     */
    FindLocalVariable(name) {
      return this.#variables.get(String(name ?? "")) ?? null;
    }

    /**
     * Searches this store and its parents; a miss reserves the name in THIS
     * store with the INVALID type.
     */
    GetVariable(name) {
      const found = this.FindVariable(name);
      if (found) {
        return found;
      }
      return this.#CreateReserved(name);
    }

    /**
     * Searches this store only; a miss reserves the name here with the
     * INVALID type.
     */
    GetLocalVariable(name) {
      return this.FindLocalVariable(name) ?? this.#CreateReserved(name);
    }

    /**
     * Gets the names of the variables held locally by this store.
     */
    GetLocalNames() {
      return [...this.#variables.values()].map(variable => variable.GetName());
    }

    // Carbon RegisterVariableType: reuse an existing local variable when the
    // type matches or was only reserved; a hard type conflict returns null.

    /**
     * Reuses an existing local variable when its type matches or was only reserved
     * as INVALID, returns null on a hard type conflict, and otherwise creates the
     * local variable.
     */
    #RegisterVariableType(name, contentType) {
      const existing = this.FindLocalVariable(name);
      if (existing) {
        const existingType = existing.GetType();
        if (existingType === TriVariableContentType.TRIVARIABLE_INVALID) {
          existing.contentType = contentType;
        } else if (contentType !== TriVariableContentType.TRIVARIABLE_INVALID && contentType !== existingType) {
          return null;
        }
        return existing;
      }
      return this.#CreateLocal(name, contentType);
    }

    /**
     * Creates a local variable holding only the reserved INVALID type, so the name
     * is claimed before a value is known.
     */
    #CreateReserved(name) {
      return this.#CreateLocal(name, TriVariableContentType.TRIVARIABLE_INVALID);
    }

    /**
     * Creates a variable with the given name and content type and stores it in
     * this store.
     */
    #CreateLocal(name, contentType) {
      const variable = new _TriVariable();
      variable.name = String(name ?? "");
      variable.contentType = contentType;
      this.#variables.set(variable.name, variable);
      return variable;
    }
    /**
     * The root of the variable-store graph (Carbon's GlobalStore()).
     */
    static GlobalStore() {
      if (!_Tr2VariableStore.#global) {
        _Tr2VariableStore.#creatingGlobalStore = true;
        try {
          _Tr2VariableStore.#global = new _Tr2VariableStore();
        } finally {
          _Tr2VariableStore.#creatingGlobalStore = false;
        }
      }
      return _Tr2VariableStore.#global;
    }
  }];
  #global = null;
  #creatingGlobalStore = false;
  constructor() {
    super(_Tr2VariableStore), _initClass();
  }
}();

export { _Tr2VariableStore as Tr2VariableStore };
//# sourceMappingURL=Tr2VariableStore.js.map
