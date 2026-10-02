// Source: trinity/trinity/TriRenderBatch.h
import { RenderBatchSortType } from "../../../generated/trinityCore/enums.js";
import { meta } from "#schema";

/** Carbon's DefaultKeyGenerator batch sorting policy. */
export class DefaultKeyGenerator
{
  /** Carbon's unsorted comparator never requests a reorder. */
  @meta.blue.method
  @meta.implemented
  static Less(_batch1, _batch2)
  {
    return false;
  }

  /** Selects the unsorted accumulator path. */
  @meta.blue.method
  @meta.implemented
  static GetSortType()
  {
    return RenderBatchSortType.RENDERBATCHSORTTYPE_NONE;
  }

  static ALLOW_GDPR = false;
}
