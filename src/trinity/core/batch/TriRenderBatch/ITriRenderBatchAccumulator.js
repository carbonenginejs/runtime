// Source: trinity/trinity/TriRenderBatch.h (ITriRenderBatchAccumulator)
//
// Abstract base for render-batch accumulators: shared render-mode / user-data
// state plus the collect/sort contract. Concrete accumulators
// (TriRenderBatchAccumulator) implement Commit/Finalize/Get*/TransferFrom. This
// collects CPU batch data; dispatch to the device is not ported yet.
import { exposure as be } from "#be";
import { RenderingMode } from "#consts/graphics";
import { CjsSchema, meta } from "#schema";


/**
 * Abstract base for render-batch accumulators: holds the shared rendering mode,
 * user data and per-object-data store, and declares the collect and sort
 * contract concrete accumulators implement.
 *
 * @abstract
 */
@meta.carbon("ITriRenderBatchAccumulator")
@be.abstract
export class ITriRenderBatchAccumulator
{
  // Fields in Carbon's member order (TriRenderBatch.h:291-293), with the
  // constructor's init list (TriRenderBatch.h:228-231).

  /** Carbon `m_userData( 0x0 )` (TriRenderBatch.h:229). */
  userData = 0;

  /**
   * Carbon `m_allocator`, which its constructor takes as an argument
   * (TriRenderBatch.h:230). The per-object-data store (a TriPoolAllocator) is
   * set once from the render context at scene setup through
   * SetTriPoolAllocator, so it starts null. The engine builds it from its own
   * struct reflection; Trinity never defines a struct here.
   */
  rawDataStore = null;

  /** Carbon `m_renderingMode( RM_ANY )` (TriRenderBatch.h:231). */
  renderingMode = RenderingMode.RM_ANY;

  // Bind the per-object-data store (from the render context). Carbon's pool
  // allocator (Tr2Renderer::GetPoolAllocator) relocates onto this store.

  /**
   * Binds the per-object-data store, normally taken from the render context at
   * scene setup; returns this for chaining.
   */
  SetTriPoolAllocator(store)
  {
    this.rawDataStore = store;
    return this;
  }

  /** The bound per-object-data store, or null when none was set. */
  GetTriPoolAllocator()
  {
    return this.rawDataStore;
  }

  // Lease a transient per-object payload for a registered struct (the pooled
  // per-object-data allocation). Requires a store - there is no fallback; a
  // missing store is a setup error, not a silent tight-pack.

  /**
   * Leases a transient per-object payload for a registered struct from the bound
   * store; a missing store throws rather than silently falling back, because it
   * is a setup error.
   */
  Alloc(name)
  {
    if (!this.rawDataStore)
    {
      throw new Error(`ITriRenderBatchAccumulator: no per-object-data store bound (set it from the render context before Alloc "${name}")`);
    }

    return this.rawDataStore.Allocate(name);
  }

  // Carbon pool-allocates per-object data from the accumulator; in JS the GC
  // owns lifetime, so this just constructs the requested object. Retained for
  // the deferred { object: this } sites during the per-object-data migration.

  /**
   * Constructs the requested per-object-data object; Carbon pool-allocates here,
   * but in JS the GC owns lifetime, so this only calls the constructor.
   *
   * @adapted
   */
  Allocate(Constructor)
  {
    return new Constructor();
  }

  /**
   * Attaches an opaque caller value that every batch collected by this
   * accumulator carries.
   *
   * @implemented
   */
  SetUserData(userData)
  {
    this.userData = userData;
  }

  /**
   * Sets the rendering mode that Commit stamps onto every batch collected here.
   *
   * @implemented
   */
  SetRenderingMode(mode)
  {
    this.renderingMode = mode;
  }

  /**
   * The rendering mode stamped onto collected batches.
   *
   * @implemented
   */
  GetRenderingMode()
  {
    return this.renderingMode;
  }

  /**
   * Abstract: concrete accumulators drop every collected batch and reset the
   * shared state.
   *
   * @abstract
  */
  @meta.abstract
  Clear() {}

  /**
   * Abstract: concrete accumulators take ownership of a batch and file it for
   * sorting.
   *
   * @abstract
  */
  @meta.abstract
  Commit(_batch) {}

  /**
   * Abstract: the GDPR-eligible batch vector.
   *
   * @abstract
   */
  @meta.abstract
  GetGdprBatches() {}

  /**
   * Abstract: the plain batch vector.
   *
   * @abstract
   */
  @meta.abstract
  GetBatches() {}

  /**
   * Abstract: concrete accumulators sort and group-count the collected batches.
   *
   * @abstract
   */
  @meta.abstract
  Finalize() {}

  /**
   * Abstract: total number of collected batches.
   *
   * @abstract
   */
  @meta.abstract
  GetBatchCount() {}

  /**
   * Abstract: whether the collected batches are effect-sorted rather than
   * order-preserving.
   *
   * @abstract
  */
  @meta.abstract
  IsChainedByEffect() {}

  /**
   * Abstract: folds another accumulator's batches into this one.
   *
   * @abstract
   */
  @meta.abstract
  TransferFrom(_source) {}
}

// States: SetUserData, SetRenderingMode and GetRenderingMode are TriRenderBatch.h:273-287. Allocate is adapted: Carbon pool-allocates from the
// allocator (h:241-251); the garbage collector owns lifetime here, so it constructs the object. The rest are pure virtuals (h:254-270).
CjsSchema.decorateMethod(ITriRenderBatchAccumulator, "Allocate", meta.adapted);
CjsSchema.decorateMethod(ITriRenderBatchAccumulator, "SetUserData", meta.implemented);
CjsSchema.decorateMethod(ITriRenderBatchAccumulator, "SetRenderingMode", meta.implemented);
CjsSchema.decorateMethod(ITriRenderBatchAccumulator, "GetRenderingMode", meta.implemented);
