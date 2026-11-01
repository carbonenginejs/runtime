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
// installs PrepareResources, IsGood and GetDescription where the class has none.
// That route has no constructor. Most such classes register on use, through
// IsGood at their use site, and are released when idle; infrastructure (scene,
// render driver, pools, managers) registers in its own constructor with
// `trinity.RegisterResource(this)`, as this constructor does, and
// unregisters in its Destruct, where Carbon's destructor would (cpp:11-14)
// (docs internal/decisions/device-resource-registration.md).
import { CjsSchema, meta } from "#schema";
import { blue } from "#blue";
import { trinity } from "../../CjsTrinity.js";
import { Tr2DeviceResourceState } from "./deviceResourceState.js";



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
   * Whether this device resource has everything it needs to work, and a use: it
   * stamps Blue's current frame time, prepares its device objects if it has
   * none, lists itself with `trinity` once prepared (the sweep's array and
   * Carbon's registry), and answers whether its device objects exist now (docs
   * internal/decisions/device-resource-registration.md, *Where `IsGood` lives*,
   * *Revised lifecycle* § 3-4). Asked at each use site, after the gates; a
   * resource asked nowhere goes idle and is released by the sweep. A destructed
   * resource answers false and never prepares again.
   *
   * @cjs Carbon's Tr2DeviceResource has no IsGood: it registers in its
   *   constructor and lives in the registry until its destructor. JavaScript has
   *   no destructor, so registration follows use, and asking is the use; this
   *   extends the resources' "IsGood renews" to device resources (non-Carbon
   *   extensions register, *Resource keep-alive through IsGood*).
   * @returns {boolean} Whether the device objects exist now.
   */
  IsGood()
  {
    if (this._state === Tr2DeviceResourceState.DESTRUCTED) return false;
    const now = blue.os.GetCurrentFrameTime();
    if (!(this._stamp >= now)) this._stamp = now;
    if (this._state !== Tr2DeviceResourceState.PREPARED) this.PrepareResources();
    if (this._state === Tr2DeviceResourceState.PREPARED && this._listed !== true) trinity._ListSceneResource(this);
    return this._state === Tr2DeviceResourceState.PREPARED;
  }

  /**
   * Keeps this resource: the same stamp as a use, Blue's current frame time,
   * and prepares it if it has no device objects (prepare-ahead). A holder that
   * wants it kept renews it at least once per idle rule; it never stamps ahead.
   *
   * @cjs MotherLode's name for the same thing on resources (`MotherLode.KeepAlive`);
   *   Carbon's device resources live until their destructor (*Revised lifecycle* § 4).
   * @returns {void}
   */
  KeepAlive()
  {
    this.IsGood();
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

