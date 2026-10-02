// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { TR2SHADERMODEL } from "#consts/graphics";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { TriBatchType } from "#consts/graphics";
// A cycle with EveBoosterSet2.js; each side reads the other only inside methods.
import { EveBoosterSet2 } from "./EveBoosterSet2.js";


/**
 * One ship's instance of a booster set: it carries the parent transform, speed
 * and rotation, derives the booster and trail intensities, and maintains the
 * five-point trail spline and its LOD flags.
 */
@meta.define({ className: "EveBoosterSet2Renderable", family: "eve/attachment/boosters" })
@meta.blue.inherit(ITr2Renderable)
export class EveBoosterSet2Renderable
{

  /** m_trailIntensity (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  trailIntensity = 0;

  /** m_trailsTotalLength (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  trailsTotalLength = 0;

  /** m_isVisible (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  isVisible = false;

  /** m_trailsVisible (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  trailsVisible = false;

  /** m_boostersVisible (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  boostersVisible = false;

  /** m_trailsTimeDelta (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  trailsTimeDelta = 1;

  /** m_boosterHighLod (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  boosterHighLod = false;

  /** m_trailsBoundsMax (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  trailsBoundsMax = vec3.fromValues(
    -EveBoosterSet2Renderable._floatMax,
    -EveBoosterSet2Renderable._floatMax,
    -EveBoosterSet2Renderable._floatMax
  );

  /** m_trailsBoundsMin (Vector3) [READ] */
  @meta.blue.read
  @meta.type.vec3
  trailsBoundsMin = vec3.fromValues(
    EveBoosterSet2Renderable._floatMax,
    EveBoosterSet2Renderable._floatMax,
    EveBoosterSet2Renderable._floatMax
  );

  /** m_overallIntensity (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  overallIntensity = 0;

  /** m_parentRotation (Quaternion) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.quat
  parentRotation = quat.create();

  /** m_parentSpeed (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  parentSpeed = 0;

  _boosterSet = null;

  _lastAccFactor = 0;

  _lastValue = 0;

  _parentTransform = mat4.create();

  _trailsControlPositions = Array.from(
    { length: EveBoosterSet2Renderable._controlPointCount },
    () => vec3.create()
  );

  _trailsControlNormals = Array.from(
    { length: EveBoosterSet2Renderable._controlPointCount },
    () => vec3.fromValues(0, 0, -1)
  );

  _trailsControlNormalsFactor = new Float32Array(
    EveBoosterSet2Renderable._controlPointCount
  ).fill(1);

  _trailsSequenceLength = new Float32Array(
    EveBoosterSet2Renderable._controlPointCount
  );

  _trailsOffsets = Array.from(
    { length: EveBoosterSet2Renderable._positionOffsetCount },
    () => vec3.create()
  );

  _trailsOffsetLatest = 0;

  _trailsOffsetAccu = vec3.create();

  _trailsTimeToNext = 0;

  /**
   * Reserves the quad-list index buffer for the shader model's shape, as
   * Carbon's constructor does (EveBoosterSet2.cpp:77-78). Before a device
   * exists this is a no-op, and Tr2Renderer.PrepareDeviceResources reserves
   * 128 quads later (Tr2Renderer.cpp:1301).
   */
  constructor()
  {
    Tr2Renderer.ReserveQuadListIndexBuffer(EveBoosterSet2Renderable._planesCount[EveBoosterSet2Renderable._Shape()]);
  }

  /**
   * Binds this instance to the booster set whose authored placements, colours
   * and light data it draws.
   */
  @meta.blue.method
  @meta.adapted
  SetBoosterSet(boosterSet)
  {
    this._boosterSet = boosterSet ?? null;
  }

