import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, type } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass;

/**
 * A registry of named boolean, number and string settings with type-checked
 * reads and writes and a Python-style repr.
 */
let _TriSettings;
new class extends _identity {
  static [class TriSettings extends CjsModel {
    static {
      ({
        e: [_initProto],
        c: [_TriSettings, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriSettings",
        family: "trinityCore"
      })], [[[carbon, carbon.method], 18, "GetValue"], [[carbon, carbon.method], 18, "SetValue"], [[carbon, carbon.method], 18, "__repr__"]], 0, void 0, CjsModel));
    }
    #settings = (_initProto(this), new Map());

    /**
     * Registers a setting and latches its value type from the initial value; only
     * boolean, number and string are supported, and re-registering replaces the
     * entry. Returns this for chaining.
     */
    RegisterSetting(name, value) {
      const key = _TriSettings.#GetKey(name);
      const valueType = typeof value;
      if (valueType !== "boolean" && valueType !== "number" && valueType !== "string") {
        throw new TypeError(`Unsupported setting type for '${key}'`);
      }
      this.#settings.set(key, {
        value,
        valueType
      });
      return this;
    }

    /**
     * The { value, valueType } record for a setting, or null when it is not
     * registered.
     */
    FindSetting(name) {
      return this.#settings.get(_TriSettings.#GetKey(name)) ?? null;
    }

    /**
     * The current value of a registered setting; an unknown name throws RangeError
     * rather than returning a default.
     */
    GetValue(name) {
      const key = _TriSettings.#GetKey(name);
      const setting = this.#settings.get(key);
      if (!setting) {
        throw new RangeError(`Setting '${key}' is not registered`);
      }
      return setting.value;
    }

    /**
     * Assigns a registered setting, throwing RangeError for an unknown name and
     * TypeError when the value's type differs from the one latched at
     * registration.
     */
    SetValue(name, value) {
      const key = _TriSettings.#GetKey(name);
      const setting = this.#settings.get(key);
      if (!setting) {
        throw new RangeError(`Setting '${key}' is not registered`);
      }
      if (typeof value !== setting.valueType) {
        throw new TypeError(`Setting '${key}' requires a ${setting.valueType} value`);
      }
      setting.value = value;
    }

    /** A Python-style dict literal of every setting, ordered by name. */
    GetReprString() {
      let result = "{";
      const entries = [...this.#settings.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (const [name, setting] of entries) {
        result += `'${name}':${_TriSettings.#ReprValue(setting.value)}, `;
      }
      return `${result}}`;
    }

    /** Python repr hook, delegating to GetReprString. */
    __repr__() {
      return this.GetReprString();
    }

    /** Validates that a setting name is a string and returns it as the map key. */

    /**
     * Formats a value the way Python would: True/False for booleans and
     * single-quoted, escaped text for strings.
     */
  }];
  #GetKey(name) {
    if (typeof name !== "string") {
      throw new TypeError("Setting name must be a string");
    }
    return name;
  }
  #ReprValue(value) {
    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "string") return `'${value.replaceAll("'", "\\'")}'`;
    return String(value);
  }
  constructor() {
    super(_TriSettings), _initClass();
  }
}();

export { _TriSettings as TriSettings };
//# sourceMappingURL=TriSettings.js.map
