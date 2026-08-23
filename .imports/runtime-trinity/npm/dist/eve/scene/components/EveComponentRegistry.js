import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { impl, carbon, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveComponentCollection as _EveComponentCollecti } from './EveComponentCollection.js';
import { EveComponentType, EveComponentRequiredMethods } from '../../EveComponentTypes.js';
import { ITr2FroxelFogSettings as _ITr2FroxelFogSetting } from '../../child/ITr2FroxelFogSettings.js';

let _initProto, _initClass, _init_componentCollectionLoopGuard, _init_extra_componentCollectionLoopGuard, _init_registeredEntities, _init_extra_registeredEntities;

/** Indexes Eve entities and their component collections for scene processing. */
let _EveComponentRegistry;
class EveComponentRegistry extends CjsModel {
  static {
    ({
      e: [_init_componentCollectionLoopGuard, _init_extra_componentCollectionLoopGuard, _init_registeredEntities, _init_extra_registeredEntities, _initProto],
      c: [_EveComponentRegistry, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveComponentRegistry",
      family: "eve/scene"
    })], [[type.rawStruct("std::shared_mutex"), 0, "componentCollectionLoopGuard"], [type.list("EveEntity"), 0, "registeredEntities"], [[impl, impl.implemented], 18, "Clear"], [[impl, impl.implemented], 18, "ReRegister"], [[impl, impl.implemented], 18, "Register"], [[impl, impl.implemented], 18, "UnRegister"], [[impl, impl.implemented], 18, "UnRegisterAllComponents"], [[impl, impl.implemented], 18, "GetComponentCollection"], [[impl, impl.adapted, void 0, impl.reason("JavaScript passes Carbon's compile-time component name explicitly because it has no C++ template specialization.")], 18, "RegisterComponent"], [[impl, impl.adapted, void 0, impl.reason("JavaScript passes Carbon's compile-time component name explicitly because it has no C++ template specialization.")], 18, "UnRegisterComponent"], [[impl, impl.implemented], 18, "AddCollection"], [[impl, impl.implemented], 18, "AddToCollection"], [[impl, impl.implemented], 18, "RemoveFromCollection"], [[impl, impl.implemented], 18, "GetComponents"], [[impl, impl.implemented], 18, "ComponentCount"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns Carbon's vector of name/count pairs as JavaScript tuple arrays.")], 18, "GetComponentInfo"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_registeredEntities(this);
  }
  #componentCollections = (_initProto(this), []);

  /** m_componentCollectionLoopGuard (mutable std::shared_mutex) */
  componentCollectionLoopGuard = _init_componentCollectionLoopGuard(this, null);

  /** m_registeredEntities (std::vector<EveEntity*>) */
  registeredEntities = (_init_extra_componentCollectionLoopGuard(this), _init_registeredEntities(this, []));

  /**
   * Empties every component collection and detaches all registered entities,
   * resetting their registry link and component state.
   */
  Clear() {
    for (const collection of this.#componentCollections) {
      collection.Clear();
    }
    for (const entity of this.registeredEntities) {
      if (entity.registry === this) {
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
  ReRegister(entity) {
    entity.UnRegister(this);
    entity.Register(this);
  }

  /**
   * Adds an entity to the registry and records its index, returning false if the
   * entity is already registered anywhere.
   */
  Register(entity) {
    if (entity.indexInRegistry !== -1) {
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
  UnRegister(entity) {
    const index = entity.indexInRegistry;
    if (entity.registry !== this || index < 0 || index >= this.registeredEntities.length) {
      return false;
    }
    const lastIndex = this.registeredEntities.length - 1;
    if (index !== lastIndex) {
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
  UnRegisterAllComponents(entity) {
    for (const collection of this.#componentCollections) {
      this.RemoveFromCollection(collection, entity);
    }
  }

  /**
   * Returns the collection for a component name, or null when no collection has
   * been created for it yet.
   */
  GetComponentCollection(componentName) {
    return this.#componentCollections.find(collection => collection.name === componentName) ?? null;
  }

  /**
   * Adds an entity to the named component's collection, creating the collection
   * on demand, and throws if the entity is missing any method the component
   * interface requires - the fail-closed stand-in for Carbon's compile-time
   * RegisterComponent<T> constraint.
   */
  RegisterComponent(componentName, entity) {
    if (componentName === EveComponentType.FroxelFogSettings) {
      if (!(entity instanceof _ITr2FroxelFogSetting)) {
        throw new TypeError(`EveComponentRegistry.RegisterComponent("${componentName}") expects an ITr2FroxelFogSettings.`);
      }
    }
    // Fail-closed duck assertion: Carbon's RegisterComponent<T> cannot compile
    // for an entity that does not implement T; the JS port asserts the
    // interface's pure-virtual surface (EveComponentRequiredMethods) instead.
    else if (Object.hasOwn(EveComponentRequiredMethods, componentName)) {
      for (const method of EveComponentRequiredMethods[componentName]) {
        if (typeof entity?.[method] !== "function") {
          throw new TypeError(`EveComponentRegistry.RegisterComponent("${componentName}"): entity ` + `${entity?.constructor?.name ?? typeof entity} is missing required method ${method}().`);
        }
      }
    }
    let collection = this.GetComponentCollection(componentName);
    if (!collection) {
      collection = this.AddCollection(componentName);
    }
    return this.AddToCollection(collection, entity);
  }

  /**
   * Removes an entity from the named component's collection, returning false
   * when no such collection exists.
   */
  UnRegisterComponent(componentName, entity) {
    const collection = this.GetComponentCollection(componentName);
    return collection ? this.RemoveFromCollection(collection, entity) : false;
  }

  /**
   * Creates a collection for a component name and assigns it the next free bit;
   * throws once 32 collections exist because the entity component mask is 32
   * bits wide.
   */
  AddCollection(componentName) {
    if (this.#componentCollections.length >= 32) {
      throw new RangeError("EveComponentRegistry supports at most 32 component collections.");
    }
    const collection = new _EveComponentCollecti();
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
  AddToCollection(collection, entity) {
    if (entity.GetComponentIndex(collection.GetBit()) !== undefined) {
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
  RemoveFromCollection(collection, entity) {
    const bit = collection.GetBit();
    const index = entity.GetComponentIndex(bit);
    if (index === undefined) {
      return false;
    }
    const swappedEntity = collection.SwapWithBack(index);
    if (swappedEntity) {
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
  GetComponents(componentName) {
    return this.GetComponentCollection(componentName)?.collection ?? [];
  }

  /**
   * Returns how many entities are in the named component collection, or 0 when
   * the collection does not exist.
   */
  ComponentCount(componentName) {
    return this.GetComponentCollection(componentName)?.Size() ?? 0;
  }

  /** Carbon method GetComponentInfo (MAP_METHOD_AND_WRAP). */
  GetComponentInfo() {
    return this.#componentCollections.map(collection => [collection.name, collection.Size()]);
  }
  static {
    _initClass();
  }
}

export { _EveComponentRegistry as EveComponentRegistry };
//# sourceMappingURL=EveComponentRegistry.js.map
