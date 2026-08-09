import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';

let _initProto, _initClass, _init_resourceLoader, _init_extra_resourceLoader, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_loadChildAutomatically, _init_extra_loadChildAutomatically, _init_resPath, _init_extra_resPath, _init_child, _init_extra_child;

/** A child that lazily resolves and owns a referenced space-object-child resource by path, forwarding controller and registration calls to it. */
let _EveChildRef;
class EveChildRef extends _EveChildTransform {
  static {
    ({
      e: [_init_resourceLoader, _init_extra_resourceLoader, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_loadChildAutomatically, _init_extra_loadChildAutomatically, _init_resPath, _init_extra_resPath, _init_child, _init_extra_child, _initProto],
      c: [_EveChildRef, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildRef",
      family: "eve/child"
    })], [[type.objectRef("IEveChildResourceLoader"), 0, "resourceLoader"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.boolean], 16, "loadChildAutomatically"], [[io, io.notify, io, io.persist, type, type.string], 16, "resPath"], [[io, io.read, void 0, type.objectRef("IEveSpaceObjectChild")], 16, "child"], [[carbon, carbon.method, impl, impl.adapted], 18, "Reload"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildTransform));
  }
  constructor(...args) {
    super(...args);
    _init_extra_child(this);
  }
  /** Runtime resource-resolution seam supplied by an engine package. */
  resourceLoader = (_initProto(this), _init_resourceLoader(this, null));

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  display = (_init_extra_resourceLoader(this), _init_display(this, true));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_display(this), _init_name(this, ""));

  /** m_loadChildAutomatically (bool) [READWRITE, PERSIST] */
  loadChildAutomatically = (_init_extra_name(this), _init_loadChildAutomatically(this, true));

  /** m_resPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  resPath = (_init_extra_loadChildAutomatically(this), _init_resPath(this, ""));

  /** m_child (IEveSpaceObjectChildPtr) [READ] */
  child = (_init_extra_resPath(this), _init_child(this, null));

  /** Carbon method Reload (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  Reload(bypassAutoLoadBlocker = false) {
    if (!this.loadChildAutomatically && !bypassAutoLoadBlocker) return false;
    const next = this.resourceLoader?.LoadChild?.(this.resPath, this) ?? this.resourceLoader?.(this.resPath, this);
    if (!next || typeof next.then === "function") return false;
    this.child = next;
    return true;
  }

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  HandleControllerEvent(name) {
    this.child?.HandleControllerEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  SetControllerVariable(name, value) {
    this.child?.SetControllerVariable?.(name, value);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  StartControllers() {
    this.child?.StartControllers?.();
  }

  /** Carbon EveChildRef::RegisterComponents (cpp:87-96): forward-only to the
   * referenced child. Gate IsInRegistry() && child && m_display. */
  RegisterComponents() {
    if (this.IsInRegistry() && this.child !== null && this.display) {
      this.child.Register?.(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildRef::UnRegisterComponents (cpp:98-107): forwards to the
   * referenced child; no display re-check. */
  UnRegisterComponents() {
    if (this.IsInRegistry() && this.child !== null) {
      this.child.UnRegister?.(this.GetComponentRegistry());
    }
  }
  static {
    _initClass();
  }
}

export { _EveChildRef as EveChildRef };
//# sourceMappingURL=EveChildRef.js.map
