// Source: trinity/trinity/trinity.cpp:200-296 (InitializeTrinity)
// Source: trinity/trinity/TriDevice.h:135-136, :262-266, :347 (RegisterResource, GetResourcesRegistered, gTriDev)
// Source: trinity/trinity/TriDevice.cpp:1041, :1084-1106
//
// Trinity's holder: one instance, `trinity`, that classes import, as `blue` is
// `new CjsBlue()`. Carbon's trinity is a Python module (PyModuleDef "trinity",
// trinity.cpp:131-138) whose state lives in module globals - `gTriDev`, the
// global variable store, the font manager - and in TriDevice's statics; here
// that state is instances on this object (docs
// internal/decisions/device-resource-registration.md, projects/cjs-runtime-root.md).
import { blue, IBlueEvents } from "#blue";
import { TriStorageFlags } from "#consts/graphics";
import { noise } from "../global/math/noise.js";
import { TRINITY } from "./core/device/trinityTickCookie.js";
import { Tr2DeviceResourceState, TICKS_PER_SECOND } from "./core/device/deviceResourceState.js";
import { Tr2GlobalVariableStore } from "./core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "./generated/trinityCore/enums.js";

// IMPORTS NOTHING THAT REACHES THE DEVICE-RESOURCE CLASSES. Every class imports
// `trinity`, and Tr2DeviceResource is applied while classes are being defined
// (`@be.inherit`), so if this module's imports reached a class that inherits it,
// loading Tr2DeviceResource.js first would ask for it before it exists. The
// device, the font manager and the renderer are therefore handed to
// `Initialize` by the host's composition (CjsLibrary), which imports them;
// the variable store's module is light and created here. scripts/lint-device-imports.js
// and test/trinity/trinity-load-order.test.js keep it so.

/**
 * Trinity: the device, the global variable store, the font manager and the
 * device-resource registry, as one object classes import.
 *
 * Ours (docs architecture/non-carbon-extensions.md, *Trinity's holder*):
 * Carbon has no class here; its trinity is a Python module.
 */
export class CjsTrinity extends IBlueEvents
{

  /**
   * The device, null until `Initialize` builds it for the backend the host chose.
   *
   * Carbon: gTriDev (TriDevice.h:347)
   * @type {TriDevice|null}
   */
  device = null;

  /**
   * The font manager, created by `Initialize` (trinity.cpp:290).
   *
   * Carbon: g_fontManager (Tr2FontManager.h)
   * @type {Tr2FontManager|null}
   */
  fontManager = null;

  /**
   * The one idle rule for scene content: seconds of Blue frame time a prepared
   * scene-content device resource may go unused (no `EnsureGood`, no `KeepAlive`)
   * before the sweep releases it.
   *
   * @cjs Configured through `CjsLibrary` (`deviceResources.idleRule`); a
   *   provisional default (docs internal/decisions/device-resource-registration.md,
   *   *Revised lifecycle* § 5).
   * @type {number}
   */
  resourceIdleRule = 30;

  /**
   * Seconds of Blue frame time between sweeps. The sweep is rare and never per
   * frame; `CollectResources` runs one on demand.
   *
   * @cjs Configured through `CjsLibrary` (`deviceResources.sweepInterval`).
   * @type {number}
   */
  resourceSweepInterval = 60;

  /**
   * The root variable store, created on its first read.
   *
   * @type {Tr2GlobalVariableStore|null}
   */
  _variableStore = null;

  /**
   * Carbon's registry: every registered device resource, which a device swap or
   * reset walks. Infrastructure is on it from its constructor to its `Destruct`;
   * scene content while it is prepared. Each entry is the resource and, at the
   * same index in `_registeredGenerations`, the generation it was registered
   * with; an entry whose generation no longer matches is stale (destructed, or
   * released by the sweep), skipped by every walk and compacted by the sweep.
   *
   * @adapted Carbon's is a static `std::set` of raw pointers on TriDevice
   *   (`GetResourcesRegistered`, TriDevice.h:266), erased by the destructor. Here
   *   it is an array on Trinity with the sweep's idiom (operator: arrays, not Maps
   *   or Sets, for this registry), holding strongly until the sweep drops a stale
   *   entry (*Revised lifecycle* § 1).
   * @type {object[]}
   */
  _resourcesRegistered = [];

  /**
   * The generation of each entry in `_resourcesRegistered`, at the same index.
   *
   * @cjs
   * @type {number[]}
   */
  _registeredGenerations = [];

