// Source: trinity/trinity/TriSettings.h
//   trinity/trinity/TriSettings_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/**
 * A registry of named boolean, number and string settings with type-checked
 * reads and writes and a Python-style repr.
 */
@type.define({ className: "TriSettings", family: "trinityCore" })
export class TriSettings extends CjsModel
{
  #settings = new Map();

  /**
   * Registers a setting and latches its value type from the initial value; only
   * boolean, number and string are supported, and re-registering replaces the
   * entry. Returns this for chaining.
   *
   * Carbon's RegisterSetting<T> (TriSettings.h:14-19) derives the Be::VARTYPE
   * from the template type and delegates to the private helper; here typeof
   * is the derivation.
   */
  RegisterSetting(name, value)
  {
    this.#RegisterSettingHelper(TriSettings.#GetKey(name), value, typeof value);
    return this;
  }

  /**
   * Carbon RegisterSettingHelper (TriSettings.h:62-76, private): reject an
   * unsupported type, else record name -> (type, value). Carbon logs and
   * returns on Be::INVALID; the JS registry throws, because a setting that
   * silently fails to register turns every later GetValue into a RangeError
   * far from the cause.
   */
  #RegisterSettingHelper(key, value, valueType)
  {
    if (valueType !== "boolean" && valueType !== "number" && valueType !== "string")
    {
      throw new TypeError(`Unsupported setting type for '${key}'`);
    }
    this.#settings.set(key, { value, valueType });
  }

  /**
   * The { value, valueType } record for a setting, or null when it is not
   * registered.
   */
  FindSetting(name)
  {
    return this.#settings.get(TriSettings.#GetKey(name)) ?? null;
  }

  /**
   * The current value of a registered setting; an unknown name throws RangeError
   * rather than returning a default.
   */
  @carbon.method
  GetValue(name)
  {
    const key = TriSettings.#GetKey(name);
    const setting = this.#settings.get(key);
    if (!setting)
    {
      throw new RangeError(`Setting '${key}' is not registered`);
    }
    return setting.value;
  }

  /**
   * Assigns a registered setting, throwing RangeError for an unknown name and
   * TypeError when the value's type differs from the one latched at
   * registration.
   */
  @carbon.method
  SetValue(name, value)
  {
    const key = TriSettings.#GetKey(name);
    const setting = this.#settings.get(key);
    if (!setting)
    {
      throw new RangeError(`Setting '${key}' is not registered`);
    }
    if (typeof value !== setting.valueType)
    {
      throw new TypeError(`Setting '${key}' requires a ${setting.valueType} value`);
    }
    setting.value = value;
  }

  /** A Python-style dict literal of every setting, ordered by name. */
  GetReprString()
  {
    let result = "{";
    const entries = [...this.#settings.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [name, setting] of entries)
    {
      result += `'${name}':${this.GetSettingReprString(setting)}, `;
    }
    return `${result}}`;
  }

  /**
   * Carbon GetSettingReprString (TriSettings_Blue.cpp:8-44): formats one
   * setting's value as a python literal by its registered type. Carbon
   * switches over six Be::VARTYPEs (%d, True/False, %f, quoted string); the
   * JS registry latches only boolean/number/string, so the number arm covers
   * Carbon's integer and float arms in JS's own number formatting.
   */
  @impl.adapted
  @impl.reason("Carbon formats per Be::VARTYPE (%d vs %f); JS has one number type, so numeric formatting follows JS.")
  GetSettingReprString(setting)
  {
    return TriSettings.#ReprValue(setting.value);
  }

  /** Python repr hook, delegating to GetReprString. */
  @carbon.method
  __repr__()
  {
    return this.GetReprString();
  }

  /** Validates that a setting name is a string and returns it as the map key. */
  static #GetKey(name)
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
  static #ReprValue(value)
  {
    if (typeof value === "boolean") return value ? "True" : "False";
    if (typeof value === "string") return `'${value.replaceAll("'", "\\'")}'`;
    return String(value);
  }
}
