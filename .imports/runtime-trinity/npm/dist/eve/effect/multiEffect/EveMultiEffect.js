import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { BELIST_INSERTED, BELIST_REMOVED, BELIST_LOADING, BELIST_UNLOADSTART, BELIST_EVENTMASK } from '../../../controllers/contracts.js';

let _initProto, _initClass, _init_bindings, _init_extra_bindings, _init_controllers, _init_extra_controllers, _init_curveSets, _init_extra_curveSets, _init_externalParameters, _init_extra_externalParameters, _init_parameters, _init_extra_parameters, _init_name, _init_extra_name;

/**
 * A named bundle of curve sets, controllers and dynamic bindings that animates
 * other space objects through typed parameter slots, without owning any geometry
 * itself.
 */
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

    /**
     * Builds the prototype-free name map that dynamic bindings resolve against:
     * each parameter slot's bound object and each curve set's root under their own
     * names, plus Owner for the effect itself.
     */
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

    /**
     * Post-hydration hook; takes ownership of the parameter slots and dynamic
     * bindings, then links the bindings and controllers.
     */
    Initialize() {
      for (const parameter of this.parameters) parameter?.SetOwner?.(this);
      for (const binding of this.bindings) binding?.SetOwner?.(this);
      this.Rebind();
      return true;
    }

    /**
     * Applies Carbon's IList ownership callbacks for the parameters, bindings and
     * controllers lists - assigning or clearing owners, linking or unlinking
     * controllers, unlinking all of them on unload - and rebinds afterwards.
     */
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

    /** First parameter slot with the given name, or null. */
    GetParameterByName(parameterName) {
      const name = String(parameterName);
      return this.parameters.find(parameter => _EveMultiEffect.#GetName(parameter) === name) ?? null;
    }

    /**
     * Fills out with Owner followed by each parameter slot's bound object, so a slot named Owner overrides the effect itself.
     * @param {Object|Map} [out] - caller-owned map, mutated in place
     * @returns {Object|Map} out
     */
    GetBindingRoots(out = {}) {
      _EveMultiEffect.#SetMapValue(out, "Owner", this);
      for (const parameter of this.parameters) {
        _EveMultiEffect.#SetMapValue(out, _EveMultiEffect.#GetName(parameter), parameter?.GetParameterObject?.() ?? parameter?.object ?? null);
      }
      return out;
    }

    /**
     * Plays every curve set with the given name, over a named time range when one
     * is given, otherwise from the start with the range reset.
     */
    PlayCurveSet(name, rangeName = "") {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) !== name) continue;
        if (rangeName) curveSet?.PlayTimeRange?.(rangeName);else {
          curveSet?.ResetTimeRange?.();
          curveSet?.Play?.();
        }
      }
    }

    /** Stops every curve set with the given name. */
    StopCurveSet(name) {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) curveSet?.Stop?.();
      }
    }

    /**
     * Advances every curve set with the given name to an explicit time, bypassing
     * the effect's own update pass.
     */
    UpdateCurveSet(name, time, renderContext = null) {
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) curveSet.Update(time, time, renderContext);
      }
    }

    /**
     * Longest duration among the curve sets with the given name, or 0 when there
     * is no such set.
     */
    GetCurveSetDuration(name) {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) {
          duration = Math.max(duration, Number(curveSet?.GetMaxCurveDuration?.() ?? 0));
        }
      }
      return duration;
    }

    /**
     * Longest duration of a named time range among the curve sets with the given
     * name, or 0 when there is no such range.
     */
    GetRangeDuration(name, rangeName) {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        if (_EveMultiEffect.#GetName(curveSet) === name) {
          duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
        }
      }
      return duration;
    }

    /**
     * Advances the curve sets, controllers and bindings for the frame; the effect
     * has no geometry, so this is its only update phase.
     */
    UpdateSyncronous(updateContext) {
      const time = Number(updateContext?.GetTime?.() ?? updateContext?.currentTime ?? updateContext?.time ?? 0);
      for (const curveSet of this.curveSets) curveSet.Update(time, time, updateContext.renderContext);
      for (const controller of this.controllers) controller?.Update?.(0.5);
      for (const binding of this.bindings) binding?.Update?.(time);
    }

    /**
     * IEveSpaceObject2 asynchronous phase; the effect does all of its work
     * synchronously.
     */
    UpdateAsyncronous(_updateContext) {}

    /** IEveSpaceObject2 hook; the effect has nothing of its own to cull. */
    UpdateVisibility(_updateContext, _parentTransform) {}

    /**
     * IEveSpaceObject2 hook; the effect contributes no renderables - it animates
     * objects that are collected by their own owners.
     */
    GetRenderables(_renderables, _impostors) {}

    /** The effect has no spatial extent, so it never reports a bounding sphere. */
    GetBoundingSphere(_sphere, _query = 0) {
      return false;
    }

    /**
     * IEveSpaceObject2 hook; the effect contributes no per-object values of its
     * own.
     */
    GetPerObjectStructs(_vsData, _psData) {}

    /**
     * IEveSpaceObject2 hook with nothing to advance: a multi-effect has no model
     * centre, so the call is a no-op.
     */
    UpdateModelCenterWorldPosition(_position, _time) {}

    /**
     * IEveSpaceObject2 hook that leaves the caller position untouched, since a
     * multi-effect has no model centre to report.
     */
    GetModelCenterWorldPosition(_position) {}

    /** The effect has no local geometry, so it never reports a bounding box. */
    GetLocalBoundingBox(_min, _max) {
      return false;
    }

    /**
     * IEveSpaceObject2 hook; the effect has no placement of its own, so the
     * caller's matrix is left as it was.
     */
    GetLocalToWorldTransform(_transform) {}

    /**
     * IEveSpaceObject2 hook with nothing to register, since a multi-effect owns no
     * quads.
     */
    RegisterWithQuadRenderer(_quadRenderer) {}

    /**
     * IEveSpaceObject2 hook with nothing to submit: a multi-effect contributes no
     * quads for the frustum.
     */
    AddQuadsToQuadRenderer(_frustum, _quadRenderer) {}

    /**
     * Name of a parameter slot or curve set as a string, from GetName() or a name
     * field, empty when it has neither.
     */

    /**
     * Writes a name and value into a binding-root container that may be either a
     * Map or a plain object.
     */
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
