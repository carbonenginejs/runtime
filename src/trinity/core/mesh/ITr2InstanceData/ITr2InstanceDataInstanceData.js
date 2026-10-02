// Source: trinity/trinity/Include/ITr2InstanceData.h
import { meta, types } from "#schema";

/**
 * ITr2InstanceData::InstanceData, a plain nested record returned by a provider.
 * The flattened JavaScript constructor name is retained for existing consumers.
 * Its enclosing interface is not a base and supplies no record lifecycle.
 */
@meta.define({ className: "ITr2InstanceDataInstanceData", family: "trinityCore" })
export class ITr2InstanceDataInstanceData
{
  /**
   * Borrowed native const Tr2BufferAL reference; null represents empty AL state.
   * @type {object|ArrayBuffer|null}
   */
  @types.rawStruct("Tr2BufferAL")
  buffer = null;

  /**
   * Byte offset into the borrowed buffer.
   * @type {number}
   */
  @types.uint32
  offset = 0;

  /**
   * Byte stride between successive instances.
   * @type {number}
   */
  @types.uint32
  stride = 0;

  /**
   * Number of instances in the slice.
   * @type {number}
   */
  @types.uint32
  count = 0;
}
