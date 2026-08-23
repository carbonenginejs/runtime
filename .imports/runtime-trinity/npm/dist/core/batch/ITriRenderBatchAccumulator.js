import { RenderingMode } from '@carbonenginejs/runtime-utils/graphics';

// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/TriRenderBatch.h (ITriRenderBatchAccumulator)
//
// Abstract base for render-batch accumulators: shared render-mode / user-data
// state plus the collect/sort contract. Concrete accumulators
// (TriRenderBatchAccumulator) implement Commit/Finalize/Get*/TransferFrom. This
// stays GPU-free; dispatch to the device is the engine adapter's job.

/**
 * Abstract base for render-batch accumulators: holds the shared rendering mode,
 * user data and per-object-data store, and declares the collect and sort
 * contract concrete accumulators implement.
 */
class ITriRenderBatchAccumulator {
  /**
   * Starts with zero user data, RM_ANY rendering mode and no per-object-data
   * store bound.
   */
  constructor() {
    this.userData = 0;
    this.renderingMode = RenderingMode.RM_ANY;

    // The per-object-data store (a TriPoolAllocator), set once from the render
    // context at scene setup. The engine builds it from its own struct
    // reflection; Trinity never defines a struct here.
    this.rawDataStore = null;
  }

  // Bind the per-object-data store (from the render context). Carbon's pool
  // allocator (Tr2Renderer::GetPoolAllocator) relocates onto this store.

  /**
   * Binds the per-object-data store, normally taken from the render context at
   * scene setup; returns this for chaining.
   */
  SetTriPoolAllocator(store) {
    this.rawDataStore = store;
    return this;
  }

  /** The bound per-object-data store, or null when none was set. */
  GetTriPoolAllocator() {
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
  Alloc(name) {
    if (!this.rawDataStore) {
      throw new Error(`ITriRenderBatchAccumulator: no per-object-data store bound (set it from the render context before Alloc "${name}")`);
    }
    return this.rawDataStore.Alloc(name);
  }

  // Carbon pool-allocates per-object data from the accumulator; in JS the GC
  // owns lifetime, so this just constructs the requested object. Retained for
  // the deferred { object: this } sites during the per-object-data migration.

  /**
   * Constructs the requested per-object-data object; Carbon pool-allocates here,
   * but in JS the GC owns lifetime, so this only calls the constructor.
   */
  Allocate(Constructor) {
    return new Constructor();
  }

  /**
   * Attaches an opaque caller value that every batch collected by this
   * accumulator carries.
   */
  SetUserData(userData) {
    this.userData = userData;
  }

  /** Sets the rendering mode that Commit stamps onto every batch collected here. */
  SetRenderingMode(mode) {
    this.renderingMode = mode;
  }

  /** The rendering mode stamped onto collected batches. */
  GetRenderingMode() {
    return this.renderingMode;
  }

  /**
   * Abstract: concrete accumulators drop every collected batch and reset the
   * shared state.
   */
  Clear() {
    throw new Error("ITriRenderBatchAccumulator.Clear is abstract");
  }

  /**
   * Abstract: concrete accumulators take ownership of a batch and file it for
   * sorting.
   */
  Commit(_batch) {
    throw new Error("ITriRenderBatchAccumulator.Commit is abstract");
  }

  /** Abstract: the GDPR-eligible batch vector. */
  GetGdprBatches() {
    throw new Error("ITriRenderBatchAccumulator.GetGdprBatches is abstract");
  }

  /** Abstract: the plain batch vector. */
  GetBatches() {
    throw new Error("ITriRenderBatchAccumulator.GetBatches is abstract");
  }

  /** Abstract: concrete accumulators sort and group-count the collected batches. */
  Finalize() {
    throw new Error("ITriRenderBatchAccumulator.Finalize is abstract");
  }

  /** Abstract: total number of collected batches. */
  GetBatchCount() {
    throw new Error("ITriRenderBatchAccumulator.GetBatchCount is abstract");
  }

  /**
   * Abstract: whether the collected batches are effect-sorted rather than
   * order-preserving.
   */
  IsChainedByEffect() {
    throw new Error("ITriRenderBatchAccumulator.IsChainedByEffect is abstract");
  }

  /** Abstract: folds another accumulator's batches into this one. */
  TransferFrom(_source) {
    throw new Error("ITriRenderBatchAccumulator.TransferFrom is abstract");
  }
}

export { ITriRenderBatchAccumulator };
//# sourceMappingURL=ITriRenderBatchAccumulator.js.map
