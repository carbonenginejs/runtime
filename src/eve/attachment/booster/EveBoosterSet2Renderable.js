// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveBoosterSet2.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveBoosterSet2.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


@type.define({ className: "EveBoosterSet2Renderable", family: "eve/attachment/boosters" })
export class EveBoosterSet2Renderable extends CjsModel
{

  /** m_trailIntensity (float) [READ] */
  @io.read
  @type.float32
  trailIntensity = 0;

  /** m_trailsTotalLength (float) [READ] */
  @io.read
  @type.float32
  trailsTotalLength = 0;

  /** m_isVisible (bool) [READ] */
  @io.read
  @type.boolean
  isVisible = false;

  /** m_trailsVisible (bool) [READ] */
  @io.read
  @type.boolean
  trailsVisible = false;

  /** m_boostersVisible (bool) [READ] */
  @io.read
  @type.boolean
  boostersVisible = false;

  /** m_trailsTimeDelta (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  trailsTimeDelta = 1;

  /** m_boosterHighLod (bool) [READ] */
  @io.read
  @type.boolean
  boosterHighLod = false;

  /** m_trailsBoundsMax (Vector3) [READ] */
  @io.read
  @type.vec3
  trailsBoundsMax = vec3.fromValues(
    -EveBoosterSet2Renderable.#floatMax,
    -EveBoosterSet2Renderable.#floatMax,
    -EveBoosterSet2Renderable.#floatMax
  );

  /** m_trailsBoundsMin (Vector3) [READ] */
  @io.read
  @type.vec3
  trailsBoundsMin = vec3.fromValues(
    EveBoosterSet2Renderable.#floatMax,
    EveBoosterSet2Renderable.#floatMax,
    EveBoosterSet2Renderable.#floatMax
  );

  /** m_overallIntensity (float) [READ] */
  @io.read
  @type.float32
  overallIntensity = 0;

  /** m_parentRotation (Quaternion) [READWRITE] */
  @io.readwrite
  @type.quat
  parentRotation = quat.create();

  /** m_parentSpeed (float) [READWRITE] */
  @io.readwrite
  @type.float32
  parentSpeed = 0;

  #boosterSet = null;

  #lastAccFactor = 0;

  #lastValue = 0;

  #parentTransform = mat4.create();

  #trailsControlPositions = Array.from(
    { length: EveBoosterSet2Renderable.#controlPointCount },
    () => vec3.create()
  );

  #trailsControlNormals = Array.from(
    { length: EveBoosterSet2Renderable.#controlPointCount },
    () => vec3.fromValues(0, 0, -1)
  );

