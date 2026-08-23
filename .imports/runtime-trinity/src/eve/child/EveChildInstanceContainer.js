// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { Origin } from "../../generated/eve/child/enums.js";

/** A child that instantiates a source template across a list of authored or locator-driven transforms, forwarding controller and registration calls to the instances. */
@type.define({ className: "EveChildInstanceContainer", family: "eve/child" })
export class EveChildInstanceContainer extends EveChildTransform
{

  #controllerVariables = new Map();

  /** m_transformModifiers (PIEveChildTransformModifierVector) [READ, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.list("IEveChildTransformModifier")
  transformModifiers = [];

  /** m_transforms (PEveChildInstanceTransformStructureList) [READ, PERSIST] */
  @io.persist
  @type.list("EveChildInstanceTransform")
  transforms = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_isAlwaysOn (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  alwaysOn = false;

  /** m_inheritProperties (EveChildInheritPropertiesPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("EveChildInheritProperties")
  inheritProperties = null;

  /** m_reset (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  reset = true;

  /** m_instances (PIEveSpaceObjectChildVector) [READ] */
  @io.read
  @type.list("IEveSpaceObjectChild")
  instances = [];

  /** m_locatorSetName (BlueSharedString) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  locatorSet = "";

  /** m_source (IEveSpaceObjectChildPtr) [PERSISTONLY] */
  @io.persistOnly
  @type.model("IEveSpaceObjectChild")
  source = null;

  /** m_origin (Origin - enum Origin) [READ] */
  @io.read
  @type.int32
  @type.enum("Origin")
  origin = 0;

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const instance of this.instances) instance?.HandleControllerEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.source?.SetControllerVariable?.(key, next);
    this.#controllerVariables.set(key, next);
    for (const instance of this.instances) instance?.SetControllerVariable?.(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const instance of this.instances) instance?.StartControllers?.();
  }

  /** Carbon EveChildInstanceContainer::RegisterComponents (cpp:83-103):
   * forwards the instances; with no instances (and edit mode enabled -
   * m_disableEditMode has no JS field yet, read duck-typed) the source
   * template registers instead. Gate IsInRegistry() && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.display)
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.Register?.(registry);
      }

      if (!this.instances.length && !this.disableEditMode)
      {
        this.source?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildInstanceContainer::UnRegisterComponents (cpp:105-122):
   * forwards the instances and the source; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry())
    {
      const registry = this.GetComponentRegistry();
      for (const instance of this.instances)
      {
        instance?.UnRegister?.(registry);
      }
      this.source?.UnRegister?.(registry);
    }
  }

  static Origin = Origin;

}
