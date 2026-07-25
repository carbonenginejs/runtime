// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { TriFloat } from "../../../trinityCore/TriFloat.js";
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


@type.define({ className: "EveStretch", family: "eve/renderable/stretch" })
export class EveStretch extends EveEntity
{
  @io.persist @type.string name = "";
  @io.persist @type.model("ITriVectorFunction") source = null;
  @io.persist @type.model("ITriVectorFunction") dest = null;
  @io.persist @type.model("IStretchAudio") stretchAudio = null;
  @io.read @type.int32 @schema.enum("Tr2Lod") lodLevel = 0;
  @io.persist @type.model("ITriScalarFunction") progressCurve = null;
  @io.persist @type.model("TriCurveSet") moveCompletion = null;
  @io.persist @type.list("TriCurveSet") curveSets = [];
  @io.persist @type.model("TriFloat") length = new TriFloat();
  @io.readwrite @type.boolean moving = false;
  @io.readwrite @type.boolean moveCompleted = false;
  @io.notify @io.persist @type.boolean display = true;
  @io.persist @type.boolean update = true;
  @io.persist @type.list("Tr2Light") destLights = [];
  @io.persist @type.list("Tr2Light") sourceLights = [];
  @io.persist @type.model("EveTransform") destObject = null;
  @io.persist @type.model("EveTransform") sourceObject = null;
  @io.persist @type.model("EveTransform") stretchObject = null;
  @io.persist @type.boolean useCurveLod = true;
  @io.read @type.float64 startTime = -1;
  @io.persist @type.model("ITr2Audio") audio = null;
  @io.persist @type.model("EveTransform") moveObject = null;

  #sourcePosition = vec3.create();
  #destinationPosition = vec3.create();
  #sourceTransform = mat4.create();
  #destinationTransform = mat4.create();
  #useTransforms = false;
  #displaySource = true;
  #displayDestination = true;
  #sourceScale = 1;
  #destinationScale = 1;
  #negativeZ = false;

