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

  /**
   * Empties every component collection and detaches all registered entities,
   * resetting their registry link and component state.
   */
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

  /**
   * Removes the entity from this registry and adds it back, moving it to the end
   * of the registration order.
   */
  @impl.implemented
  ReRegister(entity)
  {
    entity.UnRegister(this);
    entity.Register(this);
  }

  /**
   * Adds an entity to the registry and records its index, returning false if the
   * entity is already registered anywhere.
   */
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

  /**
   * Removes an entity by swapping the last registered entity into its slot,
   * keeping the entity list dense, and returns false if the entity is not
   * registered here.
   */
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

  /**
   * Drops the entity from every component collection while leaving it registered
   * in the entity list.
   */
  @impl.implemented
  UnRegisterAllComponents(entity)
  {
    for (const collection of this.#componentCollections)
    {
      this.RemoveFromCollection(collection, entity);
    }
  }

  /**
   * Returns the collection for a component name, or null when no collection has
   * been created for it yet.
   */
  @impl.implemented
  GetComponentCollection(componentName)
  {
    return this.#componentCollections.find(collection => collection.name === componentName) ?? null;
  }

  /**
   * Adds an entity to the named component's collection, creating the collection
   * on demand, and throws if the entity is missing any method the component
   * interface requires - the fail-closed stand-in for Carbon's compile-time
   * RegisterComponent<T> constraint.
   */
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

  /**
   * Removes an entity from the named component's collection, returning false
   * when no such collection exists.
   */
  @impl.adapted
  @impl.reason("JavaScript passes Carbon's compile-time component name explicitly because it has no C++ template specialization.")
  UnRegisterComponent(componentName, entity)
  {
    const collection = this.GetComponentCollection(componentName);
    return collection ? this.RemoveFromCollection(collection, entity) : false;
  }

  /**
   * Creates a collection for a component name and assigns it the next free bit;
   * throws once 32 collections exist because the entity component mask is 32
   * bits wide.
   */
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

  /**
   * Appends an entity to a collection and stores the resulting index on the
   * entity under the collection's bit, returning false if it is already a
   * member.
   */
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

  /**
   * Removes an entity from a collection by swapping the back element into its
   * slot and fixing up the moved entity's stored index, returning false if it
   * was not a member.
   */
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

  /**
   * Returns the live entity array backing the named component collection, or an
   * empty array when the collection does not exist; the array is borrowed and
   * changes as entities register.
   */
  @impl.implemented
  GetComponents(componentName)
  {
    return this.GetComponentCollection(componentName)?.collection ?? [];
  }

  /**
   * Returns how many entities are in the named component collection, or 0 when
   * the collection does not exist.
   */
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
