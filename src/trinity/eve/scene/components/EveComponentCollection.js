// Source: trinity/trinity/Eve/EveComponentRegistry.h
// Hand-maintained after promotion from generated schema intake.
import { meta } from "#schema";

/** Stores entities belonging to one Eve component type. */
@meta.define({ className: "EveComponentCollection", family: "eve/scene" })
export class EveComponentCollection
{

  /** m_name (const char*) */
  @meta.type.string
  name = "";

  /** m_bit (uint32_t) */
  @meta.type.uint32
  bit = 0;

  /** m_collection (std::vector<T*>) */
  @meta.type.list("T")
  collection = [];

  /**
   * Appends an entity and returns the index it was stored at, which the registry
   * records on the entity.
   */
  @meta.implemented
  Add(entity)
  {
    const index = this.collection.length;
    this.collection.push(entity);
    return index;
  }

  /**
   * Removes the entry at an index by moving the last element into its place and
   * returns that moved entity so the caller can fix up its stored index, or null
   * when nothing moved or the index is out of range.
   */
  @meta.implemented
  SwapWithBack(index)
  {
    if (index < 0 || index >= this.collection.length)
    {
      return null;
    }
    const lastIndex = this.collection.length - 1;
    let swappedEntity = null;
    if (index !== lastIndex)
    {
      swappedEntity = this.collection[lastIndex];
      this.collection[index] = swappedEntity;
    }
    this.collection.pop();
    return swappedEntity;
  }

  /**
   * Drops all entities from the collection without touching their stored
   * component state.
   */
  @meta.implemented
  Clear()
  {
    this.collection.length = 0;
  }

  /**
   * Returns the single mask bit the registry assigned to this collection, used
   * as the key for an entity's per-component index.
   */
  @meta.implemented
  GetBit()
  {
    return this.bit;
  }

  /** Returns the number of entities currently in the collection. */
  @meta.implemented
  Size()
  {
    return this.collection.length;
  }

}