  @carbon.method @impl.implemented
  UpdateSynchronous(context)
  {
    if (!this.update) return true;
    const time = getTime(context);
    if (this.source) sampleVector(this.source, time, this.#sourcePosition);
    else if (this.#useTransforms) mat4.getTranslation(this.#sourcePosition, this.#sourceTransform);
    if (this.dest) sampleVector(this.dest, time, this.#destinationPosition);
    return true;
  }

  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  @carbon.method @impl.adapted
  @impl.reason("Carbon splits synchronous and asynchronous work; the browser graph keeps both phases but executes child calls serially.")
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    this.UpdateCurves(context);
    this.length.value = vec3.distance(this.#sourcePosition, this.#destinationPosition);
    if (this.#displaySource) updateChildAsync(this.sourceObject, context);
    if (this.#displayDestination) updateChildAsync(this.destObject, context);
    updateChildAsync(this.stretchObject, context);
    updateChildAsync(this.moveObject, context);
    this.audio?.Update?.(this.#sourcePosition, this.#destinationPosition);
    this.stretchAudio?.Update?.(this.#sourcePosition, this.#destinationPosition);
    return true;
  }

  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  UpdateEffectSync(context)
  {
    void context;
    return true;
  }

  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  @carbon.method @impl.implemented
  Update(context)
  {
    this.UpdateSynchronous(context);
    this.UpdateAsynchronous(context);
    return true;
  }

  @carbon.method @impl.adapted
  @impl.reason("Curve LOD is renderer policy in Carbon; runtime-trinity retains the authored gate and updates graph curves without device globals.")
  UpdateCurves(context)
  {
    const time = getTime(context);
    if (this.startTime < 0 && this.moving) this.startTime = time;
    const relative = this.startTime >= 0 ? time - this.startTime : time;
    for (const curveSet of this.curveSets) updateCurveSet(curveSet, relative);
    if (this.progressCurve)
    {
      if (typeof this.progressCurve.UpdateValue === "function") this.progressCurve.UpdateValue(relative);
      else this.progressCurve.Update?.(relative);
    }
    updateCurveSet(this.moveCompletion, relative);
  }

  @carbon.method @impl.adapted
  @impl.reason("The transforms are computed in Trinity, while child render realization remains backend-owned.")
  UpdateVisibility(context, parentTransform = EveStretch.#identity)
  {
    if (!this.display) return;
    const sourceTransform = EveStretch.#sourceMatrix;
    const destinationTransform = EveStretch.#destinationMatrix;
    if (this.#useTransforms)
    {
      mat4.multiply(sourceTransform, this.#sourceTransform, EveStretch.#sourceCorrection);
      mat4.copy(destinationTransform, this.#destinationTransform);
      destinationTransform[0] *= this.#destinationScale;
      destinationTransform[1] *= this.#destinationScale;
      destinationTransform[2] *= this.#destinationScale;
      destinationTransform[4] *= this.#destinationScale;
      destinationTransform[5] *= this.#destinationScale;
      destinationTransform[6] *= this.#destinationScale;
      destinationTransform[8] *= this.#destinationScale;
      destinationTransform[9] *= this.#destinationScale;
      destinationTransform[10] *= this.#destinationScale;
    }
    else
    {
      makeEndpointTransforms(this.#sourcePosition, this.#destinationPosition, sourceTransform, destinationTransform);
      for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10])
      {
        sourceTransform[index] *= this.#sourceScale;
        destinationTransform[index] *= this.#destinationScale;
      }
      if (parentTransform?.length === 16)
      {
        mat4.multiply(sourceTransform, parentTransform, sourceTransform);
        mat4.multiply(destinationTransform, parentTransform, destinationTransform);
      }
    }

    if (this.#displaySource) updateChildVisibility(this.sourceObject, context, sourceTransform);
    if (this.#displayDestination) updateChildVisibility(this.destObject, context, destinationTransform);

    const stretchTransform = EveStretch.#stretchMatrix;
    if (this.#useTransforms)
    {
      mat4.copy(stretchTransform, this.#sourceTransform);
      const stretchLength = this.length.value * (this.#negativeZ ? -1 : 1);
      stretchTransform[8] *= stretchLength;
      stretchTransform[9] *= stretchLength;
      stretchTransform[10] *= stretchLength;
    }
    else
    {
      makeStretchTransform(this.#sourcePosition, this.#destinationPosition, stretchTransform, this.#negativeZ);
      if (parentTransform?.length === 16) mat4.multiply(stretchTransform, parentTransform, stretchTransform);
    }
    updateChildVisibility(this.stretchObject, context, stretchTransform);

    if (this.moveObject)
    {
      const progression = Number(this.progressCurve?.value ?? this.progressCurve?.GetValue?.() ?? 0);
      vec3.lerp(EveStretch.#movePosition, this.#sourcePosition, this.#destinationPosition, progression);
      updateChildVisibility(this.moveObject, context, translationMatrix(EveStretch.#movePosition, EveStretch.#moveMatrix));
      if (progression >= 1 && !this.moveCompleted)
      {
        this.moveCompleted = true;
        this.moveObject.SetDisplay?.(false);
        this.moveCompletion?.Play?.();
      }
    }
  }

  @carbon.method @impl.adapted
  @impl.reason("Renderable collection is backend-neutral; runtime-engine turns the returned objects into draw batches.")
  GetRenderables(out = [])
  {
    if (!this.display) return out;
    if (this.#displaySource) collectRenderables(this.sourceObject, out);
    if (this.#displayDestination) collectRenderables(this.destObject, out);
    collectRenderables(this.stretchObject, out);
    collectRenderables(this.moveObject, out);
    return out;
  }

  @carbon.method @impl.implemented
  StartMoving()
  {
    this.startTime = -1;
    this.moving = true;
    this.moveCompleted = false;
    this.moveObject?.SetDisplay?.(true);
    if (typeof this.audio?.TriggerStretchEvent === "function") this.audio.TriggerStretchEvent();
    else this.audio?.SendEvent?.("wise:/msg_fx_play_stretch");
  }

  @carbon.method @impl.implemented
  Start()
  {
    this.StartMoving();
    this.curveSets[0]?.Play?.();
  }

  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  @carbon.method @impl.implemented
  SetSourcePosition(value)
  {
    this.#useTransforms = false;
    vec3.copy(this.#sourcePosition, value);
  }

  @carbon.method @impl.implemented
  SetDestinationPosition(value)
  {
    vec3.copy(this.#destinationPosition, value);
    translationMatrix(value, this.#destinationTransform);
  }

  @carbon.method @impl.implemented
  SetSourceTransform(value)
  {
    this.#useTransforms = true;
    mat4.copy(this.#sourceTransform, value);
    mat4.getTranslation(this.#sourcePosition, value);
  }

  @carbon.method @impl.implemented
  SetDestinationTransform(value)
  {
    mat4.copy(this.#destinationTransform, value);
    mat4.getTranslation(this.#destinationPosition, value);
  }

  @carbon.method @impl.implemented
  SetIsNegZForward(value)
  {
    this.#negativeZ = !!value;
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
    for (const curveSet of this.curveSets)
    {
      const name = curveSet?.GetName?.() ?? curveSet?.name;
      if (name === "play_start")
      {
        curveSet.PlayFrom?.(-delay);
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.PlayFrom?.(-delay);
      else if (name === "play_end") curveSet.Stop?.();
    }
    this.stretchAudio?.Start?.();
    this.audio?.TriggerOutburstEvent?.();
    this.audio?.TriggerImpactEvent?.();
    this.audio?.TriggerStretchEvent?.();
  }

  @carbon.method @impl.implemented
  StopFiring()
  {
    for (const curveSet of this.curveSets)
    {
      const name = curveSet?.GetName?.() ?? curveSet?.name;
      if (name === "play_start")
      {
        curveSet.Stop?.();
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.Stop?.();
      else if (name === "play_end") curveSet.Play?.();
    }
    this.stretchAudio?.Stop?.();
  }

  @carbon.method @impl.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) this.SetSourceTransform(source);
    else this.SetSourcePosition(source);
    this.SetDestinationPosition(destination);
    this.SetIsNegZForward(true);
  }

  @carbon.method @impl.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this.#displaySource = !!displaySource;
    this.#displayDestination = !!displayDestination;
  }

  @carbon.method @impl.implemented
  SetSourceObjectScale(scale)
  {
    this.#sourceScale = Number(scale);
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
  @impl.reason("Bounds are merged from graph children without Carbon's native BoundingSphere helper.")
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, 0, 0, 0, 0);
    for (const child of [this.sourceObject, this.destObject, this.stretchObject])
    {
      if (typeof child?.GetBoundingSphere === "function" && child.GetBoundingSphere(EveStretch.#sphere) !== false)
      {
        mergeSphere(out, EveStretch.#sphere);
      }
    }
    return out[3] > 0;
  }

  @carbon.method @impl.adapted
  @impl.reason("Light ownership is forwarded to browser light objects; device light-manager registration stays outside Trinity.")
  GetLights(lightManager)
  {
    if (!this.display) return;
    const source = translationMatrix(this.#sourcePosition, EveStretch.#lightSource, this.#sourceScale);
    const destination = translationMatrix(this.#destinationPosition, EveStretch.#lightDestination, this.#destinationScale);
    if (this.#displaySource) for (const light of this.sourceLights) light?.AddLight?.(lightManager, source, this.#sourceScale);
    if (this.#displayDestination) for (const light of this.destLights) light?.AddLight?.(lightManager, destination, this.#destinationScale);
  }

  /** Carbon EveStretch::RegisterComponents (cpp:606-613): LightOwner leaf
   * self-registration. Gate m_display. */
  @carbon.method @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  static Tr2Lod = Object.freeze({ TR2_LOD_UNSPECIFIED: -1, TR2_LOD_LOW: 0, TR2_LOD_MEDIUM: 1, TR2_LOD_HIGH: 2, TR2_LOD_ULTRA: 3, TR2_LOD_COUNT: 4 });
  static #identity = mat4.create();
  static #sourceMatrix = mat4.create();
  static #destinationMatrix = mat4.create();
  static #stretchMatrix = mat4.create();
  static #moveMatrix = mat4.create();
  static #movePosition = vec3.create();
  static #sphere = vec4.create();
  static #lightSource = mat4.create();
  static #lightDestination = mat4.create();
  static #sourceCorrection = mat4.fromXRotation(mat4.create(), -Math.PI * 0.5);
}
