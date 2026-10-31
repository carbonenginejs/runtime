import { blue } from "../global/blue/index.js";
import { installBlueServices } from "../global/blue/blue.js";
import { BeCallbackMan } from "../global/blue/BlueCallbackMan.js";
import { BlueCallbackManTicker } from "../global/blue/BlueCallbackManTicker.js";
import { CjsSchema, meta } from "#schema";
import { CjsOverlay2D } from "./overlay/CjsOverlay2D.js";

import { IBlueResFileSystem } from "../global/blue/IBlueResFileSystem.js";
import { IBlueDynamicResourceConstructor } from "../global/blue/IBlueDynamicResourceConstructor.js";
import { DefaultConfiguration } from "./configuration.js";
import { ImageIO } from "../resource/imageio/ImageIO.js";
import { TriSettingsRegistrar } from "../trinity/core/TriSettingsRegistrar.js";
import { Tr2EffectRes } from "../trinity/shader/Tr2EffectRes.js";
import { SetEffectPathDefaults } from "#utils/effectPath";

let activeLibrary = null;


/** Reader/factory policy is installed at startup; changing it requires reboot. */
const REBOOT_CONFIGURATION_SECTIONS = new Set([
  "formats", "formatOptions", "objectLoaders", "objectBuilders", "extensions",
  "resourceConstructors", "imageHandlers", "callbackMan", "effects"
]);

/** BeCallbackMan is process-global: the first library to initialize starts it. */
let callbackManStarted = false;

/** Installed policy follows the cache owner across library wrappers without retaining it. */
const installedResourcePolicies = new WeakMap();

/**
 * Application composition root. This service-installation boundary implements
 * Blue startup; rendering/device and user-facing wrappers remain separate work.
 * Construction is inert. Providers supplied to Initialize are preconfigured,
 * borrowed references. Explicit configuration is applied to the selected owners;
 * initialization does not start playback, load SOF data, create a device or pump a host loop.
 */
export class CjsLibrary
{
  /** Requested entries; construction does not apply them to any owner. */
  _configuration = null;
  /** Entries whose owner call returned successfully; not a claim of GPU activation. */
  _configured = {};
  /** Actual instances selected by Initialize, retained for truthful readback. */
  _configurationOwners = null;
  /** A failed owner call may have mutated its owner before throwing. */
  _configurationFailure = null;

  /** Copies explicit defaults and overrides without installing or starting anything. */
  constructor(configuration = {})
  {
    this._configuration = CopyConfiguration(DefaultConfiguration);
    this.SetConfiguration(configuration);
  }

  /**
   * Replaces supplied named entries, retaining omitted entries without deep merge.
   * Before Initialize this records requests only. Afterwards it forwards only the
   * supplied live entries to their existing owners. Reader and factory policies
   * are recorded for reboot, without invalidating or reloading cached resources.
   * Global append-only registrations
   * cannot be replaced or reset through this API. A failure is rethrown unchanged;
   * prior successful calls remain recorded and are not rolled back.
   */
  SetConfiguration(configuration)
  {
    ValidateConfiguration(configuration);
    if (this._initialization) throw new Error("Configuration cannot change during initialization.");
    const patch = CopyConfiguration(configuration);
    const immediate = this._previousServices
      ? LiveConfiguration(patch, this._configurationOwners.settings)
      : patch;
    if (this._previousServices && patch.settings) this._ValidateConfigurationOwners({ settings: patch.settings });
    if (this._previousServices) this._ValidateConfigurationOwners(immediate);
    for (const [section, entries] of Object.entries(patch))
      this._configuration[section] = { ...this._configuration[section], ...entries };
    if (this._previousServices) this._ApplyConfiguration(immediate);
    return this;
  }

  /**
   * Returns requested data and successful owner submissions, plus the last failure.
   * Reader/factory policy changes remain in requested, while configured retains
   * the policy installed at startup. Applying those changes requires reboot;
   * this API never purges or reloads resources implicitly.
   * LOAD settings also wait for reboot. Configured CREATE settings affect later
   * device creation. Backend data is requested only; the host consumes it at its
   * existing setup boundary. Shutdown does not undo global registry mutations.
   */
  GetConfiguration()
  {
    return { requested: CopyConfiguration(this._configuration), configured: CopyConfiguration(this._configured),
      initialized: this._previousServices !== null, owners: this._configurationOwners ? { ...this._configurationOwners } : null,
      failure: this._configurationFailure ? { ...this._configurationFailure } : null };
  }

