// Source: trinity/trinity/Interior/Tr2InteriorRenderBatch.h
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

/** Stable-sort policy for interior render batches. */
@type.define({ className: "Tr2IntKeyGenerator", family: "interior" })
export class Tr2IntKeyGenerator extends CjsModel
{

  /** Carbon static comparator for interior render batches. */
  @carbon.method
  @impl.implemented
  static Less(batch1, batch2)
  {
    if (batch1.renderingMode < batch2.renderingMode) return true;
    if (batch1.renderingMode > batch2.renderingMode) return false;
    return batch1.renderingMode === 4 ? batch1.depth < batch2.depth : false;
  }

  /** Carbon requests stable sorting so authored decal order is preserved. */
  @carbon.method
  @impl.implemented
  static GetSortType()
  {
    return 2;
  }

  static ALLOW_GDPR = false;

}
