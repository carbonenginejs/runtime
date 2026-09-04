// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildRef.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";

/** A child that lazily resolves and owns a referenced space-object-child resource by path, forwarding controller and registration calls to it. */
@type.define({ className: "EveChildRef", family: "eve/child" })
export class EveChildRef extends EveChildTransform
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
    if (!this.resourceLoader) return false;
    const next = this.resourceLoader.LoadChild(this.resPath, this);
    if (!next) return false;
    if (this.child) this.UnregisterChild(this.child);
    this.child = next;
    this.RegisterChild(this.child);
    return true;
  }

  /** Carbon EveChildRef::SetAutoLoadBlocker (cpp:47-50). */
  @carbon.method
  @impl.implemented
  SetAutoLoadBlocker(shouldBlockAutoLoad)
  {
    this.loadChildAutomatically = !shouldBlockAutoLoad;
  }

  /** Propagates the owning space object to the resolved child. */
  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    if (this.GetOwner() === owner) return;
    super.SetOwner(owner);
    if (this.child) this.child.SetOwner(owner);
  }

  /** Propagates a modular part tag to the resolved child. */
  @carbon.method
  @impl.implemented
  SetPartTag(tag)
  {
    const next = Number(tag) >>> 0;
    if (this.GetPartTag() === next) return;
    super.SetPartTag(next);
    if (this.child) this.child.SetPartTag(next);
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  HandleControllerEvent(name)
  {
    this.child?.HandleControllerEvent(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    this.child?.SetControllerVariable(name, value);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  StartControllers()
  {
    this.child?.StartControllers();
  }

  /** Carbon EveChildRef::RegisterComponents (cpp:87-96): forward-only to the
   * referenced child. Gate IsInRegistry() && child && m_display. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    if (this.IsInRegistry() && this.child !== null && this.display)
    {
      this.child.Register(this.GetComponentRegistry());
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
      this.child.UnRegister(this.GetComponentRegistry());
    }
  }

}
