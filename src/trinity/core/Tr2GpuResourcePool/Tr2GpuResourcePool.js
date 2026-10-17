// Source: trinity/trinity/Tr2GpuResourcePool.h
// Source: trinity/trinity/Tr2GpuResourcePool.cpp
//
// Where a render pass gets a scratch texture or buffer, and how one is kept
// alive only as long as something holds it.
//
// THIS IS THE CLASS FOUR INVENTED ONES WERE STANDING IN FOR. Carbon's
// `Tr2ShadowMap::PrepareShadowRendering( gpuResourcePool, renderContext )` and
// the whole `EveSpaceScene` volumetrics family take a pool and do their own
// work. Ours had the methods but bounced them to an engine-supplied executor,
// because there was no pool to hand them. So an interface was invented per
// subsystem rather than porting the one class they all needed.
//
// Temporary entries can be reused once unlocked; persistent entries share by
// name and description. All entries age out of pool membership independently
// of retained handles. Explicit AL values keep their backend alive until the
// final owner releases it. The context recording clock supplies frame age.
//
// NESTING IS CARBON'S: a pool may have an OUTER pool, and a lookup that misses
// walks outward. That is how a scene-local pool shares the global one's
// resources without owning them.

import { Failed, Tr2BitmapDimensions, Tr2TextureAL } from "../../../trinityal/index.js";
import { Tr2CpuUsage } from "#consts/render-context";
import { isFunction } from "#utils/is";
import { TriDevice } from "../device/TriDevice.js";
import { TriStorageFlags } from "#consts/graphics";
import { GpuResourceHandle } from "./GpuResourceHandle.js";

const allPools = new Set();

/** Throws a resource-pool error with the supplied diagnostic. */
export function fail(message)
{
  const error = new Error(`Tr2GpuResourcePool: ${message}`);
  error.code = "CJS_GPU_POOL_INVALID";
  throw error;
}

/**
 * Pooled scratch textures and buffers.
 */
export class Tr2GpuResourcePool
{
  /** m_outer - the pool a miss falls through to. */
  #outer = null;

  #tempTextures = [];

  #persistentTextures = [];

  #tempBuffers = [];

  #persistentBuffers = [];

  /** m_debugMode */
  #debugMode = false;

  /**
   * The backend resources are created against.
   *
   * Carbon's pool is a `Tr2DeviceResource` and reaches its device that way.
   * This runtime has no process-wide device, so the context is handed in - the
   * same arrangement `Tr2EffectStateManager` uses.
   */
  #renderContext = null;

  /**
   * @param {Tr2GpuResourcePool} [outer] A pool to fall through to on a miss.
   */
  constructor(outer = null)
  {
    this.#outer = outer;
    allPools.add(this);
    TriDevice.RegisterResource(this);
  }

  /**
   * Binds the backend resources are created against.
   *
   * @param {object} renderContext A render-context abstraction layer.
   * @returns {Tr2GpuResourcePool} This pool, for chaining.
   */
  SetRenderContext(renderContext)
  {
    this.#renderContext = renderContext;

    return this;
  }

