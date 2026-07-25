// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch2.h
// Source: E:\carbonengine\trinity\trinity\Eve\Renderable\Stretch\EveStretch2.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { getCurveDuration, getOriginShift, getTime, makeEndpointTransforms, updateCurveSet } from "./CjsStretchRuntime.js";


@type.define({ className: "EveStretch2", family: "eve/renderable/stretch" })
export class EveStretch2 extends EveEntity
{
  static MAX_QUAD_COUNT = 128;

  @io.persist @type.string name = "";
  @io.persist @type.model("TriCurveSet") loop = null;
  @io.persist @type.model("TriCurveSet") start = null;
  @io.persist @type.model("TriCurveSet") end = null;
  @io.persist @type.model("Tr2Effect") effect = null;
  @io.persist @type.model("Tr2GpuSharedEmitter") destinationEmitter = null;
  @io.persist @type.model("Tr2GpuSharedEmitter") sourceEmitter = null;
  @io.notify @io.persist @type.uint32 quadCount = 0;
  @io.persist @type.model("TriObserverLocal") destinationObserver = null;
  @io.persist @type.model("TriObserverLocal") sourceObserver = null;
  @io.persist @type.model("Tr2PointLight") destinationLight = null;
  @io.persist @type.model("Tr2PointLight") sourceLight = null;
  @io.persist @type.float32 boundingRadius = 100;

  #source = vec3.create();
  #destination = vec3.create();
  #sourceTransform = mat4.create();
  #destinationTransform = mat4.create();
  #destinationScale = 1;
  #currentDestinationScale = 1;
  #visible = true;
  #inFrustum = true;
  #startTime = 0;
  #intensity = 1;
  #effectData = [vec4.fromValues(0, 0, 0, Math.random()), vec4.fromValues(1, 0, 0, 0)];

  @carbon.method @impl.adapted
  @impl.reason("GPU buffer preparation belongs to runtime-engine; initialization validates the graph-owned quad count.")
  Initialize()
  {
    return this.OnModified();
  }

