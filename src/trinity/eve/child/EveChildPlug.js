// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPlug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";

/** A container of child objects plugged into a socket, forwarding controller events, controller variables and component registration to what it contains. */
@type.define({ className: "EveChildPlug", family: "eve/child" })
export class EveChildPlug extends EveChildTransform
{

  #controllerVariables = new Map();

  /** m_objects (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSpaceObjectChild")
  objects = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2Controller")
  controllers = [];

  /** Registers hydrated children and links hydrated controllers. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.RegisterChildren(this.objects);
    for (const controller of this.controllers)
    {
      if (!controller.IsLinked()) controller.Link(this);
    }
    return true;
  }

  /** Appends and registers one plugged child. */
  @carbon.method
  @impl.implemented
  AddToEffectChildrenList(child)
  {
    this.objects.push(child);
    this.RegisterChild(child);
    for (const [name, value] of this.#controllerVariables)
    {
      child.SetControllerVariable(name, value);
    }
    return child;
  }

  /** Removes and unregisters one plugged child. */
  @carbon.method
  @impl.implemented
  RemoveFromEffectChildrenList(child)
  {
    const index = this.objects.indexOf(child);
    if (index === -1) return false;
    this.UnregisterChild(child);
    this.objects.splice(index, 1);
    return true;
  }

  /** Propagates the owning space object through the plugged subtree. */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.objects) child.SetOwner(owner);
  }

  /** Propagates a modular part tag through the plugged subtree. */
  @carbon.method
  @impl.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.objects) child.SetPartTag(next);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable(key, next);
    for (const object of this.objects) object?.SetControllerVariable(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
  }

  /** Carbon EveChildPlug::RegisterComponents (cpp:122-135): forward-only to
   * the plugged objects. Gate m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      for (const object of this.objects)
      {
        object?.Register(registry);
      }
    }
  }

  /** Carbon EveChildPlug::UnRegisterComponents (cpp:141-154): forwards to the
   * plugged objects; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const object of this.objects)
      {
        object?.UnRegister(registry);
      }
    }
  }

}
