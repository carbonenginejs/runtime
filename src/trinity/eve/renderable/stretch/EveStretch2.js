// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2QuadRenderer } from "../../../core/Tr2QuadRenderer.js";
import { Tr2RenderBatch } from "../../../core/batch/Tr2RenderBatch.js";
import { getCurveDuration, getOriginShift, getTime, makeEndpointTransforms, updateCurveSet } from "./CjsStretchRuntime.js";


/**
 * A simplified stretch that renders the span between two points as a strip of
 * quads with its own effect, end emitters, observers and point lights, instead
 * of hosting child objects.
 */
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

  /**
   * Post-hydration hook; validates the authored quad count. Carbon also builds
   * the procedural GPU buffers here, which is engine work in this port.
   */
  @carbon.method @impl.adapted
  @impl.reason("GPU buffer preparation belongs to runtime-engine; initialization validates the graph-owned quad count.")
  Initialize()
  {
    return this.OnModified();
  }

  /**
   * Re-validates quadCount against the 128-quad procedural geometry limit after
   * a model update and throws a RangeError when it is exceeded.
   */
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

  /**
   * Sets the destination-end scale and adopts it as the current one, undoing any
   * hidden-destination override left by DisplayEndPoints.
   */
  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this.#destinationScale = this.#currentDestinationScale = Number(scale);
  }

  /** IEveFiringEffectElement move hook; EveStretch2 has no travelling child. */
  @carbon.method @impl.noop
  StartMoving()
  {
  }

  /** Longer of the start and loop curve-set durations. */
  @carbon.method @impl.implemented
  GetCurveDuration()
  {
    return Math.max(getCurveDuration(this.start), getCurveDuration(this.loop));
  }

  /**
   * Begins a shot: reseeds the per-shot random value carried in the effect data, plays the start and loop sets from -delay and stops the end set.
   * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
   */
  @carbon.method @impl.adapted
  @impl.reason("Carbon uses rand(); the browser uses Math.random for the per-shot shader seed.")
  StartFiring(delay = 0)
  {
    this.#effectData[0][3] = Math.random();
    this.start?.PlayFrom?.(-delay);
    this.loop?.PlayFrom?.(-delay);
    this.end?.Stop?.();
  }

  /** Ends a shot: stops the start and loop sets and plays the end set. */
  @carbon.method @impl.implemented
  StopFiring()
  {
    this.start?.Stop?.();
    this.loop?.Stop?.();
    this.end?.Play?.();
  }

  /**
   * Sets both endpoints, accepting either a 16-element source transform - of
   * which only the translation is kept, since the span orientation is rebuilt
   * each update - or a source position.
   */
  @carbon.method @impl.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) mat4.getTranslation(this.#source, source);
    else vec3.copy(this.#source, source);
    vec3.copy(this.#destination, destination);
  }

  /**
   * Hides the destination end by zeroing its current scale; the source end is
   * always drawn, so the source flag is ignored.
   */
  @carbon.method @impl.implemented
  DisplayEndPoints(_displaySource, displayDestination)
  {
    this.#currentDestinationScale = displayDestination ? this.#destinationScale : 0;
  }

  /**
   * Shows or hides the stretch, gating visibility, renderable collection and
   * light contribution.
   */
  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this.#visible = !!display;
  }

  /**
   * Sets the intensity uploaded in per-object data, clamped to zero at the
   * bottom; a zero intensity also suppresses visibility, renderables and lights.
   */
  @carbon.method @impl.implemented
  SetIntensity(intensity)
  {
    this.#intensity = Math.max(0, Number(intensity));
  }

  /**
   * IEveFiringEffectElement synchronous hook; EveStretch2 does all of its work
   * in the asynchronous phase.
   */
  @carbon.method @impl.noop
  UpdateEffectSync(_context)
  {
    return true;
  }

  /** IEveFiringEffectElement asynchronous hook; runs Update. */
  @carbon.method @impl.implemented
  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  /**
   * Advances the start, loop and end curve sets on time measured from the first
   * update, records each set's scaled time into the effect data that
   * GetPerObjectData uploads, rebuilds the two endpoint bases, and drives the
   * end observers and GPU emitters from them.
   */
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
      updateCurveSet(sets[index], relative, context.renderContext);
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

  /**
   * Frustum-tests a box in the source basis that reaches boundingRadius sideways and the endpoint distance plus boundingRadius forwards, caching the result for GetRenderables; a hidden or zero-intensity stretch fails without testing, and a frustum that cannot test boxes passes.
   * @returns {Boolean} whether the stretch is in frustum
   */
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

  /**
   * Pushes the stretch itself when displayed, non-zero intensity and in frustum; the quad strip is built by the engine from the per-object data, not here.
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("The class is collected as a renderable; GPU batch realization remains runtime-engine work.")
  GetRenderables(out = [])
  {
    if (this.#visible && this.#intensity > 0 && this.#inFrustum) out.push(this);
    return out;
  }

  /** Carbon EveStretch2::GetPerObjectData (cpp:327-337): stamps
   * m_effectData[1].x = m_intensity, then uploads the contiguous member run
   * m_source..m_effectData[2] (EveStretch2.h:105-109) - 4 vec4s - to BOTH
   * per-object slots (cpp:23-39). One payload, stages ["vs", "ps"]. */
  @carbon.method @impl.implemented
  GetPerObjectData(accumulator)
  {
    this.#effectData[1][0] = this.#intensity;

    const data = accumulator.Alloc("EveStretch2PerObjectData");

    data.Set("sourceData", [
      this.#source[0], this.#source[1], this.#source[2], this.#currentDestinationScale
    ]);
    data.Set("destinationData", [
      this.#destination[0], this.#destination[1], this.#destination[2], this.#destinationScale
    ]);
    data.SetIndex("effectData", 0, this.#effectData[0]);
    data.SetIndex("effectData", 1, this.#effectData[1]);

    return data;
  }

  /**
   * Emits Carbon's additive procedural-quad batch. Trinity records the shared
   * vertex/index sources and draw arguments; the selected engine realizes the
   * buffers and vertex declaration.
   * @returns {Boolean} whether the batch was committed
   */
  @carbon.method @impl.adapted
  @impl.reason("GPU-free: records Carbon's procedural stretch vertices and shared quad indices for engine realization.")
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE || !this.effect || !this.quadCount)
    {
      return false;
    }

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetGeometry(0, EveStretch2.VertexSource, 8, Tr2QuadRenderer.QuadIndexSource, 2);
    batch.SetPerObjectData(perObjectData);
    batch.SetDrawIndexedInstanced(6 * this.quadCount, 1, 0, 0, 0);
    return batches.Commit(batch);
  }

  /** Carbon EveStretch2::HasTransparentBatches: the strip is additive. */
  @carbon.method @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveStretch2::GetSortValue: additive batches are unsorted. */
  @carbon.method @impl.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Offers the source and destination point lights at their endpoint bases, the
   * destination scaled by its current scale; nothing is offered while hidden or
   * at zero intensity.
   */
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

  /**
   * Copies the source endpoint position.
   * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  GetSourcePosition(out = vec3.create())
  {
    return vec3.copy(out, this.#source);
  }

  /**
   * Copies the destination endpoint position.
   * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  GetDestinationPosition(out = vec3.create())
  {
    return vec3.copy(out, this.#destination);
  }

  /**
   * Copies the source endpoint basis, which is only valid once Update has run.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  GetSourceTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#sourceTransform);
  }

  /**
   * Copies the destination endpoint basis, which is only valid once Update has run.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  GetDestinationTransform(out = mat4.create())
  {
    return mat4.copy(out, this.#destinationTransform);
  }

  /** Deferred descriptor for Carbon's MAX_QUAD_COUNT float2 vertex buffer. */
  static VertexSource = Object.freeze({ eveStretch2Buffer: "quad-vertices", maxQuadCount: EveStretch2.MAX_QUAD_COUNT });
}