  /** Checks owner-supported constraints before any entry in a patch is applied. */
  _ValidateConfigurationOwners(configuration)
  {
    const { settings, resMan } = this._configurationOwners;
    for (const [extension, loader] of Object.entries(configuration.objectLoaders || {}))
    {
      const route = resMan.GetExtensionRoute(extension);
      if (route?.loader && route.loader !== loader && !Object.hasOwn(configuration.extensions || {}, extension))
        throw new Error(`objectLoaders.${extension}: submit the corresponding extension route in the same patch; its loader is captured.`);
    }
    for (const [name, value] of Object.entries(configuration.settings || {}))
    {
      const entry = settings.FindSetting(name);
      if (!entry) throw new RangeError(`Setting '${name}' is not registered`);
      if (typeof value !== entry.valueType) throw new TypeError(`Setting '${name}' requires ${entry.valueType}`);
    }
    for (const section of ["imageHandlers", "paths", "formats", "callbackModules"])
    {
      for (const [key, value] of Object.entries(configuration[section] || {}))
      {
        const previous = this._configured[section]?.[key];
        const oldIdentity = section === "formats" ? previous?.Format || previous : previous;
        const newIdentity = section === "formats" ? value.Format || value : value;
        if (previous && oldIdentity !== newIdentity)
          throw new Error(`${section}.${key}: owner supports append, not replacement of this registration. Use a new entry name.`);
      }
    }
  }

  /**
   * Applies entries through fixed existing owners; records each successful call.
   * @param {object} configuration Normalized application registration configuration.
   * @returns {void}
   */
  _ApplyConfiguration(configuration)
  {
    const { resMan, paths, settings } = this._configurationOwners;
    this._ValidateConfigurationOwners(configuration);
    this._configurationFailure = null;
    for (const section of ["formatOptions", "resMan", "formats", "objectLoaders", "objectBuilders", "extensions",
      "resourceConstructors", "imageHandlers", "paths", "settings", "callbackModules", "effects"])
    {
      const entries = configuration[section] || {};
      if (section === "effects" && Object.keys(entries).length)
      {
        try
        {
          // Effects are committed together, once: the tree `/effect/` paths
          // resolve into is the tree Tr2EffectRes translates from.
          const { source = null, target = null, translator = null, permutations, shaderModel = "high" } = entries;
          if (source !== null && target !== null) Tr2EffectRes.CommitBackend({ source, target, translator, permutations });
          SetEffectPathDefaults({ platformName: source, shaderModel });
          this._configured.effects = { ...entries };
        }
        catch (error)
        {
          delete this._configured.effects;
          this._configurationFailure = { section, key: null, error };
          throw error;
        }
        continue;
      }
      if (section === "resMan" && Object.keys(entries).length)
      {
        try
        {
          // Register consumes related options together (for example cacheSize/cacheCleanup).
          const options = { ...entries };
          if (Object.hasOwn(options, "cacheSize") && !Object.hasOwn(options, "cacheCleanup")
            && Object.hasOwn(this._configuration.resMan, "cacheCleanup")) options.cacheCleanup = this._configuration.resMan.cacheCleanup;
          resMan.Register(options);
          this._configured.resMan = { ...this._configured.resMan, ...entries };
        }
        catch (error)
        {
          for (const key of Object.keys(entries)) delete this._configured.resMan?.[key];
          this._configurationFailure = { section, key: null, error };
          throw error;
        }
        continue;
      }
      for (const [key, value] of Object.entries(entries))
      {
        try
        {
          if (section === "formats" && value.routes)
          {
            const format = new value.Format(value.options || {});
            format.SetBlue(this._configuration.formatOptions.buildClasses ? blue : null);
            format.SetWorkerEnabled(value.workers !== false);
            for (const { extension, ex = "", Res } of value.routes)
            {
              resMan.RegisterExtension(extension + ex, Res, { instance: format });
            }
          }
          else if (["formats", "objectLoaders", "extensions"].includes(section))
            resMan.Register({ [section]: { [key]: value } });
          else if (section === "objectBuilders") resMan.RegisterObjectBuilder(key, value);
          else if (section === "resourceConstructors")
            resMan.RegisterResourceConstructor(key, typeof value === "function" ? new value(resMan) : value);
          else if (section === "imageHandlers") ImageIO.registerImageHandler(value);
          else if (section === "paths")
          {
            if (!paths.IsFileSystemRegistered(value)) paths.RegisterFileSystem(value);
          }
          else if (section === "settings") settings.SetValue(key, value);
          else if (section === "callbackModules") BeCallbackMan.RegisterCallbackModule(key, value);
          (this._configured[section] ??= {})[key] = value;
        }
        catch (error)
        {
          delete this._configured[section]?.[key];
          this._configurationFailure = { section, key, error };
          throw error;
        }
      }
    }
  }


