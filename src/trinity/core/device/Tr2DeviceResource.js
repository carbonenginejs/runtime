// Source: trinity/trinity/Tr2DeviceResource.h
// Source: trinity/trinity/Tr2DeviceResource.cpp
//
// Carbon's base for objects that own device resources. The registry (on
// `trinity`; TriDevice forwards Carbon's names) prepares them when resources may
// be created and releases them before a reset or shutdown.
//
// Carbon notes this is "not a proper Blue interface - it does not inherit
// from IRoot" (h:19-21): a class takes it as one of several C++ bases. In
// JavaScript a class has one base, so the Eve and Trinity classes take it the
// way they take their other secondary bases, through `@be.inherit`, which
// installs PrepareResources, IsGood, KeepAlive, EnsureGood and GetDescription
// where the class has none. That route has no constructor. Most such classes
// register on use, through EnsureGood at their use site, and are released when idle; infrastructure (scene,
// render driver, pools, managers) registers in its own constructor with
// `trinity.RegisterResource(this)`, as this constructor does, and
// unregisters in its Destruct, where Carbon's destructor would (cpp:11-14)
// (docs internal/decisions/device-resource-registration.md).
import { CjsSchema, meta } from "#schema";
import { blue } from "#blue";
import { trinity } from "../../CjsTrinity.js";
import { Tr2DeviceResourceState, TICKS_PER_SECOND, PREPARE_RETRY_SECONDS } from "./deviceResourceState.js";



/** Carbon Tr2DeviceResource (Tr2DeviceResource.h:22-62). */

export class Tr2DeviceResource
{

  /**
   * Carbon's constructor (cpp:6-9): registers with the device. Resolve its class
   * at call time because TriDevice imports the resource families which compose
   * this base; eagerly importing TriDevice creates an ESM initialization cycle.
   *
   * @adapted
   */
  constructor()
  {
    trinity.RegisterResource(this);
  }

  /**
   * Carbon GetDescription (h:28-33, TRINITYDEV): the resource's description
   * for device diagnostics.
   *
   * @adapted returned rather than written to an output string, as the other
   *   resource descriptions are (TriDebugResourceHelper.GetDescription).
   * @returns {string} "<Unknown>" unless a resource says otherwise.
   */

  GetDescription()
  {
    return "<Unknown>";
  }

  /**
   * Carbon ReleaseResources (h:40-45): the device asks the resource to drop
   * what the storage flags name - TRISTORAGE_ALL before the device itself is
   * released, TRISTORAGE_VIDEOMEMORY before a reset.
   *
   * @abstract
   * @param {number} _s TriStorageFlags.
   */

  ReleaseResources(_s)
  {
  }

  /**
   * Carbon PrepareResources (cpp:16-27): creates the resource's device
   * objects through OnPrepareResources, but only while resource creation is
   * allowed - nothing is created in the middle of an attempted reset, and
   * that counts as success.
   *
   * @implemented
   * @returns {boolean} False when OnPrepareResources fails.
   */

  PrepareResources()
  {
    if (CjsSchema.getConstructor("Tr2Renderer").IsResourceCreationAllowed())
    {
      const prepared = this._OnPrepareResources() === true;
      // Ours: the state IsGood answers from (Revised lifecycle § 3). A destructed
      // resource stays destructed.
      if (this._state !== Tr2DeviceResourceState.DESTRUCTED)
      {
        this._state = prepared ? Tr2DeviceResourceState.PREPARED : Tr2DeviceResourceState.NONE;
      }
      if (!prepared)
      {
        return false;
      }
    }
    return true;
  }

  /**
   * Whether this device resource's device objects exist now. Only asks: it
   * neither stamps, prepares nor lists, so a status or harness can look without
   * keeping anything alive. A destructed resource answers false.
   *
   * @cjs Carbon's Tr2DeviceResource has no IsGood (h:22-62): its device objects
   *   live from registration to destructor. The question exists here because a
   *   JavaScript resource is prepared at use and released when idle (docs
   *   internal/decisions/device-resource-registration.md); it answers as
   *   `BlueAsyncRes.IsGood` does, and use goes through `EnsureGood`.
   * @returns {boolean} Whether the device objects exist now.
   */
  IsGood()
  {
    return this._state === Tr2DeviceResourceState.PREPARED;
  }

