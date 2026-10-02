import { meta } from "#schema";


/**
 * Minimum renderer contract for a finalized Trinity batch map.
 * Backend-private preparation and encoding details do not belong here.
 */
export class CjsTrinityBatchDispatcher
{

  /** Prepares a finalized canonical batch map for later encoding. */
  @meta.abstract
  PrepareBatchMap(_batchMap)
  {
    throw new Error("CjsTrinityBatchDispatcher.PrepareBatchMap must be implemented by a concrete dispatcher.");
  }

  /** Encodes one canonical batch type from a prepared map into a render pass. */
  @meta.abstract
  EncodeBatchType(_pass, _preparedBatchMap, _batchType)
  {
    throw new Error("CjsTrinityBatchDispatcher.EncodeBatchType must be implemented by a concrete dispatcher.");
  }

  /** Releases renderer-owned state associated with a prepared batch map. */
  @meta.abstract
  DestroyBatchMap(_preparedBatchMap)
  {
    throw new Error("CjsTrinityBatchDispatcher.DestroyBatchMap must be implemented by a concrete dispatcher.");
  }

}
