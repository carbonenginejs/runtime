import { RenderingMode } from '@carbonenginejs/runtime-utils/graphics';
import { D3dPrimitiveTopology } from '@carbonenginejs/runtime-utils/d3d';
import { RenderBatchSortType } from '../../generated/trinityCore/enums.js';
import { ITriRenderBatchAccumulator } from './ITriRenderBatchAccumulator.js';
import { OrderOf, Tr2GdprBatchFullPartition } from './Tr2RenderBatch.js';

// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/TriRenderBatch.h (TriRenderBatchAccumulator<KeyGenerator>,
//                             DefaultKeyGenerator, EffectKeyGenerator)
//
// GPU-free render-batch accumulator: collects committed batches into two vectors
// (GDPR-eligible and plain), then sorts / group-counts them on Finalize. The
// engine adapter reads GetGdprBatches()/GetBatches()/IsChainedByEffect() from a
// finalized accumulator and issues the actual draws.

// Unsorted, order-preserving, single vector, no GDPR. Used for transparent /
// order-dependent passes (which are pre-sorted by object distance CPU-side).
const DefaultKeyGenerator = {
  ALLOW_GDPR: false,
  Less(_batch1, _batch2) {
    return false;
  },
  GetSortType() {
    return RenderBatchSortType.RENDERBATCHSORTTYPE_NONE;
  }
};

// Effect-sorted (shader, then vertex declaration); GDPR-enabled. Used for
// opaque / decal / depth / additive / shadow passes.
const EffectKeyGenerator = {
  ALLOW_GDPR: true,
  Less(batch1, batch2) {
    const shaderOrder = OrderOf(batch1.shader) - OrderOf(batch2.shader);
    if (shaderOrder !== 0) return shaderOrder < 0;
    return batch1.vertexDeclaration < batch2.vertexDeclaration;
  },
  GetSortType() {
    return RenderBatchSortType.RENDERBATCHSORTTYPE_SORT;
  }
};

/**
 * Concrete GPU-free batch accumulator: collects committed batches into a
 * GDPR-eligible and a plain vector, then sorts and group-counts them on
 * Finalize.
 */
class TriRenderBatchAccumulator extends ITriRenderBatchAccumulator {
  /**
   * Creates an empty accumulator whose key generator decides sorting and GDPR
   * eligibility, defaulting to the effect-sorted one.
   */
  constructor(keyGenerator = EffectKeyGenerator) {
    super();
    this.keyGenerator = keyGenerator;
    this.gdprBatches = [];
    this.batches = [];
  }

  /**
   * Drops both batch vectors and resets user data and rendering mode to their
   * defaults.
   */
  Clear() {
    this.userData = 0;
    this.renderingMode = RenderingMode.RM_ANY;
    this.gdprBatches.length = 0;
    this.batches.length = 0;
  }

  // Collects a batch. Invalid batches (no shader) are dropped. GDPR-eligible
  // batches (allowed by the key generator, GDR-compatible material, triangle
  // topology, indexed) go to the GDPR vector; the rest to the plain vector. The
  // batch's rendering mode is overwritten with the accumulator's mode (faithful
  // to Carbon). Commit takes ownership of the batch; do not reuse it afterwards.
  // Returns whether the batch was accepted (JS addition; Carbon returns void).

  /**
   * Collects a batch, dropping invalid ones and routing GDPR-eligible batches
   * (allowed by the key generator, GDR-compatible material, triangle list,
   * indexed) to the GDPR vector; the batch's rendering mode is overwritten with
   * the accumulator's and ownership passes here, so the caller must not reuse
   * the batch. Returns whether it was accepted.
   */
  Commit(batch) {
    if (!batch.IsValid()) return false;
    if (this.keyGenerator.ALLOW_GDPR && batch.material?.CompatibleWithGdr?.() && batch.topology === D3dPrimitiveTopology.TRIANGLELIST && batch.indexBuffer) {
      this.gdprBatches.push(batch);
    } else {
      this.batches.push(batch);
    }
    batch.renderingMode = this.renderingMode;
    return true;
  }

  // Folds another accumulator's batches into this one, then clears the source.
  // Mirrors Carbon TransferFrom (per-thread accumulator merge).

  /**
   * Folds another accumulator's batches into this one and clears the source; the
   * source's GDPR batches land in the plain vector when this accumulator does
   * not allow GDPR.
   */
  TransferFrom(source) {
    const sourceGdpr = source.GetGdprBatches();
    const sourceBatches = source.GetBatches();
    if (this.keyGenerator.ALLOW_GDPR) {
      for (const batch of sourceGdpr) this.gdprBatches.push(batch);
    } else {
      for (const batch of sourceGdpr) this.batches.push(batch);
    }
    for (const batch of sourceBatches) this.batches.push(batch);
    source.Clear();
  }

  /** The live GDPR-eligible batch vector, not a copy. */
  GetGdprBatches() {
    return this.gdprBatches;
  }

  /** The live plain batch vector, not a copy. */
  GetBatches() {
    return this.batches;
  }

  // Sorts and group-counts the collected batches. No-op for the order-preserving
  // key generator; effect/GDPR generators sort both vectors and stamp each
  // bin-run's length onto its leading batch's groupCount.

  /**
   * Sorts and group-counts the collected batches: a no-op for the
   * order-preserving key generator, a full bin partition of both vectors for
   * GDPR-enabled ones, and a plain comparator sort otherwise.
   */
  Finalize() {
    const sortType = this.keyGenerator.GetSortType();
    if (sortType === RenderBatchSortType.RENDERBATCHSORTTYPE_NONE) return;
    if (this.keyGenerator.ALLOW_GDPR) {
      Tr2GdprBatchFullPartition(this.gdprBatches);
      Tr2GdprBatchFullPartition(this.batches);
      return;
    }
    const keyGenerator = this.keyGenerator;
    this.batches.sort((batch1, batch2) => {
      if (keyGenerator.Less(batch1, batch2)) return -1;
      if (keyGenerator.Less(batch2, batch1)) return 1;
      return 0;
    });
  }

  /** Total batches across both vectors. */
  GetBatchCount() {
    return this.gdprBatches.length + this.batches.length;
  }

  /**
   * Whether the batches are effect-sorted, so consecutive batches can share one
   * state-set, rather than order-preserving.
   */
  IsChainedByEffect() {
    return this.keyGenerator.GetSortType() !== RenderBatchSortType.RENDERBATCHSORTTYPE_NONE;
  }
}

export { DefaultKeyGenerator, EffectKeyGenerator, TriRenderBatchAccumulator };
//# sourceMappingURL=TriRenderBatchAccumulator.js.map
