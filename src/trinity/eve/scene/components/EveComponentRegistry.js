import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/EveComponentRegistry.h
// Source: trinity/trinity/Eve/EveComponentRegistry.cpp
// Hand-maintained after promotion from generated schema intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { EveComponentCollection } from "./EveComponentCollection.js";
import { EveComponentRequiredMethods, EveComponentType } from "../../EntityComponents.js";
import { ITr2FroxelFogSettings } from "../../child/ITr2FroxelFogSettings.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { ITr2VolumetricRenderable } from "../../../core/ITr2VolumetricRenderable.js";
import { ITr2PostProcessOwner } from "../../../postProcess/ITr2PostProcessOwner.js";

/** Indexes Eve entities and their component collections for scene processing. */
@be.define("EveComponentRegistry")
@blue.inherit(IRoot)

export class EveComponentRegistry
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
  @blue.method
  @meta.implemented
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
   * Carbon `template <typename T> void Clear()` (EveComponentRegistry.h:232-247):
   * empties one component type's collection, first clearing that component's
   * bit from each entity in it. Nothing happens when the collection was never
   * created.
   *
   * Adapted: JavaScript names the component explicitly, as RegisterComponent
   * does, because it has no template specialization. Carbon's collection
   * loop guard has no counterpart without threads.
   * @param {string} componentName The component type's registered name.
   */
  @blue.method
  @meta.adapted
  Clear__Component(componentName)
  {
    const collection = this.GetComponentCollection(componentName);
    if (collection === null)
    {
      return;
    }
    for (const entity of collection.collection)
    {
      this.RemoveCollectionFromEntityState(collection, entity);
    }
    collection.Clear();
  }

  /**
   * Removes the entity from this registry and adds it back, moving it to the end
   * of the registration order.
   */
  @blue.method
  @meta.implemented
  ReRegister(entity)
  {
    entity.UnRegister(this);
    entity.Register(this);
  }

  /**
   * Adds an entity to the registry and records its index, returning false if the
   * entity is already registered anywhere.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetComponentCollection(componentName)
  {
    return this.#componentCollections.find(collection => collection.name === componentName) ?? null;
  }

  /**
   * Adds an entity to the named component's collection, creating the collection
   * on demand, and throws if the entity is not the component's interface - the
   * fail-closed stand-in for Carbon's compile-time RegisterComponent<T>
   * constraint. Components whose interface has a nominal root are checked with
   * CjsSchema.cast against the interface their REGISTER_COMPONENT_TYPE row
   * binds: ReflectionRenderable (ITr2Renderable.h:58), VolumetricRenderable
   * (ITr2VolumetricRenderable.h:55), PostProcessOwner
   * (PostProcess/ITr2PostProcessOwner.h:15) and FroxelFogSettings
   * (Tr2VolumetricsRenderer.h:59). The rest check their pure-virtual method
   * names (EveComponentRequiredMethods).
   *
   * Adapted: JavaScript passes Carbon's compile-time component name explicitly because it
   * has no C++ template specialization.
   */
  @blue.method
  @meta.adapted
  RegisterComponent(componentName, entity)
  {
    if (componentName === EveComponentType.ReflectionRenderable)
    {
      if (!CjsSchema.cast(entity, ITr2Renderable))
      {
        throw new TypeError(
          `EveComponentRegistry.RegisterComponent("${componentName}") expects an ITr2Renderable.`);
      }
    }
    else if (componentName === EveComponentType.VolumetricRenderable)
    {
      if (!CjsSchema.cast(entity, ITr2VolumetricRenderable))
      {
        throw new TypeError(
          `EveComponentRegistry.RegisterComponent("${componentName}") expects an ITr2VolumetricRenderable.`);
      }
    }
    else if (componentName === EveComponentType.PostProcessOwner)
    {
      if (!CjsSchema.cast(entity, ITr2PostProcessOwner))
      {
        throw new TypeError(
          `EveComponentRegistry.RegisterComponent("${componentName}") expects an ITr2PostProcessOwner.`);
      }
    }
    else if (componentName === EveComponentType.FroxelFogSettings)
    {
      if (!CjsSchema.cast(entity, ITr2FroxelFogSettings))
      {
        throw new TypeError(
          `EveComponentRegistry.RegisterComponent("${componentName}") expects an ITr2FroxelFogSettings.`);
      }
    }
    // Interfaces without a promoted nominal root still fail closed against
    // their pure-virtual surface. Nominal interfaces are handled above.
    else if (Object.hasOwn(EveComponentRequiredMethods, componentName))
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
   *
   * Adapted: JavaScript passes Carbon's compile-time component name explicitly because it
   * has no C++ template specialization.
   */
  @blue.method
  @meta.adapted
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetComponents(componentName)
  {
    return this.GetComponentCollection(componentName)?.collection ?? [];
  }

  /**
   * Returns how many entities are in the named component collection, or 0 when
   * the collection does not exist.
   */
  @blue.method
  @meta.implemented
  ComponentCount(componentName)
  {
    return this.GetComponentCollection(componentName)?.Size() ?? 0;
  }

  /**
   * Carbon ProcessComponents (EveComponentRegistry.h:250-267, template
   * header-inline): runs the processor over every entity in the named
   * collection, and no-ops when the collection is absent. Carbon resolves the
   * name from the template type and holds a shared_lock; single-threaded JS
   * takes the name directly and needs no lock.
   */
  @blue.method
  @meta.implemented
  ProcessComponents(componentName, processor)
  {
    const collection = this.GetComponentCollection(componentName);
    if (!collection) return;
    for (const component of collection.collection)
    {
      processor(component);
    }
  }

  /**
   * Carbon ProcessComponentsUntil (h:270-290): identical to ProcessComponents
   * except it stops at the first processor call that returns true.
   */
  @blue.method
  @meta.implemented
  ProcessComponentsUntil(componentName, processor)
  {
    const collection = this.GetComponentCollection(componentName);
    if (!collection) return;
    for (const component of collection.collection)
    {
      if (processor(component)) return;
    }
  }

  /**
   * Carbon RemoveCollectionFromEntityState (EveComponentRegistry.cpp:147-150):
   * clears the collection's bit from the entity's component mask.
   */
  @blue.method
  @meta.implemented
  RemoveCollectionFromEntityState(collection, entity)
  {
    entity.RemoveComponentState(collection.GetBit());
  }

  /**
   * Carbon method GetComponentInfo (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Returns Carbon's vector of name/count pairs as JavaScript tuple arrays.
   */
  @blue.method
  @meta.adapted
  GetComponentInfo()
  {
    return this.#componentCollections.map(collection => [collection.name, collection.Size()]);
  }

}
