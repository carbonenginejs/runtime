import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { impl, carbon, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveComponentCollection as _EveComponentCollecti } from './EveComponentCollection.js';
import { EveComponentRequiredMethods } from '../../EveComponentTypes.js';

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
  ReRegister(entity) {
    entity.UnRegister(this);
    entity.Register(this);
  }
  Register(entity) {
    if (entity.indexInRegistry !== -1) {
      return false;
    }
    entity.registry = this;
    entity.indexInRegistry = this.registeredEntities.length;
    this.registeredEntities.push(entity);
    return true;
  }
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
  UnRegisterAllComponents(entity) {
    for (const collection of this.#componentCollections) {
      this.RemoveFromCollection(collection, entity);
    }
  }
  GetComponentCollection(componentName) {
    return this.#componentCollections.find(collection => collection.name === componentName) ?? null;
  }
  RegisterComponent(componentName, entity) {
    // Fail-closed duck assertion: Carbon's RegisterComponent<T> cannot compile
    // for an entity that does not implement T; the JS port asserts the
    // interface's pure-virtual surface (EveComponentRequiredMethods) instead.
    if (Object.hasOwn(EveComponentRequiredMethods, componentName)) {
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
  UnRegisterComponent(componentName, entity) {
    const collection = this.GetComponentCollection(componentName);
    return collection ? this.RemoveFromCollection(collection, entity) : false;
  }
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
  AddToCollection(collection, entity) {
    if (entity.GetComponentIndex(collection.GetBit()) !== undefined) {
      return false;
    }
    const index = collection.Add(entity);
    entity.SetComponentState(collection.GetBit(), index);
    return true;
  }
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
  GetComponents(componentName) {
    return this.GetComponentCollection(componentName)?.collection ?? [];
  }
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