  /**
   * Derives the booster intensity from the parent's speed ratio and the
   * acceleration along its backward axis, each low-pass filtered against the
   * previous frame and the result clamped to 2; an always-on set returns its
   * authored intensity instead.
   */
  @meta.blue.method
  @meta.implemented
  CalculateIntensity(acceleration)
  {
    const boosterSet = this._boosterSet;
    if (!boosterSet)
    {
      return 0;
    }
    if (boosterSet.alwaysOn)
    {
      return boosterSet.alwaysOnIntensity;
    }

    const backward = vec3.transformQuat(vec3.create(), EveBoosterSet2Renderable._zAxis, this.parentRotation);
    const speedRatio = boosterSet.maxVel ? this.parentSpeed / boosterSet.maxVel : 0;
    let accFactor = vec3.dot(acceleration ?? EveBoosterSet2Renderable._zero, backward);
    accFactor *= Math.max(0.3, speedRatio);
    accFactor = Math.min(1, Math.max(0, accFactor));
    accFactor = accFactor * 0.2 + this._lastAccFactor * 0.8;
    this._lastAccFactor = accFactor;

    let value = this._lastValue * 0.8 + (0.8 * speedRatio + 0.2 * accFactor) * 0.2;
    value = Math.min(value, 2);
    this._lastValue = value;
    return value;
  }

  /**
   * Takes the parent transform, speed and rotation for the frame - deriving
   * speed from the transform delta when the set is not destiny-driven - and
   * recomputes the overall intensity, which it returns.
   */
  @meta.blue.method
  @meta.implemented
  Update(deltaTime, _time, parentMatrix, parentSpeed, parentAcceleration, parentRotation)
  {
    const boosterSet = this._boosterSet;
    if (boosterSet?.destinyUpdate)
    {
      this.parentSpeed = Number(parentSpeed) || 0;
    }
    else if (deltaTime && parentMatrix?.length === 16)
    {
      const dx = parentMatrix[12] - this._parentTransform[12];
      const dy = parentMatrix[13] - this._parentTransform[13];
      const dz = parentMatrix[14] - this._parentTransform[14];
      this.parentSpeed = Math.hypot(dx, dy, dz) / Number(deltaTime);
    }

    if (parentMatrix?.length === 16)
    {
      mat4.copy(this._parentTransform, parentMatrix);
    }
    if (parentRotation?.length === 4)
    {
      quat.copy(this.parentRotation, parentRotation);
    }
    this.overallIntensity = this.CalculateIntensity(parentAcceleration);
    return this.overallIntensity;
  }

  /**
   * Recomputes the trail spline and maps its total length onto the trail
   * intensity, fading in above the minimum length and back out approaching the
   * maximum, with nothing drawn outside that band; an always-on set is pinned to
   * full intensity.
   */
  @meta.blue.method
  @meta.adapted
  UpdateTrails(deltaTime, _time = 0)
  {
    const boosterSet = this._boosterSet;
    if (!boosterSet)
    {
      return false;
    }
    this._CalculateSplineData(deltaTime);

    const length = this.trailsTotalLength;
    if (length > EveBoosterSet2.eveSpaceObjectTrailsMinLength &&
      length < EveBoosterSet2.eveSpaceObjectTrailsMinLength +
        EveBoosterSet2.eveSpaceObjectTrailsMinLengthFade)
    {
      this.trailIntensity = EveBoosterSet2Renderable._SinSmooth(
        (length - EveBoosterSet2.eveSpaceObjectTrailsMinLength) /
          EveBoosterSet2.eveSpaceObjectTrailsMinLengthFade
      );
    }
    else if (length > EveBoosterSet2.eveSpaceObjectTrailsMaxLength -
      EveBoosterSet2.eveSpaceObjectTrailsMaxLengthFade &&
      length < EveBoosterSet2.eveSpaceObjectTrailsMaxLength)
    {
      this.trailIntensity = EveBoosterSet2Renderable._SinSmooth(
        (EveBoosterSet2.eveSpaceObjectTrailsMaxLength - length) /
          EveBoosterSet2.eveSpaceObjectTrailsMaxLengthFade
      );
    }
    else if (length < EveBoosterSet2.eveSpaceObjectTrailsMinLength ||
      length > EveBoosterSet2.eveSpaceObjectTrailsMaxLength)
    {
      this.trailIntensity = 0;
    }
    else
    {
      this.trailIntensity = 1;
    }

    if (boosterSet.alwaysOn)
    {
      this.trailIntensity = 1;
    }
    return true;
  }