  /**
   * Carbon's `GetTempTexture( name, width, height, pixelFormat, gpuUsage )`
   * (Tr2GpuResourcePool.h:87, cpp:97-100): a 2D texture of one mip.
   *
   * @param {string} name A debug name.
   * @param {number} width Width in pixels.
   * @param {number} height Height in pixels.
   * @param {number} pixelFormat A `PixelFormat` value.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @returns {GpuResourceHandle} The borrowed texture.
   */
  GetTempTexture__WidthHeight(name, width, height, pixelFormat, gpuUsage)
  {
    return this.GetTempTexture(name, Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, pixelFormat), gpuUsage);
  }

  /**
   * Carbon's `GetTempTexture( name, size, pixelFormat, gpuUsage )`
   * (Tr2GpuResourcePool.h:88, cpp:102-105): a 2D texture of one mip.
   *
   * @param {string} name A debug name.
   * @param {TextureSize2D} size Width and height in pixels.
   * @param {number} pixelFormat A `PixelFormat` value.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @returns {GpuResourceHandle} The borrowed texture.
   */
  GetTempTexture__Size(name, size, pixelFormat, gpuUsage)
  {
    return this.GetTempTexture(name, Tr2BitmapDimensions.create__WidthHeightMipCountFormat(size.width, size.height, 1, pixelFormat), gpuUsage);
  }

  /**
   * Carbon's `GetTempTexture( name, desc, gpuUsage )` (Tr2GpuResourcePool.h:89,
   * cpp:107-146), which the other two overloads forward to: borrows a scratch
   * texture, creating one only if no free match exists.
   *
   * A FREE MATCH IS ONE NOBODY HOLDS. A record with a live lock is never handed
   * out again, which is what lets two passes ask for "a 512 square" and get
   * different surfaces when both are in flight, and the same one when they are
   * not. A match is the same description and GPU usage.
   *
   * @param {string} name A debug name.
   * @param {Tr2BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @returns {GpuResourceHandle} The borrowed texture.
   */
  GetTempTexture(name, desc, gpuUsage)
  {
    return this.#Borrow(this.#tempTextures, name, { desc, gpuUsage }, SameTexture, () => this.#CreateTexture(name, desc, gpuUsage, null, false));
  }

  /**
   * Carbon's `GetPersistentTexture( name, width, height, pixelFormat, gpuUsage,
   * initializer )` (Tr2GpuResourcePool.h:90, cpp:148-151): a 2D texture of one
   * mip.
   *
   * @param {string} name A debug name.
   * @param {number} width Width in pixels.
   * @param {number} height Height in pixels.
   * @param {number} pixelFormat A `PixelFormat` value.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {Function|Tr2SubresourceData[]|null} initializer As `GetPersistentTexture`.
   * @returns {GpuResourceHandle} The texture.
   */
  GetPersistentTexture__WidthHeight(name, width, height, pixelFormat, gpuUsage, initializer)
  {
    return this.GetPersistentTexture(name, Tr2BitmapDimensions.create__WidthHeightMipCountFormat(width, height, 1, pixelFormat), gpuUsage, initializer);
  }

  /**
   * Carbon's `GetPersistentTexture( name, desc, gpuUsage, initializer )`
   * (Tr2GpuResourcePool.h:91, cpp:153-186): borrows a persistent texture,
   * matched on name, description and GPU usage, initializing it the first
   * time only.
   *
   * Carbon's TextureInitializer is a variant (h:86): initial subresource data
   * goes to `Create`, and a function runs once on the created texture with the
   * render context. JavaScript has no variant type, so the alternative is
   * selected the way `std::get_if` does, by what the value holds; null is
   * neither.
   *
   * @param {string} name A debug name.
   * @param {Tr2BitmapDimensions} desc The texture description.
   * @param {number} gpuUsage A `Tr2GpuUsage` bit set.
   * @param {Function|Tr2SubresourceData[]|null} initializer Initial
   *   subresource data, or a function called once with the new texture and
   *   the render context.
   * @returns {GpuResourceHandle} The texture.
   */
  GetPersistentTexture(name, desc, gpuUsage, initializer)
  {
    const description = { desc, gpuUsage };
    const existing = this.#Find(this.#persistentTextures, name, description, SameTexture, false);

    if (existing) return new GpuResourceHandle(existing);

    const initFunc = isFunction(initializer) ? initializer : null;
    const texture = this.#CreateTexture(name, desc, gpuUsage, initFunc ? null : initializer, true);

    if (!texture) return new GpuResourceHandle();
    if (initFunc) initFunc(texture, this.#renderContext);

    return new GpuResourceHandle(this.#Add(this.#persistentTextures, name, description, texture));
  }

  /**
   * Borrows a scratch buffer.
   *
   * @param {string} name A debug name.
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @returns {GpuResourceHandle} The borrowed buffer.
   */
  GetTempBuffer(name, description)
  {
    return this.#Borrow(this.#tempBuffers, name, description, SameDescription, () => this.#CreateBuffer(description));
  }

  /**
   * Borrows a persistent buffer, initializing it the first time only.
   *
   * Carbon's BufferInitializer is a variant (`Tr2GpuResourcePool.cpp:240-250`):
   * initial bytes go to `Create`, which a buffer the CPU cannot write needs,
   * and a function runs on the created buffer.
   *
   * @param {string} name A debug name.
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {ArrayBufferView|Function|null} [initializer] Initial bytes, or a
   *   function called once with the new buffer.
   * @returns {GpuResourceHandle} The buffer.
   */
  GetPersistentBuffer(name, description, initializer = null)
  {
    const existing = this.#Find(this.#persistentBuffers, name, description, SameDescription, false);

    if (existing) return new GpuResourceHandle(existing);

    const initialData = ArrayBuffer.isView(initializer) ? initializer : null;
    const buffer = this.#CreateBuffer(description, initialData);

    if (!buffer) return new GpuResourceHandle();
    if (typeof initializer === "function") initializer(buffer);

    return new GpuResourceHandle(this.#Add(this.#persistentBuffers, name, description, buffer));
  }

  /**
   * Returns a borrowed resource, as Carbon's allocators do.
   *
   * @param {GpuResourceHandle} handle The handle to give back.
   * @returns {boolean} Whether a claim was dropped.
   */
  Free(handle)
  {
    if (!handle) fail("Free needs a handle");

    return handle.Detach();
  }

  /**
   * Retires aged membership from all four lists; outstanding handles keep their shares.
   *
   * @param {number} [frameThreshold] How many frames of disuse to allow.
   * @returns {number} How many resources were dropped.
   */
  ClearUnusedResources(frameThreshold = 3)
  {
    let dropped = 0;
    const currentFrame = this.#renderContext ? this.#renderContext.GetRecordingFrameNumber() : 0;

    for (const list of [ this.#tempTextures, this.#persistentTextures, this.#tempBuffers, this.#persistentBuffers ])
    {
      for (let index = list.length - 1; index >= 0; index -= 1)
      {
        const record = list[index];

        if (currentFrame < frameThreshold + record.lastAccessFrame) continue;

        record.poolOwned = false;
        if (record.lockCount === 0) record.resource.Destroy();
        list.splice(index, 1);
        dropped += 1;
      }
    }

    return dropped;
  }

  /**
   * Explicit final-owner teardown replaces the native pool destructor.
   * Outstanding handles retain their record and their own resource value;
   * this drops the pool's membership and unregisters it from device sweeps.
   */
  Destroy()
  {
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    allPools.delete(this);
    TriDevice.UnregisterResource(this);
    this.#renderContext = null;
    this.#outer = null;
  }

  /** Clears every pool once per device tick using each bound context clock. */
  static ClearAllUnusedResources(frameThreshold = 3)
  {
    for (const pool of allPools) pool.ClearUnusedResources(frameThreshold);
  }

  /** The native pool has no resources to prepare eagerly. */
  PrepareResources()
  {
    return this.OnPrepareResources();
  }

  /** Native preparation succeeds without allocating pooled resources. */
  OnPrepareResources()
  {
    return true;
  }

  /** Only the exact all-storage request drops native pool membership. */
  ReleaseResources(storage)
  {
    if (storage !== TriStorageFlags.TRISTORAGE_ALL) return;
    for (const list of [ this.#tempTextures, this.#persistentTextures, this.#tempBuffers, this.#persistentBuffers ])
    {
      for (const record of list)
      {
        record.poolOwned = false;
        if (record.lockCount === 0) record.resource.Destroy();
      }
      list.length = 0;
    }
  }

  /** @param {boolean} enable Whether to keep debug detail. */
  SetDebugMode(enable)
  {
    this.#debugMode = !!enable;
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  }

  /** @returns {boolean} Whether debug mode is on. */
  GetDebugMode()
  {
    return this.#debugMode;
  }

  /**
   * Every temp texture the pool holds, for a caller that must assert.
   *
   * @returns {object[]} The textures.
   */
  DebugGetAllTempTextures()
  {
    return this.#tempTextures.map(record => record.resource);
  }

  /**
   * How many resources are currently held by a handle.
   *
   * Not Carbon's - JavaScript has no destructor to release on, so a caller
   * needs a way to prove it released what it borrowed.
   *
   * @returns {number} The count.
   */
  GetHeldCount()
  {
    return [ this.#tempTextures, this.#persistentTextures, this.#tempBuffers, this.#persistentBuffers ]
      .reduce((total, list) => total + list.filter(record => record.lockCount > 0).length, 0);
  }

  /**
   * Creates and names a pool texture as Carbon's accessors do: a temp texture
   * with `Create( desc, gpuUsage, renderContext )` (cpp:132), a persistent one
   * with `Create( desc, gpuUsage, Tr2CpuUsage::NONE, initData, renderContext )`
   * (cpp:169). Null when the backend refuses.
   *
   * THE CONTEXT CHOOSES THE BACKEND. This used to be `new Tr2TextureALStub()`,
   * which named the backend at authoring time: every texture the pool handed
   * out was a stub no matter which backend was bound, so a WebGPU pass would
   * have been handed textures that reach no device and drawn nothing, with no
   * error anywhere. Tr2Blitter's head comment names this exact defect.
   * `Tr2TextureAL.Create` asks the bound context for its implementation.
   */
  #CreateTexture(name, desc, gpuUsage, initialData, persistent)
  {
    if (!this.#renderContext) fail("a pool creates against a render context; none is bound");

    const texture = new Tr2TextureAL();
    const result = persistent
      ? texture.Create__GpuUsageCpuUsageInitialData(desc, gpuUsage, Tr2CpuUsage.NONE, initialData ?? null, this.#renderContext)
      : texture.Create__GpuUsage(desc, gpuUsage, this.#renderContext);

    if (Failed(result)) return null;
    texture.SetName(name);

    return texture;
  }

  /**
   * Creates a stub buffer from the description against the pool's render
   * context.
   */
  #CreateBuffer(description, initialData = null)
  {
    if (!this.#renderContext) fail("a pool creates against a render context; none is bound");

    // Through the context, which chooses the backend (see #CreateTexture). The
    // previous form also passed the context as `initialData`, leaving
    // renderContext undefined and throwing a TypeError on the first line of
    // Create that touched it - which is why neither buffer accessor had ever
    // run. Both faults go together.
    return this.#renderContext.CreateBuffer(description, initialData);
  }

  /**
   * Borrows a matching free resource from this pool or its outer pool,
   * allocating when necessary.
   */
  #Borrow(list, name, description, same, create)
  {
    const free = this.#Find(list, name, description, same, true);

    if (free) return new GpuResourceHandle(free);

    if (this.#outer) return this.#outer.#Borrow(list === this.#tempTextures
      ? this.#outer.#tempTextures
      : this.#outer.#tempBuffers, name, description, same, create);

    return new GpuResourceHandle(this.#Add(list, name, description, create()));
  }

  /** Finds a matching pool record and updates its last-access frame. */
  #Find(list, name, description, same, freeOnly)
  {
    const match = list.find(record =>
      record.name === name
      && same(record.description, description)
      && (!freeOnly || record.lockCount === 0));

    if (match) match.lastAccessFrame = (this.#renderContext ? this.#renderContext.GetRecordingFrameNumber() : 0);

    return match ?? null;
  }

  /** Adds an unlocked resource record stamped with the current frame. */
  #Add(list, name, description, resource)
  {
    if (!resource) return null;
    const record = { resource, name, description, lockCount: 0, lastAccessFrame: (this.#renderContext ? this.#renderContext.GetRecordingFrameNumber() : 0), poolOwned: true };

    list.push(record);

    return record;
  }
}

/**
 * A texture record matches on Carbon's terms (cpp:119-125, 161-163): an equal
 * description and the same GPU usage. The initializer is never compared.
 */
function SameTexture(left, right)
{
  return left.desc.Equals(right.desc) && left.gpuUsage === right.gpuUsage;
}

/** A buffer record matches when every description field is equal. */
function SameDescription(left, right)
{
  if (left === right) return true;
  if (!left || !right) return false;

  const keys = new Set([ ...Object.keys(left), ...Object.keys(right) ]);

  for (const key of keys)
  {
    if (left[key] !== right[key]) return false;
  }

  return true;
}

let globalPool = null;

/**
 * Carbon's `GetGlobalGpuResourcePool`.
 *
 * @returns {Tr2GpuResourcePool} The process-wide pool.
 */
export function GetGlobalGpuResourcePool()
{
  globalPool ??= new Tr2GpuResourcePool();

  return globalPool;
}

/** Device final shutdown releases the global pool; individual drivers never call this. */
export function DestroyGlobalGpuResourcePool()
{
  if (globalPool) globalPool.Destroy();
  globalPool = null;
}
