// Source: trinity/trinity/TriRenderBatch.h
import { RenderBatchSortType } from "../../../generated/trinityCore/enums.js";
import { OrderOf } from "./Tr2RenderBatch.js";
import { carbon, impl } from "#schema";

/** Carbon's EffectKeyGenerator batch sorting policy. */
export class EffectKeyGenerator
{
  /** Orders shader identities, then vertex declarations. */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript has no pointer ordering; the existing per-reference ordinal keeps equal shader identities contiguous.")
  static Less(batch1, batch2)
  {
    const shaderOrder = OrderOf(batch1.shader) - OrderOf(batch2.shader);
    if (shaderOrder !== 0) return shaderOrder < 0;
    return batch1.vertexDeclaration < batch2.vertexDeclaration;
  }

  /** Selects Carbon's regular sort path. */
  @carbon.method
  @impl.implemented
  static GetSortType()
  {
    return RenderBatchSortType.RENDERBATCHSORTTYPE_SORT;
  }

  static ALLOW_GDPR = true;
}