  /**
   * A freshly allocated snapshot of the trail spline: control positions carrying
   * their normalized segment lengths, control normals carrying their length
   * factors, plus total length, intensity and world bounds.
   */
  @meta.blue.method
  @meta.adapted
  GetTrailSplineData()
  {
    return {
      positions: this._trailsControlPositions.map((position, index) => vec4.fromValues(
        position[0],
        position[1],
        position[2],
        this._trailsSequenceLength[index]
      )),
      normals: this._trailsControlNormals.map((normal, index) => vec4.fromValues(
        normal[0],
        normal[1],
        normal[2],
        this._trailsControlNormalsFactor[index]
      )),
      totalLength: this.trailsTotalLength,
      intensity: this.trailIntensity,
      boundsMin: vec3.clone(this.trailsBoundsMin),
      boundsMax: vec3.clone(this.trailsBoundsMax)
    };
  }

  /** The overall booster intensity computed by the last Update. */
  @meta.blue.method
  @meta.implemented
  GetIntensity()
  {
    return this.overallIntensity;
  }

  /** Carbon EveBoosterSet2Renderable::HasTransparentBatches is always false
   * (additive batches only, via the instanced geometry provider). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveBoosterSet2Renderable::GetSortValue is the constant one. */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 1;
  }

  /**
   * Commits the instanced booster draw (Carbon EveBoosterSet2Renderable::GetBatches,
   * EveBoosterSet2.cpp:174-240): additive only; the set's box or star on
   * stream 0, its instance buffer on stream 1, the shared quad-list index
   * buffer, 3 * 2 * planes indices per booster instance.
   */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE) return;

    const boosterSet = this._boosterSet;
    if (!boosterSet.display) return;
    if (!boosterSet._instanceBuffer.IsValid()) return;
    if (boosterSet._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;

    if (this.boostersVisible)
    {
      const shape = EveBoosterSet2Renderable._Shape();
      const indexBuffer = Tr2Renderer.GetQuadListIndexBuffer();
      if (!indexBuffer.IsValid()) return;

      const batch = new Tr2RenderBatch();
      batch.SetMaterial((this.boosterHighLod || !boosterSet.effectFar) ? boosterSet.effect : boosterSet.effectFar);
      batch.SetPerObjectData(perObjectData);
      batch.SetVertexDeclaration(boosterSet._vertexDeclHandle);

      // Made by the same device prepare that set the declaration handle
      // checked above, so it exists here (see Tr2ProceduralBuffer).
      const vb = boosterSet._vertexBuffer.GetSharedResource();
      batch.SetStreamSource(0, vb.GetBuffer(), vb.GetStride());

      // Carbon's SetStreamSource( index, Allocation& ) and SetInidices(
      // Allocation& ) overloads take the buffer and stride from the allocation.
      const instanceBuffer = boosterSet._instanceBuffer;
      batch.SetStreamSource(1, instanceBuffer.GetBuffer(), instanceBuffer.GetStride());
      batch.SetIndices(indexBuffer.GetBuffer(), indexBuffer.GetStride());

      batch.SetDrawIndexedInstanced(
        3 * 2 * EveBoosterSet2Renderable._planesCount[shape],
        boosterSet._singleBoosters.length,
        indexBuffer.GetStartIndex(),
        vb.GetOffset() / vb.GetStride(),
        instanceBuffer.GetOffset() / instanceBuffer.GetStride());
      batches.Commit(batch);
    }

    // cpp:222-239: the trails, when visible, enabled, and with length and
    // intensity above zero.
    if (this.trailsVisible && boosterSet.trails && EveBoosterSet2.eveSpaceObjectTrailsEnabled
      && this.trailsTotalLength > 0 && this.trailIntensity > 0)
    {
      boosterSet.trails.GetBatches(batches, perObjectData);
    }
  }

  /** The shape every booster site picks from the shader model (cpp:77, :196, :929). */
  static _Shape()
  {
    return Tr2Renderer.GetShaderModel() >= TR2SHADERMODEL.TR2SM_3_0_HI
      ? EveBoosterSet2.Shape.BOX
      : EveBoosterSet2.Shape.STAR;
  }

  /** EVE_BOOSTER_PLANES_COUNT (EveBoosterSet2.cpp:27), indexed by EveBoosterSet2.Shape. */
  static _planesCount = [ 4, 6 ];

  /** Carbon EveBoosterSet2Renderable::GetPerObjectData (cpp:260-289): the
   * EveBoosterSetPerObjectData composite - a VertexShaderData + PixelShaderData
   * pair uploaded as TWO constant buffers (cpp:1325-1329). Here that is two
   * Allocs returned as a { vs, ps } record. Set(MATRIX) performs Carbon's
   * `Transpose(m_parentTransform)`; both 5-slot trail arrays are fully
   * written, exactly as Carbon's loop. The padding scalars are never written
   * (Carbon leaves them uninitialized). */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const vs = accumulator.Alloc("EveBoosterSetVSData");
    const ps = accumulator.Alloc("EveBoosterSetPSData");

    vs.SetAndTranspose("shipMatrix", this._parentTransform);
    vs.Set("boosterIntensity", [this.overallIntensity]);
    vs.Set("shipSpeed", [this.parentSpeed]);
    vs.Set("maxBoosterSize", [this._boosterSet?.maxSize ?? 0]);

    ps.Set("boosterIntensity", [this.overallIntensity]);
    ps.Set("trailIntensity", [this.trailIntensity]);
    ps.Set("warpIntensity", [this._boosterSet?.warpIntensity ?? 0]);

    for (let index = 0; index < this._trailsControlPositions.length; index++)
    {
      const position = this._trailsControlPositions[index];
      const normal = this._trailsControlNormals[index];

      vs.SetIndex("trailsControlPositions", index, [
        position[0], position[1], position[2], this._trailsSequenceLength[index]
      ]);
      vs.SetIndex("trailsControlNormals", index, [
        normal[0], normal[1], normal[2], this._trailsControlNormalsFactor[index]
      ]);
    }

    return { vs, ps };
  }

  /** Carbon EveBoosterSet2Renderable::UpdateVisibility (cpp:307-337). Three
   * independent gates, all off the SAME bounding-sphere radius:
   * - boosters: `2 * pixelSize(sphere)`; HIGH lod above `medium * 1.5`, drawn at
   *   all above `low`. `boosterHighLod` picks the effect at batch time
   *   (cpp:208 - `effectFar` when low, unless the set has none), and
   *   `boostersVisible` also gates the glow flare (cpp:1264).
   * - trails: the CLOSEST spline control point to the camera, given the
   *   booster sphere's radius, scaled `7.5x`; drawn above `low`.
   * - `isVisible`: frustum sphere test OR the trail bounds box - a booster whose
   *   hull is off-screen still renders while its trail crosses the view.
   *
   * The sphere is passed as a packed vec4, which is Carbon's `Vector4*` overload
   * and therefore the DEPTH pixel-size formula, not the Est one.
   * No lodFactor is applied anywhere here; Carbon does not apply one either. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext)
  {
    const frustum = updateContext?.GetFrustum();
    if (!frustum || !this._boosterSet)
    {
      return false;
    }

    const boundingSphere = this.GetBoundingSphere(
      EveBoosterSet2Renderable._visibilitySphere
    );
    const lowDetailThreshold = updateContext.GetLowDetailThreshold();

    const boosterLod = 2 * frustum.GetPixelSizeAccross(boundingSphere);
    this.boosterHighLod = boosterLod > updateContext.GetMediumDetailThreshold() * 1.5;
    this.boostersVisible = boosterLod > lowDetailThreshold;

    const viewPos = frustum.viewPos;
    let closestIndex = 0;
    let closestSqDistance = Infinity;
    for (let index = 0; index < EveBoosterSet2Renderable._controlPointCount; index++)
    {
      const position = this._trailsControlPositions[index];
      const sqDistance = vec3.squaredDistance(position, viewPos);
      if (sqDistance < closestSqDistance)
      {
        closestSqDistance = sqDistance;
        closestIndex = index;
      }
    }

    const trailsSphere = sph3.fromPositionRadius(
      EveBoosterSet2Renderable._trailsSphere,
      this._trailsControlPositions[closestIndex],
      sph3.radius(boundingSphere)
    );
    const trailsLod = 7.5 * frustum.GetPixelSizeAccross(trailsSphere);
    this.trailsVisible = trailsLod > lowDetailThreshold;

    this.isVisible = frustum.IsSphereVisible(boundingSphere) ||
      frustum.IsBoxVisible(this.trailsBoundsMin, this.trailsBoundsMax);

    return this.isVisible;
  }

  /** Carbon EveBoosterSet2Renderable::GetRenderables (cpp:349-356): submits
   * itself only when UpdateVisibility left it visible. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out = [])
  {
    if (this.isVisible)
    {
      out.push(this);
    }
    return out;
  }

  /** Protected-equivalent read of Carbon's m_parentTransform
   * (EveBoosterSet2.h:132) - the owning set's GetLights transforms each
   * booster light position by it (cpp:1305/1314). Returns the live buffer;
   * read-only by convention. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's direct member access becomes an accessor; JS has no protected fields.")
  GetParentTransform()
  {
    return this._parentTransform;
  }

  /** Carbon EveBoosterSet2Renderable::GetBoundingSphere (cpp:295-303): the
   * authored sphere pushed back half a radius to cover the exhaust glow, its
   * centre transformed into world space, and its radius DOUBLED. The radius is
   * set outright rather than run through sph3.transformMat4, because Carbon
   * transforms only the centre (TransformCoord) and never scales w.
   *
   * `out` is required, as in Carbon (`Vector4&`) - this is called per frame and
   * must not allocate. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out)
  {
    const boosterSet = this._boosterSet;
    if (!boosterSet)
    {
      return sph3.empty(out);
    }
    const position = sph3.$position(out);
    vec3.copy(position, boosterSet.boosterBoundingSphereCenter);
    position[2] -= 0.5 * boosterSet.boosterBoundingSphereRadius;
    vec3.transformMat4(position, position, this._parentTransform);
    out[3] = 2 * boosterSet.boosterBoundingSphereRadius;
    return out;
  }

  /**
   * Places the five trail control points for the frame - sampled out of the
   * physics offset ring at the trail time delta, or taken from the set's static
   * offsets rotated into parent space - then recomputes the spline metrics;
   * returns false for a non-positive delta.
   */
  _CalculateSplineData(deltaTime)
  {
    const elapsed = Number(deltaTime);
    if (!(elapsed > 0))
    {
      return false;
    }

    const boosterSet = this._boosterSet;
    const parentPosition = vec3.fromValues(
      this._parentTransform[12],
      this._parentTransform[13],
      this._parentTransform[14]
    );

    if (boosterSet.physicsUpdate)
    {
      this._UpdatePhysicsTrailOffsets(elapsed);
      const stride = Math.trunc(
        this.trailsTimeDelta / EveBoosterSet2Renderable._positionOffsetDelta
      );
      let ringIndex = this._trailsOffsetLatest;
      for (let index = 0; index < EveBoosterSet2Renderable._controlPointCount; index++)
      {
        vec3.add(
          this._trailsControlPositions[index],
          parentPosition,
          this._trailsOffsets[ringIndex]
        );
        ringIndex = EveBoosterSet2Renderable._WrapOffsetIndex(ringIndex - stride);
      }
    }
    else
    {
      const offsets = EveBoosterSet2Renderable._GetStaticOffsets(boosterSet);
      for (let index = 0; index < EveBoosterSet2Renderable._controlPointCount; index++)
      {
        EveBoosterSet2Renderable._TransformNormal(
          this._trailsControlPositions[index],
          offsets[index],
          this._parentTransform
        );
        vec3.add(
          this._trailsControlPositions[index],
          this._trailsControlPositions[index],
          parentPosition
        );
      }
    }

    this._UpdateSplineMetrics();
    return true;
  }

  /**
   * Advances the 300-entry trail offset ring by the parent's movement in fixed
   * ~16.7 ms steps, taking a separate bulk path once twenty or more steps are
   * owed in a single frame so a stalled or teleported ship does not walk the
   * ring one entry at a time.
   */
  _UpdatePhysicsTrailOffsets(deltaTime)
  {
    const movement = vec3.transformQuat(
      vec3.create(),
      EveBoosterSet2Renderable._zAxis,
      this.parentRotation
    );
    vec3.scale(movement, movement, deltaTime * this.parentSpeed);
    this._trailsTimeToNext += deltaTime;
    vec3.subtract(this._trailsOffsetAccu, this._trailsOffsetAccu, movement);

    const iterationCount = Math.trunc(
      this._trailsTimeToNext / EveBoosterSet2Renderable._positionOffsetDelta
    );
    if (!iterationCount)
    {
      return;
    }

    const fraction = EveBoosterSet2Renderable._positionOffsetDelta /
      this._trailsTimeToNext;
    const cumulativeOffset = vec3.scale(
      vec3.create(),
      this._trailsOffsetAccu,
      fraction * iterationCount
    );

    if (iterationCount < 20)
    {
      if (vec3.squaredLength(this._trailsOffsetAccu) > 0.00001)
      {
        for (const offset of this._trailsOffsets)
        {
          vec3.add(offset, offset, cumulativeOffset);
        }
      }
      for (let index = 0; index < iterationCount; index++)
      {
        this._trailsOffsetLatest = EveBoosterSet2Renderable._WrapOffsetIndex(
          this._trailsOffsetLatest + 1
        );
        vec3.scale(
          this._trailsOffsets[this._trailsOffsetLatest],
          this._trailsOffsetAccu,
          (iterationCount - 1 - index) * fraction
        );
      }
    }
    else
    {
      this._trailsOffsetLatest = EveBoosterSet2Renderable._WrapOffsetIndex(
        this._trailsOffsetLatest + 1
      );
      const partialOffset = vec3.scale(
        vec3.create(),
        this._trailsOffsetAccu,
        fraction
      );
      for (let index = 0; index < EveBoosterSet2Renderable._positionOffsetCount; index++)
      {
        const relativeIndex = EveBoosterSet2Renderable._WrapOffsetIndex(
          index - this._trailsOffsetLatest
        );
        if (relativeIndex < iterationCount)
        {
          vec3.scale(
            this._trailsOffsets[index],
            partialOffset,
            iterationCount - 1 - relativeIndex
          );
        }
        else
        {
          vec3.add(this._trailsOffsets[index], this._trailsOffsets[index], cumulativeOffset);
        }
      }
      this._trailsOffsetLatest = EveBoosterSet2Renderable._WrapOffsetIndex(
        this._trailsOffsetLatest + iterationCount - 1
      );
    }

    vec3.subtract(this._trailsOffsetAccu, this._trailsOffsetAccu, cumulativeOffset);
    this._trailsTimeToNext -=
      EveBoosterSet2Renderable._positionOffsetDelta * iterationCount;
  }

  /**
   * Recomputes everything derived from the control points: total trail length,
   * world trail bounds padded by the booster sphere radius, the per-point
   * tangent normals with their length factors, and the normalized per-segment
   * lengths.
   */
  _UpdateSplineMetrics()
  {
    this.trailsTotalLength = 0;
    for (let index = 1; index < EveBoosterSet2Renderable._controlPointCount; index++)
    {
      this.trailsTotalLength += vec3.distance(
        this._trailsControlPositions[index],
        this._trailsControlPositions[index - 1]
      );
    }

    vec3.set(this.trailsBoundsMin, Infinity, Infinity, Infinity);
    vec3.set(this.trailsBoundsMax, -Infinity, -Infinity, -Infinity);
    const radius = sph3.radius(
      this.GetBoundingSphere(EveBoosterSet2Renderable._boundsSphere)
    );
    for (const position of this._trailsControlPositions)
    {
      for (let axis = 0; axis < 3; axis++)
      {
        this.trailsBoundsMin[axis] = Math.min(
          this.trailsBoundsMin[axis],
          position[axis] - radius
        );
        this.trailsBoundsMax[axis] = Math.max(
          this.trailsBoundsMax[axis],
          position[axis] + radius
        );
      }
    }

    const firstLength = Math.min(
      this._boosterSet.trailsSmoothing,
      vec3.distance(this._trailsControlPositions[1], this._trailsControlPositions[0])
    );
    EveBoosterSet2Renderable._TransformNormal(
      this._trailsControlNormals[0],
      [0, 0, -firstLength],
      this._parentTransform
    );

    const lastIndex = EveBoosterSet2Renderable._controlPointCount - 1;
    vec3.subtract(
      this._trailsControlNormals[lastIndex],
      this._trailsControlPositions[lastIndex],
      this._trailsControlPositions[lastIndex - 1]
    );
    vec3.scale(
      this._trailsControlNormals[lastIndex],
      this._trailsControlNormals[lastIndex],
      0.5
    );

    for (let index = 1; index < lastIndex; index++)
    {
      const normal = vec3.subtract(
        this._trailsControlNormals[index],
        this._trailsControlPositions[index + 1],
        this._trailsControlPositions[index - 1]
      );
      const nextLength = vec3.distance(
        this._trailsControlPositions[index + 1],
        this._trailsControlPositions[index]
      );
      const previousLength = vec3.distance(
        this._trailsControlPositions[index],
        this._trailsControlPositions[index - 1]
      );
      if (vec3.squaredLength(normal))
      {
        vec3.normalize(normal, normal);
      }
      vec3.scale(normal, normal, nextLength);
      this._trailsControlNormalsFactor[index] = nextLength
        ? previousLength / nextLength
        : 0;
    }

    this._trailsSequenceLength[0] = 0;
    for (let index = 1; index < EveBoosterSet2Renderable._controlPointCount; index++)
    {
      const length = vec3.distance(
        this._trailsControlPositions[index],
        this._trailsControlPositions[index - 1]
      );
      this._trailsSequenceLength[index] = this.trailsTotalLength
        ? length / this.trailsTotalLength
        : 0;
    }
  }

  /**
   * The booster set's five authored static trail offsets gathered into an array
   * in control-point order.
   */
  static _GetStaticOffsets(boosterSet)
  {
    return [
      boosterSet.trailsStaticOffsets0,
      boosterSet.trailsStaticOffsets1,
      boosterSet.trailsStaticOffsets2,
      boosterSet.trailsStaticOffsets3,
      boosterSet.trailsStaticOffsets4
    ];
  }

  /**
   * Maps 0..1 through a sine ease so a trail length fade starts and ends flat
   * instead of stepping.
   */
  static _SinSmooth(value)
  {
    return Math.sin(value * Math.PI - Math.PI / 2) / 2 + 0.5;
  }

  /**
   * Applies only a transform's upper 3x3 rotation and scale to a vector, leaving
   * its translation out, so a direction stays a direction.
   */
  static _TransformNormal(out, value, transform)
  {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }

  /**
   * Wraps an index into the 300-entry trail offset ring, handling negative
   * values so the ring can be walked backwards.
   */
  static _WrapOffsetIndex(index)
  {
    const count = EveBoosterSet2Renderable._positionOffsetCount;
    return ((index % count) + count) % count;
  }

  static _zero = [0, 0, 0];

  static _zAxis = [0, 0, 1];

  static _controlPointCount = 5;

  static _positionOffsetCount = 300;

  static _positionOffsetDelta = 0.0167;

  static _floatMax = 3.4028234663852886e38;

  /** Per-frame visibility scratch - UpdateVisibility must not allocate. */
  static _visibilitySphere = sph3.create();

  static _trailsSphere = sph3.create();

  static _boundsSphere = sph3.create();

}
