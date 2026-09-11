// Nested Tr2GpuResourcePool::GpuResourceHandle (Tr2GpuResourcePool.h:54).
// Nested Tr2GpuResourcePool::GpuResourceHandle (Tr2GpuResourcePool.h:54).
// Nested Tr2GpuResourcePool::GpuResourceHandle (Tr2GpuResourcePool.h:54).
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

import { fail } from "./Tr2GpuResourcePool.js";

/**
 * A borrowed pool resource.
 *
 * CARBON RELEASES ON DESTRUCTION AND JAVASCRIPT CANNOT. Its handle decrements a
 * lock count in its destructor, so a resource returns to the pool when the last
 * holder goes out of scope. There is no such moment here, so `Release` is
 * explicit and a handle that is never released pins its resource forever -
 * which is a leak, not a crash, and therefore worth being loud about. The pool
 * reports held resources so a caller can assert.
 *
 * THE VERB IS `Free`, AND THE POOL OWNS IT. Settled 2026-09-05 with
 * `cjs-carbon-verbs`, after two wrong turns worth recording:
 *
 * - `Destroy` is wrong. It means GONE NOW - the pure virtual on
 *   `Tr2BaseDeviceResourceAL` (`trinityal/Tr2DeviceResourceAL.h:30`), used on
 *   35 Carbon classes. A pooled resource is not destroyed; it goes back and is
 *   handed out again. `ClearUnusedResources` below is where `Destroy` is
 *   right, and where it is used.
 * - `Release` is not engine vocabulary. Bare `Release` appears ONLY in
 *   Carbon's mesh viewer and video player, as Vulkan idiom. Trinity uses only
 *   the qualified forms - `ReleaseLater`, `ReleaseDeviceResources`.
 *
 * `Free` is shared engine vocabulary on six Carbon classes - `FreeList`,
 * `Tr2VirtualAllocator`, `Tr2SuballocatedBuffer` and three descriptor-heap
 * allocators - and EVERY ONE IS AN ALLOCATOR OR POOL. The direction is theirs
 * too: `Tr2VirtualAllocator::Free( allocation )` and
 * `Tr2SuballocatedBuffer::Free( allocation& )` put the verb on the allocator,
 * not on the thing lent. So `pool.Free(handle)`, not `handle.Release()`.
 *
 * Carbon's handle has no named method at all - the work is in
 * `~GpuResourceHandle`. That absence is C++ not needing a name, and reading it
 * as a prohibition is how this briefly became a coined `ReleaseToPool`.
 */
export class GpuResourceHandle
{
  #record = null;

  /**
   * @param {object} [record] The pool record this handle locks.
   */
  constructor(record = null)
  {
    this.#record = record;

    if (record) record.lockCount += 1;
  }

  /**
   * The resource itself.
   *
   * @returns {object|null} The resource, or null once released.
   */
  Get()
  {
    return this.#record?.resource ?? null;
  }

  /** @returns {boolean} Whether this handle still holds a resource. */
  IsValid()
  {
    return this.#record !== null;
  }

  /** @returns {string} The resource's debug name. */
  GetName()
  {
    return this.#record?.name ?? "";
  }

  /**
   * Drops this handle's claim. Called by `Tr2GpuResourcePool.Free`.
   *
   * Freeing twice is a caller error rather than a silent no-op: it means the
   * lock count no longer describes who is holding what.
   *
   * @returns {boolean} Whether a claim was dropped.
   */
  Detach()
  {
    if (!this.#record) fail("a handle freed twice");

    this.#record.lockCount -= 1;
    this.#record = null;

    return true;
  }
}
