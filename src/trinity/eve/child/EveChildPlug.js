// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPlug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { EveEntity } from "../EveEntity.js";
import { carbon, impl, io, type, CjsSchema } from "#schema";
import { BlueListEvent } from "#consts/trinity";
import { CjsModel } from "#model";
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

  /**
   * Carbon OnListModified (EveChildPlug.cpp:44-110), the owner reacting to its
   * own lists - Carbon installs the plug on its controller list at cpp:19.
   *
   * Controllers link and replay the recorded variables on insert, unlink on
   * remove, unlink every one on unload. Objects go through the shared
   * child-registration helper and, while this plug is in a registry, register
   * or unregister as entities.
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const masked = event & BlueListEvent.EVENTMASK;
    if ((event & BlueListEvent.LOADING) !== 0) return;

    if (list === this.controllers)
    {
      if (masked === BlueListEvent.INSERTED && value)
      {
        value.Link(this);
        for (const [ name, variable ] of this.#controllerVariables) value.SetVariable(name, variable);
      }
      else if (masked === BlueListEvent.REMOVED && value) value.Unlink();
      else if (masked === BlueListEvent.UNLOADSTART)
      {
        for (const controller of this.controllers) controller.Unlink();
      }
      return;
    }

    if (list !== this.objects) return;

    // Carbon's shared HandleChildrenListModified (EveSpaceObjectChild.h:340-367).
    if (masked === BlueListEvent.INSERTED && value) this.RegisterChild(value);
    else if (masked === BlueListEvent.REMOVED && value) this.UnregisterChild(value);
    else if (masked === BlueListEvent.UNLOADSTART)
    {
      for (const child of this.objects) this.UnregisterChild(child);
    }

    if (masked === BlueListEvent.INSERTED && value)
    {
      for (const [ name, variable ] of this.#controllerVariables) value.SetControllerVariable(name, variable);
    }

    if (!this.IsInRegistry()) return;
    const registry = this.GetComponentRegistry();
    if (!registry) return;
    // Carbon casts to EveEntityPtr before registering (cpp:82-96).
    if (masked === BlueListEvent.INSERTED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.Register(registry);
    }
    else if (masked === BlueListEvent.REMOVED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.UnRegister(registry);
    }
    else if (masked === BlueListEvent.UNLOADSTART)
    {
      for (const child of this.objects)
      {
        const entity = CjsSchema.cast(child, EveEntity);
        if (entity) entity.UnRegister(registry);
      }
    }
  }

  /**
   * Appends one plugged child. The registration and the variable replay are the
   * INSERTED arm's, reached through the managed mutation.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("A JavaScript array has no notify slot, so the owner drives the notification through CjsModel.addChild rather than the list driving it.")
  AddToEffectChildrenList(child)
  {
    CjsModel.addChild(this, "objects", child);
    return child;
  }

  /** Removes one plugged child; the unregistration is the REMOVED arm's. */
  @carbon.method
  @impl.adapted
  @impl.reason("A JavaScript array has no notify slot, so the owner drives the notification through CjsModel.removeChild rather than the list driving it.")
  RemoveFromEffectChildrenList(child)
  {
    return CjsModel.removeChild(this, "objects", child);
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
