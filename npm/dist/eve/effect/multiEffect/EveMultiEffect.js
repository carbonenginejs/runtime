import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { BELIST_INSERTED, BELIST_REMOVED, BELIST_LOADING, BELIST_UNLOADSTART, BELIST_EVENTMASK } from '../../../controllers/contracts.js';

let _initProto, _initClass, _init_bindings, _init_extra_bindings, _init_controllers, _init_extra_controllers, _init_curveSets, _init_extra_curveSets, _init_externalParameters, _init_extra_externalParameters, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name;
let _EveMultiEffect;
new class extends _identity {
  static [class EveMultiEffect extends CjsModel {
    static {
      ({
        e: [_init_bindings, _init_extra_bindings, _init_controllers, _init_extra_controllers, _init_curveSets, _init_extra_curveSets, _init_externalParameters, _init_extra_externalParameters, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name, _initProto],
        c: [_EveMultiEffect, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveMultiEffect",
        family: "eve/effect"
      })], [[[io, io.persist, void 0, type.list("Tr2DynamicBinding")], 16, "bindings"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, void 0, type.list("Tr2ExternalParameter")], 16, "externalParameters"], [[io, io.persist, void 0, type.list("EveMultiEffectParameter")], 16, "parameters"], [[io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Builds Carbon's unordered root map as a prototype-free JavaScript object.")], 18, "GetParameterMap"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Links portable owner objects directly instead of using Carbon parent locks and raw roots.")], 18, "Rebind"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Assigns portable owner references before linking because JavaScript arrays do not provide Carbon IList parent locks.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Reproduces Carbon IList ownership and controller callbacks through explicit portable list-event arguments.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Accepts portable parameter objects and duck-typed setter methods in place of Carbon's Blue interface cast.")], 18, "SetParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterByName"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Mutates a JavaScript object or Map while preserving Carbon's base-Owner-then-parameter precedence.")], 18, "GetBindingRoots"], [[carbon, carbon.method, impl, impl.implemented], 18, "PlayCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateCurveSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveSetDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRangeDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.noop], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.noop], 18, "GetPerObjectStructs"], [[carbon, carbon.method, impl, impl.noop], 18, "UpdateModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.noop], 18, "GetModelCenterWorldPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalBoundingBox"], [[carbon, carbon.method, impl, impl.noop], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.noop], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.noop], 18, "AddQuadsToQuadRenderer"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_name(this);
    }
    /** m_bindings (PTr2DynamicBindingVector) [READ, PERSIST] */
    bindings = (_initProto(this), _init_bindings(this, []));

    /** m_controllers (PITr2ControllerVector) [READ, PERSIST] */
    controllers = (_init_extra_bindings(this), _init_controllers(this, []));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_controllers(this), _init_curveSets(this, []));

    /** m_externalParameters (PTr2ExternalParameterVector) [READ, PERSIST] */
    externalParameters = (_init_extra_curveSets(this), _init_externalParameters(this, []));

    /** m_parameters (PEveMultiEffectParameterVector) [READ, PERSIST] */
    parameters = (_init_extra_externalParameters(this), _init_parameters(this, []));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_parameters(this), _init_name(this, ""));
    GetParameterMap() {
      const out = Object.create(null);
      for (const parameter of this.parameters) {
        out[_EveMultiEffect.#GetName(parameter)] = parameter?.GetParameterObject?.() ?? parameter?.object ?? null;
      }
      for (const curveSet of this.curveSets) {
        out[_EveMultiEffect.#GetName(curveSet)] = curveSet?.GetRawRoot?.() ?? curveSet;
      }
      out.Owner = this;
      return out;
    }

    /** Carbon method Rebind (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
    Rebind(onlyUpdateBindings = false) {
      for (const binding of this.bindings) {
        binding?.Link?.();
        binding?.Update?.(0);
      }
      if (!onlyUpdateBindings) {
        for (const controller of this.controllers) controller?.Link?.(this);
      }
    }
    Initialize() {
      for (const parameter of this.parameters) parameter?.SetOwner?.(this);
      for (const binding of this.bindings) binding?.SetOwner?.(this);
      this.Rebind();
      return true;
    }
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = null) {
      const maskedEvent = event & BELIST_EVENTMASK;
      if (list === this.parameters) {
        if (maskedEvent === BELIST_INSERTED) value?.SetOwner?.(this);else if (maskedEvent === BELIST_REMOVED) value?.SetOwner?.(null);
      } else if (list === this.bindings) {
        if (maskedEvent === BELIST_INSERTED) value?.SetOwner?.(this);else if (maskedEvent === BELIST_REMOVED) value?.SetOwner?.(null);
      } else if (list === this.controllers && (event & BELIST_LOADING) === 0) {
        if (maskedEvent === BELIST_INSERTED) value?.Link?.(this);else if (maskedEvent === BELIST_REMOVED) value?.Unlink?.();else if (maskedEvent === BELIST_UNLOADSTART) {
          for (const controller of this.controllers) controller?.Unlink?.();
        }
      }
      this.Rebind();
    }

    /** Carbon method HandleControllerEvent (MAP_METHOD_AND_WRAP). */
    HandleControllerEvent(name) {
      for (const controller of this.controllers) controller?.HandleEvent?.(name);
    }

    /** Carbon method SetControllerVariable (MAP_METHOD_AND_WRAP). */
    SetControllerVariable(name, value) {
      for (const controller of this.controllers) controller?.SetVariable?.(name, value);
    }

    /** Carbon method SetParameter (MAP_METHOD_AND_WRAP). */
    SetParameter(parameterName, object) {
      const name = String(parameterName);
      const parameter = this.parameters.find(item => (item?.GetName?.() ?? item?.name) === name);
      if (!parameter) return false;
      if (parameter.SetParameterObject) parameter.SetParameterObject(object);else parameter.object = object;
      this.Rebind();
      return true;
    }

    /** Carbon method StartControllers (MAP_METHOD_AND_WRAP). */
    StartControllers() {
      for (const controller of this.controllers) controller?.Start?.();
    }
    GetParameterByName(parameterName) {
      const name = String(parameterName);
      return this.parameters.find(parameter => _EveMultiEffect.#GetName(parameter) === name) ?? null;
    }
    GetBindingRoots(out = {}) {
      _EveMultiEffect.#SetMapValue(out, "Owner", this);
      for (const parameter of this.parameters) {
        _EveMultiEffect.#SetMapValue(out, _EveMultiEffect.#GetName(parameter), parameter?.GetParameterObject?.() ?? parameter?.object ?? null);
      }
      return out;
    }
    PlayCurveSet(name, rangeName = "") {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) !== name) continue;
        if (rangeName) curveSet?.PlayTimeRange?.(rangeName);else {
          curveSet?.ResetTimeRange?.();
          curveSet?.Play?.();
        }
      }
    }
    StopCurveSet(name) {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) curveSet?.Stop?.();
      }
    }
    UpdateCurveSet(name, time) {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) curveSet?.Update?.(time, time);
      }
    }
    GetCurveSetDuration(name) {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) {
          duration = Math.max(duration, Number(curveSet?.GetMaxCurveDuration?.() ?? 0));
        }
      }
      return duration;
    }
    GetRangeDuration(name, rangeName) {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) {
          duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
        }
      }
      return duration;
    }
    UpdateSyncronous(updateContext) {
      const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
      for (const curveSet of this.curveSets) curveSet?.Update?.(time, time);
      for (const controller of this.controllers) controller?.Update?.(0.5);
      for (const binding of this.bindings) binding?.Update?.(time);
    }
    UpdateAsyncronous(_updateContext) {}
    UpdateVisibility(_updateContext, _parentTransform) {}
    GetRenderables(_renderables, _impostors) {}
    GetBoundingSphere(_sphere, _query = 0) {
      return false;
    }
    GetPerObjectStructs(_vsData, _psData) {}
    UpdateModelCenterWorldPosition(_position, _time) {}
    GetModelCenterWorldPosition(_position) {}
    GetLocalBoundingBox(_min, _max) {
      return false;
    }
    GetLocalToWorldTransform(_transform) {}
    RegisterWithQuadRenderer(_quadRenderer) {}
    AddQuadsToQuadRenderer(_frustum, _quadRenderer) {}
  }];
  #GetName(value) {
    return String(value?.GetName?.() ?? value?.name ?? "");
  }
  #SetMapValue(out, name, value) {
    if (out instanceof Map) out.set(name, value);else out[name] = value;
  }
  constructor() {
    super(_EveMultiEffect), _initClass();
  }
}();

export { _EveMultiEffect as EveMultiEffect };
//# sourceMappingURL=EveMultiEffect.js.map
