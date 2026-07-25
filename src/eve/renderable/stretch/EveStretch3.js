// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch3.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch3.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../../controllers/contracts.js";
import { EveEntity } from "../../EveEntity.js";
import { TriFloat } from "../../../trinityCore/TriFloat.js";
import { EveChildUpdateParams } from "../../EveChildUpdateParams.js";
import {
  collectRenderables,
  getCurveDuration,
  getTime,
  makeEndpointTransforms,
  makeStretchTransform,
  mergeSphere,
  sampleVector,
  translationMatrix,
  updateChildAsync,
  updateChildSync,
  updateChildVisibility,
  updateCurveSet
} from "./CjsStretchRuntime.js";


@type.define({ className: "EveStretch3", family: "eve/renderable/stretch" })
export class EveStretch3 extends EveEntity
{
  @io.read @type.vec3 sourcePosition = vec3.create();
  @io.read @type.vec3 destinationPosition = vec3.create();
  @io.notify @io.persist @type.model("ITriVectorFunction") source = null;
  @io.notify @io.persist @type.model("ITriVectorFunction") dest = null;
  @io.persist @type.string name = "";
  @io.persist @type.model("TriFloat") moveProgression = new TriFloat();
  @io.persist @type.model("IStretchAudio") stretchAudio = null;
  @io.persist @type.list("ITr2Controller") controllers = [];
  @io.persist @type.list("TriCurveSet") curveSets = [];
  @io.persist @type.model("TriFloat") length = new TriFloat();
  @io.persist @type.list("Tr2DynamicBinding") dynamicBindings = [];
  @io.notify @io.persist @type.boolean display = true;
  @io.persist @type.boolean update = true;
  @io.persistOnly @type.model("IEveSpaceObjectChild") destObject = null;
  @io.persistOnly @type.model("IEveSpaceObjectChild") sourceObject = null;
  @io.persistOnly @type.model("IEveSpaceObjectChild") stretchObject = null;
  @io.read @type.float64 startTime = 0;
  @io.persist @type.model("ITr2Audio") audio = null;
  @io.persistOnly @type.model("IEveSpaceObjectChild") moveObject = null;

  #sourceSpaceObject = null;
  #destinationSpaceObject = null;
  #sourceMatrix = mat4.create();
  #destinationScale = 1;
  #delay = 0;
  #isMuzzleEffect = false;
  #stretchState = EveStretch3.StretchState.STRETCH_STATE_UNDEFINED;

