// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPlug.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { ITr2SoundEmitterOwner } from "../ITr2SoundEmitterOwner.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2CurveSetOwner } from "../../curves/ITr2CurveSetOwner.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { EveEntity } from "../EveEntity.js";
import { CjsSchema, meta } from "#schema";
import { IsMatch } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { addChild, removeChild, clearChildren } from "../../../global/blue/children.js";
import { EveChildTransform } from "./EveChildTransform.js";

/** A container of child objects plugged into a socket, forwarding controller events, controller variables and component registration to what it contains. */
@meta.define({ className: "EveChildPlug", family: "eve/child" })
@meta.blue.inherit(ITr2CurveSetOwner, IInitialize, INotify, IListNotify)
@meta.blue.interface(EveSpaceObjectChild, IEveSpaceObjectChild, ITr2CurveSetOwner, IInitialize, INotify, ITr2SoundEmitterOwner, EveEntity)
export class EveChildPlug extends EveChildTransform
{

  _controllerVariables = new Map();

  /** m_objects (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSpaceObjectChild")
  objects = [];

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2ExternalParameter")
  externalParameters = [];

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("ITr2Controller")
  controllers = [];

  /** Registers hydrated children and links hydrated controllers. */
  @meta.blue.method
  @meta.implemented
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
   * Carbon EveChildPlug::OnModified (EveChildPlug.cpp:111-118): a display change
   * re-registers with the scene component registry.
   *
   * @param {*} [value=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */
  @meta.blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "display"))
    {
      this.ReRegister();
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
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    const masked = event & BLUELISTEVENT.BELIST_EVENTMASK;
    if ((event & BLUELISTEVENT.BELIST_LOADING) !== 0) return;

    if (list === this.controllers)
    {
      if (masked === BLUELISTEVENT.BELIST_INSERTED && value)
      {
        value.Link(this);
        for (const [ name, variable ] of this._controllerVariables) value.SetVariable(name, variable);
      }
      else if (masked === BLUELISTEVENT.BELIST_REMOVED && value) value.Unlink();
      else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller.Unlink();
      }
      return;
    }

    if (list !== this.objects) return;

    // Carbon's shared HandleChildrenListModified (EveSpaceObjectChild.h:340-367).
    if (masked === BLUELISTEVENT.BELIST_INSERTED && value) this.RegisterChild(value);
    else if (masked === BLUELISTEVENT.BELIST_REMOVED && value) this.UnregisterChild(value);
    else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
    {
      for (const child of this.objects) this.UnregisterChild(child);
    }

    if (masked === BLUELISTEVENT.BELIST_INSERTED && value)
    {
      for (const [ name, variable ] of this._controllerVariables) value.SetControllerVariable(name, variable);
    }

    if (!this.IsInRegistry()) return;
    const registry = this.GetComponentRegistry();
    if (!registry) return;
    // Carbon casts to EveEntityPtr before registering (cpp:82-96).
    if (masked === BLUELISTEVENT.BELIST_INSERTED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.Register(registry);
    }
    else if (masked === BLUELISTEVENT.BELIST_REMOVED)
    {
      const entity = CjsSchema.cast(value, EveEntity);
      if (entity) entity.UnRegister(registry);
    }
    else if (masked === BLUELISTEVENT.BELIST_UNLOADSTART)
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
   *
   * Adapted: A JavaScript array has no notify slot, so the owner drives the notification
   * through the shared child service rather than the list driving it.
   */
  @meta.blue.method
  @meta.adapted
  AddToEffectChildrenList(child)
  {
    addChild(this, "objects", child, { listNotify: this });
    return child;
  }

  /**
   * Removes one plugged child; the unregistration is the REMOVED arm's.
   *
   * Adapted: A JavaScript array has no notify slot, so the owner drives the notification
   * through the shared child service rather than the list driving it.
   */
  @meta.blue.method
  @meta.adapted
  RemoveFromEffectChildrenList(child)
  {
    return removeChild(this, "objects", child, { listNotify: this });
  }

  /** Propagates the owning space object through the plugged subtree. */
  @meta.blue.method
  @meta.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    for (const child of this.objects) child.SetOwner(owner);
  }

  /** Propagates a modular part tag through the plugged subtree. */
  @meta.blue.method
  @meta.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    for (const child of this.objects) child.SetPartTag(next);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this._controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable(key, next);
    for (const object of this.objects) object?.SetControllerVariable(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start();
  }

  /** Carbon EveChildPlug::PlayAllCurveSets (cpp:272-281): forwards to the curve-set-owning objects. */
  @meta.implemented
  PlayAllCurveSets()
  {
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) owner.PlayAllCurveSets();
    }
  }

  /** Carbon EveChildPlug::StopAllCurveSets (cpp:283-292). */
  @meta.implemented
  StopAllCurveSets()
  {
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) owner.StopAllCurveSets();
    }
  }

  /** Carbon EveChildPlug::PlayCurveSet (cpp:294-303). */
  @meta.implemented
  PlayCurveSet(name, rangeName = "")
  {
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) owner.PlayCurveSet(name, rangeName);
    }
  }

  /** Carbon EveChildPlug::StopCurveSet (cpp:305-314). */
  @meta.implemented
  StopCurveSet(name)
  {
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) owner.StopCurveSet(name);
    }
  }

  /** Carbon EveChildPlug::UpdateCurveSet (cpp:316-325); renderContext travels as EveChildContainer's does. */
  @meta.implemented
  UpdateCurveSet(name, time, renderContext = null)
  {
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) owner.UpdateCurveSet(name, time, renderContext);
    }
  }

  /** Carbon EveChildPlug::GetCurveSetDuration (cpp:327-339): the longest over the curve-set-owning objects. */
  @meta.implemented
  GetCurveSetDuration(name)
  {
    let duration = 0;
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) duration = Math.max(duration, owner.GetCurveSetDuration(name));
    }
    return duration;
  }

  /** Carbon EveChildPlug::GetRangeDuration (cpp:341-353): the longest over the curve-set-owning objects. */
  @meta.implemented
  GetRangeDuration(name, rangeName)
  {
    let duration = 0;
    for (const object of this.objects)
    {
      const owner = CjsSchema.cast(object, ITr2CurveSetOwner);
      if (owner) duration = Math.max(duration, owner.GetRangeDuration(name, rangeName));
    }
    return duration;
  }

  /** Carbon EveChildPlug::RegisterComponents (cpp:122-135): forward-only to
   * the plugged objects. Gate m_display. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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

// EveChildPlug_Blue.cpp: native exposure; unported contracts: IEveEffectChildrenOwner, IShaderConfigurer.
