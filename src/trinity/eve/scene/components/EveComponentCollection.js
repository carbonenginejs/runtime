// Source: trinity/trinity/Eve/EveComponentRegistry.h
// Hand-maintained after promotion from generated schema intake.
import { meta, type, blue } from "#schema";
import { IEveComponentCollection } from "./IEveComponentCollection.js";

/** Stores entities belonging to one Eve component type. */
@blue.define("EveComponentCollection")
@blue.inherit(IEveComponentCollection)
export class EveComponentCollection
{

  /** m_name (const char*) */
  @type.string
  name = "";

  /** m_bit (uint32_t) */
  @type.uint32
  bit = 0;

  /** m_collection (std::vector<T*>) */
  @type.list("T")
  collection = [];

  /**
   * Appends an entity and returns the index it was stored at, which the registry
   * records on the entity.
   */
  @blue.method
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
   * when nothing moved (EveComponentRegistry.h:163-174). Removing the only or
   * the last element moves nothing, whatever the index.
   *
   * Carbon indexes m_collection unchecked; an index it would write outside the
   * collection, or a pop from an empty one, throws a RangeError here
   * (ruling 11).
   *
   * @param {number} index Index of the entity to remove.
   * @returns {object|null} The entity moved into index, or null.
   * @throws {RangeError} When the write at index or the pop falls outside the collection.
   */
  @blue.method
  @meta.implemented
  SwapWithBack(index)
  {
    const size = this.collection.length;
    let swappedEntity = null;

    if (size !== 1 && index !== size - 1)
    {
      if (!(Number.isInteger(index) && index >= 0 && index < size))
      {
        throw new RangeError(`EveComponentCollection.SwapWithBack: index ${index} out of range, size is ${size}.`);
      }
      this.collection[index] = this.collection[size - 1];
      swappedEntity = this.collection[index];
    }

    if (size === 0)
    {
      throw new RangeError("EveComponentCollection.SwapWithBack: pop_back on an empty collection.");
    }
    this.collection.pop();
    return swappedEntity;
  }

  /**
   * Drops all entities from the collection without touching their stored
   * component state.
   */
  @blue.method
  @meta.implemented
  Clear()
  {
    this.collection.length = 0;
  }

  /**
   * Returns the single mask bit the registry assigned to this collection, used
   * as the key for an entity's per-component index.
   */
  @blue.method
  @meta.implemented
  GetBit()
  {
    return this.bit;
  }

  /** Returns the number of entities currently in the collection. */
  @blue.method
  @meta.implemented
  Size()
  {
    return this.collection.length;
  }

}