  /** Creates the 2D overlay canvas over a 3D canvas; it draws on Blue ticks. */
  CreateOverlay2D(options)
  {
    return new CjsOverlay2D(options);
  }
  /** In-flight initialization; concurrent calls share the first configuration. */
  _initialization = null;

  /** Exact prior service references and activation state, retained until shutdown. */
  _previousServices = null;

  /**
   * Claims the single application root and installs Blue's named providers.
   * A default SOF is constructed lazily here, never by the global holder.
   * Repeated initialization returns this root until Shutdown; the first call
   * chooses its providers. All provider validation precedes publication.
   * @param {object} [options={}] Preconfigured resMan, paths, os, sof and audio providers.
   * @returns {Promise<CjsLibrary>} The initialized root.
   */
  async Initialize(options = {})
  {
    if (this._initialization) return this._initialization;
    if (this._previousServices) return this;
    if (!options || typeof options !== "object" || Array.isArray(options))
      throw new TypeError("Library initialization requires named providers.");
    if (activeLibrary && activeLibrary !== this)
      throw new Error("A CjsLibrary is already active.");
    activeLibrary = this;
    // Publish the in-flight operation before provider hooks can reenter startup.
    this._initialization = Promise.resolve().then(async () =>
    {
      try
      {
        const services = { ...options };
        if (!Object.hasOwn(services, "sof"))
        {
          const { EveSOF } = await import("../sof/EveSOF.js");
          services.sof = new EveSOF();
        }
        this._previousServices = installBlueServices(services);
        const installedPolicy = installedResourcePolicies.get(blue.resMan) || null;
        if (this._configurationOwners?.resMan !== blue.resMan)
        {
          for (const section of ["resMan", "formats", "formatOptions", "objectLoaders", "objectBuilders", "extensions", "resourceConstructors"])
            delete this._configured[section];
        }
        if (installedPolicy) Object.assign(this._configured, CopyConfiguration(installedPolicy));
        if (this._configurationOwners?.paths !== blue.paths) delete this._configured.paths;
        this._configurationOwners = { resMan: blue.resMan, paths: blue.paths, settings: TriSettingsRegistrar.getSettings() };
        // Reattaching the same manager does not reboot its cache or consumers.
        const startup = installedPolicy
          ? LiveConfiguration(this._configuration, this._configurationOwners.settings)
          : this._configuration;
        // LOAD owners are class statics. Another completed application may have
        // configured them since this manager last ran. Restore this cache's
        // original policy, never its newly requested pending policy.
        if (installedPolicy) startup.settings = { ...startup.settings, ...installedPolicy.settings };
        this._ApplyConfiguration(startup);
        this._StartCallbackMan();
        if (!installedPolicy)
        {
          const installed = Object.fromEntries(
            Object.entries(this._configured).filter(([section]) => REBOOT_CONFIGURATION_SECTIONS.has(section))
          );
          const settings = this._configurationOwners.settings;
          installed.settings = Object.fromEntries(settings.GetNames()
            .filter(name => settings.FindSetting(name).applies === meta.setting.LOAD)
            .map(name => [name, settings.GetValue(name)]));
          installedResourcePolicies.set(blue.resMan, CopyConfiguration(installed));
        }
        return this;
      }
      catch (error)
      {
        if (activeLibrary === this) activeLibrary = null;
        if (this._previousServices)
        {
          const previous = this._previousServices;
          this._previousServices = null;
          try { installBlueServices(previous, previous.running); }
          catch (restoreError) { throw new AggregateError([error, restoreError], "Configuration failed and service restoration failed.", { cause: error }); }
        }
        throw error;
      }
    });
    try { return await this._initialization; }
    finally { this._initialization = null; }
  }

