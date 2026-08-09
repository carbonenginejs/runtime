import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';

let _initProto, _initClass, _init_objects, _init_extra_objects, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers;

/** A container of child objects plugged into a socket, forwarding controller events, controller variables and component registration to what it contains. */
let _EveChildPlug;
class EveChildPlug extends _EveChildTransform {
  static {
    ({
      e: [_init_objects, _init_extra_objects, _init_display, _init_extra_display, _init_name, _init_extra_name, _init_externalParameters, _init_extra_externalParameters, _init_controllers, _init_extra_controllers, _initProto],
      c: [_EveChildPlug, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildPlug",
      family: "eve/child"
    })], [[[io, io.persist, void 0, type.list("IEveSpaceObjectChild")], 16, "objects"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("Tr2ExternalParameter")], 16, "externalParameters"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveChildTransform));
  }
  constructor(...args) {
    super(...args);
    _init_extra_controllers(this);
  }
  #controllerVariables = (_initProto(this), new Map());

  /** m_objects (PIEveSpaceObjectChildVector) [READ, PERSIST] */
  objects = _init_objects(this, []);

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  display = (_init_extra_objects(this), _init_display(this, true));

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_init_extra_display(this), _init_name(this, ""));

  /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
  externalParameters = (_init_extra_name(this), _init_externalParameters(this, []));

  /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
  controllers = (_init_extra_externalParameters(this), _init_controllers(this, []));

  /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
  HandleControllerEvent(name) {
    for (const controller of this.controllers) controller?.HandleEvent?.(name);
  }

  /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
  SetControllerVariable(name, value) {
    const key = String(name);
    const next = Number(value);
    this.#controllerVariables.set(key, next);
    for (const controller of this.controllers) controller?.SetVariable?.(key, next);
    for (const object of this.objects) object?.SetControllerVariable?.(key, next);
  }

  /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
  StartControllers() {
    for (const controller of this.controllers) controller?.Start?.();
  }

  /** Carbon EveChildPlug::RegisterComponents (cpp:122-135): forward-only to
   * the plugged objects. Gate m_display. */
  RegisterComponents() {
    const registry = this.GetComponentRegistry();
    if (registry && this.display) {
      for (const object of this.objects) {
        object?.Register?.(registry);
      }
    }
  }

  /** Carbon EveChildPlug::UnRegisterComponents (cpp:141-154): forwards to the
   * plugged objects; no display re-check. */
  UnRegisterComponents() {
    const registry = this.GetComponentRegistry();
    if (registry) {
      for (const object of this.objects) {
        object?.UnRegister?.(registry);
      }
    }
  }
  static {
    _initClass();
  }
}

export { _EveChildPlug as EveChildPlug };
//# sourceMappingURL=EveChildPlug.js.map