  /**
   * Marks this resource as in use now: stamps Blue's current frame time, so the
   * sweep does not release it before its idle rule has passed. Never stamps
   * ahead and does nothing else; a holder that wants a resource kept renews it at
   * least once per idle rule.
   *
   * @cjs MotherLode's name for the same thing on resources (`MotherLode.KeepAlive`);
   *   Carbon's device resources live until their destructor (*Revised lifecycle* § 4).
   * @returns {void}
   */
  KeepAlive()
  {
    if (this._state === Tr2DeviceResourceState.DESTRUCTED) return;
    const now = blue.os.GetCurrentFrameTime();
    if (!(this._stamp >= now)) this._stamp = now;
  }

  /**
   * Uses this resource: renews it (`KeepAlive`), prepares its device objects if
   * it has none, lists it with `trinity` once prepared (the sweep's array and
   * Carbon's registry), then answers `IsGood()`. Called at each draw or update
   * site, after the gates; a resource used nowhere goes idle and is released by
   * the sweep. A failed prepare waits `PREPARE_RETRY_SECONDS` before trying
   * again, unlisted. A destructed resource answers false and never prepares again.
   *
   * @cjs Carbon registers a device resource in its constructor and prepares it
   *   when the device can create resources; JavaScript has no destructor to
   *   unregister it, so registration and preparing follow use (device resource
   *   registration decision, *Where `IsGood` lives*, *Revised lifecycle* § 3-4),
   *   as `BlueAsyncRes.EnsureGood` renews a resource at use.
   * @returns {boolean} Whether the device objects exist now.
   */
  EnsureGood()
  {
    if (this._state === Tr2DeviceResourceState.DESTRUCTED) return false;
    this.KeepAlive();
    const now = blue.os.GetCurrentFrameTime();
    if (this._state !== Tr2DeviceResourceState.PREPARED && !(now < this._retryAt))
    {
      if (!this.PrepareResources()) this._retryAt = now + PREPARE_RETRY_SECONDS * TICKS_PER_SECOND;
    }
    if (this._state === Tr2DeviceResourceState.PREPARED && this._listed !== true) trinity._ListSceneResource(this);
    return this.IsGood();
  }

  /**
   * `NONE`, `PREPARED` or `DESTRUCTED` (`Tr2DeviceResourceState`). Installed
   * classes take it on first use (`@be.inherit` copies methods, not fields), so
   * an undefined state reads as `NONE`.
   *
   * @cjs
   * @type {number}
   */
  _state = Tr2DeviceResourceState.NONE;

  /**
   * Blue frame time (ticks) of the last use.
   *
   * @cjs
   * @type {number}
   */
  _stamp = 0;

  /**
   * Moves on whenever this resource's entry in the sweep's array stops being
   * valid (destructed, or released by the sweep), so the old entry is dropped.
   *
   * @cjs
   * @type {number}
   */
  _generation = 0;

  /**
   * Whether it has a valid entry in the sweep's array, so a use never lists it
   * twice.
   *
   * @cjs
   * @type {boolean}
   */
  _listed = false;

  /**
   * The generation of its entry in Carbon's registry, so it is registered once
   * per generation.
   *
   * @cjs
   * @type {number}
   */
  _registeredGeneration = -1;

  /**
   * Blue frame time (ticks) before which a failed prepare is not tried again.
   *
   * @cjs
   * @type {number}
   */
  _retryAt = 0;

  /**
   * Carbon OnPrepareResources (h:47-62): creates only the device objects that
   * are missing, since a release may have dropped only some of them. Called
   * from PrepareResources, never directly.
   *
   * @abstract
   * @returns {boolean} Whether preparation succeeded.
   */

  _OnPrepareResources()
  {
  }

  /** Browser backend handles owned by this device resource; allocated on demand. */
  __adapterResources = null;