  /** Restores the exact prior slots and tick activation without destroying borrowed providers. */
  async Shutdown()
  {
    if (this._initialization) await this._initialization;
    if (!this._previousServices) return this;
    this._callbackManTickOs.UnregisterForTicks(this._callbackManTicker, "BeCallbackMan");
    this._callbackManTickOs = null;
    installBlueServices(this._previousServices, this._previousServices.running);
    this._previousServices = null;
    activeLibrary = null;
    return this;
  }

  /** Ticks BeCallbackMan while it runs through Update; registered on the installed OS. */
  _callbackManTicker = new BlueCallbackManTicker(BeCallbackMan);

  /** The OS the ticker is registered on, until Shutdown. */
  _callbackManTickOs = null;

  /**
   * Configures and starts Blue's background callback manager, as Carbon's
   * startup does (ResourceLoading.cpp:85-91), and registers its ticker. Blue
   * decides between workers and Update mode; the ticker does nothing while
   * workers run.
   */
  _StartCallbackMan()
  {
    if (!callbackManStarted)
    {
      const { useWorkers, threadCount, workerModule } = this._configuration.callbackMan;
      if (workerModule !== undefined) BeCallbackMan.SetWorkerModule(workerModule);
      BeCallbackMan.SetThreadCount(threadCount);
      BeCallbackMan.Start(useWorkers);
      callbackManStarted = true;
    }
    this._configured.callbackMan = { ...this._configuration.callbackMan };
    this._callbackManTicker.mainThreadTimeSlice = this._configuration.callbackMan.mainThreadTimeSlice;
    blue.os.RegisterForTicks(this._callbackManTicker, "BeCallbackMan");
    this._callbackManTickOs = blue.os;
  }

  /** Acquires a DNA build or resource through the installed Blue services. */
  async Fetch(value, options)
  {
    return blue.Fetch(value, options);
  }
}

CjsSchema.meta.define(CjsLibrary, {
  className: "CjsLibrary",
  fields: {},
  methods: { Initialize: [], Shutdown: [], Fetch: [], SetConfiguration: [], GetConfiguration: [],
    CreateOverlay2D: [] }
});

export default CjsLibrary;

/** Keeps live owner settings; reader registrations and LOAD policy wait for reboot. */
function LiveConfiguration(configuration, settings)
{
  const result = Object.fromEntries(Object.entries(configuration)
    .filter(([section]) => !REBOOT_CONFIGURATION_SECTIONS.has(section)));
  if (result.settings)
    result.settings = Object.fromEntries(Object.entries(result.settings)
      .filter(([name]) => settings.FindSetting(name)?.applies !== meta.setting.LOAD));
  return result;
}

/** Copies configuration containers, preserving borrowed providers and executable identities. */
function CopyConfiguration(configuration)
{
  return Object.fromEntries(Object.entries(configuration).map(([section, entries]) => [section,
    Object.fromEntries(Object.entries(entries).map(([key, value]) => [key,
      ["paths", "resourceConstructors", "imageHandlers", "objectLoaders", "objectBuilders"].includes(section)
        || (section === "resMan" && ["motherLode", "source", "mainThreadLoader", "workerLoader"].includes(key))
        || (section === "effects" && key === "translator")
        ? value : CopyConfigurationData(value)]))]));
}

/** Detaches plain option data; classes, functions and class instances remain references. */
function CopyConfigurationData(value)
{
  if (Array.isArray(value)) return value.map(CopyConfigurationData);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, CopyConfigurationData(item)]));
  return value;
}

