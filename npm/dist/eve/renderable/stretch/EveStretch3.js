import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { BELIST_LOADING, BELIST_INSERTED, BELIST_REMOVED, BELIST_UNLOADSTART, BELIST_EVENTMASK } from '../../../controllers/contracts.js';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { TriFloat as _TriFloat } from '../../../trinityCore/TriFloat.js';
import { EveChildUpdateParams as _EveChildUpdateParams } from '../../EveChildUpdateParams.js';
import { getTime, sampleVector, updateChildSync, translationMatrix, updateCurveSet, makeEndpointTransforms, updateChildAsync, makeStretchTransform, updateChildVisibility, collectRenderables, mergeSphere, getCurveDuration } from './CjsStretchRuntime.js';

let _initProto, _initClass, _init_sourcePosition, _init_extra_sourcePosition, _init_destinationPosition, _init_extra_destinationPosition, _init_source, _init_extra_source, _init_dest, _init_extra_dest, _init_name, _init_extra_name, _init_moveProgression, _init_extra_moveProgression, _init_stretchAudio, _init_extra_stretchAudio, _init_controllers, _init_extra_controllers, _init_curveSets, _init_extra_curveSets, _init_length, _init_extra_length, _init_dynamicBindings, _init_extra_dynamicBindings, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_stretchObject, _init_extra_stretchObject, _init_startTime, _init_extra_startTime, _init_audio, _init_extra_audio, _init_moveObject, _init_extra_moveObject;
let _EveStretch;
new class extends _identity {
  static [class EveStretch3 extends _EveEntity {
    static {
      ({
        e: [_init_sourcePosition, _init_extra_sourcePosition, _init_destinationPosition, _init_extra_destinationPosition, _init_source, _init_extra_source, _init_dest, _init_extra_dest, _init_name, _init_extra_name, _init_moveProgression, _init_extra_moveProgression, _init_stretchAudio, _init_extra_stretchAudio, _init_controllers, _init_extra_controllers, _init_curveSets, _init_extra_curveSets, _init_length, _init_extra_length, _init_dynamicBindings, _init_extra_dynamicBindings, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_destObject, _init_extra_destObject, _init_sourceObject, _init_extra_sourceObject, _init_stretchObject, _init_extra_stretchObject, _init_startTime, _init_extra_startTime, _init_audio, _init_extra_audio, _init_moveObject, _init_extra_moveObject, _initProto],
        c: [_EveStretch, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveStretch3",
        family: "eve/renderable/stretch"
      })], [[[io, io.read, type, type.vec3], 16, "sourcePosition"], [[io, io.read, type, type.vec3], 16, "destinationPosition"], [[io, io.notify, io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "source"], [[io, io.notify, io, io.persist, void 0, type.model("ITriVectorFunction")], 16, "dest"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("TriFloat")], 16, "moveProgression"], [[io, io.persist, void 0, type.model("IStretchAudio")], 16, "stretchAudio"], [[io, io.persist, void 0, type.list("ITr2Controller")], 16, "controllers"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, void 0, type.model("TriFloat")], 16, "length"], [[io, io.persist, void 0, type.list("Tr2DynamicBinding")], 16, "dynamicBindings"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "destObject"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "sourceObject"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "stretchObject"], [[io, io.read, type, type.float64], 16, "startTime"], [[io, io.persist, void 0, type.model("ITr2Audio")], 16, "audio"], [[io, io.persistOnly, void 0, type.model("IEveSpaceObjectChild")], 16, "moveObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Assigns portable dynamic-binding owners directly because JavaScript arrays do not provide Carbon IList parent locks.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSourceSpaceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourceSpaceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDestSpaceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestSpaceObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Links portable bindings/controllers directly instead of using Carbon raw roots.")], 18, "Rebind"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Builds Carbon's unordered parameter map as a prototype-free JavaScript object.")], 18, "GetParameterMap"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBindingRoots"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Reproduces Carbon IList controller and dynamic-binding callbacks through explicit portable list-event arguments.")], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's synchronous task phase is retained as a serial graph update in the browser runtime.")], 18, "UpdateSynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's asynchronous task phase is retained as a serial graph update in the browser runtime.")], 18, "UpdateAsynchronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Visibility transforms are computed here; renderer-specific LOD realization stays in runtime-engine.")], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Renderable collection is backend-neutral; draw-batch construction remains runtime-engine work.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDisplay"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Bounds are merged from child graph objects without Carbon's native BoundingSphere helper.")], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurveDuration"], [[carbon, carbon.method, impl, impl.implemented], 18, "StartFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "StopFiring"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetFiringTransform"], [[carbon, carbon.method, impl, impl.noop], 18, "DisplayEndPoints"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestObjectScale"], [[carbon, carbon.method, impl, impl.noop], 18, "SetIntensity"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct child/controller method forwarding.")], 18, "SetControllerVariable"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct child/controller method forwarding.")], 18, "HandleControllerEvent"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Controller ownership is represented by direct child/controller method forwarding.")], 18, "StartControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"]], 0, void 0, _EveEntity));
    }
    sourcePosition = (_initProto(this), _init_sourcePosition(this, vec3.create()));
    destinationPosition = (_init_extra_sourcePosition(this), _init_destinationPosition(this, vec3.create()));
    source = (_init_extra_destinationPosition(this), _init_source(this, null));
    dest = (_init_extra_source(this), _init_dest(this, null));
    name = (_init_extra_dest(this), _init_name(this, ""));
    moveProgression = (_init_extra_name(this), _init_moveProgression(this, new _TriFloat()));
    stretchAudio = (_init_extra_moveProgression(this), _init_stretchAudio(this, null));
    controllers = (_init_extra_stretchAudio(this), _init_controllers(this, []));
    curveSets = (_init_extra_controllers(this), _init_curveSets(this, []));
    length = (_init_extra_curveSets(this), _init_length(this, new _TriFloat()));
    dynamicBindings = (_init_extra_length(this), _init_dynamicBindings(this, []));
    display = (_init_extra_dynamicBindings(this), _init_display(this, true));
    update = (_init_extra_display(this), _init_update(this, true));
    destObject = (_init_extra_update(this), _init_destObject(this, null));
    sourceObject = (_init_extra_destObject(this), _init_sourceObject(this, null));
    stretchObject = (_init_extra_sourceObject(this), _init_stretchObject(this, null));
    startTime = (_init_extra_stretchObject(this), _init_startTime(this, 0));
    audio = (_init_extra_startTime(this), _init_audio(this, null));
    moveObject = (_init_extra_audio(this), _init_moveObject(this, null));
    #sourceSpaceObject = (_init_extra_moveObject(this), null);
    #destinationSpaceObject = null;
    #sourceMatrix = mat4.create();
    #destinationScale = 1;
    #delay = 0;
    #isMuzzleEffect = false;
    #stretchState = _EveStretch.StretchState.STRETCH_STATE_UNDEFINED;
    Initialize() {
      for (const controller of this.controllers) {
        if (!controller?.IsLinked?.()) controller?.Link?.(this);
      }
      this.#InitializeBindings();
      return true;
    }
    GetSourceSpaceObject() {
      return this.#sourceSpaceObject;
    }
    SetSourceSpaceObject(value) {
      this.#sourceSpaceObject = value ?? null;
      this.#InitializeBindings();
    }
    GetDestSpaceObject() {
      return this.#destinationSpaceObject;
    }
    SetDestSpaceObject(value) {
      this.#destinationSpaceObject = value ?? null;
      this.#InitializeBindings();
    }
    Rebind(onlyUpdateBindings = false) {
      for (const binding of this.dynamicBindings) {
        binding?.Link?.();
        binding?.Update?.(0);
      }
      if (!onlyUpdateBindings) {
        for (const controller of this.controllers) controller?.Link?.(this);
      }
    }
    GetParameterMap() {
      const out = Object.create(null);
      for (const curveSet of this.curveSets) {
        const name = String(curveSet?.GetName?.() ?? curveSet?.name ?? "");
        out[name] = curveSet?.GetRawRoot?.() ?? curveSet;
      }
      out.Owner = this;
      if (this.#sourceSpaceObject) out.SourceSpaceObject = this.#sourceSpaceObject;
      if (this.#destinationSpaceObject) out.DestSpaceObject = this.#destinationSpaceObject;
      if (this.sourceObject) out.SourceObject = this.sourceObject?.GetRootObject?.() ?? this.sourceObject;
      if (this.destObject) out.DestObject = this.destObject?.GetRootObject?.() ?? this.destObject;
      if (this.moveObject) out.MoveObject = this.moveObject?.GetRootObject?.() ?? this.moveObject;
      if (this.stretchObject) out.StretchObject = this.stretchObject?.GetRootObject?.() ?? this.stretchObject;
      return out;
    }
    GetBindingRoots(out = {}) {
      out.Owner = this;
      out.Source = this.sourceObject;
      out.Dest = this.destObject;
      out.Stretch = this.stretchObject;
      out.Move = this.moveObject;
      out.SourceSpaceObject = this.#sourceSpaceObject;
      out.DestSpaceObject = this.#destinationSpaceObject;
      return out;
    }
    OnListModified(event, _key = 0, _key2 = 0, value = null, list = null) {
      if ((event & BELIST_LOADING) !== 0) return;
      const maskedEvent = event & BELIST_EVENTMASK;
      if (list === this.controllers) {
        if (maskedEvent === BELIST_INSERTED) value?.Link?.(this);else if (maskedEvent === BELIST_REMOVED) value?.Unlink?.();else if (maskedEvent === BELIST_UNLOADSTART) {
          for (const controller of this.controllers) controller?.Unlink?.();
        }
      } else if (list === this.dynamicBindings) {
        if (maskedEvent === BELIST_INSERTED) {
          value?.SetOwner?.(this);
          value?.Link?.();
        } else if (maskedEvent === BELIST_REMOVED) {
          value?.SetOwner?.(null);
        }
      }
    }
    UpdateSynchronous(context) {
      if (!this.update) return true;
      if (this.#stretchState === _EveStretch.StretchState.STRETCH_STATE_STARTING) {
        this.StartControllers();
        this.SetControllerVariable("FiringDelay", this.#delay);
        this.SetControllerVariable("IsFiring", 1);
        this.#stretchState = _EveStretch.StretchState.STRETCH_STATE_STARTED;
      } else if (this.#stretchState === _EveStretch.StretchState.STRETCH_STATE_STOPPING) {
        this.SetControllerVariable("IsFiring", 0);
        this.#stretchState = _EveStretch.StretchState.STRETCH_STATE_UNDEFINED;
      }
      const time = getTime(context);
      for (const binding of this.dynamicBindings) binding?.Update?.(time);
      for (const controller of this.controllers) controller?.Update?.(0.5);
      if (this.source) sampleVector(this.source, time, this.sourcePosition);
      if (this.dest) sampleVector(this.dest, time, this.destinationPosition);
      this.length.value = vec3.distance(this.sourcePosition, this.destinationPosition);
      const params = this.#makeParams();
      params.spaceObjectParent = this.#sourceSpaceObject ?? this;
      updateChildSync(this.sourceObject, context, params);
      updateChildSync(this.stretchObject, context, params);
      if (this.moveObject) {
        vec3.subtract(_EveStretch.#movePosition, this.sourcePosition, this.destinationPosition);
        vec3.scale(_EveStretch.#movePosition, _EveStretch.#movePosition, this.moveProgression.value);
        translationMatrix(_EveStretch.#movePosition, params.localToWorldTransform);
        updateChildSync(this.moveObject, context, params);
      }
      if (this.destObject) {
        params.spaceObjectParent = this.#destinationSpaceObject ?? this;
        translationMatrix(this.destinationPosition, params.localToWorldTransform, this.#destinationScale);
        updateChildSync(this.destObject, context, params);
      }
      return true;
    }
    UpdateSyncronous(context) {
      return this.UpdateSynchronous(context);
    }
    UpdateAsynchronous(context) {
      if (!this.update) return true;
      const time = getTime(context);
      if (this.startTime === 0) this.startTime = time;
      const relative = time - this.startTime;
      for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative);
      const params = this.#makeParams();
      const sourceMatrix = _EveStretch.#sourceTransform;
      const destinationMatrix = _EveStretch.#destinationTransform;
      makeEndpointTransforms(this.sourcePosition, this.destinationPosition, sourceMatrix, destinationMatrix);
      mat4.copy(_EveStretch.#directionTransform, sourceMatrix);
      if (this.#isMuzzleEffect) mat4.copy(sourceMatrix, this.#sourceMatrix);
      mat4.copy(params.localToWorldTransform, sourceMatrix);
      updateChildAsync(this.sourceObject, context, params);
      makeStretchTransform(this.destinationPosition, this.sourcePosition, params.localToWorldTransform);
      vec3.lerp(_EveStretch.#midpoint, this.sourcePosition, this.destinationPosition, 0.5);
      params.localToWorldTransform[12] = _EveStretch.#midpoint[0];
      params.localToWorldTransform[13] = _EveStretch.#midpoint[1];
      params.localToWorldTransform[14] = _EveStretch.#midpoint[2];
      updateChildAsync(this.stretchObject, context, params);
      vec3.lerp(_EveStretch.#movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
      mat4.copy(params.localToWorldTransform, _EveStretch.#directionTransform);
      params.localToWorldTransform[12] = _EveStretch.#movePosition[0];
      params.localToWorldTransform[13] = _EveStretch.#movePosition[1];
      params.localToWorldTransform[14] = _EveStretch.#movePosition[2];
      updateChildAsync(this.moveObject, context, params);
      for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10]) destinationMatrix[index] *= this.#destinationScale;
      mat4.copy(params.localToWorldTransform, destinationMatrix);
      updateChildAsync(this.destObject, context, params);
      this.audio?.Update?.(this.sourcePosition, this.destinationPosition);
      this.stretchAudio?.Update?.(this.sourcePosition, this.destinationPosition);
      return true;
    }
    UpdateAsyncronous(context) {
      return this.UpdateAsynchronous(context);
    }
    UpdateEffectSync(context) {
      return this.UpdateSynchronous(context);
    }
    UpdateEffectAsync(context) {
      return this.UpdateAsynchronous(context);
    }
    StartMoving() {}
    UpdateVisibility(context, parentTransform = _EveStretch.#identity) {
      if (!this.display) return;
      updateChildVisibility(this.sourceObject, context, translationMatrix(this.sourcePosition, _EveStretch.#sourceVisibility));
      updateChildVisibility(this.destObject, context, translationMatrix(this.destinationPosition, _EveStretch.#destinationVisibility, this.#destinationScale));
      updateChildVisibility(this.stretchObject, context, parentTransform);
      vec3.lerp(_EveStretch.#movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
      makeEndpointTransforms(this.sourcePosition, this.destinationPosition, _EveStretch.#moveVisibility, _EveStretch.#unusedTransform);
      _EveStretch.#moveVisibility[12] = _EveStretch.#movePosition[0];
      _EveStretch.#moveVisibility[13] = _EveStretch.#movePosition[1];
      _EveStretch.#moveVisibility[14] = _EveStretch.#movePosition[2];
      updateChildVisibility(this.moveObject, context, _EveStretch.#moveVisibility);
    }
    GetRenderables(out = []) {
      if (this.display) for (const component of this.#components()) collectRenderables(component, out);
      return out;
    }
    SetDisplay(display) {
      this.display = !!display;
    }
    GetBoundingSphere(out = vec4.create()) {
      vec4.set(out, 0, 0, 0, 0);
      let valid = false;
      for (const component of this.#components()) {
        if (typeof component?.GetBoundingSphere === "function" && component.GetBoundingSphere(_EveStretch.#sphere) !== false) {
          mergeSphere(out, _EveStretch.#sphere);
          valid = true;
        }
      }
      return valid;
    }
    GetCurveDuration() {
      let duration = 0;
      for (const curveSet of this.curveSets) {
        const timeScale = Number(curveSet?.GetTimeScale?.() ?? curveSet?.timeScale ?? 1) || 1;
        duration = Math.max(duration, getCurveDuration(curveSet) / timeScale);
      }
      return duration;
    }
    StartFiring(delay = 0) {
      this.#delay = Number(delay);
      this.#stretchState = _EveStretch.StretchState.STRETCH_STATE_STARTING;
      this.stretchAudio?.Start?.();
    }
    StopFiring() {
      this.#stretchState = _EveStretch.StretchState.STRETCH_STATE_STOPPING;
      this.stretchAudio?.Stop?.();
    }
    SetFiringTransform(source, destination) {
      this.source = null;
      this.dest = null;
      if (source?.length === 16) {
        this.#isMuzzleEffect = true;
        mat4.copy(this.#sourceMatrix, source);
        mat4.getTranslation(this.sourcePosition, source);
      } else {
        this.#isMuzzleEffect = false;
        vec3.copy(this.sourcePosition, source);
        translationMatrix(source, this.#sourceMatrix);
      }
      vec3.copy(this.destinationPosition, destination);
    }
    DisplayEndPoints(_displaySource, _displayDestination) {}
    SetDestObjectScale(scale) {
      this.#destinationScale = Number(scale);
    }
    SetIntensity(_intensity) {}
    SetControllerVariable(name, value) {
      for (const component of this.#components()) component?.SetControllerVariable?.(name, value);
      for (const controller of this.controllers) controller?.SetVariable?.(name, value);
    }
    HandleControllerEvent(name) {
      for (const component of this.#components()) component?.HandleControllerEvent?.(name);
      for (const controller of this.controllers) controller?.HandleEvent?.(name);
    }
    StartControllers() {
      for (const component of this.#components()) component?.StartControllers?.();
      for (const controller of this.controllers) controller?.Start?.();
    }
    PlayCurveSet(name, rangeName = "") {
      if (!this.display) return;
      for (const curveSet of this.curveSets) {
        if ((curveSet?.GetName?.() ?? curveSet?.name) !== name) continue;
        if (rangeName) curveSet.PlayTimeRange?.(rangeName);else {
          curveSet.ResetTimeRange?.();
          curveSet.Play?.();
        }
      }
      for (const component of this.#components()) component?.PlayCurveSet?.(name, rangeName);
    }
    StopCurveSet(name) {
      if (!this.display) return;
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) curveSet.Stop?.();
      for (const component of this.#components()) component?.StopCurveSet?.(name);
    }
    UpdateCurveSet(name, time) {
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) updateCurveSet(curveSet, time);
      for (const component of this.#components()) component?.UpdateCurveSet?.(name, time);
    }
    GetCurveSetDuration(name) {
      if (!this.display) return 0;
      let duration = 0;
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, getCurveDuration(curveSet));
      for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetCurveSetDuration?.(name) ?? 0));
      return duration;
    }
    GetRangeDuration(name, rangeName) {
      if (!this.display) return 0;
      let duration = 0;
      for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
      for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetRangeDuration?.(name, rangeName) ?? 0));
      return duration;
    }
    FindSoundEmitter(name) {
      return this.audio?.FindEmitterByName?.(name) ?? this.stretchAudio?.FindEmitterByName?.(name) ?? null;
    }

    /** Carbon EveStretch3::RegisterComponents (cpp:721-734): forwards the
     * source/dest/stretch children via RunOnComponents (cpp:126-141; the move
     * object is NOT part of that fan-out). Gate m_display. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry && this.display) {
        this.sourceObject?.Register?.(registry);
        this.destObject?.Register?.(registry);
        this.stretchObject?.Register?.(registry);
      }
    }

    /** Carbon EveStretch3::UnRegisterComponents (cpp:736-749): forwards the
     * same RunOnComponents children; no display re-check. */
    UnRegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        this.sourceObject?.UnRegister?.(registry);
        this.destObject?.UnRegister?.(registry);
        this.stretchObject?.UnRegister?.(registry);
      }
    }
    #components() {
      return [this.sourceObject, this.destObject, this.stretchObject, this.moveObject].filter(Boolean);
    }
    #InitializeBindings() {
      for (const binding of this.dynamicBindings) {
        binding?.SetOwner?.(this);
        binding?.Link?.();
      }
    }
    #makeParams() {
      const params = new _EveChildUpdateParams();
      params.isVisible = this.display;
      return params;
    }
  }];
  StretchState = Object.freeze({
    STRETCH_STATE_UNDEFINED: 0,
    STRETCH_STATE_STARTING: 1,
    STRETCH_STATE_STARTED: 2,
    STRETCH_STATE_STOPPING: 3
  });
  #identity = mat4.create();
  #sourceTransform = mat4.create();
  #destinationTransform = mat4.create();
  #sourceVisibility = mat4.create();
  #destinationVisibility = mat4.create();
  #moveVisibility = mat4.create();
  #directionTransform = mat4.create();
  #unusedTransform = mat4.create();
  #movePosition = vec3.create();
  #midpoint = vec3.create();
  #sphere = vec4.create();
  constructor() {
    super(_EveStretch), _initClass();
  }
}();

export { _EveStretch as EveStretch3 };
//# sourceMappingURL=EveStretch3.js.map
