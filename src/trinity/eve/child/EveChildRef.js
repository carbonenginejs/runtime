// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";

/** A child that lazily resolves and owns a referenced space-object-child resource by path, forwarding controller and registration calls to it. */
@type.define({ className: "EveChildRef", family: "eve/child" })
export class EveChildRef extends EveChildTransform
{

  /** Runtime resource-resolution seam supplied by an engine package. */
  @type.objectRef("IEveChildResourceLoader")
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

  /** m_loadChildAutomatically (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  loadChildAutomatically = true;

  /** m_resPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  resPath = "";

  /** m_child (IEveSpaceObjectChildPtr) [READ] */
  @io.read
  @type.objectRef("IEveSpaceObjectChild")
  child = null;

  /** Carbon method Reload (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.adapted
  Reload(bypassAutoLoadBlocker = false)
  {
    if (!this.loadChildAutomatically && !bypassAutoLoadBlocker) return false;
    const next = this.resourceLoader?.LoadChild?.(this.resPath, this) ?? this.resourceLoader?.(this.resPath, this);
    if (!next || typeof next.then === "function") return false;
    this.child = next;
    return true;
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    this.child?.HandleControllerEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    this.child?.SetControllerVariable?.(name, value);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    this.child?.StartControllers?.();
  }

  /** Carbon EveChildRef::RegisterComponents (cpp:87-96): forward-only to the
   * referenced child. Gate IsInRegistry() && child && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null && this.display)
    {
      this.child.Register?.(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildRef::UnRegisterComponents (cpp:98-107): forwards to the
   * referenced child; no display re-check. */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null)
    {
      this.child.UnRegister?.(this.GetComponentRegistry());
    }
  }

}