  /**
   * Attach an opaque engine-owned resource object.
   *
   * Runtime-resource stores this value but does not inspect GPU APIs.
   *
   * @cjs
   * @adapted
   * @param {string} key
   * @param {*} value
   * @returns {Tr2DeviceResource}
   */


  SetAdapterResource(key, value) {
    if (!key) throw new TypeError("Tr2DeviceResource.SetAdapterResource requires a key.");
    (this.__adapterResources ??= Object.create(null))[String(key)] = value;
    return this;
  }

  /**
   * Get an opaque engine-owned resource object.
   *
   * @cjs
   * @adapted
   * @param {string} key
   * @returns {*}
   */


  GetAdapterResource(key) {
    return this.__adapterResources?.[String(key)] ?? null;
  }

  /**
   * Returns true when an adapter resource exists for the given key.
   *
   * @cjs
   * @adapted
   * @param {string} key
   * @returns {boolean}
   */


  HasAdapterResource(key) {
    return this.__adapterResources !== null && Object.prototype.hasOwnProperty.call(this.__adapterResources, String(key));
  }

  /**
   * Remove an adapter resource and optionally call its destroy/dispose method.
   *
   * @cjs
   * @adapted
   * @param {string} key
   * @param {object} options
   * @returns {Tr2DeviceResource}
   */


  DestroyAdapterResource(key, options = {}) {
    const name = String(key);
    if (!this.__adapterResources) return this;
    const value = this.__adapterResources[name];
    if (value && options.destroy !== false) {
      destroyAdapterValue(value);
    }
    delete this.__adapterResources[name];
    return this;
  }

  /**
   * Remove the opaque slots registered through SetAdapterResource.
   *
   * Custom: this JS adapter registry has no Carbon counterpart. Carbon releases
   * texture and mesh allocations on their owning resources, so their JS
   * ReleaseResources/_OnShutdown paths retain that ownership. This method
   * visits only __adapterResources: it does not release TriTextureRes.texture,
   * loadedBitmap, or geometry LOD allocations. Full cache cleanup invokes both
   * this method and the resource's native cleanup hook.
   *
   * Teardown delegates to destroyAdapterValue, which selects the first truthy
   * Destroy, Dispose, destroy, or dispose member and calls it when callable.
   * Passing destroy: false removes the slots without calling teardown.
   *
   * @cjs
   * @adapted
   * @param {object} [options={}] Adapter teardown options.
   * @param {boolean} [options.destroy=true] Whether to call registered teardown.
   * @returns {Tr2DeviceResource} This resource after removing the slots.
   */


  DestroyAdapterResources(options = {}) {
    for (const key of Object.keys(this.__adapterResources || {})) {
      this.DestroyAdapterResource(key, options);
    }
    return this;
  }
}

/**
 * Release one adapter value, whatever it calls its teardown.
 *
 * FOUR SPELLINGS, AND THEY ARE NOT A HEDGE. `Destroy` is this runtime's and
 * Carbon's; `destroy` is the platform's — a `GPUTexture`, `GPUBuffer` and
 * `AudioBufferSourceNode` all spell it lowercase — and `Dispose`/`dispose` cover
 * the same split for anything that names it that way. An adapter slot holds a
 * DEVICE object we did not define, so accepting the platform's spelling is a
 * bridge, not defensive coding against ourselves.
 *
 * Functions are accepted as well as objects: the texture-array path stores a
 * callable adapter value, and skipping it silently leaked whatever it held.
 *
 * @param {*} value Adapter slot contents.
 */
export function destroyAdapterValue(value)
{
  if (!value || (typeof value !== "object" && typeof value !== "function")) return;

  const destroy = value.Destroy || value.Dispose || value.destroy || value.dispose;
  if (typeof destroy === "function") destroy.call(value);
}

// Imperative metadata keeps native resource source imports valid ESM.
meta.carbon("Tr2DeviceResource")(Tr2DeviceResource);
CjsSchema.decorateMethod(Tr2DeviceResource, "ReleaseResources", meta.abstract);
CjsSchema.decorateMethod(Tr2DeviceResource, "_OnPrepareResources", meta.abstract);

