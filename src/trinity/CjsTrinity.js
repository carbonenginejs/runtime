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
   * Seconds of rendered time between eviction passes.
   *
   * @cjs Configured through `CjsLibrary`; one second, from the measurement in
   *   docs internal/decisions/device-resource-registration.md.
   * @type {number}
   */
  resourceEvictionInterval = 1;

  /**
   * The short retention rule, in seconds of rendered time: used constantly, so
   * idle means gone.
   *
   * @cjs Provisional default, configured through `CjsLibrary`.
   * @type {number}
   */
  resourceRetentionShort = 10;

  /**
   * The long retention rule, in seconds of rendered time: may sit unused between
   * updates.
   *
   * @cjs Provisional default, configured through `CjsLibrary`.
   * @type {number}
   */
  resourceRetentionLong = 120;

  /**
   * The root variable store, created on its first read.
   *
   * @type {Tr2GlobalVariableStore|null}
   */
  _variableStore = null;

  /**
   * The device resources registered, Carbon's registry.
   *
   * @adapted Carbon's is a static `std::set` of raw pointers on TriDevice
   *   (`GetResourcesRegistered`, TriDevice.h:266) that owns nothing. Here it is an
   *   array on Trinity: a resource's `_registered` flag says it has an entry, so
   *   registering never searches it, and the eviction pass compacts it in place,
   *   so no `Set` or `Map` is iterated in the per-frame path (hot-path rule). It
   *   holds its resources strongly only until they are idle past their rule.
   * @type {object[]}
   */
  _resourcesRegistered = [];

  /**
   * Seconds of rendered time: the clamped tick deltas `OnTick` takes, summed, so
   * a hidden tab, which is not ticked, ages nothing. Retention counts in it.
   *
   * @cjs Trinity's own clock stands in for the runtime root's rendered time
   *   shared with resMan, and moves to it when the root provides one.
   * @type {number}
   */
  _renderedTime = 0;

  /**
   * `_renderedTime` at the last eviction pass.
   *
   * @cjs
   * @type {number}
   */
  _lastResourceEviction = 0;

  /**
   * The simulation time of the last tick, for the rendered-time delta.
   *
   * @cjs
   * @type {number}
   */
  _lastSimTime = 0;

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
   * Blue's tick: forwards to the device's `OnTick`, then sums rendered time and
   * runs the eviction pass once `resourceEvictionInterval` has passed.
   *
   * @adapted Carbon's device registers itself for Blue's tick
   *   (`BeOS->RegisterForTicks( this, TRINITY )`, TriDevice.cpp:310); here Trinity
   *   registers, because the registry it evicts is Trinity's.
   * @param {number} realTime Time since the client started, in 100ns ticks.
   * @param {number} simTime The same, slowed under load.
   * @param {*} [cookie] The registration cookie.
   * @returns {void}
   */
  OnTick(realTime, simTime, cookie = null)
  {
    this.device.OnTick(realTime, simTime, cookie);

    // The device's own clamp (TriDevice.cpp:817-822): the seconds delta, at most one.
    let delta = (Number(simTime) - this._lastSimTime) / 10000000;
    this._lastSimTime = Number(simTime) || 0;
    if (!(delta > 0)) delta = 0;
    if (delta > 1) delta = 1;
    this._renderedTime += delta;

    if (this._renderedTime - this._lastResourceEviction >= this.resourceEvictionInterval)
    {
      this._lastResourceEviction = this._renderedTime;
      this._ReleaseIdleResources();
    }
  }

  /**
   * Registers a device resource with Trinity
   * (`TriDevice::RegisterResource`, TriDevice.h:135, TriDevice.cpp:1087-1091).
   * A resource already listed keeps its one entry; only its stamp and rule are
   * refreshed. Works before `Initialize`: `Initialize` prepares what is listed.
   *
   * Carbon: TriDevice::RegisterResource (TriDevice.h:135)
   * @adapted Carbon's is static on TriDevice and holds its resources for their
   *   whole life, unregistered by their destructor. JavaScript has no destructor,
   *   so a resource is listed while used and released and dropped by the eviction
   *   pass once idle past `retention`; the rule is the further parameter that needs.
   * @param {object} resource A `Tr2DeviceResource`.
   * @param {number} retention Seconds of rendered time it may sit unused;
   *   `Infinity` never evicts it.
   * @returns {void}
   */
  RegisterResource(resource, retention)
  {
    resource._retention = retention;
    resource._lastUsed = this._renderedTime;
    resource._unregistered = false;
    if (resource._registered) return;
    resource._registered = true;
    this._resourcesRegistered.push(resource);
  }

  /**
   * Takes a device resource out of the registry at the next eviction pass
   * (`TriDevice::UnregisterResource`, TriDevice.h:136, TriDevice.cpp:1093-1106).
   *
   * Carbon: TriDevice::UnregisterResource (TriDevice.h:136)
   * @adapted Carbon erases it at once, or queues it in `s_resourcesToBeRemoved`
   *   while a release walk iterates. Here only the eviction pass changes the
   *   array: this marks the resource, `GetResourcesRegistered` stops listing it,
   *   and the pass drops it without releasing it again; a use first keeps it.
   * @param {object} resource The registered resource.
   * @returns {void}
   */
  UnregisterResource(resource)
  {
    resource._unregistered = true;
  }

  /**
   * Every registered device resource (`TriDevice::GetResourcesRegistered`,
   * TriDevice.h:266), as a snapshot.
   *
   * Carbon: TriDevice::GetResourcesRegistered (TriDevice.h:266)
   * @adapted returns a copy, so walking it cannot change the registry, and leaves
   *   out resources unregistered since their last use, which Carbon would have
   *   erased already.
   * @returns {object[]} The registered resources.
   */
  GetResourcesRegistered()
  {
    const resources = this._resourcesRegistered;
    const listed = [];
    for (let i = 0; i < resources.length; i++)
    {
      if (!resources[i]._unregistered) listed.push(resources[i]);
    }
    return listed;
  }

  /**
   * The eviction pass, run from `OnTick`: walks the registry once and compacts it
   * in place. A resource unregistered since its last use is dropped; one idle
   * past its retention is released (`ReleaseResources(TRISTORAGE_VIDEOMEMORY)`,
   * as before a device reset) and dropped; the rest are kept. A dropped
   * resource's `_registered` is cleared, so its next use registers it again.
   *
   * @cjs Carbon's registry has no eviction; this is the half of use-driven
   *   registration that removes.
   * @returns {void}
   */
  _ReleaseIdleResources()
  {
    const resources = this._resourcesRegistered;
    const now = this._renderedTime;
    let write = 0;
    // A release can register another resource; the loop reads to the live length.
    for (let read = 0; read < resources.length; read++)
    {
      const resource = resources[read];
      if (resource._unregistered)
      {
        resource._unregistered = false;
        resource._registered = false;
        continue;
      }
      if (now - resource._lastUsed > resource._retention)
      {
        resource._registered = false;
        resource.ReleaseResources(TriStorageFlags.TRISTORAGE_VIDEOMEMORY);
        resource._prepared = false;
        continue;
      }
      resources[write++] = resource;
    }
    resources.length = write;
  }

  static className = "CjsTrinity";

}

/** Trinity: the one instance classes import. */
export const trinity = new CjsTrinity();
