// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch.cpp
import "#consts/trinity";
import { Tr2Lod } from "#consts/trinity";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { IEveTransform } from "../../IEveTransform.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { INotify, IsMatch } from "#blue";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { TriFloat } from "../../../core/variable/TriFloat.js";
import {
  collectRenderables,
  getCurveDuration,
  getDeltaTime,
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
 * An effect drawn between a source point and a destination point, hosting
 * transform children pinned at each end, stretched along the span, and
 * travelling from one end to the other.
 */
@meta.define({ className: "EveStretch", family: "eve/renderable/stretch" })
@meta.blue.inherit(IEveSpaceObject2, IEveTransform)
@meta.blue.mapInterface(INotify)
export class EveStretch extends IEveFiringEffectElement
{

  /** Carbon EveStretch.cpp:43: display controls component registry membership. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "display")) this.ReRegister();
    return true;
  }

  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.string name = "";
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriVectorFunction") source = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriVectorFunction") dest = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("IStretchAudio") stretchAudio = null;
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lodLevel = 0;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriScalarFunction") progressCurve = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("TriCurveSet") moveCompletion = null;
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("TriCurveSet") curveSets = [];
  @meta.blue.read
  @meta.blue.persist
 @meta.type.model("TriFloat") length = new TriFloat();
  @meta.blue.readwrite @meta.type.boolean moving = false;
  @meta.blue.readwrite @meta.type.boolean moveCompleted = false;
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean display = true;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean update = true;
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("Tr2Light") destLights = [];
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("Tr2Light") sourceLights = [];
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") destObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") sourceObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") stretchObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean useCurveLod = true;
  @meta.blue.read @meta.type.float64 startTime = -1;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITr2Audio") audio = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") moveObject = null;

  _sourcePosition = vec3.create();
  _destinationPosition = vec3.create();
  _sourceTransform = mat4.create();
  _destinationTransform = mat4.create();
  _useTransforms = false;
  _displaySource = true;
  _displayDestination = true;
  _sourceScale = 1;
  _destinationScale = 1;
  _negativeZ = false;

  /**
   * Samples the source and destination position curves for the frame; with no
   * source curve the source position falls back to the translation of the
   * transform last given to SetSourceTransform. Skipped entirely while update is
   * false.
   */
  @meta.blue.method @meta.implemented
  UpdateSynchronous(context)
  {
    if (!this.update) return true;
    const time = getTime(context);
    if (this.source) sampleVector(this.source, time, this._sourcePosition);
    else if (this._useTransforms) mat4.getTranslation(this._sourcePosition, this._sourceTransform);
    if (this.dest) sampleVector(this.dest, time, this._destinationPosition);
    return true;
  }

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * Advances the curves, records the endpoint separation in length, forwards the
   * asynchronous phase to the displayed endpoint children plus the stretch and
   * move children, and feeds both audio objects the current endpoints.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Carbon splits synchronous and asynchronous work; the browser graph keeps both phases but executes child calls serially.")
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    this.UpdateCurves(context);
    this.length.value = vec3.distance(this._sourcePosition, this._destinationPosition);
    if (this._displaySource) updateChildAsync(this.sourceObject, context);
    if (this._displayDestination) updateChildAsync(this.destObject, context);
    updateChildAsync(this.stretchObject, context);
    updateChildAsync(this.moveObject, context);
    this.audio?.Update?.(this._sourcePosition, this._destinationPosition);
    if (this.stretchAudio)
    {
      this.stretchAudio.Update(this._sourcePosition, this._destinationPosition);
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
   * IEveFiringEffectElement synchronous hook; EveStretch does all of its firing
   * work in the asynchronous phase, so this only reports success.
   */
  UpdateEffectSync(context)
  {
    void context;
    return true;
  }

  /**
   * IEveFiringEffectElement asynchronous hook; runs both update phases through
   * Update.
   */
  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  /**
   * Runs both update phases in order, for callers that drive the stretch outside
   * the scene's split synchronous/asynchronous pass.
   */
  @meta.blue.method @meta.implemented
  Update(context)
  {
    this.UpdateSynchronous(context);
    this.UpdateAsynchronous(context);
    return true;
  }

  /**
   * Advances the curve sets, the progress curve and the move-completion set on
   * time measured from startTime, which is latched on the first frame after
   * StartMoving.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Curve LOD is renderer policy in Carbon; the runtime Trinity layer retains the authored gate and updates graph curves without device globals.")
  UpdateCurves(context)
  {
    const time = getTime(context);
    if (this.startTime < 0 && this.moving) this.startTime = time;
    const relative = this.startTime >= 0 ? time - this.startTime : time;
    for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative, context.renderContext);
    if (this.progressCurve)
    {
      if (typeof this.progressCurve.UpdateValue === "function") this.progressCurve.UpdateValue(relative);
      else this.progressCurve.Update?.(relative);
    }
    updateCurveSet(this.moveCompletion, relative, context.renderContext);
  }

  /**
   * Computes the source, destination, stretch and move placements for the frame
   * and hands each to its child; the stretch itself never draws, so nothing is
   * realized on the GPU here. In transform mode (SetSourceTransform) the
   * authored transforms are used, the source taking a fixed -90 degree X
   * correction and parentTransform being ignored; otherwise the bases are
   * derived from the sampled endpoints, scaled by the endpoint scales and
   * combined with parentTransform. Latches moveCompleted and hides the move
   * child once the progress curve reaches 1.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("The transforms are computed in Trinity, while child rendering is not ported yet.")
  UpdateVisibility(context, parentTransform = EveStretch._identity)
  {
    if (!this.display) return;
    const sourceTransform = EveStretch._sourceMatrix;
    const destinationTransform = EveStretch._destinationMatrix;
    if (this._useTransforms)
    {
      mat4.multiply(sourceTransform, this._sourceTransform, EveStretch._sourceCorrection);
      mat4.copy(destinationTransform, this._destinationTransform);
      destinationTransform[0] *= this._destinationScale;
      destinationTransform[1] *= this._destinationScale;
      destinationTransform[2] *= this._destinationScale;
      destinationTransform[4] *= this._destinationScale;
      destinationTransform[5] *= this._destinationScale;
      destinationTransform[6] *= this._destinationScale;
      destinationTransform[8] *= this._destinationScale;
      destinationTransform[9] *= this._destinationScale;
      destinationTransform[10] *= this._destinationScale;
    }
    else
    {
      makeEndpointTransforms(this._sourcePosition, this._destinationPosition, sourceTransform, destinationTransform);
      for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10])
      {
        sourceTransform[index] *= this._sourceScale;
        destinationTransform[index] *= this._destinationScale;
      }
      if (parentTransform?.length === 16)
      {
        mat4.multiply(sourceTransform, parentTransform, sourceTransform);
        mat4.multiply(destinationTransform, parentTransform, destinationTransform);
      }
    }

    if (this._displaySource) updateChildVisibility(this.sourceObject, context, sourceTransform);
    if (this._displayDestination) updateChildVisibility(this.destObject, context, destinationTransform);

    const stretchTransform = EveStretch._stretchMatrix;
    if (this._useTransforms)
    {
      mat4.copy(stretchTransform, this._sourceTransform);
      const stretchLength = this.length.value * (this._negativeZ ? -1 : 1);
      stretchTransform[8] *= stretchLength;
      stretchTransform[9] *= stretchLength;
      stretchTransform[10] *= stretchLength;
    }
    else
    {
      makeStretchTransform(this._sourcePosition, this._destinationPosition, stretchTransform, this._negativeZ);
      if (parentTransform?.length === 16) mat4.multiply(stretchTransform, parentTransform, stretchTransform);
    }
    updateChildVisibility(this.stretchObject, context, stretchTransform);

    if (this.moveObject)
    {
      const progression = Number(this.progressCurve?.value ?? this.progressCurve?.GetValue?.() ?? 0);
      vec3.lerp(EveStretch._movePosition, this._sourcePosition, this._destinationPosition, progression);
      updateChildVisibility(this.moveObject, context, translationMatrix(EveStretch._movePosition, EveStretch._moveMatrix));
      if (progression >= 1 && !this.moveCompleted)
      {
        this.moveCompleted = true;
        this.moveObject.SetDisplay?.(false);
        this.moveCompletion?.Play?.();
      }
    }
  }

  /**
   * Appends the displayed children's renderables to out; this package stops at collection, and runtime-engine turns the collected objects into draw batches.
   * @returns {Array} out
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Renderable collection is backend-neutral; runtime-engine turns the returned objects into draw batches.")
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this._displaySource) collectRenderables(this.sourceObject, out);
    if (this._displayDestination) collectRenderables(this.destObject, out);
    collectRenderables(this.stretchObject, out);
    collectRenderables(this.moveObject, out);
    return out;
  }

  /**
   * Restarts the travelling child from the source end: clears the latched start
   * time and the completion flag, re-shows the move child and fires the stretch
   * audio event.
   */
  @meta.blue.method @meta.implemented
  StartMoving()
  {
    this.startTime = -1;
    this.moving = true;
    this.moveCompleted = false;
    this.moveObject?.SetDisplay?.(true);
    if (typeof this.audio?.TriggerStretchEvent === "function") this.audio.TriggerStretchEvent();
    else this.audio?.SendEvent?.("wise:/msg_fx_play_stretch");
  }

  /** Starts the travelling child and plays the first curve set. */
  @meta.blue.method @meta.implemented
  Start()
  {
    this.StartMoving();
    this.curveSets[0]?.Play?.();
  }

  /**
   * Shows or hides the whole stretch, gating visibility, renderable collection
   * and light contribution.
   */
  @meta.blue.method @meta.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Pins the source endpoint to a plain position, which also switches the
   * stretch out of transform mode so the source orientation is derived from the
   * span again.
   */
  @meta.blue.method @meta.implemented
  SetSourcePosition(value)
  {
    this._useTransforms = false;
    vec3.copy(this._sourcePosition, value);
  }

  /**
   * Pins the destination endpoint and rebuilds its transform as a pure
   * translation.
   */
  @meta.blue.method @meta.implemented
  SetDestinationPosition(value)
  {
    vec3.copy(this._destinationPosition, value);
    translationMatrix(value, this._destinationTransform);
  }

  /**
   * Pins the source endpoint from a full transform and switches the stretch into
   * transform mode, so UpdateVisibility uses the supplied orientation instead of
   * deriving one from the two endpoints.
   */
  @meta.blue.method @meta.implemented
  SetSourceTransform(value)
  {
    this._useTransforms = true;
    mat4.copy(this._sourceTransform, value);
    mat4.getTranslation(this._sourcePosition, value);
  }

  /**
   * Pins the destination endpoint from a full transform and takes its position
   * from that transform's translation.
   */
  @meta.blue.method @meta.implemented
  SetDestinationTransform(value)
  {
    mat4.copy(this._destinationTransform, value);
    mat4.getTranslation(this._destinationPosition, value);
  }

  /**
   * Reverses the direction the stretch child is scaled along, for effects
   * authored pointing down -Z.
   */
  @meta.blue.method @meta.implemented
  SetIsNegZForward(value)
  {
    this._negativeZ = !!value;
  }

  /**
   * Longest curve-set duration in seconds, each divided by that set's own time
   * scale.
   */
  @meta.blue.method @meta.implemented
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
   * Begins a firing cycle by curve-set name convention: play_start and play_loop are played from -delay, play_end is stopped, and the audio outburst/impact/stretch events are triggered. Starting play_start also restarts the travelling child.
   * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
   */
  @meta.blue.method @meta.implemented
  StartFiring(delay = 0)
  {
    for (const curveSet of this.curveSets)
    {
      const name = curveSet?.GetName() ?? curveSet?.name;
      if (name === "play_start")
      {
        curveSet.PlayFrom?.(-delay);
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.PlayFrom?.(-delay);
      else if (name === "play_end") curveSet.Stop();
    }
    if (this.stretchAudio)
    {
      this.stretchAudio.Start();
    }
    this.audio?.TriggerOutburstEvent?.();
    this.audio?.TriggerImpactEvent?.();
    this.audio?.TriggerStretchEvent?.();
  }

  /**
   * Ends a firing cycle: play_start and play_loop stop, play_end plays, the
   * travelling child restarts and the stretch audio stops.
   */
  @meta.blue.method @meta.implemented
  StopFiring()
  {
    for (const curveSet of this.curveSets)
    {
      const name = curveSet?.GetName() ?? curveSet?.name;
      if (name === "play_start")
      {
        curveSet.Stop();
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.Stop();
      else if (name === "play_end") curveSet.Play();
    }
    if (this.stretchAudio)
    {
      this.stretchAudio.Stop();
    }
  }

  /**
   * Sets both endpoints from a firing call, accepting either a 16-element source
   * transform or a source position, and marks the stretch as -Z forward.
   */
  @meta.blue.method @meta.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) this.SetSourceTransform(source);
    else this.SetSourcePosition(source);
    this.SetDestinationPosition(destination);
    this.SetIsNegZForward(true);
  }

  /**
   * Selects which endpoint children take part in updates, visibility, renderable
   * collection and light contribution.
   */
  @meta.blue.method @meta.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this._displaySource = !!displaySource;
    this._displayDestination = !!displayDestination;
  }

  /**
   * Uniform scale applied to the source endpoint child's basis and to its light
   * placement.
   */
  @meta.blue.method @meta.implemented
  SetSourceObjectScale(scale)
  {
    this._sourceScale = Number(scale);
  }

  /**
   * Uniform scale applied to the destination endpoint child's basis and to its
   * light placement.
   */
  @meta.blue.method @meta.implemented
  SetDestObjectScale(scale)
  {
    this._destinationScale = Number(scale);
  }

  /**
   * IEveFiringEffectElement intensity hook; EveStretch has no intensity term of
   * its own.
   */
  @meta.blue.method @meta.noop
  SetIntensity(_intensity)
  {
  }

  /**
   * Merges the bounding spheres of the source, destination and stretch children; the travelling child is not included.
   * @param {Array} out - caller-owned packed (x, y, z, radius), overwritten
   * @returns {Boolean} whether any child contributed a sphere
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Bounds are merged from graph children without Carbon's native BoundingSphere helper.")
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, 0, 0, 0, 0);
    for (const child of [this.sourceObject, this.destObject, this.stretchObject])
    {
      if (typeof child?.GetBoundingSphere === "function" && child.GetBoundingSphere(EveStretch._sphere) !== false)
      {
        mergeSphere(out, EveStretch._sphere);
      }
    }
    return out[3] > 0;
  }

  /**
   * Offers the source and destination lights to the light manager at their
   * endpoint positions, each scaled by its endpoint scale; a hidden stretch or a
   * hidden endpoint contributes nothing.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Light ownership is forwarded to browser light objects; device light-manager registration stays outside Trinity.")
  GetLights(lightManager)
  {
    if (!this.display) return;
    const source = translationMatrix(this._sourcePosition, EveStretch._lightSource, this._sourceScale);
    const destination = translationMatrix(this._destinationPosition, EveStretch._lightDestination, this._destinationScale);
    if (this._displaySource) for (const light of this.sourceLights) light?.AddLight(lightManager, source, this._sourceScale);
    if (this._displayDestination) for (const light of this.destLights) light?.AddLight(lightManager, destination, this._destinationScale);
  }

  /** Carbon EveStretch::RegisterComponents (cpp:606-613): LightOwner leaf
   * self-registration. Gate m_display. */
  @meta.blue.method @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  static Tr2Lod = Tr2Lod;
  static _identity = mat4.create();
  static _sourceMatrix = mat4.create();
  static _destinationMatrix = mat4.create();
  static _stretchMatrix = mat4.create();
  static _moveMatrix = mat4.create();
  static _movePosition = vec3.create();
  static _sphere = vec4.create();
  static _lightSource = mat4.create();
  static _lightDestination = mat4.create();
  static _sourceCorrection = mat4.fromXRotation(mat4.create(), -Math.PI * 0.5);
}
