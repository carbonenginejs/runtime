import { blue } from "../blue/index.js";
import { installBlueServices } from "../blue/blue.js";
import { BeCallbackMan } from "../blue/services/BlueCallbackMan.js";
import { BlueCallbackManTicker } from "../blue/services/BlueCallbackManTicker.js";
import { CjsSchema, meta } from "#schema";
import { CjsOverlay2D } from "./overlay/CjsOverlay2D.js";

import { IBlueResFileSystem } from "../blue/interfaces/IBlueResFileSystem.js";
import { IBlueDynamicResourceConstructor } from "../blue/interfaces/IBlueDynamicResourceConstructor.js";
import { DefaultConfiguration } from "./configuration.js";
import { ImageIO } from "../resource/imageio/ImageIO.js";
import { TriSettingsRegistrar } from "../trinity/core/TriSettingsRegistrar.js";
import { Tr2EffectRes } from "../trinity/shader/Tr2EffectRes.js";
import { trinity, TriDevice, Tr2FontManager, Tr2Renderer, Tr2RenderContext_GetMainThreadRenderContext } from "../trinity/index.js";
import { SetEffectPathDefaults } from "#utils/effectPath";
import { CjsLibrarySettingsTicker } from "./CjsLibrarySettingsTicker.js";

let activeLibrary = null;

/** The audio Trinity barrel, imported once by the first DNA Fetch. */
let sofAudioClasses = null;

/**
 * Settings this library holds at a fixed value, with the reason. A requested
 * value is still recorded (and an application may still save it); the owner
 * always receives the fixed one.
 */
const FORCED_SETTINGS = new Map([
  // Carbon's g_newBloom (default true, Tr2PostProcessRenderer.cpp:23-24) works
  // but is not fully supported or set up in Carbon itself.
  [ "newBloom", { value: false, reason: "Not fully supported in Carbon" } ]
]);