  /**
   * The prepared scene-content device resources: the sweep's array. Each entry is
   * the resource and, at the same index in `_sceneGenerations`, the generation
   * it was pushed with; an entry whose generation no longer matches its
   * resource's is stale and is dropped.
   *
   * @cjs Use-driven eviction is ours (docs internal/decisions/device-resource-registration.md,
   *   *Revised lifecycle* § 4). Two parallel arrays, for the hot-path rule; the
   *   sweep compacts them in place.
   * @type {object[]}
   */
  _sceneResources = [];

  /**
   * The generation of each entry in `_sceneResources`, at the same index.
   *
   * @cjs
   * @type {number[]}
   */
  _sceneGenerations = [];

  /**
   * Blue frame time (ticks) of the last sweep.
   *
   * @cjs
   * @type {number}
   */
  _lastSweep = 0;

  /**
   * The root of the variable-store graph, created on first read.
   *
   * Carbon: GlobalStore (Tr2VariableStore.cpp:459-463)
   * @adapted Carbon's is a free function with a function-local static; here it
   *   is Trinity's, created the same way, on first use, so constructors register
   *   into it before `Initialize`.
   * @returns {Tr2GlobalVariableStore} The root store.
   */
  get variableStore()
  {
    if (!this._variableStore) this._variableStore = new Tr2GlobalVariableStore();
    return this._variableStore;
  }

  /**
   * Replaces the root variable store.
   *
   * @cjs Carbon's global store lives for the process; a test isolates itself
   *   from the rest of the suite, or a host resets between scenes, through this
   *   (`Tr2VariableStore.setGlobalStore`).
   * @param {Tr2GlobalVariableStore|null} store The new root; null makes the next read create one.
   */
  set variableStore(store)
  {
    this._variableStore = store;
  }

