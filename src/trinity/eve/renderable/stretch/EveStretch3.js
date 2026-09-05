// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch3.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch3.cpp
import { mat4 } from "#math/mat4";
import { withIEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { carbon, impl, io, type } from "#schema";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../../controllers/contracts.js";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { TriFloat } from "../../../core/variable/TriFloat.js";
import { EveChildUpdateParams } from "../../EveChildUpdateParams.js";
import { StretchState } from "../../../generated/eve/renderable/stretch/enums.js";
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


/**
 * The current stretch effect: places space-object children at the source, across
 * the span, at the destination and at a travelling point between them, driven by
 * its own controllers, dynamic bindings and curve sets.
 */
@type.define({ className: "EveStretch3", family: "eve/renderable/stretch" })
export class EveStretch3 extends withIEveSpaceObject2(IEveFiringEffectElement)
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

  /**
   * Post-hydration hook; links any controller that is not already linked and
   * takes ownership of the dynamic bindings.
   */
  @carbon.method @impl.adapted
  @impl.reason("Assigns portable dynamic-binding owners directly because JavaScript arrays do not provide Carbon IList parent locks.")
  Initialize()
  {
    for (const controller of this.controllers)
    {
      if (!controller?.IsLinked()) controller?.Link(this);
    }
    this.#InitializeBindings();
    return true;
  }

  /**
   * The space object standing in as parent for the source-side children, or
   * null.
   */
  @carbon.method @impl.implemented
  GetSourceSpaceObject()
  {
    return this.#sourceSpaceObject;
  }

  /**
   * Sets the space object used as parent for the source-side children and
   * relinks the dynamic bindings, since it is one of their roots.
   */
  @carbon.method @impl.implemented
  SetSourceSpaceObject(value)
  {
    this.#sourceSpaceObject = value ?? null;
    this.#InitializeBindings();
  }

  /** The space object standing in as parent for the destination child, or null. */
  @carbon.method @impl.implemented
  GetDestSpaceObject()
  {
    return this.#destinationSpaceObject;
  }

  /**
   * Sets the space object used as parent for the destination child and relinks
   * the dynamic bindings, since it is one of their roots.
   */
  @carbon.method @impl.implemented
  SetDestSpaceObject(value)
  {
    this.#destinationSpaceObject = value ?? null;
    this.#InitializeBindings();
  }

  /**
   * Relinks the dynamic bindings and evaluates them once at time zero, and unless only the bindings were asked for, relinks the controllers.
   * @param {Boolean} [onlyUpdateBindings] - leave the controllers linked as they are
   */
  @carbon.method @impl.adapted
  @impl.reason("Links portable bindings/controllers directly instead of using Carbon raw roots.")
  Rebind(onlyUpdateBindings = false)
  {
    for (const binding of this.dynamicBindings)
    {
      binding?.Link();
      binding?.Update(0);
    }
    if (!onlyUpdateBindings)
    {
      for (const controller of this.controllers) controller?.Link(this);
    }
  }

  /**
   * Builds the prototype-free name map that bindings and controllers resolve
   * against: every curve set under its own name, plus Owner, the source and
   * destination space objects, and the root object of each child.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Builds Carbon's unordered parameter map as a prototype-free JavaScript object.")
  GetParameterMap()
  {
    const out = Object.create(null);
    for (const curveSet of this.curveSets)
    {
      const name = String(curveSet?.GetName() ?? curveSet?.name ?? "");
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

  /**
   * Fills out with the fixed binding roots - Owner, Source, Dest, Stretch, Move and the two space objects - under their binding-path names.
   * @param {Object} [out] - caller-owned map, mutated in place
   * @returns {Object} out
   */
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

  /**
   * Applies Carbon's IList ownership callbacks for the controllers and
   * dynamic-binding lists - linking on insert, unlinking on remove, unlinking
   * every controller on unload - and ignores events flagged as loading.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Reproduces Carbon IList controller and dynamic-binding callbacks through explicit portable list-event arguments.")
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if ((event & BELIST_LOADING) !== 0) return;
    const maskedEvent = event & BELIST_EVENTMASK;
    if (list === this.controllers)
    {
      if (maskedEvent === BELIST_INSERTED) value?.Link(this);
      else if (maskedEvent === BELIST_REMOVED) value?.Unlink();
      else if (maskedEvent === BELIST_UNLOADSTART)
      {
        for (const controller of this.controllers) controller?.Unlink();
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

  /**
   * Applies a pending firing transition (starting sets the FiringDelay and
   * IsFiring controller variables, stopping clears IsFiring), advances the
   * bindings and controllers, samples the endpoint curves, records the span in
   * length, and drives each child's synchronous phase with a fresh parameter
   * block: the source and stretch children under the source space object, the
   * move child at the interpolated offset, and the destination child under the
   * destination space object at its scaled placement. Skipped entirely while
   * update is false.
   */
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
    for (const binding of this.dynamicBindings) binding?.Update(time);
    for (const controller of this.controllers) controller?.Update(0.5);
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

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * Advances the curve sets on time measured from the first asynchronous update,
   * then places each child: the source at the span basis, or verbatim at the
   * muzzle transform when SetFiringTransform supplied one; the stretch child
   * spanning the endpoints and re-centred on their midpoint; the move child at
   * the interpolated position carrying the span orientation; and the destination
   * at its scaled basis. Finally feeds both audio objects the current endpoints.
   * Skipped entirely while update is false.
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon's asynchronous task phase is retained as a serial graph update in the browser runtime.")
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    const time = getTime(context);
    if (this.startTime === 0) this.startTime = time;
    const relative = time - this.startTime;
    for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative, context.renderContext);

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
    if (this.stretchAudio)
    {
      this.stretchAudio.Update(this.sourcePosition, this.destinationPosition);
    }
    return true;
  }

  /**
   * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
   * unchanged.
   */
  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * IEveFiringEffectElement synchronous hook; runs the normal synchronous
   * update.
   */
  UpdateEffectSync(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * IEveFiringEffectElement asynchronous hook; runs the normal asynchronous
   * update.
   */
  UpdateEffectAsync(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * IEveFiringEffectElement move hook; EveStretch3 drives its travelling child
   * from the moveProgression value instead of a start event.
   */
  StartMoving()
  {
  }

  /**
   * Hands each child its visibility placement: the endpoint children as plain
   * translations (the destination scaled), the stretch child the parent
   * transform unchanged, and the move child the span orientation moved to the
   * interpolated position. No GPU work happens here.
   */
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

  /**
   * Appends every child's renderables to out while displayed; batch construction is left to runtime-engine.
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; draw-batch construction remains runtime-engine work.")
  GetRenderables(out = [])
  {
    if (this.display) for (const component of this.#components()) collectRenderables(component, out);
    return out;
  }

  /**
   * Shows or hides the stretch, gating visibility, renderable collection,
   * curve-set control and component registration.
   */
  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Merges the bounding spheres of every child, including the travelling one.
   * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
   * @returns {Boolean} whether any child contributed a sphere
   */
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

  /**
   * Longest curve-set duration in seconds, each divided by that set's own time
   * scale.
   */
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

  /**
   * Requests a firing start; the controller variables are only applied on the next synchronous update, while the stretch audio starts immediately.
   * @param {Number} [delay] - seconds handed to the controllers as the FiringDelay variable
   */
  @carbon.method @impl.implemented
  StartFiring(delay = 0)
  {
    this.#delay = Number(delay);
    this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_STARTING;
    if (this.stretchAudio)
    {
      this.stretchAudio.Start();
    }
  }

  /**
   * Requests a firing stop; IsFiring is cleared on the next synchronous update,
   * while the stretch audio stops immediately.
   */
  @carbon.method @impl.implemented
  StopFiring()
  {
    this.#stretchState = EveStretch3.StretchState.STRETCH_STATE_STOPPING;
    if (this.stretchAudio)
    {
      this.stretchAudio.Stop();
    }
  }

  /**
   * Pins both endpoints explicitly and drops the source and dest position curves
   * so they cannot overwrite them. A 16-element source marks this a muzzle
   * effect, whose transform is used verbatim for the source child instead of the
   * derived span basis.
   */
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

  /** IEveFiringEffectElement hook; EveStretch3 cannot hide individual endpoints. */
  @carbon.method @impl.noop
  DisplayEndPoints(_displaySource, _displayDestination)
  {
  }

  /**
   * Uniform scale applied to the destination child's placement in both the
   * synchronous and asynchronous passes.
   */
  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.#destinationScale = Number(scale);
  }

  /**
   * IEveFiringEffectElement intensity hook; EveStretch3 has no intensity term of
   * its own.
   */
  @carbon.method @impl.noop
  SetIntensity(_intensity)
  {
  }

  /**
   * Sets a controller variable on every child and on this stretch's own
   * controllers.
   */
  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  SetControllerVariable(name, value)
  {
    for (const component of this.#components()) component?.SetControllerVariable(name, value);
    for (const controller of this.controllers) controller?.SetVariable(name, value);
  }

  /**
   * Delivers a controller event to every child and to this stretch's own
   * controllers.
   */
  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  HandleControllerEvent(name)
  {
    for (const component of this.#components()) component?.HandleControllerEvent(name);
    for (const controller of this.controllers) controller?.HandleEvent(name);
  }

  /** Starts every child's controllers and this stretch's own. */
  @carbon.method @impl.adapted
  @impl.reason("Controller ownership is represented by direct child/controller method forwarding.")
  StartControllers()
  {
    for (const component of this.#components()) component?.StartControllers();
    for (const controller of this.controllers) controller?.Start();
  }

  /**
   * Plays every local curve set with the given name - over a named time range
   * when one is given, otherwise from the start with the range reset - and
   * forwards the call to the children. Ignored while hidden.
   */
  PlayCurveSet(name, rangeName = "")
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets)
    {
      if ((curveSet?.GetName() ?? curveSet?.name) !== name) continue;
      if (rangeName) curveSet.PlayTimeRange?.(rangeName);
      else { curveSet.ResetTimeRange(); curveSet.Play(); }
    }
    for (const component of this.#components()) component?.PlayCurveSet?.(name, rangeName);
  }

  /**
   * Stops every local curve set with the given name and forwards the call to the
   * children. Ignored while hidden.
   */
  StopCurveSet(name)
  {
    if (!this.display) return;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) curveSet.Stop();
    for (const component of this.#components()) component?.StopCurveSet?.(name);
  }

  /**
   * Advances every local curve set with the given name to an explicit time and
   * forwards the call to the children; unlike play and stop this is not gated on
   * display.
   */
  UpdateCurveSet(name, time, renderContext = null)
  {
    for (const curveSet of this.curveSets)
    {
      if (curveSet.GetName() === name)
      {
        updateCurveSet(curveSet, time, renderContext);
      }
    }
    for (const component of this.#components()) component?.UpdateCurveSet?.(name, time, renderContext);
  }

  /**
   * Longest duration of the named curve set across this stretch and its
   * children; 0 while hidden.
   */
  GetCurveSetDuration(name)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) duration = Math.max(duration, getCurveDuration(curveSet));
    for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetCurveSetDuration?.(name) ?? 0));
    return duration;
  }

  /**
   * Longest duration of a named time range within the named curve set, across
   * this stretch and its children; 0 while hidden.
   */
  GetRangeDuration(name, rangeName)
  {
    if (!this.display) return 0;
    let duration = 0;
    for (const curveSet of this.curveSets) if ((curveSet?.GetName() ?? curveSet?.name) === name) duration = Math.max(duration, Number(curveSet?.GetRangeDuration(rangeName) ?? 0));
    for (const component of this.#components()) duration = Math.max(duration, Number(component?.GetRangeDuration?.(name, rangeName) ?? 0));
    return duration;
  }

  /**
   * First emitter with the given name from the audio object, falling back to the
   * stretch audio, or null when neither has one.
   */
  FindSoundEmitter(name)
  {
    if (this.audio)
    {
      return this.audio.FindEmitterByName(name);
    }
    if (this.stretchAudio)
    {
      return this.stretchAudio.FindEmitterByName(name);
    }
    return null;
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
      this.sourceObject?.Register(registry);
      this.destObject?.Register(registry);
      this.stretchObject?.Register(registry);
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
      this.sourceObject?.UnRegister(registry);
      this.destObject?.UnRegister(registry);
      this.stretchObject?.UnRegister(registry);
    }
  }

  /**
   * The non-null children in Carbon's RunOnComponents order: source,
   * destination, stretch, then the travelling child.
   */
  #components()
  {
    return [this.sourceObject, this.destObject, this.stretchObject, this.moveObject].filter(Boolean);
  }

  /**
   * Takes ownership of every dynamic binding and links it, so the bindings
   * resolve against this stretch's roots.
   */
  #InitializeBindings()
  {
    for (const binding of this.dynamicBindings)
    {
      binding?.SetOwner(this);
      binding?.Link();
    }
  }

  /**
   * A fresh child-update parameter block carrying this stretch's visibility;
   * each call site fills in the parent object and the world placement.
   */
  #makeParams()
  {
    const params = new EveChildUpdateParams();
    params.isVisible = this.display;
    return params;
  }

  static StretchState = StretchState;
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
