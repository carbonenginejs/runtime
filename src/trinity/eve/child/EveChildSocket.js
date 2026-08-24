// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildSocket.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveSocketParameterString } from "../socket/EveSocketParameterString.js";

/** A named attachment point on a ship that resolves and hot-reloads a plugged-in child resource, forwarding controller and registration calls to it. */
@type.define({ className: "EveChildSocket", family: "eve/child" })
export class EveChildSocket extends EveChildTransform
{

  /** Runtime resource-resolution seam supplied by an engine package. */
  @type.objectRef("CjsEveChildResourceLoader")
  resourceLoader = null;

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_parameters (PIEveSocketParameterVector) [READ, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.list("IEveSocketParameter")
  parameters = [];

  /** m_plugResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  resPath = "";

  /** m_plug (EveChildPlugPtr) [READ] */
  @io.read
  @type.objectRef("EveChildPlug")
  plug = null;

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    this.plug?.HandleControllerEvent?.(name);
  }

  /** Carbon method Rebind -> BindParameters (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Rebind()
  {
    if (!this.plug) return false;
    for (const parameter of this.parameters) parameter.ClearBindings();
    for (const external of this.plug.externalParameters ?? [])
    {
      let bound = this.parameters.some(parameter => parameter.BindToExternalParameter(external));
      if (!bound && typeof external.GetValue() === "string")
      {
        const parameter = new EveSocketParameterString();
        parameter.SetName(external.GetName());
        bound = parameter.BindToExternalParameter(external);
        if (bound)
        {
          parameter.SetValueToDefault();
          this.parameters.push(parameter);
        }
      }
    }
    return true;
  }

  /** Carbon method Reload (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  Reload()
  {
    if (!this.resourceLoader) return false;
    const next = this.resourceLoader.LoadChild(this.resPath, this);
    if (!next) return false;
    this.plug = next;
    this.Rebind();
    return true;
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    this.plug?.SetControllerVariable?.(name, value);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    this.plug?.StartControllers?.();
  }

  /** Carbon EveChildSocket::RegisterComponents (cpp:212-221): forward-only to
   * the plug. Gate IsInRegistry() && plug && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.plug !== null && this.display)
    {
      this.plug.Register?.(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildSocket::UnRegisterComponents (cpp:227-236): forwards to
   * the plug; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry() && this.plug)
    {
      this.plug.UnRegister?.(this.GetComponentRegistry());
    }
  }

}
