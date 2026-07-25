// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
// Source: trinity/trinity/Eve/EveComponentRegistry.h
// Source: trinity/trinity/Eve/EveComponentRegistry.cpp
// Hand-maintained after promotion from generated schema intake.
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { EveComponentCollection } from "./EveComponentCollection.js";
import { EveComponentRequiredMethods } from "../../EveComponentTypes.js";

/** Indexes Eve entities and their component collections for scene processing. */
@type.define({ className: "EveComponentRegistry", family: "eve/scene" })
export class EveComponentRegistry extends CjsModel
{

  #componentCollections = [];

  /** m_componentCollectionLoopGuard (mutable std::shared_mutex) */
  @type.rawStruct("std::shared_mutex")
  componentCollectionLoopGuard = null;

  /** m_registeredEntities (std::vector<EveEntity*>) */
  @type.list("EveEntity")
  registeredEntities = [];

  @impl.implemented
  Clear()
  {
    for (const collection of this.#componentCollections)
    {
      collection.Clear();
    }
    for (const entity of this.registeredEntities)
    {
      if (entity.registry === this)
      {
        entity.registry = null;
        entity.indexInRegistry = -1;
        entity.ClearComponentState();
      }
    }
    this.registeredEntities.length = 0;
  }

  @impl.implemented
  ReRegister(entity)
  {
    entity.UnRegister(this);
    entity.Register(this);
  }

  @impl.implemented
  Register(entity)
  {
    if (entity.indexInRegistry !== -1)
    {
      return false;
    }
    entity.registry = this;
    entity.indexInRegistry = this.registeredEntities.length;
    this.registeredEntities.push(entity);
    return true;
  }

  @impl.implemented
  UnRegister(entity)
  {
    const index = entity.indexInRegistry;
    if (entity.registry !== this || index < 0 || index >= this.registeredEntities.length)
    {
      return false;
    }
    const lastIndex = this.registeredEntities.length - 1;
    if (index !== lastIndex)
    {
      const swappedEntity = this.registeredEntities[lastIndex];
      swappedEntity.indexInRegistry = index;
      this.registeredEntities[index] = swappedEntity;
    }
    this.registeredEntities.pop();
    entity.registry = null;
    entity.indexInRegistry = -1;
    return true;
  }

  @impl.implemented
  UnRegisterAllComponents(entity)
  {
    for (const collection of this.#componentCollections)
    {
      this.RemoveFromCollection(collection, entity);
    }
  }

  @impl.implemented
  GetComponentCollection(componentName)
  {
    return this.#componentCollections.find(collection => collection.name === componentName) ?? null;
  }

  @impl.adapted
  @impl.reason("JavaScript passes Carbon's compile-time component name explicitly because it has no C++ template specialization.")
  RegisterComponent(componentName, entity)
  {
    // Fail-closed duck assertion: Carbon's RegisterComponent<T> cannot compile
    // for an entity that does not implement T; the JS port asserts the
    // interface's pure-virtual surface (EveComponentRequiredMethods) instead.
    if (Object.hasOwn(EveComponentRequiredMethods, componentName))
    {
      for (const method of EveComponentRequiredMethods[componentName])
      {
        if (typeof entity?.[method] !== "function")
        {
          throw new TypeError(
            `EveComponentRegistry.RegisterComponent("${componentName}"): entity `
            + `${entity?.constructor?.name ?? typeof entity} is missing required method ${method}().`);
        }
      }
    }
    let collection = this.GetComponentCollection(componentName);
    if (!collection)
    {
      collection = this.AddCollection(componentName);
    }
    return this.AddToCollection(collection, entity);
  }

  @impl.adapted
  @impl.reason("JavaScript passes Carbon's compile-time component name explicitly because it has no C++ template specialization.")
  UnRegisterComponent(componentName, entity)
  {
    const collection = this.GetComponentCollection(componentName);
    return collection ? this.RemoveFromCollection(collection, entity) : false;
  }

  @impl.implemented
  AddCollection(componentName)
  {
    if (this.#componentCollections.length >= 32)
    {
      throw new RangeError("EveComponentRegistry supports at most 32 component collections.");
    }
    const collection = new EveComponentCollection();
    collection.name = String(componentName);
    collection.bit = 2 ** this.#componentCollections.length;
    this.#componentCollections.push(collection);
    return collection;
  }

  @impl.implemented
  AddToCollection(collection, entity)
  {
    if (entity.GetComponentIndex(collection.GetBit()) !== undefined)
    {
      return false;
    }
    const index = collection.Add(entity);
    entity.SetComponentState(collection.GetBit(), index);
    return true;
  }

  @impl.implemented
  RemoveFromCollection(collection, entity)
  {
    const bit = collection.GetBit();
    const index = entity.GetComponentIndex(bit);
    if (index === undefined)
    {
      return false;
    }
    const swappedEntity = collection.SwapWithBack(index);
    if (swappedEntity)
    {
      swappedEntity.SetComponentState(bit, index);
    }
    entity.RemoveComponentState(bit);
    return true;
  }

  @impl.implemented
  GetComponents(componentName)
  {
    return this.GetComponentCollection(componentName)?.collection ?? [];
  }

  @impl.implemented
  ComponentCount(componentName)
  {
    return this.GetComponentCollection(componentName)?.Size() ?? 0;
  }

  /** Carbon method GetComponentInfo (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns Carbon's vector of name/count pairs as JavaScript tuple arrays.")
  GetComponentInfo()
  {
    return this.#componentCollections.map(collection => [collection.name, collection.Size()]);
  }

}
