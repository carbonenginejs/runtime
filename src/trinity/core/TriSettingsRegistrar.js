// Source: trinity/trinity/TriSettingsRegistrar.h
//   trinity/trinity/Tr2Renderer.cpp:1387-1391 (GetSettings)
import { CjsSchema } from "#schema";
import { TriSettings } from "./TriSettings.js";

/**
 * Carbon's `TRI_REGISTER_SETTING( name, value )` is a file-scope
 * `static TriSettingsRegistrar` that registers a global with the renderer's
 * settings.
 *
 * Here a class static is marked with `@edit.setting(name)` instead, and
 * getSettings() registers every marked static. Constructing a registrar is
 * left for a value that is not a class static, such as a module variable
 * reached through accessors.
 *
 * The registry itself is `Tr2Renderer::GetSettings()`'s function-local static.
 * It is held here, and `Tr2Renderer.getSettings()` returns it, so that
 * low-level classes such as TriFrustum can register without importing the
 * renderer and everything it imports.
 */
export class TriSettingsRegistrar
{
  /**
   * Carbon TriSettingsRegistrar( name, T* value ) (TriSettingsRegistrar.h:19-23).
   *
   * @param {string} name Carbon's setting name.
   * @param {object} owner The object holding the value.
   * @param {string} key The owner's property holding the value.
   * @param {{ applies?: string, enum?: object|string|null, values?: Array|null, carbon?: boolean }} [options] See CjsSchema.edit.setting.
   */
  constructor(name, owner, key, options = {})
  {
    TriSettingsRegistrar.getSettings().RegisterSetting(name, owner, key, options);
  }

  /**
   * The renderer's settings, created on first use as Carbon's function-local
   * static is, with every `@edit.setting` static registered.
   *
   * @returns {TriSettings} The registry.
   */
  static getSettings()
  {
    const settings = TriSettingsRegistrar._settings ??= new TriSettings();
    for (const { name, owner, key, applies, enum: enumType, values, carbon } of CjsSchema.getSettings())
    {
      const registered = settings.FindSetting(name);
      if (registered?.owner === owner && registered.key === key) continue;
      settings.RegisterSetting(name, owner, key, { applies, enum: enumType, values, carbon });
    }
    return settings;
  }

  static _settings = null;
}