/** Validates this bounded configuration vocabulary before invoking any owner. */
function ValidateConfiguration(configuration)
{
  const plain = value => value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
  const options = new Set(["motherLode", "cacheSize", "cacheCleanup", "autoPurgePolicy", "source", "mainThreadLoader",
    "workerLoader", "useWorkerLoading", "maxConcurrentLoads", "maxPrepareTime", "maxPrepareItemsPerTick", "maxAllowedInPrepareQueue",
    "autoPumpMainThreadQueue", "queueScheduler", "urgentResourceLoads"]);
  if (!plain(configuration)) throw new TypeError("Configuration must contain named sections.");
  for (const [section, entries] of Object.entries(configuration))
  {
    if (!Object.hasOwn(DefaultConfiguration, section)) throw new TypeError(`Unsupported configuration section: ${section}`);
    if (!plain(entries)) throw new TypeError(`Configuration ${section} must contain named entries; reset is not supported.`);
    for (const [key, value] of Object.entries(entries))
    {
      if (!key || ["__proto__", "prototype", "constructor"].includes(key)) throw new TypeError("Invalid configuration entry name.");
      let valid = true;
      if (["objectLoaders", "objectBuilders"].includes(section)) valid = typeof value === "function";
      else if (section === "formats")
      {
        const Format = typeof value === "function" ? value : value?.Format;
        valid = typeof Format === "function" && Array.isArray(Format.extensions) && Format.extensions.length > 0;
        if (valid && value.routes !== undefined)
          valid = Array.isArray(value.routes) && value.routes.length > 0
            && value.routes.every(route =>
            {
              if (!plain(route)) return false;
              const { Res, extension, ex } = route;
              return typeof extension === "string" && extension.trim().replace(/^\./u, "") !== ""
                && typeof Res === "function" && Res.isResource === true
                && (ex === undefined || typeof ex === "string");
            })
            && (value.options === undefined || plain(value.options))
            && (value.workers === undefined || typeof value.workers === "boolean");
      }

      else if (section === "extensions")
      {
        const Handler = typeof value === "function" ? value : value?.Handler;
        valid = typeof Handler === "function" && (!!Handler.handlerMode || Handler.isResource === true);
      }
      else if (section === "formatOptions") valid = key === "buildClasses" && typeof value === "boolean";
      else if (section === "imageHandlers") valid = typeof value === "function";
      else if (section === "resourceConstructors") valid = typeof value === "function" || !!CjsSchema.cast(value, IBlueDynamicResourceConstructor);
      else if (section === "paths") valid = !!CjsSchema.cast(value, IBlueResFileSystem);
      else if (section === "settings") valid = ["string", "boolean", "number"].includes(typeof value)
        && (typeof value !== "number" || Number.isFinite(value));
      else if (section === "backends") valid = plain(value);
      else if (section === "callbackModules") valid = typeof value === "string" && value !== "";
      else if (section === "effects")
      {
        if (key === "source" || key === "target") valid = typeof value === "string" && /^[a-z0-9_]+$/u.test(value);
        else if (key === "translator") valid = value === null || typeof value?.buildEffect === "function";
        else if (key === "permutations") valid = value === "onDemand" || value === "all";
        else if (key === "shaderModel") valid = typeof value === "string" && value !== "";
        else valid = false;
      }
      else if (section === "callbackMan")
      {
        if (key === "useWorkers") valid = typeof value === "boolean";
        else if (key === "threadCount") valid = Number.isInteger(value) && value >= 1 && value <= 32;
        else if (key === "workerModule") valid = typeof value === "string" || value instanceof URL;
        else if (key === "mainThreadTimeSlice") valid = typeof value === "number" && Number.isFinite(value) && value > 0;
        else valid = false;
      }
      else if (section === "resMan")
      {
        valid = options.has(key) && value !== undefined;
        if (["cacheSize", "maxConcurrentLoads", "maxPrepareTime", "maxPrepareItemsPerTick", "maxAllowedInPrepareQueue"].includes(key))
          valid = typeof value === "number" && Number.isFinite(value) && value >= 0 && (key !== "maxConcurrentLoads" || value > 0);
        if (["useWorkerLoading", "autoPumpMainThreadQueue", "urgentResourceLoads"].includes(key)) valid = typeof value === "boolean";
        if (key === "queueScheduler") valid = value === null || typeof value === "function";
      }
      if (!valid) throw new TypeError(`Invalid configuration entry: ${section}.${key}`);
    }
  }
}

CjsSchema.decorateMethod(CjsLibrary, "_ApplyConfiguration", CjsSchema.meta.implemented);

CjsSchema.decorateMethod(CjsLibrary, "Initialize", CjsSchema.meta.implemented);
