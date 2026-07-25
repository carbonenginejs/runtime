// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/EveComponentRegistry.h
// Hand-maintained after promotion from generated schema intake.
import { impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Stores entities belonging to one Eve component type. */
@type.define({ className: "EveComponentCollection", family: "eve/scene" })
export class EveComponentCollection extends CjsModel
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

  @impl.implemented
  Add(entity)
  {
    const index = this.collection.length;
    this.collection.push(entity);
    return index;
  }

  @impl.implemented
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

  @impl.implemented
  Clear()
  {
    this.collection.length = 0;
  }

  @impl.implemented
  GetBit()
  {
    return this.bit;
  }

  @impl.implemented
  Size()
  {
    return this.collection.length;
  }

}
