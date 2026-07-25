// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/EveEntity.h
//   trinity/trinity/Eve/EveEntity.cpp
import { carbon, impl, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

@type.define({ className: "EveEntity", family: "eve" })
export class EveEntity extends CjsModel
{

  #componentIndexLookup = new Map();

  // Carbon keeps m_registry/m_indexInRegistry PRIVATE (EveEntity.h:57-61) -
  // they are runtime registration state, never Blue-exposed. Schema typing
  // removed 2026-07-23: exporting them via GetValues leaked indexInRegistry
  // into values interchange and poisoned re-registration of hydrated
  // entities (Register() refuses when indexInRegistry !== -1).
  /** m_registry (EveComponentRegistry*) - runtime-only. */
  registry = null;

  /** m_indexInRegistry (size_t) - runtime-only. */
  indexInRegistry = -1;

  @carbon.method
  @impl.implemented
  IsInRegistry()
  {
    return this.registry !== null;
  }

  @carbon.method
  @impl.implemented
  Register(registry)
  {
    if (this.registry === registry)
    {
      return;
    }
    if (this.registry)
    {
      this.UnRegister(this.registry);
    }
    if (!registry)
    {
      return;
    }
    registry.Register(this);
    this.RegisterComponents();
  }

  @carbon.method
  @impl.implemented
  UnRegister(registry)
  {
    if (!registry || this.registry !== registry)
    {
      return;
    }
    registry.UnRegisterAllComponents(this);
    this.UnRegisterComponents();
    registry.UnRegister(this);
  }

  @carbon.method
  @impl.implemented
  ReRegister()
  {
    this.registry?.ReRegister(this);
  }

  @carbon.method
  @impl.implemented
  GetComponentRegistry()
  {
    return this.registry;
  }

  @carbon.method
  @impl.implemented
  GetComponentIndex(componentBit)
  {
    return this.#componentIndexLookup.get(componentBit);
  }

  @carbon.method
  @impl.implemented
  SetComponentState(componentBit, index)
  {
    this.#componentIndexLookup.set(componentBit, index);
  }

  @carbon.method
  @impl.implemented
  RemoveComponentState(componentBit)
  {
    this.#componentIndexLookup.delete(componentBit);
  }

  @impl.implemented
  ClearComponentState()
  {
    this.#componentIndexLookup.clear();
  }

  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
  }

  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
  }

}
