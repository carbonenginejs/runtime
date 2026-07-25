import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass;
let _EveEntity;
class EveEntity extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_EveEntity, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveEntity",
      family: "eve"
    })], [[[carbon, carbon.method, impl, impl.implemented], 18, "IsInRegistry"], [[carbon, carbon.method, impl, impl.implemented], 18, "Register"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegister"], [[carbon, carbon.method, impl, impl.implemented], 18, "ReRegister"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetComponentRegistry"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetComponentIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetComponentState"], [[carbon, carbon.method, impl, impl.implemented], 18, "RemoveComponentState"], [[impl, impl.implemented], 18, "ClearComponentState"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, CjsModel));
  }
  #componentIndexLookup = (_initProto(this), new Map());

  // Carbon keeps m_registry/m_indexInRegistry PRIVATE (EveEntity.h:57-61) -
  // they are runtime registration state, never Blue-exposed. Schema typing
  // removed 2026-07-23: exporting them via GetValues leaked indexInRegistry
  // into values interchange and poisoned re-registration of hydrated
  // entities (Register() refuses when indexInRegistry !== -1).
  /** m_registry (EveComponentRegistry*) - runtime-only. */
  registry = null;

  /** m_indexInRegistry (size_t) - runtime-only. */
  indexInRegistry = -1;
  IsInRegistry() {
    return this.registry !== null;
  }
  Register(registry) {
    if (this.registry === registry) {
      return;
    }
    if (this.registry) {
      this.UnRegister(this.registry);
    }
    if (!registry) {
      return;
    }
    registry.Register(this);
    this.RegisterComponents();
  }
  UnRegister(registry) {
    if (!registry || this.registry !== registry) {
      return;
    }
    registry.UnRegisterAllComponents(this);
    this.UnRegisterComponents();
    registry.UnRegister(this);
  }
  ReRegister() {
    this.registry?.ReRegister(this);
  }
  GetComponentRegistry() {
    return this.registry;
  }
  GetComponentIndex(componentBit) {
    return this.#componentIndexLookup.get(componentBit);
  }
  SetComponentState(componentBit, index) {
    this.#componentIndexLookup.set(componentBit, index);
  }
  RemoveComponentState(componentBit) {
    this.#componentIndexLookup.delete(componentBit);
  }
  ClearComponentState() {
    this.#componentIndexLookup.clear();
  }
  RegisterComponents() {}
  UnRegisterComponents() {}
  static {
    _initClass();
  }
}

export { _EveEntity as EveEntity };
//# sourceMappingURL=EveEntity.js.map