  @carbon.method @impl.adapted
  @impl.reason("Assigns portable dynamic-binding owners directly because JavaScript arrays do not provide Carbon IList parent locks.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked?.()) controller?.Link?.(this);
    }
    this.#InitializeBindings();
    return true;
  }

  @carbon.method @impl.implemented
  GetSourceSpaceObject()
  {
    return this.#sourceSpaceObject;
  }

  @carbon.method @impl.implemented
  SetSourceSpaceObject(value)
  {
    this.#sourceSpaceObject = value ?? null;
    this.#InitializeBindings();
  }

  @carbon.method @impl.implemented
  GetDestSpaceObject()
  {
    return this.#destinationSpaceObject;
  }

  @carbon.method @impl.implemented
  SetDestSpaceObject(value)
  {
    this.#destinationSpaceObject = value ?? null;
    this.#InitializeBindings();
  }

  @carbon.method @impl.adapted
  @impl.reason("Links portable bindings/controllers directly instead of using Carbon raw roots.")
  Rebind(onlyUpdateBindings = false)
  {
    for (const binding of this.dynamicBindings)
    {
      binding?.Link?.();
      binding?.Update?.(0);
    }
    if (!onlyUpdateBindings)
    {
      for (const controller of this.controllers) controller?.Link?.(this);
    }
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Builds Carbon's unordered parameter map as a prototype-free JavaScript object.")
  GetParameterMap()
  {
    const out = Object.create(null);
    for (const curveSet of this.curveSets)
    {
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

  @carbon.method
  @impl.implemented
  GetBindingRoots(out = {})
  {
    out.Owner = this;
    out.Source = this.sourceObject;
    out.Dest = this.destObject;
    out.Stretch = this.stretchObject;
    out.Move = this.moveObject;
    out.SourceSpaceObject = this.#sourceSpaceObject;
    out.DestSpaceObject = this.#destinationSpaceObject;
    return out;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Reproduces Carbon IList controller and dynamic-binding callbacks through explicit portable list-event arguments.")
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if ((event & BELIST_LOADING) !== 0) return;
    const maskedEvent = event & BELIST_EVENTMASK;
    if (list === this.controllers)
    {
      if (maskedEvent === BELIST_INSERTED) value?.Link?.(this);
      else if (maskedEvent === BELIST_REMOVED) value?.Unlink?.();
      else if (maskedEvent === BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller?.Unlink?.();
      }
    }
    else if (list === this.dynamicBindings)
    {
      if (maskedEvent === BELIST_INSERTED)
      {
        value?.SetOwner?.(this);
        value?.Link?.();
      }
      else if (maskedEvent === BELIST_REMOVED)
      {
        value?.SetOwner?.(null);
      }
    }
  }

  @carbon.method @impl.adapted
  @impl.reason("Carbon's synchronous task phase is retained as a serial graph update in the browser runtime.")
  UpdateSynchronous(context)
  {
    if (!this.update) return true;
    if (this.#stretchState === EveStretch3.StretchState.STRETCH_STATE_STARTING)
    {
      this.StartControllers();
      this.SetControllerVariable("FiringDelay", this.#delay);
      this.SetControllerVariable("IsFiring", 1);
      this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_STARTED;
    }
    else if (this.#stretchState === EveStretch3.StretchState.STRETCH_STATE_STOPPING)
    {
      this.SetControllerVariable("IsFiring", 0);
      this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_UNDEFINED;
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
    if (this.moveObject)
    {
      vec3.subtract(EveStretch3.#movePosition, this.sourcePosition, this.destinationPosition);
      vec3.scale(EveStretch3.#movePosition, EveStretch3.#movePosition, this.moveProgression.value);
      translationMatrix(EveStretch3.#movePosition, params.localToWorldTransform);
      updateChildSync(this.moveObject, context, params);
    }
    if (this.destObject)
    {
      params.spaceObjectParent = this.#destinationSpaceObject ?? this;
      translationMatrix(this.destinationPosition, params.localToWorldTransform, this.#destinationScale);
      updateChildSync(this.destObject, context, params);
    }
    return true;
  }

  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  @carbon.method @impl.adapted
  @impl.reason("Carbon's asynchronous task phase is retained as a serial graph update in the browser runtime.")
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    const time = getTime(context);
    if (this.startTime === 0) this.startTime = time;
    const relative = time - this.startTime;
    for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative);

    const params = this.#makeParams();
    const sourceMatrix = EveStretch3.#sourceTransform;
    const destinationMatrix = EveStretch3.#destinationTransform;
    makeEndpointTransforms(this.sourcePosition, this.destinationPosition, sourceMatrix, destinationMatrix);
    mat4.copy(EveStretch3.#directionTransform, sourceMatrix);
    if (this.#isMuzzleEffect) mat4.copy(sourceMatrix, this.#sourceMatrix);

    mat4.copy(params.localToWorldTransform, sourceMatrix);
    updateChildAsync(this.sourceObject, context, params);
    makeStretchTransform(this.destinationPosition, this.sourcePosition, params.localToWorldTransform);
    vec3.lerp(EveStretch3.#midpoint, this.sourcePosition, this.destinationPosition, 0.5);
    params.localToWorldTransform[12] = EveStretch3.#midpoint[0];
    params.localToWorldTransform[13] = EveStretch3.#midpoint[1];
    params.localToWorldTransform[14] = EveStretch3.#midpoint[2];
    updateChildAsync(this.stretchObject, context, params);
    vec3.lerp(EveStretch3.#movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
    mat4.copy(params.localToWorldTransform, EveStretch3.#directionTransform);
    params.localToWorldTransform[12] = EveStretch3.#movePosition[0];
    params.localToWorldTransform[13] = EveStretch3.#movePosition[1];
    params.localToWorldTransform[14] = EveStretch3.#movePosition[2];
    updateChildAsync(this.moveObject, context, params);
    for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10]) destinationMatrix[index] *= this.#destinationScale;
    mat4.copy(params.localToWorldTransform, destinationMatrix);
    updateChildAsync(this.destObject, context, params);
    this.audio?.Update?.(this.sourcePosition, this.destinationPosition);
    this.stretchAudio?.Update?.(this.sourcePosition, this.destinationPosition);
    return true;
  }

  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  UpdateEffectSync(context)
  {
    return this.UpdateSynchronous(context);
  }

  UpdateEffectAsync(context)
  {
    return this.UpdateAsynchronous(context);
  }

  StartMoving()
  {
  }

  @carbon.method @impl.adapted
  @impl.reason("Visibility transforms are computed here; renderer-specific LOD realization stays in runtime-engine.")
  UpdateVisibility(context, parentTransform = EveStretch3.#identity)
  {
    if (!this.display) return;
    updateChildVisibility(this.sourceObject, context, translationMatrix(this.sourcePosition, EveStretch3.#sourceVisibility));
    updateChildVisibility(this.destObject, context, translationMatrix(this.destinationPosition, EveStretch3.#destinationVisibility, this.#destinationScale));
    updateChildVisibility(this.stretchObject, context, parentTransform);
    vec3.lerp(EveStretch3.#movePosition, this.sourcePosition, this.destinationPosition, this.moveProgression.value);
    makeEndpointTransforms(this.sourcePosition, this.destinationPosition, EveStretch3.#moveVisibility, EveStretch3.#unusedTransform);
    EveStretch3.#moveVisibility[12] = EveStretch3.#movePosition[0];
    EveStretch3.#moveVisibility[13] = EveStretch3.#movePosition[1];
    EveStretch3.#moveVisibility[14] = EveStretch3.#movePosition[2];
    updateChildVisibility(this.moveObject, context, EveStretch3.#moveVisibility);
  }

  @carbon.method @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; draw-batch construction remains runtime-engine work.")
  GetRenderables(out = [])
  {
    if (this.display) for (const component of this.#components()) collectRenderables(component, out);
    return out;
  }

  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  @carbon.method @impl.adapted
  @impl.reason("Bounds are merged from child graph objects without Carbon's native BoundingSphere helper.")
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, 0, 0, 0, 0);
    let valid = false;
    for (const component of this.#components())
    {
      if (typeof component?.GetBoundingSphere === "function" && component.GetBoundingSphere(EveStretch3.#sphere) !== false)
      {
        mergeSphere(out, EveStretch3.#sphere);
        valid = true;
      }
    }
    return valid;
  }

  @carbon.method @impl.implemented
  GetCurveDuration()
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      const timeScale = Number(curveSet?.GetTimeScale?.() ?? curveSet?.timeScale ?? 1) || 1;
      duration = Math.max(duration, getCurveDuration(curveSet) / timeScale);
    }
    return duration;
  }

  @carbon.method @impl.implemented
  StartFiring(delay = 0)
  {
    this.#delay = Number(delay);
    this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_STARTING;
    this.stretchAudio?.Start?.();
  }

  @carbon.method @impl.implemented
  StopFiring()
  {
    this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_STOPPING;
    this.stretchAudio?.Stop?.();
  }

  @carbon.method @impl.implemented
  SetFiringTransform(source, destination)
  {
    this.source = null;
    this.dest = null;
    if (source?.length === 16)
    {
      this.#isMuzzleEffect = true;
      mat4.copy(this.#sourceMatrix, source);
      mat4.getTranslation(this.sourcePosition, source);
    }
    else
    {
      this.#isMuzzleEffect = false;
      vec3.copy(this.sourcePosition, source);
      translationMatrix(source, this.#sourceMatrix);
    }
    vec3.copy(this.destinationPosition, destination);
  }

  @carbon.method @impl.noop
  DisplayEndPoints(_displaySource, _displayDestination)
  {
  }

  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.#destinationScale = Number(scale);
  }

  @carbon.method @impl.noop
  SetIntensity(_intensity)
  {
  }

  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  SetControllerVariable(name, value)
  {
    for (const component of this.#components()) component?.SetControllerVariable?.(name, value);
    for (const controller of this.controllers) controller?.SetVariable?.(name, value);
  }

  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  HandleControllerEvent(name)
  {
    for (const component of this.#components()) component?.HandleControllerEvent?.(name);
    for (const controller of this.controllers) controller?.HandleEvent?.(name);
  }

  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  StartControllers()
  {
    for (const component of this.#components()) component?.StartControllers?.();
    for (const controller of this.controllers) controller?.Start?.();
  }

  PlayCurveSet(name, rangeName = "")
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName?.() ?? curveSet?.name) !== name) continue;
      if (rangeName) curveSet.PlayTimeRange?.(rangeName);
      else { curveSet.ResetTimeRange?.(); curveSet.Play?.(); }
    }
    for (const component of this.#components()) component?.PlayCurveSet?.(name, rangeName);
  }

  StopCurveSet(name)
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) curveSet.Stop?.();
    for (const component of this.#components()) component?.StopCurveSet?.(name);
  }

  UpdateCurveSet(name, time)
  {
    for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) updateCurveSet(curveSet, time);
    for (const component of this.#components()) component?.UpdateCurveSet?.(name, time);
  }

  GetCurveSetDuration(name)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, getCurveDuration(curveSet));
    for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetCurveSetDuration?.(name) ?? 0));
    return duration;
  }

  GetRangeDuration(name, rangeName)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName?.() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet?.GetRangeDuration?.(rangeName) ?? 0));
    for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetRangeDuration?.(name, rangeName) ?? 0));
    return duration;
  }

  FindSoundEmitter(name)
  {
    return this.audio?.FindEmitterByName?.(name) ?? this.stretchAudio?.FindEmitterByName?.(name) ?? null;
  }

  /** Carbon EveStretch3::RegisterComponents (cpp:721-734): forwards the
   * source/dest/stretch children via RunOnComponents (cpp:126-141; the move
   * object is NOT part of that fan-out). Gate m_display. */
  @carbon.method @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      this.sourceObject?.Register?.(registry);
      this.destObject?.Register?.(registry);
      this.stretchObject?.Register?.(registry);
    }
  }

  /** Carbon EveStretch3::UnRegisterComponents (cpp:736-749): forwards the
   * same RunOnComponents children; no display re-check. */
  @carbon.method @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      this.sourceObject?.UnRegister?.(registry);
      this.destObject?.UnRegister?.(registry);
      this.stretchObject?.UnRegister?.(registry);
    }
  }

  #components()
  {
    return [this.sourceObject, this.destObject, this.stretchObject, this.moveObject].filter(Boolean);
  }

  #InitializeBindings()
  {
    for (const binding of this.dynamicBindings)
    {
      binding?.SetOwner?.(this);
      binding?.Link?.();
    }
  }

  #makeParams()
  {
    const params = new EveChildUpdateParams();
    params.isVisible = this.display;
    return params;
  }

  static StretchState = Object.freeze({ STRETCH_STATE_UNDEFINED: 0, STRETCH_STATE_STARTING: 1, STRETCH_STATE_STARTED: 2, STRETCH_STATE_STOPPING: 3 });
  static #identity = mat4.create();
  static #sourceTransform = mat4.create();
  static #destinationTransform = mat4.create();
  static #sourceVisibility = mat4.create();
  static #destinationVisibility = mat4.create();
  static #moveVisibility = mat4.create();
  static #directionTransform = mat4.create();
  static #unusedTransform = mat4.create();
  static #movePosition = vec3.create();
  static #midpoint = vec3.create();
  static #sphere = vec4.create();
}
