// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { carbon, impl, edit, type } from "#schema";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { getCurveDuration, getOriginShift, getTime, makeEndpointTransforms, updateCurveSet } from "./CjsStretchRuntime.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { ITr2GenericEmitterUpdateArguments } from "../../../particle/ITr2GenericEmitter/index.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { Tr2ProceduralBuffer } from "../../../core/Tr2ProceduralBuffer.js";
import { SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { Tr2VertexUsageCode } from "../../../core/vertex/usageCode.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";

/**
 * Carbon GetEveStretch2Quads (EveStretch2.cpp:51-72): MAX_QUAD_COUNT quads of
 * four vertices, each (quadIndex, cornerIndex) as two floats, in the shared
 * geometry buffer. The shader places every corner from these and the
 * per-object source/destination.
 */
function GetEveStretch2Quads(renderContext)
{
  const count = 128;
  const data = new Float32Array(count * 4 * 2);
  for (let quad = 0; quad < count; quad++)
  {
    for (let corner = 0; corner < 4; corner++)
    {
      data[(quad * 4 + corner) * 2] = quad;
      data[(quad * 4 + corner) * 2 + 1] = corner;
    }
  }
  return SharedGeometryBuffer(renderContext).Allocate(8, count * 4, data, renderContext);
}

/** Carbon OnPrepareResources' declaration (cpp:380-383): one FLOAT32_2 POSITION. */
const STRETCH_VERTEX_DECL = [ { usage: Tr2VertexUsageCode.POSITION, usageIndex: 0, type: "FLOAT32_2", offset: 0 } ];


/**
 * A simplified stretch that renders the span between two points as a strip of
 * quads with its own effect, end emitters, observers and point lights, instead
 * of hosting child objects.
 */
@type.define({ className: "EveStretch2", family: "eve/renderable/stretch" })
@carbon.inherit(ITr2Renderable)
@carbon.mapInterface(EveEntity)
export class EveStretch2 extends IEveFiringEffectElement
{
  static MAX_QUAD_COUNT = 128;

  @edit.readwrite
  @edit.persist
 @type.string name = "";
  @edit.readwrite
  @edit.persist
 @type.model("TriCurveSet") loop = null;
  @edit.readwrite
  @edit.persist
 @type.model("TriCurveSet") start = null;
  @edit.readwrite
  @edit.persist
 @type.model("TriCurveSet") end = null;
  @edit.readwrite
  @edit.persist
 @type.model("Tr2Effect") effect = null;
  @edit.readwrite
  @edit.persist
 @type.model("Tr2GpuSharedEmitter") destinationEmitter = null;
  @edit.readwrite
  @edit.persist
 @type.model("Tr2GpuSharedEmitter") sourceEmitter = null;
  @edit.notify
  @edit.readwrite
  @edit.persist
 @type.uint32 quadCount = 0;
  @edit.readwrite
  @edit.persist
 @type.model("TriObserverLocal") destinationObserver = null;
  @edit.readwrite
  @edit.persist
 @type.model("TriObserverLocal") sourceObserver = null;
  @edit.readwrite
  @edit.persist
 @type.model("Tr2PointLight") destinationLight = null;
  @edit.readwrite
  @edit.persist
 @type.model("Tr2PointLight") sourceLight = null;
  @edit.readwrite
  @edit.persist
 @type.float32 boundingRadius = 100;

  _source = vec3.create();
  _destination = vec3.create();
  _sourceTransform = mat4.create();
  _destinationTransform = mat4.create();
  _destinationScale = 1;
  _currentDestinationScale = 1;
  _visible = true;
  _inFrustum = true;
  _startTime = 0;
  _intensity = 1;
  _effectData = [vec4.fromValues(0, 0, 0, Math.random()), vec4.fromValues(1, 0, 0, 0)];

  /** m_vb (Tr2ProceduralBuffer "EveStretch2VB"): the shared quad vertices (cpp:90). */
  _vb = new Tr2ProceduralBuffer("EveStretch2VB", GetEveStretch2Quads);

  /** m_vertexDeclHandle (cpp:84), set by OnPrepareResources. */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /**
   * A Tr2DeviceResource (EveStretch2.h:28): registered with the device so a
   * stretch built before the device is prepared once it exists.
   */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /**
   * Carbon Initialize (cpp:96-100): prepares the device half. Adapted: Carbon
   * asserts an authored quadCount over 128 (cpp:105); this throws.
   */
  @carbon.method @impl.adapted
  Initialize()
  {
    if (this.quadCount > EveStretch2.MAX_QUAD_COUNT)
    {
      throw new RangeError(`EveStretch2.quadCount must be <= ${EveStretch2.MAX_QUAD_COUNT}`);
    }
    this.PrepareResources();
    return true;
  }

  /** Carbon OnModified (cpp:102-111): a new quad count re-prepares; over 128 throws (Carbon asserts). */
  @carbon.method @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "quadCount")
    {
      if (this.quadCount > EveStretch2.MAX_QUAD_COUNT)
      {
        throw new RangeError(`EveStretch2.quadCount must be <= ${EveStretch2.MAX_QUAD_COUNT}`);
      }
      this.ReleaseResources();
      this.PrepareResources();
    }
    return true;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: prepare when a device allows it. */
  @carbon.method @impl.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon ReleaseResources (cpp:371-374): forgets the declaration. */
  @carbon.method @impl.implemented
  ReleaseResources(_storage = null)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /**
   * Carbon OnPrepareResources (cpp:376-386): the FLOAT32_2 POSITION
   * declaration, and the quad-list index buffer reserved for quadCount.
   */
  @carbon.method @impl.implemented
  OnPrepareResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(STRETCH_VERTEX_DECL);
    Tr2Renderer.ReserveQuadListIndexBuffer(this.quadCount);
    return true;
  }

  /**
   * Sets the destination-end scale and adopts it as the current one, undoing any
   * hidden-destination override left by DisplayEndPoints.
   */
  @carbon.method @impl.implemented
  SetDestObjectScale(scale)
  {
    this._destinationScale = this._currentDestinationScale = Number(scale);
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
    this._effectData[0][3] = Math.random();
    this.start?.PlayFrom(-delay);
    this.loop?.PlayFrom(-delay);
    this.end?.Stop();
  }

  /** Ends a shot: stops the start and loop sets and plays the end set. */
  @carbon.method @impl.implemented
  StopFiring()
  {
    this.start?.Stop();
    this.loop?.Stop();
    this.end?.Play();
  }

  /**
   * Sets both endpoints, accepting either a 16-element source transform - of
   * which only the translation is kept, since the span orientation is rebuilt
   * each update - or a source position.
   */
  @carbon.method @impl.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) mat4.getTranslation(this._source, source);
    else vec3.copy(this._source, source);
    vec3.copy(this._destination, destination);
  }

  /**
   * Hides the destination end by zeroing its current scale; the source end is
   * always drawn, so the source flag is ignored.
   */
  @carbon.method @impl.implemented
  DisplayEndPoints(_displaySource, displayDestination)
  {
    this._currentDestinationScale = displayDestination ? this._destinationScale : 0;
  }

  /**
   * Shows or hides the stretch, gating visibility, renderable collection and
   * light contribution.
   */
  @carbon.method @impl.implemented
  SetDisplay(display)
  {
    this._visible = !!display;
  }

  /**
   * Sets the intensity uploaded in per-object data, clamped to zero at the
   * bottom; a zero intensity also suppresses visibility, renderables and lights.
   */
  @carbon.method @impl.implemented
  SetIntensity(intensity)
  {
    this._intensity = Math.max(0, Number(intensity));
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
  @impl.reason("Generic emitters receive the nominal JavaScript mirror of Carbon's UpdateArguments structure.")
  Update(context)
  {
    const time = getTime(context);
    if (this._startTime === 0) this._startTime = time;
    const relative = time - this._startTime;
    const sets = [this.start, this.loop, this.end];
    for (let index = 0; index < sets.length; index++)
    {
      updateCurveSet(sets[index], relative, context.renderContext);
      this._effectData[0][index] = Number(sets[index]?.GetScaledTime?.() ?? sets[index]?.scaledTime ?? 0);
    }
    makeEndpointTransforms(this._source, this._destination, this._sourceTransform, this._destinationTransform);
    this.sourceObserver?.Update(this._sourceTransform);
    this.destinationObserver?.Update(this._destinationTransform);
    const gpuParticleSystem = context?.GetGpuParticleSystem?.() ?? context?.gpuParticleSystem ?? null;
    const originShift = getOriginShift(context);
    if (this.sourceEmitter)
    {
      const argumentsValue = EveStretch2._sourceEmitterArguments;
      argumentsValue.time = time;
      argumentsValue.system = gpuParticleSystem;
      mat4.copy(argumentsValue.parentTransform, this._sourceTransform);
      vec3.copy(argumentsValue.originShift, originShift);
      argumentsValue.emitCountFactor = 1;
      this.sourceEmitter.Update(argumentsValue);
    }
    if (this.destinationEmitter)
    {
      const argumentsValue = EveStretch2._destinationEmitterArguments;
      argumentsValue.time = time;
      argumentsValue.system = gpuParticleSystem;
      mat4.copy(argumentsValue.parentTransform, this._destinationTransform);
      vec3.copy(argumentsValue.originShift, originShift);
      argumentsValue.emitCountFactor = 1;
      this.destinationEmitter.Update(argumentsValue);
    }
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
    if (!(this._visible && this._intensity > 0))
    {
      this._inFrustum = false;
      return false;
    }
    const frustum = context?.GetFrustum?.() ?? context?.frustum;
    const bounds = {
      min: vec3.fromValues(-this.boundingRadius, -this.boundingRadius, -this.boundingRadius),
      max: vec3.fromValues(this.boundingRadius, this.boundingRadius, vec3.distance(this._source, this._destination) + this.boundingRadius),
      transform: this._sourceTransform
    };
    this._inFrustum = frustum?.IsBoxVisible ? !!frustum.IsBoxVisible(bounds) : true;
    return this._inFrustum;
  }

  /**
   * Pushes the stretch itself when displayed, non-zero intensity and in frustum; the quad strip is built by the engine from the per-object data, not here.
   * @returns {Array} out
   */
  @carbon.method @impl.adapted
  @impl.reason("The class is collected as a renderable; GPU batch realization is not ported yet.")
  GetRenderables(out = [])
  {
    if (this._visible && this._intensity > 0 && this._inFrustum) out.push(this);
    return out;
  }

  /** Carbon EveStretch2::GetPerObjectData (cpp:327-337): stamps
   * m_effectData[1].x = m_intensity, then uploads the contiguous member run
   * m_source..m_effectData[2] (EveStretch2.h:105-109) - 4 vec4s - to BOTH
   * per-object slots (cpp:23-39). One payload, stages ["vs", "ps"]. */
  @carbon.method @impl.implemented
  GetPerObjectData(accumulator)
  {
    this._effectData[1][0] = this._intensity;

    const data = accumulator.Alloc("EveStretch2PerObjectData");

    data.Set("sourceData", [
      this._source[0], this._source[1], this._source[2], this._currentDestinationScale
    ]);
    data.Set("destinationData", [
      this._destination[0], this._destination[1], this._destination[2], this._destinationScale
    ]);
    data.SetIndex("effectData", 0, this._effectData[0]);
    data.SetIndex("effectData", 1, this._effectData[1]);

    return data;
  }

  /**
   * Carbon GetBatches (cpp:339-360): one additive batch over the shared quad
   * vertices and the renderer's quad-list index buffer, 6 indices a quad,
   * based at the allocation's first vertex.
   * @returns {Boolean} whether the batch was committed
   */
  @carbon.method @impl.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    const vb = this._vb.GetSharedResource();
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE || !this.effect || !vb?.IsValid())
    {
      return false;
    }

    const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indexBuffer.IsValid()) return false;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetVertexDeclaration(this._vertexDeclHandle);
    batch.SetStreamSource(0, vb.GetBuffer(), vb.GetStride());
    batch.SetIndices(indexBuffer.GetBuffer(), indexBuffer.GetStride());
    batch.SetDrawIndexedInstanced(6 * this.quadCount, 1, indexBuffer.GetStartIndex(), vb.GetOffset() / vb.GetStride(), 0);
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
    if (!(this._visible && this._intensity > 0)) return;
    this.sourceLight?.AddLight(lightManager, this._sourceTransform, 1);
    this.destinationLight?.AddLight(lightManager, this._destinationTransform, this._currentDestinationScale);
  }

  /** Carbon EveStretch2::RegisterComponents (cpp:389-398): LightOwner leaf
   * self-registration. Gate (m_visible && m_intensity > 0) && a source or
   * destination light. */
  @carbon.method @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    const isActive = this._visible && this._intensity > 0;
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
    return vec3.copy(out, this._source);
  }

  /**
   * Copies the destination endpoint position.
   * @param {Array} [out] - caller-owned vec3; a fresh vector is allocated when omitted
   * @returns {Array} out
   */
  GetDestinationPosition(out = vec3.create())
  {
    return vec3.copy(out, this._destination);
  }

  /**
   * Copies the source endpoint basis, which is only valid once Update has run.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  GetSourceTransform(out = mat4.create())
  {
    return mat4.copy(out, this._sourceTransform);
  }

  /**
   * Copies the destination endpoint basis, which is only valid once Update has run.
   * @param {Array} [out] - caller-owned mat4; a fresh matrix is allocated when omitted
   * @returns {Array} out
   */
  GetDestinationTransform(out = mat4.create())
  {
    return mat4.copy(out, this._destinationTransform);
  }

  /** Deferred descriptor for Carbon's MAX_QUAD_COUNT float2 vertex buffer. */

  static _sourceEmitterArguments = new ITr2GenericEmitterUpdateArguments();

  static _destinationEmitterArguments = new ITr2GenericEmitterUpdateArguments();
}
