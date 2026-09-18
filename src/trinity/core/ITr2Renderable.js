// Source: trinity/trinity/ITr2Renderable.h
import { CjsSchema, impl } from "#schema";


/**
 * Trinity-owned contract for objects collected through the renderable path.
 */
export class ITr2Renderable
{

  /** Carbon's default visibility answer for a renderable. */
  IsVisible(_updateContext)
  {
    return true;
  }

  /** Emits batches of the requested type. */
  GetBatches(_accumulator, _batchType, _perObjectData, _reason, _renderContext)
  {
    throw new Error("ITr2Renderable.GetBatches must be implemented by a renderable.");
  }

  /** Reports whether a transparent pass is required. */
  HasTransparentBatches()
  {
    throw new Error("ITr2Renderable.HasTransparentBatches must be implemented by a renderable.");
  }

  /** Returns the current transparent-sort value. */
  GetSortValue(_renderContext)
  {
    throw new Error("ITr2Renderable.GetSortValue must be implemented by a renderable.");
  }

  /** Returns or allocates the renderable's per-object data. */
  GetPerObjectData(_accumulator)
  {
    throw new Error("ITr2Renderable.GetPerObjectData must be implemented by a renderable.");
  }
}


for (const method of [
  "GetBatches",
  "HasTransparentBatches",
  "GetSortValue",
  "GetPerObjectData"
])
{
  CjsSchema.decorateMethod(ITr2Renderable, method, impl.abstract);
}
CjsSchema.define(ITr2Renderable, { className: "ITr2Renderable" });