/** The setting categories that name a device backend, as AttachTrinity's `backend` names them. */
const BACKEND_CATEGORIES = Object.freeze({ webgpu: "WebGPU", webgl2: "WebGL2" });


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
  /**
   * Whether the application wants audio. Ours, with no Carbon counterpart.
   * Unavailable until an audio manager is attached (AttachAudio) in a browser
   * with Web Audio; while it is on and available, this library enables the
   * attached manager at the first user gesture (an AudioContext needs one) and
   * disables it when it goes off.
   */
  @meta.setting("audioEnabled", { category: "audio" })
  static audioEnabled = false;

  /**
   * The initialized application root, or null before startup and after shutdown.
   * Startup reserves the single root before publishing it to application wrappers.
   *
   * @implemented
   * @returns {CjsLibrary|null} The shared, initialized library.
   */
  static get instance()
  {
    return activeLibrary && !activeLibrary._initialization && activeLibrary._previousServices
      ? activeLibrary : null;
  }

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
   *
   * @implemented
   * @param {object} configuration Normalized application registration configuration.
   * @returns {void}
   */
  _ApplyConfiguration(configuration)
  {
    const { resMan, paths, settings } = this._configurationOwners;
    this._ValidateConfigurationOwners(configuration);
    this._configurationFailure = null;
    for (const section of ["formatOptions", "resMan", "formats", "objectLoaders", "objectBuilders", "extensions",
      "resourceConstructors", "imageHandlers", "paths", "settings", "callbackModules", "effects", "deviceResources"])
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
          resMan.Register({ ...entries });
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
          else if (section === "settings") settings.SetValue(key, FORCED_SETTINGS.has(key) ? FORCED_SETTINGS.get(key).value : value);
          else if (section === "callbackModules") BeCallbackMan.RegisterCallbackModule(key, value);
          // Trinity's sweep reads them on its next tick.
          else if (section === "deviceResources" && key === "idleRule") TriDevice.resourceIdleRule = value;
          else if (section === "deviceResources" && key === "sweepInterval") TriDevice.resourceSweepInterval = value;
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


  /**
   * Builds the device for the backend the host chose and starts Trinity with it:
   * sets the host's abstraction layer on the main render context, constructs the
   * `TriDevice`, creates the font manager (`Tr2FontManager::Initialize`) and calls
   * `trinity.Initialize`, which runs Carbon's InitializeTrinity for them.
   *
   * Ours: Carbon's host builds the device itself (Python's `trinity.TriDevice()`)
   * and Trinity starts when its module loads; here the composition does both, so
   * Trinity imports no device and every class can import `trinity`. The backend
   * is whatever the host built - the WebGPU layer from its own `GPUDevice`, WebGL2,
   * or `Tr2RenderContextALStub` for tests and tools - and nothing maps a name to
   * one or falls back to another.
   *
   * @param {object} options Start-up options.
   * @param {object} options.renderContextAL The host's abstraction layer.
   * @param {"webgpu"|"webgl2"|null} [options.backend] Which backend that layer is; settings
   *   categorised for the other one become unavailable. Null (a stub or tool) marks none.
   * @returns {TriDevice} The device, now `trinity.device`.
   * @throws {Error} When no abstraction layer is given, or Trinity is already initialized.
   */
  AttachTrinity({ renderContextAL = null, backend = null } = {})
  {
    if (!renderContextAL) throw new Error("no device backend chosen");
    if (trinity.device) throw new Error("trinity is already initialized");
    if (backend !== null && !Object.hasOwn(BACKEND_CATEGORIES, backend))
      throw new RangeError(`backend must be ${Object.keys(BACKEND_CATEGORIES).join(" or ")}, or null`);
    this._backend = backend;
    // Forced settings hold before the renderer reads them at creation.
    this._ApplySettingsPolicy(false);
    Tr2RenderContext_GetMainThreadRenderContext().SetRenderContextAL(renderContextAL);
    const device = new TriDevice();
    trinity.Initialize({ device, fontManager: Tr2FontManager.initialize(), renderer: Tr2Renderer });
    this._startedTrinity = true;
    return device;
  }

  /**
   * The browser backend AcquireBackend acquired (CjsBrowserBackend), owned by
   * this library and released by Shutdown; null otherwise.
   */
  backend = null;

  /**
   * Acquires the browser's device backend on a canvas, WebGPU else WebGL2, and,
   * unless `effects` were configured, configures the effect policy it draws.
   * Runs before Initialize, because effects are committed at startup. Attach
   * its abstraction layer with AttachTrinity after Initialize. Ours: Carbon's
   * client builds its device itself.
   *
   * @param {object} options CjsBrowserBackend.create options: `canvas`, `preference`, `alphaMode`.
   * @param {string} [options.shaderModel="depth"] The shader model `/effect/` paths resolve to.
   * @returns {Promise<CjsBrowserBackend>} The backend, also `this.backend`.
   * @throws {Error} After Initialize, or when a backend is already held.
   */
  async AcquireBackend({ shaderModel = "depth", ...options } = {})
  {
    if (this._previousServices || this._initialization) throw new Error("AcquireBackend runs before Initialize.");
    if (this.backend) throw new Error("This library already holds a backend.");
    const { CjsBrowserBackend } = await import("./platform/CjsBrowserBackend.js");
    this.backend = await CjsBrowserBackend.create(options);
    if (!Object.keys(this._configuration.effects).length)
      this.SetConfiguration({ effects: this.backend.GetEffectConfiguration(shaderModel) });
    return this.backend;
  }

  /** Releases the backend AcquireBackend acquired. */
  _ReleaseBackend()
  {
    if (!this.backend) return;
    const backend = this.backend;
    this.backend = null;
    backend.Destroy();
  }

  /** Whether AttachTrinity started Trinity, so Shutdown stops it. */
  _startedTrinity = false;

  /** The backend AttachTrinity started, "webgpu" or "webgl2"; null before, or for a stub. */
  _backend = null;

  /** The audio manager AttachAudio received, or null. */
  _audio = null;

  /** The last failure enabling attached audio, until `audioEnabled` goes off; null when none. */
  _audioFailure = null;

  /** Gesture listeners installed by AttachAudio, removed by DetachAudio. */
  _audioGesture = null;

  /** Runs the settings policy on each Blue tick, registered at Initialize. */
  _settingsTicker = new CjsLibrarySettingsTicker(this);

  /** The OS the settings ticker is registered on, until Shutdown. */
  _settingsTickOs = null;

  /**
   * Whether a registered setting is available, and why not. The UI asks this
   * when it draws a setting: an unavailable one shows disabled with its reason.
   * Ours, with no Carbon counterpart. A value written while a setting is
   * unavailable is still stored; it only has no effect (or, for a forced
   * setting, the fixed value is what the engine receives).
   *
   * @param {string} name The setting's name.
   * @returns {{available: boolean, reason: string|null}} The availability.
   */
  GetSettingAvailability(name)
  {
    const unavailable = reason => ({ available: false, reason });
    const forced = FORCED_SETTINGS.get(name);
    if (forced) return unavailable(forced.reason);
    if (name === "audioEnabled")
    {
      if (!HasWebAudio()) return unavailable("Web Audio is not supported in this browser");
      if (!this._audio) return unavailable("No audio engine is attached");
      return { available: true, reason: null };
    }
    const category = TriSettingsRegistrar.getSettings().FindSetting(name)?.category ?? null;
    if (this._backend && category)
    {
      const others = Object.keys(BACKEND_CATEGORIES).filter(backend => backend !== this._backend && category.includes(backend));
      if (others.length && !category.includes(this._backend))
        return unavailable(`${others.map(backend => BACKEND_CATEGORIES[backend]).join(" and ")} only`);
    }
    return { available: true, reason: null };
  }

  /**
   * Attaches the application's audio manager (a CjsAudioMan; core does not
   * import the audio layer, so it is not type-checked). `audioEnabled` becomes available in a browser
   * with Web Audio. While it is on, the manager is enabled at the first user
   * gesture once it has a library installed; when it goes off, it is disabled.
   * The library itself is the application's to supply. Ours, as AttachTrinity is.
   *
   * @param {object} manager The audio manager.
   * @returns {object} The manager.
   */
  AttachAudio(manager)
  {
    if (!manager) throw new TypeError("AttachAudio requires an audio manager");
    if (this._audio && this._audio !== manager) this.DetachAudio();
    this._audio = manager;
    this._audioFailure = null;
    const target = globalThis.addEventListener ? globalThis : null;
    if (target && !this._audioGesture)
    {
      // An AudioContext may start inside a gesture handler on every browser.
      const handler = () => this._ApplySettingsPolicy(true);
      for (const type of [ "pointerdown", "keydown" ]) target.addEventListener(type, handler, true);
      this._audioGesture = { target, handler };
    }
    this._ApplySettingsPolicy(false);
    return manager;
  }

  /** Disables and releases the attached audio manager; `audioEnabled` becomes unavailable. */
  DetachAudio()
  {
    if (this._audioGesture)
    {
      const { target, handler } = this._audioGesture;
      for (const type of [ "pointerdown", "keydown" ]) target.removeEventListener(type, handler, true);
      this._audioGesture = null;
    }
    if (this._audio && AudioIsEnabled(this._audio)) this._audio.Disable();
    this._audio = null;
    this._audioFailure = null;
  }

  /** The attached audio manager's state for display: attached, enabled, and the last enable failure. */
  GetAudioState()
  {
    return { attached: this._audio !== null, enabled: this._audio ? AudioIsEnabled(this._audio) : false,
      failure: this._audioFailure ? String(this._audioFailure.message ?? this._audioFailure) : null };
  }

  /**
   * Holds forced settings at their fixed values and starts or stops attached
   * audio to follow `audioEnabled`. Runs on each Blue tick and inside a user
   * gesture; `gesture` says which. Outside a gesture, audio starts only once the
   * page has had one (`navigator.userActivation.hasBeenActive`).
   *
   * @param {boolean} gesture Whether this runs inside a user gesture handler.
   */
  _ApplySettingsPolicy(gesture)
  {
    const settings = TriSettingsRegistrar.getSettings();
    for (const [ name, { value } ] of FORCED_SETTINGS)
      if (settings.FindSetting(name) && settings.GetValue(name) !== value) settings.SetValue(name, value);

    const audio = this._audio;
    if (!audio) return;
    const wanted = CjsLibrary.audioEnabled === true && this.GetSettingAvailability("audioEnabled").available;
    const enabled = AudioIsEnabled(audio);
    if (!wanted)
    {
      this._audioFailure = null;
      if (enabled) audio.Disable();
      return;
    }
    if (enabled || this._audioFailure || !audio.library) return;
    if (!gesture && globalThis.navigator?.userActivation?.hasBeenActive !== true) return;
    try
    {
      if (!audio.Enable()) this._audioFailure = new Error("Audio could not start (no audio device)");
    }
    catch (error)
    {
      this._audioFailure = error;
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
   * A default SOF and character library are constructed here, never by the global holder.
   * The default SOF reads its catalog lazily through the installed resource manager;
   * a supplied SOF retains its caller's configuration.
   * Repeated initialization returns this root until Shutdown; the first call
   * chooses its providers. All provider validation precedes publication.
   *
   * @implemented
   * @param {object} [options={}] Preconfigured resMan, paths, os, sof, characterLibrary and audio providers.
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
        let createdSof = null;
        if (!Object.hasOwn(services, "sof"))
        {
          const { EveSOF } = await import("../sof/EveSOF.js");
          createdSof = services.sof = new EveSOF();
        }
        let createdCharacterLibrary = null;
        if (!Object.hasOwn(services, "characterLibrary"))
        {
          const { CjsCharacterLibraryManager } = await import("../character/library/CjsCharacterLibraryManager.js");
          createdCharacterLibrary = services.characterLibrary = new CjsCharacterLibraryManager();
        }
        this._previousServices = installBlueServices(services);
        // The character library and the character factory register their own formats on the installed resMan; this
        // root lists none.
        if (createdCharacterLibrary)
        {
          createdCharacterLibrary.Initialize(blue);
          const { CjsCharacterFactory } = await import("../character/factory/CjsCharacterFactory.js");
          CjsCharacterFactory.registerObjectBuilders(blue.resMan);
        }
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
        if (createdSof)
        {
          // The catalog's EveSOFData classes register on import; the SOF reads them through resMan.
          await import("../sof/index.js");
          const { CjsBlackFormat } = await import("../blue/formats/black/CjsBlackFormat.js");
          const resMan = blue.resMan;
          const paths = blue.paths;
          await createdSof.Register({
            // EveSOF's getObject is two-mode: catalog reads ask for runtime
            // objects; documents a build inlines (controllers, model curves,
            // effect children) ask for the file's root as model values.
            resources: { getObject: async (path, context) =>
            {
              if (context?.output !== "values") return resMan.FetchObject(path);
              const file = await paths.GetStreamFromPath(path);
              if (!file) return null;
              const read = CjsBlackFormat.read(file.data, { emit: "json" });
              return (read.root ?? read).object ?? null;
            } },
            paths: blue.paths,
            lazyData: true
          });
        }

        this._StartCallbackMan();
        blue.os.RegisterForTicks(this._settingsTicker, "CjsLibrarySettings");
        this._settingsTickOs = blue.os;
        this._ApplySettingsPolicy(false);
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

  /**
   * Restores the exact prior slots and tick activation without destroying borrowed
   * providers, then releases a backend AcquireBackend acquired.
   */
  async Shutdown()
  {
    if (this._initialization) await this._initialization;
    if (!this._previousServices)
    {
      this._ReleaseBackend();
      return this;
    }
    if (this._startedTrinity)
    {
      // The font manager's tick first: trinity.Shutdown drops the reference.
      Tr2FontManager.shutdown();
      trinity.Shutdown();
      this._startedTrinity = false;
    }
    this._callbackManTickOs.UnregisterForTicks(this._callbackManTicker, "BeCallbackMan");
    this._callbackManTickOs = null;
    this._settingsTickOs?.UnregisterForTicks(this._settingsTicker, "CjsLibrarySettings");
    this._settingsTickOs = null;
    this.DetachAudio();
    this._backend = null;
    installBlueServices(this._previousServices, this._previousServices.running);
    this._previousServices = null;
    activeLibrary = null;
    // After Trinity stopped: the device no longer renders through it.
    this._ReleaseBackend();
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

  /**
   * Acquires a live DNA graph through SOF, or an object/resource through resMan.
   *
   * @cjs Application routing belongs to the composition root; Blue only holds the services.
   * @adapted TEMPORARY: SOF emits values. Hydrate them here until the new type
   *   handlers replace CjsSchema.from, then direct SOF construction replaces the
   *   intermediate graph. Keep this bridge in one place; service values builds stay unchanged.
   * @param {string} value DNA or resource path.
   * @param {object} [options] Options forwarded to the selected service, except `awaitResources`.
   * @param {boolean} [options.awaitResources=false] Resolve only once every resource the result
   *   reaches has loaded or failed (`BlueResMan.Watch`, ccpwgl's `Tw2Library.Fetch(source, awaitResources)`).
   * @returns {Promise<object|null>} Constructed graph, loaded resource, or the SOF's null build result.
   */
  async Fetch(value, { awaitResources = false, ...options } = {})
  {
    const result = await this._Fetch(value, options);
    if (awaitResources && result) await blue.resMan.Watch(result);
    return result;
  }

  /** Routes one Fetch to the SOF or resMan. */
  async _Fetch(value, options)
  {
    if (typeof value === "string" && !/^[a-z][a-z0-9+.-]*:[/\\]/i.test(value)
      && value.split(":").length >= 3)
    {
      if (!blue.sof) throw new Error("SOF is not configured");
      // SOF output declares audio emitters (TriObserverLocal/AudEmitter); their
      // classes register on import, and hydration resolves them by name.
      await (sofAudioClasses ??= import("../audio/trinity/index.js"));
      const values = await blue.sof.BuildFromDNA(value, options);
      return values === null ? null : CjsSchema.from(values._type, values);
    }

    return blue.resMan.Fetch(value, options);
  }
}

/** Whether this realm has a Web Audio context constructor. */
function HasWebAudio()
{
  return typeof (globalThis.AudioContext ?? globalThis.webkitAudioContext) === "function";
}

/** Whether an attached audio manager's engine is enabled (CjsAudioMan: its system's manager). */
function AudioIsEnabled(audio)
{
  return audio.system?.manager?.enabled === true;
}

CjsSchema.meta.define(CjsLibrary, {
  name: "CjsLibrary",
  fields: {},
  methods: { Initialize: [], Shutdown: [], Fetch: [], SetConfiguration: [], GetConfiguration: [],
    CreateOverlay2D: [] }
});


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
  const options = new Set(["motherLode", "cacheSize", "autoPurgePolicy", "source", "mainThreadLoader",
    "workerLoader", "useWorkerLoading", "maxConcurrentLoads", "maxPrepareTime", "maxAllowedInPrepareQueue",
    "urgentResourceLoads"]);
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
      else if (section === "deviceResources")
        valid = (key === "idleRule" || key === "sweepInterval") && typeof value === "number" && Number.isFinite(value) && value > 0;
      else if (section === "resMan")
      {
        valid = options.has(key) && value !== undefined;
        if (["cacheSize", "maxConcurrentLoads", "maxPrepareTime", "maxAllowedInPrepareQueue"].includes(key))
          valid = typeof value === "number" && Number.isFinite(value) && value >= 0 && (key !== "maxConcurrentLoads" || value > 0);
        if (["useWorkerLoading", "urgentResourceLoads"].includes(key)) valid = typeof value === "boolean";
      }
      if (!valid) throw new TypeError(`Invalid configuration entry: ${section}.${key}`);
    }
  }
}
