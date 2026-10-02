// Source: trinity/trinity/Eve/EveEntity.h
//   trinity/trinity/Eve/EveEntity.cpp
import { meta } from "#schema";

/**
 * Base for Eve objects that publish themselves to a scene's component registry,
 * tracking which registry they belong to and the slot index the registry
 * assigned for each component type.
 */
@meta.define({ className: "EveEntity", family: "eve" })
export class EveEntity
{

  _componentIndexLookup = new Map();

  // Carbon keeps m_registry/m_indexInRegistry PRIVATE (EveEntity.h:57-61) -
  // they are runtime registration state, never Blue-exposed. Schema typing
  // removed 2026-07-23: exporting them via GetValues leaked indexInRegistry
  // into values interchange and poisoned re-registration of hydrated
  // entities (Register() refuses when indexInRegistry !== -1).

  /** m_registry (EveComponentRegistry*) - runtime-only. */
  registry = null;

  /** m_indexInRegistry (size_t) - runtime-only. */
  indexInRegistry = -1;

  /** Whether this entity currently belongs to a component registry. */
  @meta.blue.method
  @meta.implemented
  IsInRegistry()
  {
    return this.registry !== null;
  }

  /**
   * Joins a component registry, leaving the previous one first, then lets the
   * subclass publish the components it owns through RegisterComponents. Passing
   * nothing only leaves the current registry; re-registering with the same
   * registry is a no-op.
   */
  @meta.blue.method
  @meta.implemented
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

  /**
   * Leaves the given registry, dropping every component it holds for this
   * entity, but only when it is the registry this entity is actually in.
   */
  @meta.blue.method
  @meta.implemented
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

  /**
   * Asks the current registry to re-evaluate this entity's component
   * registrations, for use after state that gates them changes.
   */
  @meta.blue.method
  @meta.implemented
  ReRegister()
  {
    this.registry?.ReRegister(this);
  }

  /**
   * The registry this entity belongs to, or null; subclasses read it in
   * RegisterComponents to decide what to publish.
   */
  @meta.blue.method
  @meta.implemented
  GetComponentRegistry()
  {
    return this.registry;
  }

  /**
   * The registry slot index recorded for a component bit, or undefined when this
   * entity has no component of that type.
   */
  @meta.blue.method
  @meta.implemented
  GetComponentIndex(componentBit)
  {
    return this._componentIndexLookup.get(componentBit);
  }

  /**
   * Records the slot index a registry assigned for a component bit; called by
   * the registry, not by entities.
   */
  @meta.blue.method
  @meta.implemented
  SetComponentState(componentBit, index)
  {
    this._componentIndexLookup.set(componentBit, index);
  }

  /**
   * Drops the recorded slot index for a component bit; called by the registry
   * when that component is released.
   */
  @meta.blue.method
  @meta.implemented
  RemoveComponentState(componentBit)
  {
    this._componentIndexLookup.delete(componentBit);
  }

  /** Drops every recorded component slot index without touching the registry. */
  @meta.implemented
  ClearComponentState()
  {
    this._componentIndexLookup.clear();
  }

  /**
   * Override point where a subclass publishes the components it owns; called
   * after joining a registry, and again on ReRegister.
   */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
  }

  /**
   * Override point where a subclass releases components it published itself;
   * called while leaving a registry, after the registry has dropped its own
   * records.
   */
  @meta.blue.method
  @meta.implemented
  UnRegisterComponents()
  {
  }

}

// EveEntity_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveEntity], chainTo: null })(EveEntity, { kind: "class" });
