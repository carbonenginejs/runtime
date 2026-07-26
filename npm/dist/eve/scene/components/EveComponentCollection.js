import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_name, _init_extra_name, _init_bit, _init_extra_bit, _init_collection, _init_extra_collection;

/** Stores entities belonging to one Eve component type. */
let _EveComponentCollecti;
class EveComponentCollection extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_bit, _init_extra_bit, _init_collection, _init_extra_collection, _initProto],
      c: [_EveComponentCollecti, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveComponentCollection",
      family: "eve/scene"
    })], [[[type, type.string], 16, "name"], [[type, type.uint32], 16, "bit"], [type.list("T"), 0, "collection"], [[impl, impl.implemented], 18, "Add"], [[impl, impl.implemented], 18, "SwapWithBack"], [[impl, impl.implemented], 18, "Clear"], [[impl, impl.implemented], 18, "GetBit"], [[impl, impl.implemented], 18, "Size"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_collection(this);
  }
  /** m_name (const char*) */
  name = (_initProto(this), _init_name(this, ""));

  /** m_bit (uint32_t) */
  bit = (_init_extra_name(this), _init_bit(this, 0));

  /** m_collection (std::vector<T*>) */
  collection = (_init_extra_bit(this), _init_collection(this, []));

  /**
   * Appends an entity and returns the index it was stored at, which the registry
   * records on the entity.
   */
  Add(entity) {
    const index = this.collection.length;
    this.collection.push(entity);
    return index;
  }

  /**
   * Removes the entry at an index by moving the last element into its place and
   * returns that moved entity so the caller can fix up its stored index, or null
   * when nothing moved or the index is out of range.
   */
  SwapWithBack(index) {
    if (index < 0 || index >= this.collection.length) {
      return null;
    }
    const lastIndex = this.collection.length - 1;
    let swappedEntity = null;
    if (index !== lastIndex) {
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
  Clear() {
    this.collection.length = 0;
  }

  /**
   * Returns the single mask bit the registry assigned to this collection, used
   * as the key for an entity's per-component index.
   */
  GetBit() {
    return this.bit;
  }

  /** Returns the number of entities currently in the collection. */
  Size() {
    return this.collection.length;
  }
  static {
    _initClass();
  }
}

export { _EveComponentCollecti as EveComponentCollection };
//# sourceMappingURL=EveComponentCollection.js.map