  #trailsControlNormalsFactor = new Float32Array(
    EveBoosterSet2Renderable.#controlPointCount
  ).fill(1);

  #trailsSequenceLength = new Float32Array(
    EveBoosterSet2Renderable.#controlPointCount
  );

  #trailsOffsets = Array.from(
    { length: EveBoosterSet2Renderable.#positionOffsetCount },
    () => vec3.create()
  );

  #trailsOffsetLatest = 0;

  #trailsOffsetAccu = vec3.create();

  #trailsTimeToNext = 0;

  @carbon.method
  @impl.adapted
  SetBoosterSet(boosterSet)
  {
    this.#boosterSet = boosterSet ?? null;
  }

  @carbon.method
  @impl.implemented
  CalculateIntensity(acceleration)
  {
    const boosterSet = this.#boosterSet;
    if (!boosterSet)
    {
      return 0;
    }
    if (boosterSet.alwaysOn)
    {
      return boosterSet.alwaysOnIntensity;
    }

    const backward = vec3.transformQuat(vec3.create(), EveBoosterSet2Renderable.#zAxis, this.parentRotation);
    const speedRatio = boosterSet.maxVel ? this.parentSpeed / boosterSet.maxVel : 0;
    let accFactor = vec3.dot(acceleration ?? EveBoosterSet2Renderable.#zero, backward);
    accFactor *= Math.max(0.3, speedRatio);
    accFactor = Math.min(1, Math.max(0, accFactor));
    accFactor = accFactor * 0.2 + this.#lastAccFactor * 0.8;
    this.#lastAccFactor = accFactor;

    let value = this.#lastValue * 0.8 + (0.8 * speedRatio + 0.2 * accFactor) * 0.2;
    value = Math.min(value, 2);
    this.#lastValue = value;
    return value;
  }

  @carbon.method
  @impl.implemented
  Update(deltaTime, _time, parentMatrix, parentSpeed, parentAcceleration, parentRotation)
  {
    const boosterSet = this.#boosterSet;
    if (boosterSet?.destinyUpdate)
    {
      this.parentSpeed = Number(parentSpeed) || 0;
    }
    else if (deltaTime && parentMatrix?.length === 16)
    {
      const dx = parentMatrix[12] - this.#parentTransform[12];
      const dy = parentMatrix[13] - this.#parentTransform[13];
      const dz = parentMatrix[14] - this.#parentTransform[14];
      this.parentSpeed = Math.hypot(dx, dy, dz) / Number(deltaTime);
    }

    if (parentMatrix?.length === 16)
    {
      mat4.copy(this.#parentTransform, parentMatrix);
    }
    if (parentRotation?.length === 4)
    {
      quat.copy(this.parentRotation, parentRotation);
    }
    this.overallIntensity = this.CalculateIntensity(parentAcceleration);
    return this.overallIntensity;
  }

  @carbon.method
  @impl.adapted
  UpdateTrails(deltaTime, _time = 0)
  {
    const boosterSet = this.#boosterSet;
    if (!boosterSet)
    {
      return false;
    }
    this.#CalculateSplineData(deltaTime);

    const length = this.trailsTotalLength;
    if (length > EveBoosterSet2Renderable.#trailMinLength &&
      length < EveBoosterSet2Renderable.#trailMinLength +
        EveBoosterSet2Renderable.#trailMinLengthFade)
    {
      this.trailIntensity = EveBoosterSet2Renderable.#SinSmooth(
        (length - EveBoosterSet2Renderable.#trailMinLength) /
          EveBoosterSet2Renderable.#trailMinLengthFade
      );
    }
    else if (length > EveBoosterSet2Renderable.#trailMaxLength -
      EveBoosterSet2Renderable.#trailMaxLengthFade &&
      length < EveBoosterSet2Renderable.#trailMaxLength)
    {
      this.trailIntensity = EveBoosterSet2Renderable.#SinSmooth(
        (EveBoosterSet2Renderable.#trailMaxLength - length) /
          EveBoosterSet2Renderable.#trailMaxLengthFade
      );
    }
    else if (length < EveBoosterSet2Renderable.#trailMinLength ||
      length > EveBoosterSet2Renderable.#trailMaxLength)
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

  @carbon.method
  @impl.adapted
  GetTrailSplineData()
  {
    return {
      positions: this.#trailsControlPositions.map((position, index) => vec4.fromValues(
        position[0],
        position[1],
        position[2],
        this.#trailsSequenceLength[index]
      )),
      normals: this.#trailsControlNormals.map((normal, index) => vec4.fromValues(
        normal[0],
        normal[1],
        normal[2],
        this.#trailsControlNormalsFactor[index]
      )),
      totalLength: this.trailsTotalLength,
      intensity: this.trailIntensity,
      boundsMin: vec3.clone(this.trailsBoundsMin),
      boundsMax: vec3.clone(this.trailsBoundsMax)
    };
  }

  @carbon.method
  @impl.implemented
  GetIntensity()
  {
    return this.overallIntensity;
  }

  /** Carbon EveBoosterSet2Renderable::HasTransparentBatches is always false
   * (additive batches only, via the instanced geometry provider). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveBoosterSet2Renderable::GetSortValue is the constant one. */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 1;
  }

  /** Carbon EveBoosterSet2Renderable::GetBatches submits the instanced booster geometry (GPU-backed). */
  @carbon.method
  @impl.notImplemented
  GetBatches(_accumulator, _batchType, _perObjectData, _reason)
  {
    throw new Error("EveBoosterSet2Renderable.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon EveBoosterSet2Renderable::GetPerObjectData (cpp:260-289): the
   * EveBoosterSetPerObjectData composite - a VertexShaderData + PixelShaderData
   * pair uploaded as TWO constant buffers (cpp:1325-1329). Here that is two
   * Allocs returned as a { vs, ps } record. Set(MATRIX) performs Carbon's
   * `Transpose(m_parentTransform)`; both 5-slot trail arrays are fully
   * written, exactly as Carbon's loop. The padding scalars are never written
   * (Carbon leaves them uninitialized). */
  @carbon.method
  @impl.implemented
  GetPerObjectData(accumulator)
  {
    const vs = accumulator.Alloc("EveBoosterSetVSData");
    const ps = accumulator.Alloc("EveBoosterSetPSData");

    vs.Set("shipMatrix", this.#parentTransform);
    vs.Set("boosterIntensity", [this.overallIntensity]);
    vs.Set("shipSpeed", [this.parentSpeed]);
    vs.Set("maxBoosterSize", [this.#boosterSet?.maxSize ?? 0]);

    ps.Set("boosterIntensity", [this.overallIntensity]);
    ps.Set("trailIntensity", [this.trailIntensity]);
    ps.Set("warpIntensity", [this.#boosterSet?.warpIntensity ?? 0]);

    for (let index = 0; index < this.#trailsControlPositions.length; index++)
    {
      const position = this.#trailsControlPositions[index];
      const normal = this.#trailsControlNormals[index];

      vs.Set("trailsControlPositions", [
        position[0], position[1], position[2], this.#trailsSequenceLength[index]
      ], index);
      vs.Set("trailsControlNormals", [
        normal[0], normal[1], normal[2], this.#trailsControlNormalsFactor[index]
      ], index);
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
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext)
  {
    const frustum = updateContext?.GetFrustum?.();
    if (!frustum || !this.#boosterSet)
    {
      return false;
    }

    const boundingSphere = this.GetBoundingSphere();
    const lowDetailThreshold = updateContext.GetLowDetailThreshold();

    const boosterLod = 2 * frustum.GetPixelSizeAccross(boundingSphere);
    this.boosterHighLod = boosterLod > updateContext.GetMediumDetailThreshold() * 1.5;
    this.boostersVisible = boosterLod > lowDetailThreshold;

    const viewPos = frustum.viewPos;
    let closestIndex = 0;
    let closestSqDistance = Infinity;
    for (let index = 0; index < EveBoosterSet2Renderable.#controlPointCount; index++)
    {
      const position = this.#trailsControlPositions[index];
      const sqDistance = vec3.squaredDistance(position, viewPos);
      if (sqDistance < closestSqDistance)
      {
        closestSqDistance = sqDistance;
        closestIndex = index;
      }
    }

    const closest = this.#trailsControlPositions[closestIndex];
    const trailsLod = 7.5 * frustum.GetPixelSizeAccross(vec4.fromValues(
      closest[0],
      closest[1],
      closest[2],
      boundingSphere[3]
    ));
    this.trailsVisible = trailsLod > lowDetailThreshold;

    this.isVisible = frustum.IsSphereVisible(boundingSphere) ||
      frustum.IsBoxVisible(this.trailsBoundsMin, this.trailsBoundsMax);

    return this.isVisible;
  }

  /** Carbon EveBoosterSet2Renderable::GetRenderables (cpp:349-356): submits
   * itself only when UpdateVisibility left it visible. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's direct member access becomes an accessor; JS has no protected fields.")
  GetParentTransform()
  {
    return this.#parentTransform;
  }

  @carbon.method
  @impl.adapted
  GetBoundingSphere()
  {
    const boosterSet = this.#boosterSet;
    if (!boosterSet)
    {
      return vec4.create();
    }
    const center = vec3.clone(boosterSet.boosterBoundingSphereCenter);
    center[2] -= 0.5 * boosterSet.boosterBoundingSphereRadius;
    vec3.transformMat4(center, center, this.#parentTransform);
    return vec4.fromValues(
      center[0],
      center[1],
      center[2],
      2 * boosterSet.boosterBoundingSphereRadius
    );
  }

  #CalculateSplineData(deltaTime)
  {
    const elapsed = Number(deltaTime);
    if (!(elapsed > 0))
    {
      return false;
    }

    const boosterSet = this.#boosterSet;
    const parentPosition = vec3.fromValues(
      this.#parentTransform[12],
      this.#parentTransform[13],
      this.#parentTransform[14]
    );

    if (boosterSet.physicsUpdate)
    {
      this.#UpdatePhysicsTrailOffsets(elapsed);
      const stride = Math.trunc(
        this.trailsTimeDelta / EveBoosterSet2Renderable.#positionOffsetDelta
      );
      let ringIndex = this.#trailsOffsetLatest;
      for (let index = 0; index < EveBoosterSet2Renderable.#controlPointCount; index++)
      {
        vec3.add(
          this.#trailsControlPositions[index],
          parentPosition,
          this.#trailsOffsets[ringIndex]
        );
        ringIndex = EveBoosterSet2Renderable.#WrapOffsetIndex(ringIndex - stride);
      }
    }
    else
    {
      const offsets = EveBoosterSet2Renderable.#GetStaticOffsets(boosterSet);
      for (let index = 0; index < EveBoosterSet2Renderable.#controlPointCount; index++)
      {
        EveBoosterSet2Renderable.#TransformNormal(
          this.#trailsControlPositions[index],
          offsets[index],
          this.#parentTransform
        );
        vec3.add(
          this.#trailsControlPositions[index],
          this.#trailsControlPositions[index],
          parentPosition
        );
      }
    }

    this.#UpdateSplineMetrics();
    return true;
  }

  #UpdatePhysicsTrailOffsets(deltaTime)
  {
    const movement = vec3.transformQuat(
      vec3.create(),
      EveBoosterSet2Renderable.#zAxis,
      this.parentRotation
    );
    vec3.scale(movement, movement, deltaTime * this.parentSpeed);
    this.#trailsTimeToNext += deltaTime;
    vec3.subtract(this.#trailsOffsetAccu, this.#trailsOffsetAccu, movement);

    const iterationCount = Math.trunc(
      this.#trailsTimeToNext / EveBoosterSet2Renderable.#positionOffsetDelta
    );
    if (!iterationCount)
    {
      return;
    }

    const fraction = EveBoosterSet2Renderable.#positionOffsetDelta /
      this.#trailsTimeToNext;
    const cumulativeOffset = vec3.scale(
      vec3.create(),
      this.#trailsOffsetAccu,
      fraction * iterationCount
    );

    if (iterationCount < 20)
    {
      if (vec3.squaredLength(this.#trailsOffsetAccu) > 0.00001)
      {
        for (const offset of this.#trailsOffsets)
        {
          vec3.add(offset, offset, cumulativeOffset);
        }
      }
      for (let index = 0; index < iterationCount; index++)
      {
        this.#trailsOffsetLatest = EveBoosterSet2Renderable.#WrapOffsetIndex(
          this.#trailsOffsetLatest + 1
        );
        vec3.scale(
          this.#trailsOffsets[this.#trailsOffsetLatest],
          this.#trailsOffsetAccu,
          (iterationCount - 1 - index) * fraction
        );
      }
    }
    else
    {
      this.#trailsOffsetLatest = EveBoosterSet2Renderable.#WrapOffsetIndex(
        this.#trailsOffsetLatest + 1
      );
      const partialOffset = vec3.scale(
        vec3.create(),
        this.#trailsOffsetAccu,
        fraction
      );
      for (let index = 0; index < EveBoosterSet2Renderable.#positionOffsetCount; index++)
      {
        const relativeIndex = EveBoosterSet2Renderable.#WrapOffsetIndex(
          index - this.#trailsOffsetLatest
        );
        if (relativeIndex < iterationCount)
        {
          vec3.scale(
            this.#trailsOffsets[index],
            partialOffset,
            iterationCount - 1 - relativeIndex
          );
        }
        else
        {
          vec3.add(this.#trailsOffsets[index], this.#trailsOffsets[index], cumulativeOffset);
        }
      }
      this.#trailsOffsetLatest = EveBoosterSet2Renderable.#WrapOffsetIndex(
        this.#trailsOffsetLatest + iterationCount - 1
      );
    }

    vec3.subtract(this.#trailsOffsetAccu, this.#trailsOffsetAccu, cumulativeOffset);
    this.#trailsTimeToNext -=
      EveBoosterSet2Renderable.#positionOffsetDelta * iterationCount;
  }

  #UpdateSplineMetrics()
  {
    this.trailsTotalLength = 0;
    for (let index = 1; index < EveBoosterSet2Renderable.#controlPointCount; index++)
    {
      this.trailsTotalLength += vec3.distance(
        this.#trailsControlPositions[index],
        this.#trailsControlPositions[index - 1]
      );
    }

    vec3.set(this.trailsBoundsMin, Infinity, Infinity, Infinity);
    vec3.set(this.trailsBoundsMax, -Infinity, -Infinity, -Infinity);
    const radius = this.GetBoundingSphere()[3];
    for (const position of this.#trailsControlPositions)
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
      this.#boosterSet.trailsSmoothing,
      vec3.distance(this.#trailsControlPositions[1], this.#trailsControlPositions[0])
    );
    EveBoosterSet2Renderable.#TransformNormal(
      this.#trailsControlNormals[0],
      [0, 0, -firstLength],
      this.#parentTransform
    );

    const lastIndex = EveBoosterSet2Renderable.#controlPointCount - 1;
    vec3.subtract(
      this.#trailsControlNormals[lastIndex],
      this.#trailsControlPositions[lastIndex],
      this.#trailsControlPositions[lastIndex - 1]
    );
    vec3.scale(
      this.#trailsControlNormals[lastIndex],
      this.#trailsControlNormals[lastIndex],
      0.5
    );

    for (let index = 1; index < lastIndex; index++)
    {
      const normal = vec3.subtract(
        this.#trailsControlNormals[index],
        this.#trailsControlPositions[index + 1],
        this.#trailsControlPositions[index - 1]
      );
      const nextLength = vec3.distance(
        this.#trailsControlPositions[index + 1],
        this.#trailsControlPositions[index]
      );
      const previousLength = vec3.distance(
        this.#trailsControlPositions[index],
        this.#trailsControlPositions[index - 1]
      );
      if (vec3.squaredLength(normal))
      {
        vec3.normalize(normal, normal);
      }
      vec3.scale(normal, normal, nextLength);
      this.#trailsControlNormalsFactor[index] = nextLength
        ? previousLength / nextLength
        : 0;
    }

    this.#trailsSequenceLength[0] = 0;
    for (let index = 1; index < EveBoosterSet2Renderable.#controlPointCount; index++)
    {
      const length = vec3.distance(
        this.#trailsControlPositions[index],
        this.#trailsControlPositions[index - 1]
      );
      this.#trailsSequenceLength[index] = this.trailsTotalLength
        ? length / this.trailsTotalLength
        : 0;
    }
  }

  static #GetStaticOffsets(boosterSet)
  {
    return [
      boosterSet.trailsStaticOffsets0,
      boosterSet.trailsStaticOffsets1,
      boosterSet.trailsStaticOffsets2,
      boosterSet.trailsStaticOffsets3,
      boosterSet.trailsStaticOffsets4
    ];
  }

  static #SinSmooth(value)
  {
    return Math.sin(value * Math.PI - Math.PI / 2) / 2 + 0.5;
  }

  static #TransformNormal(out, value, transform)
  {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }

  static #WrapOffsetIndex(index)
  {
    const count = EveBoosterSet2Renderable.#positionOffsetCount;
    return ((index % count) + count) % count;
  }

  static #zero = Object.freeze([0, 0, 0]);

  static #zAxis = Object.freeze([0, 0, 1]);

  static #controlPointCount = 5;

  static #positionOffsetCount = 300;

  static #positionOffsetDelta = 0.0167;

  static #trailMinLength = 200;

  static #trailMinLengthFade = 1000;

  static #trailMaxLength = 50000;

  static #trailMaxLengthFade = 20000;

  static #floatMax = 3.4028234663852886e38;

}
