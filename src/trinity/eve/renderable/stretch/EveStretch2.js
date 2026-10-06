// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch2.cpp
import { IsMatch, CcpTime } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { box3 } from "#math/box3";
import { TriBatchType } from "#consts/graphics";
import { meta } from "#schema";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EntityComponents.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
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
@meta.define({ className: "EveStretch2", family: "eve/renderable/stretch" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IInitialize, INotify)
@meta.blue.interface(ITr2Renderable, IEveFiringEffectElement, IInitialize, INotify, EveEntity)
export class EveStretch2 extends IEveFiringEffectElement
{
  static MAX_QUAD_COUNT = 128;

  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.string
  name = "";
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("TriCurveSet")
  loop = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("TriCurveSet")
  start = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("TriCurveSet")
  end = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("Tr2Effect")
  effect = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("Tr2GpuSharedEmitter")
  destinationEmitter = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("Tr2GpuSharedEmitter")
  sourceEmitter = null;
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.uint32
  quadCount = 0;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("TriObserverLocal")
  destinationObserver = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("TriObserverLocal")
  sourceObserver = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("Tr2PointLight")
  destinationLight = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.rootRef("Tr2PointLight")
  sourceLight = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.float32
  boundingRadius = 100;

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
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.adapted
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "quadCount"))
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
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon ReleaseResources (cpp:371-374): forgets the declaration. */
  @meta.blue.method
  @meta.implemented
  ReleaseResources(_storage = null)
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /**
   * Carbon OnPrepareResources (cpp:376-386): the FLOAT32_2 POSITION
   * declaration, and the quad-list index buffer reserved for quadCount.
   */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  SetDestObjectScale(scale)
  {
    this._destinationScale = this._currentDestinationScale = Number(scale);
  }

  /** IEveFiringEffectElement move hook; EveStretch2 has no travelling child. */
  @meta.blue.method
  @meta.noop
  StartMoving()
  {
  }

  /** Longer of the start and loop curve-set durations. */
  @meta.blue.method
  @meta.implemented
  GetCurveDuration()
  {
    let duration = 0;
    if (this.start) duration = Math.max(duration, this.start.GetMaxCurveDuration());
    if (this.loop) duration = Math.max(duration, this.loop.GetMaxCurveDuration());
    return duration;
  }

  /**
   * Begins a shot: reseeds the per-shot random value carried in the effect data, plays the start and loop sets from -delay and stops the end set.
   *
   * Adapted: Carbon seeds with rand() / RAND_MAX (EveStretch2.cpp:137-152); the browser has no C runtime generator, so
   * the per-shot shader seed comes from Math.random.
   * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
   */
  @meta.blue.method
  @meta.adapted
  StartFiring(delay = 0)
  {
    this._effectData[0][3] = Math.random();
    this.start?.PlayFrom(-delay);
    this.loop?.PlayFrom(-delay);
    this.end?.Stop();
  }

  /** Ends a shot: stops the start and loop sets and plays the end set. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  DisplayEndPoints(_displaySource, displayDestination)
  {
    this._currentDestinationScale = displayDestination ? this._destinationScale : 0;
  }

  /**
   * Shows or hides the stretch, gating visibility, renderable collection and
   * light contribution; a change re-registers its components (EveStretch2.cpp:187-195).
   */
  @meta.blue.method
  @meta.implemented
  SetDisplay(display)
  {
    const previous = this._visible;
    this._visible = !!display;
    if (this._visible !== previous) this.ReRegister();
  }

  /**
   * Sets the intensity uploaded in per-object data. Crossing zero in either
   * direction re-registers its components (EveStretch2.cpp:197-206); a zero
   * intensity also suppresses visibility, renderables and lights.
   */
  @meta.blue.method
  @meta.implemented
  SetIntensity(intensity)
  {
    const previous = this._intensity;
    this._intensity = Number(intensity);
    if ((previous === 0 && this._intensity > 0) || (previous > 0 && this._intensity === 0)) this.ReRegister();
  }

  /**
   * IEveFiringEffectElement synchronous hook; EveStretch2 does all of its work
   * in the asynchronous phase.
   */
  @meta.blue.method
  @meta.noop
  UpdateEffectSync(_context)
  {
    return true;
  }

  /** IEveFiringEffectElement asynchronous hook; runs Update. */
  @meta.blue.method
  @meta.implemented
  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  /**
   * Advances the start, loop and end curve sets on time measured from the first
   * update, records each set's scaled time into the effect data that
   * GetPerObjectData uploads, rebuilds the two endpoint bases, and drives the
   * end observers and GPU emitters from them (EveStretch2.cpp:218-269).
   *
   * Adapted: the emitters receive the JavaScript mirror of Carbon's ITr2GenericEmitter::UpdateArguments, one reused
   * object per end, rather than a stack-constructed structure; and the curve sets also receive the context's render
   * context, which TriCurveSet forwards to its curves.
   */
  @meta.blue.method
  @meta.adapted
  Update(context)
  {
    const time = context.GetTime();
    if (this._startTime === 0) this._startTime = time;
    const relative = CcpTime.timeAsDouble(time - this._startTime);
    const effectData = this._effectData[0];
    effectData[0] = effectData[1] = effectData[2] = 0;
    if (this.start)
    {
      this.start.Update(relative, context.renderContext);
      effectData[0] = this.start.GetScaledTime();
    }
    if (this.loop)
    {
      this.loop.Update(relative, context.renderContext);
      effectData[1] = this.loop.GetScaledTime();
    }
    if (this.end)
    {
      this.end.Update(relative, context.renderContext);
      effectData[2] = this.end.GetScaledTime();
    }
    this.GetEndPointTransforms(this._sourceTransform, this._destinationTransform);
    this.sourceObserver?.Update(this._sourceTransform);
    this.destinationObserver?.Update(this._destinationTransform);
    const gpuParticleSystem = context.GetGpuParticleSystem();
    const originShift = context.GetOriginShift();
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
   * Frustum-tests the beam's box (EveStretch2.cpp:303-315): boundingRadius sideways and the endpoint distance plus
   * boundingRadius forwards in the source basis, transformed by the source transform into its world-space bounds, so
   * a beam stays visible while any of it is in view. A hidden or zero-intensity stretch fails without testing; the
   * result gates GetRenderables.
   * @param {EveUpdateContext} context Update context carrying the frustum.
   * @returns {boolean} Whether the stretch is in the frustum.
   */
  @meta.blue.method
  @meta.adapted
  UpdateVisibility(context)
  {
    if (!(this._visible && this._intensity > 0))
    {
      this._inFrustum = false;
      return false;
    }
    const { box3_0 } = EveStretch2.scratch;
    const radius = this.boundingRadius;
    box3.set(box3_0, -radius, -radius, -radius, radius, radius, vec3.distance(this._source, this._destination) + radius);
    box3.transformMat4(box3_0, box3_0, this._sourceTransform);
    this._inFrustum = context.GetFrustum().IsBoxVisible(box3_0);
    return this._inFrustum;
  }

  /**
   * Builds the two endpoint bases. The source basis's Z axis points from the source to the destination, X is
   * normalize(cross(up, Z)) and Y is cross(X, Z), where up is the world axis least aligned with the direction (+Z when
   * no axis is strictly least). The destination basis is the same frame with X and Z negated, so it faces back down
   * the line. A zero-length span normalizes to a zero Z axis, as XMVector3Normalize does, which leaves X and Y zero too.
   * Quirk, reproduced: when the two smallest components tie (a beam exactly along Z), up is +Z, parallel to the beam,
   * so X and Y collapse to zero (EveStretch2.cpp:274-294).
   * Carbon (row-vector) writes the axes as rows; gl-matrix stores them as columns at the same offsets.
   * @param {mat4} source Receives the source basis, translated to the source.
   * @param {mat4} destination Receives the destination basis, translated to the destination.
   */
  @meta.implemented
  GetEndPointTransforms(source, destination)
  {
    // vec3_0 is the direction (Z), vec3_1 the up reference, vec3_2 the X axis and vec3_3 the Y axis.
    const { vec3_0, vec3_1, vec3_2, vec3_3 } = EveStretch2.scratch;
    vec3.subtract(vec3_0, this._destination, this._source);
    const x = Math.abs(vec3_0[0]), y = Math.abs(vec3_0[1]), z = Math.abs(vec3_0[2]);
    if (x < y && x < z) vec3.set(vec3_1, 1, 0, 0);
    else if (y < x && y < z) vec3.set(vec3_1, 0, 1, 0);
    else vec3.set(vec3_1, 0, 0, 1);
    vec3.normalize(vec3_0, vec3_0);
    vec3.normalize(vec3_2, vec3.cross(vec3_2, vec3_1, vec3_0));
    vec3.cross(vec3_3, vec3_2, vec3_0);

    mat4.identity(source);
    source[0] = vec3_2[0]; source[1] = vec3_2[1]; source[2] = vec3_2[2];
    source[4] = vec3_3[0]; source[5] = vec3_3[1]; source[6] = vec3_3[2];
    source[8] = vec3_0[0]; source[9] = vec3_0[1]; source[10] = vec3_0[2];
    source[12] = this._source[0]; source[13] = this._source[1]; source[14] = this._source[2];

    mat4.copy(destination, source);
    destination[8] = -vec3_0[0]; destination[9] = -vec3_0[1]; destination[10] = -vec3_0[2];
    destination[0] = -vec3_2[0]; destination[1] = -vec3_2[1]; destination[2] = -vec3_2[2];
    destination[12] = this._destination[0]; destination[13] = this._destination[1]; destination[14] = this._destination[2];
  }

  static scratch = {
    box3_0: box3.create(),
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec3_3: vec3.create()
  };

  /**
   * Pushes the stretch itself when displayed, at non-zero intensity and in the frustum (EveStretch2.cpp:318-324);
   * its batch comes from GetBatches.
   * @returns {Array} out
   */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (this._visible && this._intensity > 0 && this._inFrustum) out.push(this);
    return out;
  }

  /** Carbon EveStretch2::GetPerObjectData (cpp:327-337): stamps
   * m_effectData[1].x = m_intensity, then uploads the contiguous member run
   * m_source..m_effectData[2] (EveStretch2.h:105-109) - 4 vec4s - to BOTH
   * per-object slots (cpp:23-39). One payload, stages ["vs", "ps"]. */
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    // The shared allocation is null until a device has run the factory (Tr2ProceduralBuffer.GetSharedResource).
    const vb = this._vb.GetSharedResource();
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE || !this.effect || !this.effect.GetShaderStateInterface() || !vb || !vb.IsValid())
    {
      return false;
    }

    const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
    if (!indexBuffer.IsValid()) return false;
    // Ask before drawing: renews what the effect holds, and skips it while its resource is not good.
    if (!this.effect.IsGood()) return false;

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
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveStretch2::GetSortValue: additive batches are unsorted. */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Offers the source and destination point lights at their endpoint bases, the
   * destination scaled by its current scale; nothing is offered while hidden or
   * at exactly zero intensity (EveStretch2.cpp:400-418).
   */
  @meta.blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (!this._visible || this._intensity === 0) return;
    this.sourceLight?.AddLight(lightManager, this._sourceTransform, 1);
    this.destinationLight?.AddLight(lightManager, this._destinationTransform, this._currentDestinationScale);
  }

  /** Carbon EveStretch2::RegisterComponents (cpp:389-398): LightOwner leaf
   * self-registration. Gate (m_visible && m_intensity > 0) && a source or
   * destination light. */
  @meta.blue.method
  @meta.implemented
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

// EveStretch2_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
