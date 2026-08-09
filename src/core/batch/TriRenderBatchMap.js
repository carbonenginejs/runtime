// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/Eve/EveSpaceScene.h  (BatchMap typedef)
//   trinity/Eve/EveSpaceScene.cpp (GetBatchesFromRenderables / FinalizeBatches / ClearBatches)
//
// GPU-free scene batch collection. Wraps Carbon's BatchMap (one accumulator per
// TriBatchType) plus the GetBatchesFromRenderables/FinalizeBatches/ClearBatches
// flow, exposed as methods on a cohesive object rather than a free function. The
// engine adapter reads the finalized per-type accumulators and issues draws.
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { TriRenderBatchAccumulator, DefaultKeyGenerator, EffectKeyGenerator } from "./TriRenderBatchAccumulator.js";


/**
 * One render-batch accumulator per TriBatchType, with the scene-level collect,
 * finalize and clear flow over them.
 */
export class TriRenderBatchMap
{
  // batchTypes: iterable of TriBatchType values to collect. createAccumulator:
  // optional (batchType) => accumulator factory. The default matches Carbon's
  // key-generator selection: order-preserving for TRANSPARENT (the producer
  // inserts back-to-front), effect-sorted for everything else.

  /**
   * Creates one accumulator per requested batch type; by default TRANSPARENT
   * gets the order-preserving key generator (the producer inserts back-to-front)
   * and every other type the effect-sorted one.
   */
  constructor(batchTypes, createAccumulator = null)
  {
    this.accumulators = new Map();

    const factory = createAccumulator ?? ((batchType) => new TriRenderBatchAccumulator(
      batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT ? DefaultKeyGenerator : EffectKeyGenerator));
    for (const batchType of batchTypes)
    {
      this.accumulators.set(batchType, factory(batchType));
    }
  }

  /** The accumulator for one batch type, or null when that type is not collected. */
  GetAccumulator(batchType)
  {
    return this.accumulators.get(batchType) ?? null;
  }

  // Bind the per-object-data store (from the render context) onto every
  // accumulator - GetPerObjectData Allocs pooled records through it.

  /**
   * Binds the per-object-data store onto every accumulator, since
   * GetPerObjectData leases pooled records through it; returns this for
   * chaining.
   */
  SetTriPoolAllocator(store)
  {
    for (const accumulator of this.accumulators.values())
    {
      accumulator.SetTriPoolAllocator(store);
    }

    return this;
  }

  /** The collected batch types, in insertion order, as a new array. */
  GetBatchTypes()
  {
    return Array.from(this.accumulators.keys());
  }

  // Serial form of Carbon GetBatchesFromRenderables: one GetPerObjectData per
  // renderable (keyed off the pool accumulator, by convention the OPAQUE one),
  // then GetBatches into each registered batch type. Renderables are expected
  // pre-culled; visibility/frustum filtering is a scene concern upstream.

  /**
   * Serial form of Carbon's GetBatchesFromRenderables: one GetPerObjectData per
   * renderable, keyed off the pool accumulator (by convention the OPAQUE one),
   * then GetBatches into every registered batch type. Renderables are expected
   * pre-culled.
   */
  CollectFromRenderables(renderables, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!renderables) return;

    const poolAccumulator = this.accumulators.get(TriBatchType.TRIBATCHTYPE_OPAQUE)
      ?? this.accumulators.values().next().value
      ?? null;

    for (const renderable of renderables)
    {
      if (!renderable) continue;

      const perObjectData = renderable.GetPerObjectData?.(poolAccumulator) ?? null;
      for (const [ batchType, accumulator ] of this.accumulators)
      {
        renderable.GetBatches?.(accumulator, batchType, perObjectData, reason);
      }
    }
  }

  /** Sorts and group-counts every accumulator. */
  Finalize()
  {
    for (const accumulator of this.accumulators.values()) accumulator.Finalize();
  }

  /**
   * Clears every accumulator; the accumulators themselves are retained and
   * reused next frame.
   */
  Clear()
  {
    for (const accumulator of this.accumulators.values()) accumulator.Clear();
  }

  /** Total batches collected across every batch type. */
  GetBatchCount()
  {
    let count = 0;
    for (const accumulator of this.accumulators.values()) count += accumulator.GetBatchCount();
    return count;
  }
}
