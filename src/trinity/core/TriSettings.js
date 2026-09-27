// Source: trinity/trinity/TriSettings.h
//   trinity/trinity/TriSettings_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/**
 * A registry of named boolean, number and string settings with type-checked
 * reads and writes and a Python-style repr.
 *
 * Carbon's entries point at the engine's own globals (TriSettings.h:62-76,
 * `m_var`), so writing a setting changes what the engine reads. A JavaScript
 * value has no address, so an entry holds the owner and key of the value
 * instead: `RegisterSetting(name, owner, key)`. The two-argument form
 * `RegisterSetting(name, value)` keeps its own value, for settings that have
 * no engine global (ccpwgl registers its switches this way).
 */
@type.define({ className: "TriSettings", family: "trinityCore" })
export class TriSettings extends CjsModel
{
  /** m_map: name -> { valueType, owner, key }; the value is owner[key]. */
  _settings = new Map();

  /**
   * Carbon RegisterSetting<T> (TriSettings.h:14-19): registers a setting and
   * latches its value type from the current value. Only boolean, number and
   * string are supported, and re-registering replaces the entry. Returns this
   * for chaining.
   *
   * Adapted: Carbon takes a pointer to the value; here the owner and key of a
   * live value stand for it. With no key, the entry holds `ownerOrValue` itself.
   * `applies`, `enum`, `values` and `carbon` are ours, for a settings menu
   * (see CjsSchema.edit.setting); Carbon records none of them.
   *
   * @param {string} name The setting's name.
   * @param {object|boolean|number|string} ownerOrValue The value's owner, or the value.
   * @param {string} [key] The owner's property holding the value.
   * @param {{ applies?: string, enum?: object|string|null, values?: Array|null, carbon?: boolean }} [options] See CjsSchema.edit.setting.
   * @returns {TriSettings} This registry.
   */
  @carbon.method
  @impl.adapted
  RegisterSetting(name, ownerOrValue, key, { applies = "always", enum: enumType = null, values = null, carbon = false } = {})
  {
    const owner = key === undefined ? { value: ownerOrValue } : ownerOrValue;
    const property = key === undefined ? "value" : key;
    this._RegisterSettingHelper(TriSettings._GetKey(name), owner, property, typeof owner[property], { applies, enum: enumType, values, carbon });
    return this;
  }

  /**
   * Carbon RegisterSettingHelper (TriSettings.h:62-76, private): reject an
   * unsupported type, else record the entry. Carbon logs and returns on
   * Be::INVALID; this throws, because a setting that silently fails to
   * register turns every later GetValue into an error far from the cause.
   */
  _RegisterSettingHelper(name, owner, key, valueType, options)
  {
    if (valueType !== "boolean" && valueType !== "number" && valueType !== "string")
    {
      throw new TypeError(`Unsupported setting type for '${name}'`);
    }
    this._settings.set(name, { valueType, owner, key, ...options });
  }

  /**
   * Carbon FindSetting (TriSettings.h:31-42): the entry for a setting, or null
   * when it is not registered.
   *
   * @param {string} name The setting's name.
   * @returns {{ valueType: string, owner: object, key: string, applies: string, enum: object|string|null, values: Array|null, carbon: boolean }|null} The entry.
   */
  @carbon.method
  @impl.implemented
  FindSetting(name)
  {
    return this._settings.get(TriSettings._GetKey(name)) ?? null;
  }

  /**
   * The registered names, in name order.
   *
   * Custom: Carbon iterates `m_map` directly; a settings panel lists from here.
   *
   * @returns {string[]} The names.
   */
  @impl.custom
  GetNames()
  {
    return [ ...this._settings.keys() ].sort();
  }

  /**
   * Carbon PyGetValue (TriSettings_Blue.cpp): the current value of a
   * registered setting; an unknown name throws RangeError, as Python's
   * LookupError.
   */
  @carbon.method
  @impl.implemented
  GetValue(name)
  {
    const setting = this._Require(name);
    return setting.owner[setting.key];
  }

  /**
   * Carbon PySetValue (TriSettings_Blue.cpp): assigns a registered setting
   * through to the value it names. An unknown name throws RangeError; a value
   * whose type differs from the registered one throws TypeError.
   */
  @carbon.method
  @impl.implemented
  SetValue(name, value)
  {
    const setting = this._Require(name);
    if (typeof value !== setting.valueType)
    {
      throw new TypeError(`Setting '${name}' requires a ${setting.valueType} value`);
    }
    setting.owner[setting.key] = value;
  }

  /** Carbon GetReprString (TriSettings.h:44-57): a Python dict literal of every setting, in name order. */
  @carbon.method
  @impl.implemented
  GetReprString()
  {
    let result = "{";
    for (const name of this.GetNames())
    {
      result += `'${name}':${this.GetSettingReprString(this._settings.get(name))}, `;
    }
    return `${result}}`;
  }

  /**
   * Carbon GetSettingReprString (TriSettings_Blue.cpp:8-44): one setting's
   * value as a Python literal.
   *
   * Adapted: Carbon formats by Be::VARTYPE (%d for integers, %f for floats);
   * JavaScript has one number type, so numbers format as JavaScript does.
   */
  @carbon.method
  @impl.adapted
  GetSettingReprString(setting)
  {
    return TriSettings._ReprValue(setting.owner[setting.key]);
  }

  /** Python repr hook, delegating to GetReprString. */
  @carbon.method
  __repr__()
  {
    return this.GetReprString();
  }

  /** The entry for a name, or a RangeError when it is not registered. */
  _Require(name)
  {
    const key = TriSettings._GetKey(name);
    const setting = this._settings.get(key);
    if (!setting)
    {
      throw new RangeError(`Setting '${key}' is not registered`);
    }
    return setting;
  }

  /** Validates that a setting name is a string and returns it as the map key. */
  static _GetKey(name)
  {
    if (typeof name !== "string")
    {
      throw new TypeError("Setting name must be a string");
    }
    return name;
  }

  /**
   * Formats a value the way Python would: True/False for booleans and
   * single-quoted, escaped text for strings.
   */
  static _ReprValue(value)
  {
    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "string") return `'${value.replaceAll("'", "\\'")}'`;
    return String(value);
  }
}
