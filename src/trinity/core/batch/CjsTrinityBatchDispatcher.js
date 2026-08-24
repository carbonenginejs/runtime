import { impl } from "#schema";


/**
 * Minimum renderer contract for a finalized Trinity batch map.
 * Backend-private preparation and encoding details do not belong here.
 */
export class CjsTrinityBatchDispatcher
{

  /** Prepares a finalized canonical batch map for later encoding. */
  @impl.abstract
  PrepareBatchMap(_batchMap)
  {
    throw new Error("CjsTrinityBatchDispatcher.PrepareBatchMap must be implemented by a concrete dispatcher.");
  }

  /** Encodes one canonical batch type from a prepared map into a render pass. */
  @impl.abstract
  EncodeBatchType(_pass, _preparedBatchMap, _batchType)
  {
    throw new Error("CjsTrinityBatchDispatcher.EncodeBatchType must be implemented by a concrete dispatcher.");
  }

  /** Releases renderer-owned state associated with a prepared batch map. */
  @impl.abstract
  DestroyBatchMap(_preparedBatchMap)
  {
    throw new Error("CjsTrinityBatchDispatcher.DestroyBatchMap must be implemented by a concrete dispatcher.");
  }

}
