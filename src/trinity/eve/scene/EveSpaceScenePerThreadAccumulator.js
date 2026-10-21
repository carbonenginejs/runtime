// Source: trinity/trinity/Eve/EveSpaceScene.h:194-200
import { meta } from "#schema";
import { EffectKeyGenerator, TriRenderBatchAccumulator } from "../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";


/**
 * Carbon EveSpaceScene::PerThreadAccumulator (public, h:194-200): an
 * effect-sorted TriRenderBatchAccumulator bound to the renderer's pool
 * allocator. It adds no members or methods of its own.
 *
 * Carbon keeps one per worker thread and batch type in m_perThreadBatches
 * (PerThreadBatchMap, h:204,424; filled for six batch types at
 * cpp:238-243). GetBatchesFromRenderables (cpp:885-933) has every thread
 * commit into its own `.local()` accumulator inside Tr2ParallelFor, then
 * TransferFrom's each one into the scene's BatchMap. JavaScript has no
 * shared-memory threads, so our gather commits straight into the BatchMap
 * and nothing constructs this class yet; it is here so the per-thread
 * gather has its donor type when one is ported.
 */
@meta.define({"className":"EveSpaceScenePerThreadAccumulator","carbon":"EveSpaceScene::PerThreadAccumulator"})
export class EveSpaceScenePerThreadAccumulator extends TriRenderBatchAccumulator
{

  /**
   * Carbon PerThreadAccumulator() (h:196-199): an EffectKeyGenerator
   * accumulator over Tr2Renderer::GetPoolAllocator().
   *
   * Adapted: Tr2Renderer's pool allocator static is relocated onto the render
   * context here (Tr2RenderContext `_poolAllocator`), so the main-thread
   * context's pool stands in for Carbon's process-wide one.
   */
  constructor()
  {
    super(EffectKeyGenerator);

    this.SetTriPoolAllocator(Tr2RenderContext_GetMainThreadRenderContext().GetTriPoolAllocator());
  }

}