  /**
   * Carbon's `InitializeTrinity` (trinity.cpp:200-296), for the device the host
   * built: registers the global variables, takes the font manager and runs the
   * renderer's start-up, prepares every resource already registered as
   * `TriDevice::CreateDevice` does (TriDevice.cpp:1041), and registers Trinity for
   * Blue's tick. The font manager and the device are assigned last, once every
   * other step has succeeded.
   *
   * Ported from InitializeTrinity: the `BlitOriginal`, `BlitCurrent` and
   * `g_texelSize` variables (:204-206), the font manager (:290), the renderer's
   * global variables (:292) and the Perlin noise warm-up (:295). Not ported,
   * because nothing here consumes them: `TrinityALCrashes`, parallel encoding
   * (:216-242, Metal and DX12 only), the start-up arguments (:244-284) and the
   * Granny allocator (:286-288).
   *
   * @adapted Carbon runs InitializeTrinity when the module loads, and the host
   *   builds the device itself (Python's `trinity.TriDevice()`). Here the host's
   *   composition (`CjsLibrary.AttachTrinity`) builds the device for the
   *   backend it chose and hands it in with the font manager (Carbon's
   *   `Tr2FontManager::Initialize`, trinity.cpp:290) and the renderer whose
   *   `Initialize` runs at :292: this module imports none of them, so that every
   *   class can import `trinity`. Trinity never chooses a backend.
   * @param {object} options Start-up options.
   * @param {object} options.device The `TriDevice` the host built.
   * @param {object} options.fontManager The font manager, from `Tr2FontManager.initialize()`.
   * @param {object} options.renderer The renderer, `Tr2Renderer`, whose static `initialize` runs here.
   * @returns {CjsTrinity} This.
   * @throws {Error} When no device is given, or Trinity is already initialized.
   */
  Initialize({ device = null, fontManager = null, renderer = null } = {})
  {
    if (this.device) throw new Error("trinity is already initialized");
    if (!device) throw new Error("no device backend chosen");
    if (!fontManager || !renderer) throw new TypeError("trinity.Initialize needs the font manager and the renderer.");

    // trinity.cpp:204-206.
    const store = this.variableStore;
    store.RegisterVariableInternal("BlitOriginal", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    store.RegisterVariableInternal("BlitCurrent", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    store.RegisterVariableInternal("g_texelSize", TriVariableContentType.TRIVARIABLE_FLOAT4, [ 0, 0, 0, 0 ]);

    renderer.initialize();

    // Carbon builds the noise table here before other threads call it; ours is
    // built when noise.js loads, so this call only matches the order.
    noise.perlin1DCarbon(0.0, 1.0, 1.0, 1);

    blue.os.RegisterForTicks(this, TRINITY);
    this.fontManager = fontManager;
    this.SetDevice(device);
    return this;
  }

  /**
   * Puts a device in place: the one way one gets in. The same device again does
   * nothing. A previous device has every registered resource's device objects
   * released from it first (`ReleaseDeviceResources(TRISTORAGE_ALL)`); then the
   * new one is assigned and everything still registered is prepared on it, as
   * `TriDevice::CreateDevice` prepares what is already registered
   * (TriDevice.cpp:1038-1059). A device lost and recovered is reset in place
   * (`TriDevice.HandleRenderTick`), not replaced through this.
   *
   * @cjs Carbon fills `gTriDev` from TriDevice's constructor, with the first
   *   device built (`TriDeviceLock`, TriDevice.h:356-365), and never replaces it.
   *   Here the device is handed in, so it can be replaced: only `trinity` (and the
   *   composition wrapping it) holds it, and every class reads `trinity.device`
   *   when it uses it (scripts/lint-device-imports.js).
   * @param {object} device The `TriDevice` to use.
   * @returns {CjsTrinity} This.
   * @throws {TypeError} For a null device: clearing it is `Shutdown`'s.
   */
  SetDevice(device)
  {
    if (!device) throw new TypeError("trinity.SetDevice needs a device; Shutdown clears it.");
    if (device === this.device) return this;
    const previous = this.device;
    if (previous) previous.ReleaseDeviceResources(TriStorageFlags.TRISTORAGE_ALL);
    this.device = device;
    device.PrepareDeviceResources();
    return this;
  }

  /**
   * Stops Trinity: unregisters its tick, releases every registered resource's
   * device objects from the device and drops the device and the font manager.
   * The registry and the variable store stay, so a later `Initialize` prepares
   * what is still registered.
   *
   * @cjs Carbon's Trinity lives for the process; a host or test that starts it
   *   again stops it here. The font manager's own tick is stopped by its owner
   *   (`Tr2FontManager.shutdown`), which this module does not import.
   * @returns {CjsTrinity} This.
   */
  Shutdown()
  {
    blue.os.UnregisterForTicks(this, TRINITY);
    if (this.device) this.device.ReleaseDeviceResources(TriStorageFlags.TRISTORAGE_ALL);
    this.device = null;
    this.fontManager = null;
    return this;
  }

  /**
   * Blue's tick: forwards to the device's `OnTick`, then runs the sweep once
   * `resourceSweepInterval` seconds of Blue frame time have passed.
   *
   * @adapted Carbon's device registers itself for Blue's tick
   *   (`BeOS->RegisterForTicks( this, TRINITY )`, TriDevice.cpp:310); here Trinity
   *   registers, because the registry it sweeps is Trinity's.
   * @param {number} realTime Time since the client started, in 100ns ticks.
   * @param {number} simTime The same, slowed under load.
   * @param {*} [cookie] The registration cookie.
   * @returns {void}
   */
  OnTick(realTime, simTime, cookie = null)
  {
    this.device.OnTick(realTime, simTime, cookie);

    const now = blue.os.GetCurrentFrameTime();
    if (now - this._lastSweep >= this.resourceSweepInterval * TICKS_PER_SECOND)
    {
      this._lastSweep = now;
      this.CollectResources();
    }
  }

  /**
   * Registers a device resource with Trinity, Carbon's registry
   * (`TriDevice::RegisterResource`, TriDevice.h:135, TriDevice.cpp:1087-1091).
   * Infrastructure calls it from its constructor, as Carbon's base constructor
   * does; scene content is registered by its own `EnsureGood` while prepared.
   * Works before `Initialize`: `Initialize` prepares what is registered.
   *
   * Carbon: TriDevice::RegisterResource (TriDevice.h:135)
   * @adapted Carbon's is static on TriDevice; here the registry is Trinity's
   *   (`_resourcesRegistered`), and an add is a push with the resource's current
   *   generation, once per generation, as Carbon's set holds each resource once.
   * @param {object} resource A `Tr2DeviceResource`.
   * @returns {void}
   */
  RegisterResource(resource)
  {
    // An installed class takes the fields on first use (`@be.inherit` copies methods).
    const generation = resource._generation | 0;
    if (resource._registeredGeneration === generation) return;
    resource._generation = generation;
    resource._registeredGeneration = generation;
    this._resourcesRegistered.push(resource);
    this._registeredGenerations.push(generation);
  }

  /**
   * Takes a device resource out of the registry, as its destructor does in
   * Carbon (`TriDevice::UnregisterResource`, TriDevice.h:136,
   * TriDevice.cpp:1093-1106): the resource is destructed. A scene-content
   * resource's state becomes `DESTRUCTED` and its generation moves on, so its
   * entry in the sweep's array is stale and its `EnsureGood` never prepares again.
   *
   * Carbon: TriDevice::UnregisterResource (TriDevice.h:136)
   * @adapted Carbon erases it, or queues it while a release walk iterates; here
   *   the generation moving on makes its entries stale at once, every walk skips
   *   them, and the sweep compacts them.
   * @param {object} resource The registered resource.
   * @returns {void}
   */
  UnregisterResource(resource)
  {
    resource._state = Tr2DeviceResourceState.DESTRUCTED;
    resource._generation = (resource._generation | 0) + 1;
    resource._listed = false;
  }

  /**
   * Every registered device resource (`TriDevice::GetResourcesRegistered`,
   * TriDevice.h:266), as a snapshot.
   *
   * Carbon: TriDevice::GetResourcesRegistered (TriDevice.h:266)
   * @adapted returns a copy, so walking it cannot change the registry.
   * @returns {object[]} The registered resources.
   */
  GetResourcesRegistered()
  {
    const resources = this._resourcesRegistered;
    const generations = this._registeredGenerations;
    const listed = [];
    for (let i = 0; i < resources.length; i++)
    {
      if ((resources[i]._generation | 0) === generations[i]) listed.push(resources[i]);
    }
    return listed;
  }

  /**
   * Lists a scene-content resource that has just been prepared: an entry in the
   * sweep's array with its current generation, and Carbon's registry, so a
   * device swap or reset reaches it. Called by `Tr2DeviceResource.EnsureGood`.
   *
   * @cjs
   * @param {object} resource The prepared resource.
   * @returns {void}
   */
  _ListSceneResource(resource)
  {
    // An installed class takes the field on first use (`@be.inherit` copies methods).
    resource._generation |= 0;
    resource._listed = true;
    this._sceneResources.push(resource);
    this._sceneGenerations.push(resource._generation);
    this.RegisterResource(resource);
  }

  /**
   * The sweep: walks the scene-content array once and compacts it in place. A
   * stale entry (its generation moved on) or a destructed resource is dropped;
   * a resource unused for longer than `resourceIdleRule` seconds of Blue frame
   * time is released (`ReleaseResources(TRISTORAGE_VIDEOMEMORY)`, as before a
   * device reset), leaves Carbon's registry and drops back to `NONE` with its
   * generation moved on, so its next use prepares and lists it again; the rest
   * are kept. Runs from `OnTick` every `resourceSweepInterval`, and on demand: a
   * host calls it after a scene unload or a failure.
   *
   * @cjs Use-driven eviction is ours (docs internal/decisions/device-resource-registration.md,
   *   *Revised lifecycle* § 6). The expired cache and the GPU budget are not
   *   built (§ 7a): an expired resource is released at once.
   * @returns {void}
   */
  CollectResources()
  {
    const resources = this._sceneResources;
    const generations = this._sceneGenerations;
    const expiry = blue.os.GetCurrentFrameTime() - this.resourceIdleRule * TICKS_PER_SECOND;
    let write = 0;
    // A release can list another resource; the loop reads to the live length.
    for (let read = 0; read < resources.length; read++)
    {
      const resource = resources[read];
      // Stale: its generation moved on (destructed, or released and listed again).
      if (generations[read] !== resource._generation) continue;
      // Released by the device and not prepared again: its next use lists it again.
      if (resource._state !== Tr2DeviceResourceState.PREPARED)
      {
        resource._listed = false;
        continue;
      }
      if (resource._stamp < expiry)
      {
        resource._listed = false;
        resource._state = Tr2DeviceResourceState.NONE;
        // The generation moving on leaves Carbon's registry too: its entry there is stale.
        resource._generation = (resource._generation | 0) + 1;
        resource.ReleaseResources(TriStorageFlags.TRISTORAGE_VIDEOMEMORY);
        continue;
      }
      resources[write] = resource;
      generations[write] = generations[read];
      write++;
    }
    resources.length = write;
    generations.length = write;

    // Carbon's registry: drop the stale entries, the same compaction.
    const registered = this._resourcesRegistered;
    const registeredGenerations = this._registeredGenerations;
    let kept = 0;
    for (let read = 0; read < registered.length; read++)
    {
      if ((registered[read]._generation | 0) !== registeredGenerations[read]) continue;
      registered[kept] = registered[read];
      registeredGenerations[kept] = registeredGenerations[read];
      kept++;
    }
    registered.length = kept;
    registeredGenerations.length = kept;
  }

  static className = "CjsTrinity";

}

/** Trinity: the one instance classes import. */
export const trinity = new CjsTrinity();
