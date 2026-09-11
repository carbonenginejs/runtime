// Source: trinity/trinity/TriRenderBatch.h
//   trinity/TriRenderBatch.cpp
//
// GPU-free CPU render-batch descriptor plus the binning/sort helpers. A batch
// holds opaque references to material/shader/geometry and plain draw arguments;
// it never touches a device. The engine adapter reads a finalized accumulator's
// batches and issues the actual draws (Carbon's Tr2RenderContextBase::RenderBatches*
// dispatch family stays engine-side and is intentionally NOT ported here).



// A contiguous (startIndex, count) block of mesh groups. Mirrors Carbon
// TriRenderBatchAreaBlock; used by the shadow/overlay area-block paths.

/**
 * A contiguous (startIndex, count) run of mesh groups, as consumed by the shadow
 * and overlay area-block paths.
 */
export class TriRenderBatchAreaBlock
{
  /**
   * Creates a block covering count groups from startIndex; both are coerced to
   * unsigned integers.
   */
  // Carbon's empty constructor leaves these integers uninitialized.
  // JS deliberately initializes them to zero; the two-argument form copies values.
  constructor(startIndex = 0, count = 0)
  {
    this.startIndex = startIndex >>> 0;
    this.count = count >>> 0;
  }

  // Compacts a set of possibly overlapping/adjacent blocks into the minimal set
  // of contiguous runs, in place. Mirrors TriRenderBatchAreaBlock::Optimize.

  /**
   * Compacts a vector of possibly overlapping or adjacent blocks into the
   * minimal set of contiguous runs, rewriting the caller's array in place and
   * returning it.
   */
  static Optimize(areaBlockVector)
  {
    const indices = new Set();
    for (const block of areaBlockVector)
    {
      for (let i = 0; i < block.count; i++) indices.add(block.startIndex + i);
    }

    const sorted = Array.from(indices).sort((a, b) => a - b);
    areaBlockVector.length = 0;

    let start = -1;
    let run = -1;
    for (const value of sorted)
    {
      if (run >= 0 && value === run + 1)
      {
        run = value;
        continue;
      }
      if (run >= 0) areaBlockVector.push(new TriRenderBatchAreaBlock(start, run - start + 1));
      start = value;
      run = value;
    }
    if (run >= 0) areaBlockVector.push(new TriRenderBatchAreaBlock(start, run - start + 1));
    return areaBlockVector;
  }
}
