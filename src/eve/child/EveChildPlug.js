// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildPlug.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
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

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    for (const controller of this.controllers) controller?.HandleEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    const key = String(name);
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable?.(key, next);
    for (const object of this.objects) object?.SetControllerVariable?.(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    for (const controller of this.controllers) controller?.Start?.();
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
        object?.Register?.(registry);
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
        object?.UnRegister?.(registry);
      }
    }
  }

}
