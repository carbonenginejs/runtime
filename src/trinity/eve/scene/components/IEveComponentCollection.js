import { meta } from "#schema";
// Source: trinity/trinity/Eve/EveComponentRegistry.h
import { blue } from "#schema";


/**
 * Carbon IEveComponentCollection (EveComponentRegistry.h:37-47): the
 * registry's type-erased view of one component type's entity collection.
 */
@meta.carbon("IEveComponentCollection")
export class IEveComponentCollection
{

  /**
   * Carbon's `bool Add( EveEntity* entity, uint32_t* index )`.
   *
   * Adapted: the output index is the return value (rule 11).
   * @param {EveEntity} _entity
   * @returns {number} The index the entity was stored at.
   */
  @meta.abstract
  Add(_entity) {}

  /**
   * Carbon's `EveEntity* SwapWithBack( uint32_t index )`.
   * @param {number} _index
   * @returns {EveEntity|null} The entity moved into the slot.
   */
  @meta.abstract
  SwapWithBack(_index) {}

  /** Carbon's `void Clear()`. */
  @meta.abstract
  Clear() {}

  /**
   * Carbon's `uint32_t GetBit() const`.
   * @returns {number}
   */
  @meta.abstract
  GetBit() {}

  /**
   * Carbon's `size_t Size() const`.
   * @returns {number}
   */
  @meta.abstract
  Size() {}

}
