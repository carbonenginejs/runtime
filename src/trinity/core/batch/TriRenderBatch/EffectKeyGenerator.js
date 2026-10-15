// Source: trinity/trinity/TriRenderBatch.h
import { RenderBatchSortType } from "../../../generated/trinityCore/enums.js";
import { OrderOf } from "./Tr2RenderBatch.js";
import { meta, blue } from "#schema";

/** Carbon's EffectKeyGenerator batch sorting policy. */
@blue.define("EffectKeyGenerator")
export class EffectKeyGenerator
{
  /**
   * Orders shader identities, then vertex declarations.
   *
   * Adapted: JavaScript has no pointer ordering; the existing per-reference ordinal keeps
   * equal shader identities contiguous.
   */
  @blue.method
  @meta.adapted
  static Less(batch1, batch2)
  {
    const shaderOrder = OrderOf(batch1.shader) - OrderOf(batch2.shader);
    if (shaderOrder !== 0) return shaderOrder < 0;
    return batch1.vertexDeclaration < batch2.vertexDeclaration;
  }

  /** Selects Carbon's regular sort path. */
  @blue.method
  @meta.implemented
  static GetSortType()
  {
    return RenderBatchSortType.RENDERBATCHSORTTYPE_SORT;
  }

  static ALLOW_GDPR = true;
}
