import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';
import { EveSocketParameterString as _EveSocketParameterSt } from '../socket/EveSocketParameterString.js';

let _initProto, _initClass, _init_resourceLoader, _init_extra_resourceLoader, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_parameters, _init_extra_parameters, _init_resPath, _init_extra_resPath, _init_plug, _init_extra_plug;

/** A named attachment point on a ship that resolves and hot-reloads a plugged-in child resource, forwarding controller and registration calls to it. */
let _EveChildSocket;
class EveChildSocket extends _EveChildTransform {
  static {
    ({
      e: [_init_resourceLoader, _init_extra_resourceLoader, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_parameters, _init_extra_parameters, _init_resPath, _init_extra_resPath, _init_plug, _init_extra_plug, _initProto],
      c: [_EveChildSocket, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildSocket",
      family: "eve/child"
    })], [[type.objectRef("IEveChildResourceLoader"), 0, "resourceLoader"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, void 0, type.list("IEveSocketParameter")], 16, "parameters"], [[io, io.notify, io, io.persist, type, type.string], 16, "resPath"], [[io, io.read, void 0, type.objectRef("EveChildPlug")], 16, "plug"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.adapted], 18, "Rebind"], [[carbon, carbon.method, impl, impl.adapted], 18, "Reload"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildTransform));
  }
  constructor(...args) {
    super(...args);
    _init_extra_plug(this);
  }
  /** Runtime resource-resolution seam supplied by an engine package. */
  resourceLoader = (_initProto(this), _init_resourceLoader(this, null));

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  display = (_init_extra_resourceLoader(this), _init_display(this, true));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_display(this), _init_name(this, ""));

  /** m_parameters (PIEveSocketParameterVector) [READ, PERSIST, NOTIFY] */
  parameters = (_init_extra_name(this), _init_parameters(this, []));

  /** m_plugResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  resPath = (_init_extra_parameters(this), _init_resPath(this, ""));

  /** m_plug (EveChildPlugPtr) [READ] */
  plug = (_init_extra_resPath(this), _init_plug(this, null));

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  HandleControllerEvent(name) {
    this.plug?.HandleControllerEvent?.(name);
  }

  /** Carbon method Rebind -> BindParameters (MAP_METHOD_AND_WRAP). */
  Rebind() {
    if (!this.plug) return false;
    for (const parameter of this.parameters) parameter?.ClearBindings?.();
    for (const external of this.plug.externalParameters ?? []) {
      let bound = this.parameters.some(parameter => parameter?.BindToExternalParameter?.(external));
      if (!bound && typeof external?.GetValue?.() === "string") {
        const parameter = new _EveSocketParameterSt();
        parameter.SetName(external.GetName?.() ?? "");
        bound = parameter.BindToExternalParameter(external);
        if (bound) {
          parameter.SetValueToDefault();
          this.parameters.push(parameter);
        }
      }
    }
    return true;
  }

  /** Carbon method Reload (MAP_METHOD_AND_WRAP). */
  Reload() {
    const next = this.resourceLoader?.LoadChild?.(this.resPath, this) ?? this.resourceLoader?.(this.resPath, this);
    if (!next || typeof next.then === "function") return false;
    this.plug = next;
    this.Rebind();
    return true;
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  SetControllerVariable(name, value) {
    this.plug?.SetControllerVariable?.(name, value);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  StartControllers() {
    this.plug?.StartControllers?.();
  }

  /** Carbon EveChildSocket::RegisterComponents (cpp:212-221): forward-only to
   * the plug. Gate IsInRegistry() && plug && m_display. */
  RegisterComponents() {
    if (this.IsInRegistry() && this.plug !== null && this.display) {
      this.plug.Register?.(this.GetComponentRegistry());
    }
  }

  /** Carbon EveChildSocket::UnRegisterComponents (cpp:227-236): forwards to
   * the plug; no display re-check. */
  UnRegisterComponents() {
    if (this.IsInRegistry() && this.plug) {
      this.plug.UnRegister?.(this.GetComponentRegistry());
    }
  }
  static {
    _initClass();
  }
}

export { _EveChildSocket as EveChildSocket };
//# sourceMappingURL=EveChildSocket.js.map
