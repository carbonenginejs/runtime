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
// TWO LIFETIMES, and the distinction is the whole design. A TEMP resource is
// recycled as soon as nothing holds it and it has not been touched for a few
// frames; a PERSISTENT one is initialized once and kept. Asking for a temp
// texture with the same shape twice in a frame therefore gets the same texture
// only if the first handle has been released - which is what makes a pass able
// to say "give me a working surface" without owning one.
//
// THE HANDLE IS THE LIFETIME. Carbon's `GpuResourceHandle` counts locks on copy
// and release, and a record with a live lock is never recycled. JavaScript has
// no destructor, so `Release()` is explicit here - see the note on the class.
//
// NESTING IS CARBON'S: a pool may have an OUTER pool, and a lookup that misses
// walks outward. That is how a scene-local pool shares the global one's
// resources without owning them.

import { Tr2BitmapDimensions } from "../../../trinityal/index.js";
import { GpuResourceHandle } from "./GpuResourceHandle.js";

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

  /** The frame a lookup counts as "now". */
  #frame = 0;

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
   * Advances the pool's idea of the current frame.
   *
   * @param {number} frame The frame number.
   */
  SetFrame(frame)
  {
    this.#frame = frame;
  }

  /**
   * Borrows a scratch texture, creating one only if no free match exists.
   *
   * A FREE MATCH IS ONE NOBODY HOLDS. A record with a live lock is never handed
   * out again, which is what lets two passes ask for "a 512 square" and get
   * different surfaces when both are in flight, and the same one when they are
   * not.
   *
   * @param {string} name A debug name.
   * @param {object} description A `Tr2BitmapDimensions` shape (`type`, `width`,
   *   `height`, `depth`, `mipCount`, `format`) plus `gpuUsage`, `cpuUsage`,
   *   `msaa` and `initialData`.
   * @returns {GpuResourceHandle} The borrowed texture.
   */
  GetTempTexture(name, description)
  {
    return this.#Borrow(this.#tempTextures, name, description, () => this.#CreateTexture(description));
  }

  /**
   * Borrows a persistent texture, initializing it the first time only.
   *
   * @param {string} name A debug name.
   * @param {object} description As `GetTempTexture`.
   * @param {Function} [initialize] Called once, with the new texture.
   * @returns {GpuResourceHandle} The texture.
   */
  GetPersistentTexture(name, description, initialize = null)
  {
    const existing = this.#Find(this.#persistentTextures, name, description, false);

    if (existing) return new GpuResourceHandle(existing);

    const texture = this.#CreateTexture(description);

    if (initialize) initialize(texture);

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
    return this.#Borrow(this.#tempBuffers, name, description, () => this.#CreateBuffer(description));
  }

  /**
   * Borrows a persistent buffer, initializing it the first time only.
   *
   * @param {string} name A debug name.
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {Function} [initialize] Called once, with the new buffer.
   * @returns {GpuResourceHandle} The buffer.
   */
  GetPersistentBuffer(name, description, initialize = null)
  {
    const existing = this.#Find(this.#persistentBuffers, name, description, false);

    if (existing) return new GpuResourceHandle(existing);

    const buffer = this.#CreateBuffer(description);

    if (initialize) initialize(buffer);

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
   * Drops temp resources nobody holds and nobody has touched recently.
   *
   * @param {number} [frameThreshold] How many frames of disuse to allow.
   * @returns {number} How many resources were dropped.
   */
  ClearUnusedResources(frameThreshold = 3)
  {
    let dropped = 0;

    for (const list of [ this.#tempTextures, this.#tempBuffers ])
    {
      for (let index = list.length - 1; index >= 0; index -= 1)
      {
        const record = list[index];

        if (record.lockCount > 0) continue;
        if (this.#frame - record.lastAccessFrame < frameThreshold) continue;

        record.resource.Destroy();
        list.splice(index, 1);
        dropped += 1;
      }
    }

    return dropped;
  }

  /** @param {boolean} enable Whether to keep debug detail. */
  SetDebugMode(enable)
  {
    this.#debugMode = !!enable;
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

  /** Splits the pool's flat description into the AL's two arguments. */
  #CreateTexture(description)
  {
    if (!this.#renderContext) fail("a pool creates against a render context; none is bound");

    const { gpuUsage, cpuUsage, msaa, initialData, ...dimensions } = description;

    // THE CONTEXT IS THE FACTORY. This used to be `new Tr2TextureALStub()`,
    // which named the backend at authoring time: every texture the pool handed
    // out was a stub no matter which backend was bound, so a WebGPU pass would
    // have been handed textures that reach no device and drawn nothing, with
    // no error anywhere. Tr2Blitter's head comment names this exact defect.
    //
    // The dimensions spread carries type, depth and mipCount, so an array or a
    // 3D texture is expressible here and always was.
    return this.#renderContext.CreateTexture(
      new Tr2BitmapDimensions(dimensions),
      { gpuUsage, cpuUsage, msaa, initialData }
    );
  }

  /**
   * Creates a stub buffer from the description against the pool's render
   * context.
   */
  #CreateBuffer(description)
  {
    if (!this.#renderContext) fail("a pool creates against a render context; none is bound");

    // Through the context for the same reason as the texture above. The
    // previous form also passed the context as `initialData`, leaving
    // renderContext undefined and throwing a TypeError on the first line of
    // Create that touched it - which is why neither buffer accessor had ever
    // run. Both faults go together.
    return this.#renderContext.CreateBuffer(description, null);
  }

  /**
   * Borrows a matching free resource from this pool or its outer pool,
   * allocating when necessary.
   */
  #Borrow(list, name, description, create)
  {
    const free = this.#Find(list, name, description, true);

    if (free) return new GpuResourceHandle(free);

    if (this.#outer) return this.#outer.#Borrow(list === this.#tempTextures
      ? this.#outer.#tempTextures
      : this.#outer.#tempBuffers, name, description, create);

    return new GpuResourceHandle(this.#Add(list, name, description, create()));
  }

  /** Finds a matching pool record and updates its last-access frame. */
  #Find(list, name, description, freeOnly)
  {
    const match = list.find(record =>
      record.name === name
      && SameDescription(record.description, description)
      && (!freeOnly || record.lockCount === 0));

    if (match) match.lastAccessFrame = this.#frame;

    return match ?? null;
  }

  /** Adds an unlocked resource record stamped with the current frame. */
  #Add(list, name, description, resource)
  {
    const record = { resource, name, description, lockCount: 0, lastAccessFrame: this.#frame };

    list.push(record);

    return record;
  }
}

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