  @carbon.method @impl.adapted
  @impl.reason("Carbon rebuilds procedural GPU buffers here; runtime-trinity only enforces the authored 128-quad contract.")
  OnModified()
  {
    if (this.quadCount > EveStretch2.MAX_QUAD_COUNT)
    {
      throw new RangeError(`EveStretch2.quadCount must be <= ${EveStretch2.MAX_QUAD_COUNT}`);
    }
    return true;
  }

  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.#destinationScale = this.#currentDestinationScale = Number(scale);
  }

  @carbon.method @impl.noop
  StartMoving()
  {
  }

  @carbon.method @impl.implemented
  GetCurveDuration()
  {
    return Math.max(getCurveDuration(this.start), getCurveDuration(this.loop));
  }

  @carbon.method @impl.adapted
  @impl.reason("Carbon uses rand(); the browser uses Math.random for the per-shot shader seed.")
  StartFiring(delay = 0)
  {
    this.#effectData[0][3] = Math.random();
    this.start?.PlayFrom?.(-delay);
    this.loop?.PlayFrom?.(-delay);
    this.end?.Stop?.();
  }

  @carbon.method @impl.implemented
  StopFiring()
  {
    this.start?.Stop?.();
    this.loop?.Stop?.();
    this.end?.Play?.();
  }

  @carbon.method @impl.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) mat4.getTranslation(this.#source, source);
    else vec3.copy(this.#source, source);
    vec3.copy(this.#destination, destination);
  }

  @carbon.method @impl.implemented
  DisplayEndPoints(_displaySource, displayDestination)
  {
    this.#currentDestinationScale = displayDestination ? this.#destinationScale : 0;
  }

  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.#visible = !!display;
  }

  @carbon.method @impl.implemented
  SetIntensity(intensity)
  {
    this.#intensity = Math.max(0, Number(intensity));
  }

  @carbon.method @impl.noop
  UpdateEffectSync(_context)
  {
    return true;
  }

  @carbon.method @impl.implemented
  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  @carbon.method @impl.adapted
  @impl.reason("Generic emitters receive a plain update descriptor instead of Carbon's native UpdateArguments structure.")
  Update(context)
  {
    const time = getTime(context);
    if (this.#startTime === 0) this.#startTime = time;
    const relative = time - this.#startTime;
    const sets = [this.start, this.loop, this.end];
    for (let index = 0; index < sets.length; index++)
    {
      updateCurveSet(sets[index], relative);
      this.#effectData[0][index] = Number(sets[index]?.GetScaledTime?.() ?? sets[index]?.scaledTime ?? 0);
    }
    makeEndpointTransforms(this.#source, this.#destination, this.#sourceTransform, this.#destinationTransform);
    this.sourceObserver?.Update?.(this.#sourceTransform);
    this.destinationObserver?.Update?.(this.#destinationTransform);
    const gpuParticleSystem = context?.GetGpuParticleSystem?.() ?? context?.gpuParticleSystem ?? null;
    const originShift = getOriginShift(context);
    this.sourceEmitter?.Update?.({ time, gpuParticleSystem, transform: this.#sourceTransform, originShift });
    this.destinationEmitter?.Update?.({ time, gpuParticleSystem, transform: this.#destinationTransform, originShift });
    return true;
  }

  @carbon.method @impl.adapted
  @impl.reason("The browser frustum is duck-typed and receives a portable axis-aligned box descriptor.")
  UpdateVisibility(context)
  {
    if (!(this.#visible && this.#intensity > 0))
    {
      this.#inFrustum = false;
      return false;
    }
    const frustum = context?.GetFrustum?.() ?? context?.frustum;
    const bounds = {
      min: vec3.fromValues(-this.boundingRadius, -this.boundingRadius, -this.boundingRadius),
      max: vec3.fromValues(this.boundingRadius, this.boundingRadius, vec3.distance(this.#source, this.#destination) + this.boundingRadius),
      transform: this.#sourceTransform
    };
    this.#inFrustum = frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(bounds) : true;
    return this.#inFrustum;
  }

  @carbon.method @impl.adapted
  @impl.reason("The class is collected as a renderable; GPU batch realization remains runtime-engine work.")
  GetRenderables(out = [])
  {
    if (this.#visible && this.#intensity > 0 && this.#inFrustum) out.push(this);
    return out;
  }

  @carbon.method @impl.adapted
  @impl.reason("Returns portable constant data rather than allocating Carbon renderer constant buffers.")
  GetPerObjectData()
  {
    this.#effectData[1][0] = this.#intensity;
    return {
      source: vec3.clone(this.#source),
      currentDestinationScale: this.#currentDestinationScale,
      destination: vec3.clone(this.#destination),
      destinationScale: this.#destinationScale,
      effectData: this.#effectData.map(value => vec4.clone(value)),
      quadCount: this.quadCount,
      effect: this.effect
    };
  }

  @carbon.method @impl.adapted
  @impl.reason("Light objects are forwarded without registering against Carbon's native light manager component registry.")
  GetLights(lightManager)
  {
    if (!(this.#visible && this.#intensity > 0)) return;
    this.sourceLight?.AddLight?.(lightManager, this.#sourceTransform, 1);
    this.destinationLight?.AddLight?.(lightManager, this.#destinationTransform, this.#currentDestinationScale);
  }

  /** Carbon EveStretch2::RegisterComponents (cpp:389-398): LightOwner leaf
   * self-registration. Gate (m_visible && m_intensity > 0) && a source or
   * destination light. */
  @carbon.method @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    const isActive = this.#visible && this.#intensity > 0;
    const hasLights = this.sourceLight || this.destinationLight;
    if (registry && isActive && hasLights)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  GetSourcePosition(out = vec3.create())
  {
    return vec3.copy(out, this.#source);
  }

  GetDestinationPosition(out = vec3.create())
  {
    return vec3.copy(out, this.#destination);
  }

  GetSourceTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#sourceTransform);
  }

  GetDestinationTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#destinationTransform);
  }
}
