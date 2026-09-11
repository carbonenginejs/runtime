// Source: trinity/trinity/TriRenderBatch.h
//   trinity/TriRenderBatch.cpp
//
// GPU-free CPU render-batch descriptor plus the binning/sort helpers. A batch
// holds opaque references to material/shader/geometry and plain draw arguments;
// it never touches a device. The engine adapter reads a finalized accumulator's
// batches and issues the actual draws (Carbon's Tr2RenderContextBase::RenderBatches*
// dispatch family stays engine-side and is intentionally NOT ported here).

import { TriRenderBatchAreaBlock } from "./TriRenderBatchAreaBlock.js";

// A shared-material list of area blocks (shadow/overlay path). Mirrors
// TriRenderBatchAreaBlocksWithSharedMaterial.

/**
 * Groups the area blocks that draw with one shared shader material on the shadow
 * and overlay path.
 */
export class TriRenderBatchAreaBlocksWithSharedMaterial extends TriRenderBatchAreaBlock
{
  /** Starts with no shared material and an empty block vector. */
  constructor()
  {
    super();
    this.shaderMaterial = null;
    this.areaBlockVector = [];
  }

  /** Compacts the owned block vector into minimal contiguous runs. */
  Optimize()
  {
    TriRenderBatchAreaBlock.Optimize(this.areaBlockVector);
  }

  /** Empties the block vector while keeping the shared material bound. */
  Clear()
  {
    this.areaBlockVector.length = 0;
  }
}
