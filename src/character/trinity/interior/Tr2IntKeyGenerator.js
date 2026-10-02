// Source: trinity/trinity/Interior/Tr2InteriorRenderBatch.h
import { meta } from "#schema";

/** Stable-sort policy for interior render batches. */
@meta.define({ className: "Tr2IntKeyGenerator", family: "interior" })
export class Tr2IntKeyGenerator
{

  /** Carbon static comparator for interior render batches. */
  @meta.blue.method
  @meta.implemented
  static Less(batch1, batch2)
  {
    if (batch1.renderingMode < batch2.renderingMode) return true;
    if (batch1.renderingMode > batch2.renderingMode) return false;
    return batch1.renderingMode === 4 ? batch1.depth < batch2.depth : false;
  }

  /** Carbon requests stable sorting so authored decal order is preserved. */
  @meta.blue.method
  @meta.implemented
  static GetSortType()
  {
    return 2;
  }

  static ALLOW_GDPR = false;

}
