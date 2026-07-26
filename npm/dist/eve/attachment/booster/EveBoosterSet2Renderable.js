import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { sph3 } from '@carbonenginejs/runtime-utils/sph3';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_trailIntensity, _init_extra_trailIntensity, _init_trailsTotalLength, _init_extra_trailsTotalLength, _init_isVisible, _init_extra_isVisible, _init_trailsVisible, _init_extra_trailsVisible, _init_boostersVisible, _init_extra_boostersVisible, _init_trailsTimeDelta, _init_extra_trailsTimeDelta, _init_boosterHighLod, _init_extra_boosterHighLod, _init_trailsBoundsMax, _init_extra_trailsBoundsMax, _init_trailsBoundsMin, _init_extra_trailsBoundsMin, _init_overallIntensity, _init_extra_overallIntensity, _init_parentRotation, _init_extra_parentRotation, _init_parentSpeed, _init_extra_parentSpeed;
let _EveBoosterSet2Render;
new class extends _identity {
  static [class EveBoosterSet2Renderable extends CjsModel {
    static {
      ({
        e: [_init_trailIntensity, _init_extra_trailIntensity, _init_trailsTotalLength, _init_extra_trailsTotalLength, _init_isVisible, _init_extra_isVisible, _init_trailsVisible, _init_extra_trailsVisible, _init_boostersVisible, _init_extra_boostersVisible, _init_trailsTimeDelta, _init_extra_trailsTimeDelta, _init_boosterHighLod, _init_extra_boosterHighLod, _init_trailsBoundsMax, _init_extra_trailsBoundsMax, _init_trailsBoundsMin, _init_extra_trailsBoundsMin, _init_overallIntensity, _init_extra_overallIntensity, _init_parentRotation, _init_extra_parentRotation, _init_parentSpeed, _init_extra_parentSpeed, _initProto],
        c: [_EveBoosterSet2Render, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveBoosterSet2Renderable",
        family: "eve/attachment/boosters"
      })], [[[io, io.read, type, type.float32], 16, "trailIntensity"], [[io, io.read, type, type.float32], 16, "trailsTotalLength"], [[io, io.read, type, type.boolean], 16, "isVisible"], [[io, io.read, type, type.boolean], 16, "trailsVisible"], [[io, io.read, type, type.boolean], 16, "boostersVisible"], [[io, io.persist, type, type.float32], 16, "trailsTimeDelta"], [[io, io.read, type, type.boolean], 16, "boosterHighLod"], [[io, io.read, type, type.vec3], 16, "trailsBoundsMax"], [[io, io.read, type, type.vec3], 16, "trailsBoundsMin"], [[io, io.read, type, type.float32], 16, "overallIntensity"], [[io, io.readwrite, type, type.quat], 16, "parentRotation"], [[io, io.readwrite, type, type.float32], 16, "parentSpeed"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBoosterSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "CalculateIntensity"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateTrails"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetTrailSplineData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetIntensity"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon's direct member access becomes an accessor; JS has no protected fields.")], 18, "GetParentTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"]], 0, void 0, CjsModel));
    }
    /** m_trailIntensity (float) [READ] */
    trailIntensity = (_initProto(this), _init_trailIntensity(this, 0));

    /** m_trailsTotalLength (float) [READ] */
    trailsTotalLength = (_init_extra_trailIntensity(this), _init_trailsTotalLength(this, 0));

    /** m_isVisible (bool) [READ] */
    isVisible = (_init_extra_trailsTotalLength(this), _init_isVisible(this, false));

    /** m_trailsVisible (bool) [READ] */
    trailsVisible = (_init_extra_isVisible(this), _init_trailsVisible(this, false));

    /** m_boostersVisible (bool) [READ] */
    boostersVisible = (_init_extra_trailsVisible(this), _init_boostersVisible(this, false));

    /** m_trailsTimeDelta (float) [READWRITE, PERSIST] */
    trailsTimeDelta = (_init_extra_boostersVisible(this), _init_trailsTimeDelta(this, 1));

    /** m_boosterHighLod (bool) [READ] */
    boosterHighLod = (_init_extra_trailsTimeDelta(this), _init_boosterHighLod(this, false));

    /** m_trailsBoundsMax (Vector3) [READ] */
    trailsBoundsMax = (_init_extra_boosterHighLod(this), _init_trailsBoundsMax(this, vec3.fromValues(-_EveBoosterSet2Render.#floatMax, -_EveBoosterSet2Render.#floatMax, -_EveBoosterSet2Render.#floatMax)));

    /** m_trailsBoundsMin (Vector3) [READ] */
    trailsBoundsMin = (_init_extra_trailsBoundsMax(this), _init_trailsBoundsMin(this, vec3.fromValues(_EveBoosterSet2Render.#floatMax, _EveBoosterSet2Render.#floatMax, _EveBoosterSet2Render.#floatMax)));

    /** m_overallIntensity (float) [READ] */
    overallIntensity = (_init_extra_trailsBoundsMin(this), _init_overallIntensity(this, 0));

    /** m_parentRotation (Quaternion) [READWRITE] */
    parentRotation = (_init_extra_overallIntensity(this), _init_parentRotation(this, quat.create()));

    /** m_parentSpeed (float) [READWRITE] */
    parentSpeed = (_init_extra_parentRotation(this), _init_parentSpeed(this, 0));
    #boosterSet = (_init_extra_parentSpeed(this), null);
    #lastAccFactor = 0;
    #lastValue = 0;
    #parentTransform = mat4.create();
    #trailsControlPositions = Array.from({
      length: _EveBoosterSet2Render.#controlPointCount
    }, () => vec3.create());
    #trailsControlNormals = Array.from({
      length: _EveBoosterSet2Render.#controlPointCount
    }, () => vec3.fromValues(0, 0, -1));
    #trailsControlNormalsFactor = new Float32Array(_EveBoosterSet2Render.#controlPointCount).fill(1);
    #trailsSequenceLength = new Float32Array(_EveBoosterSet2Render.#controlPointCount);
    #trailsOffsets = Array.from({
      length: _EveBoosterSet2Render.#positionOffsetCount
    }, () => vec3.create());
    #trailsOffsetLatest = 0;
    #trailsOffsetAccu = vec3.create();
    #trailsTimeToNext = 0;
    SetBoosterSet(boosterSet) {
      this.#boosterSet = boosterSet ?? null;
    }
    CalculateIntensity(acceleration) {
      const boosterSet = this.#boosterSet;
      if (!boosterSet) {
        return 0;
      }
      if (boosterSet.alwaysOn) {
        return boosterSet.alwaysOnIntensity;
      }
      const backward = vec3.transformQuat(vec3.create(), _EveBoosterSet2Render.#zAxis, this.parentRotation);
      const speedRatio = boosterSet.maxVel ? this.parentSpeed / boosterSet.maxVel : 0;
      let accFactor = vec3.dot(acceleration ?? _EveBoosterSet2Render.#zero, backward);
      accFactor *= Math.max(0.3, speedRatio);
      accFactor = Math.min(1, Math.max(0, accFactor));
      accFactor = accFactor * 0.2 + this.#lastAccFactor * 0.8;
      this.#lastAccFactor = accFactor;
      let value = this.#lastValue * 0.8 + (0.8 * speedRatio + 0.2 * accFactor) * 0.2;
      value = Math.min(value, 2);
      this.#lastValue = value;
      return value;
    }
    Update(deltaTime, _time, parentMatrix, parentSpeed, parentAcceleration, parentRotation) {
      const boosterSet = this.#boosterSet;
      if (boosterSet?.destinyUpdate) {
        this.parentSpeed = Number(parentSpeed) || 0;
      } else if (deltaTime && parentMatrix?.length === 16) {
        const dx = parentMatrix[12] - this.#parentTransform[12];
        const dy = parentMatrix[13] - this.#parentTransform[13];
        const dz = parentMatrix[14] - this.#parentTransform[14];
        this.parentSpeed = Math.hypot(dx, dy, dz) / Number(deltaTime);
      }
      if (parentMatrix?.length === 16) {
        mat4.copy(this.#parentTransform, parentMatrix);
      }
      if (parentRotation?.length === 4) {
        quat.copy(this.parentRotation, parentRotation);
      }
      this.overallIntensity = this.CalculateIntensity(parentAcceleration);
      return this.overallIntensity;
    }
    UpdateTrails(deltaTime, _time = 0) {
      const boosterSet = this.#boosterSet;
      if (!boosterSet) {
        return false;
      }
      this.#CalculateSplineData(deltaTime);
      const length = this.trailsTotalLength;
      if (length > _EveBoosterSet2Render.#trailMinLength && length < _EveBoosterSet2Render.#trailMinLength + _EveBoosterSet2Render.#trailMinLengthFade) {
        this.trailIntensity = _EveBoosterSet2Render.#SinSmooth((length - _EveBoosterSet2Render.#trailMinLength) / _EveBoosterSet2Render.#trailMinLengthFade);
      } else if (length > _EveBoosterSet2Render.#trailMaxLength - _EveBoosterSet2Render.#trailMaxLengthFade && length < _EveBoosterSet2Render.#trailMaxLength) {
        this.trailIntensity = _EveBoosterSet2Render.#SinSmooth((_EveBoosterSet2Render.#trailMaxLength - length) / _EveBoosterSet2Render.#trailMaxLengthFade);
      } else if (length < _EveBoosterSet2Render.#trailMinLength || length > _EveBoosterSet2Render.#trailMaxLength) {
        this.trailIntensity = 0;
      } else {
        this.trailIntensity = 1;
      }
      if (boosterSet.alwaysOn) {
        this.trailIntensity = 1;
      }
      return true;
    }
    GetTrailSplineData() {
      return {
        positions: this.#trailsControlPositions.map((position, index) => vec4.fromValues(position[0], position[1], position[2], this.#trailsSequenceLength[index])),
        normals: this.#trailsControlNormals.map((normal, index) => vec4.fromValues(normal[0], normal[1], normal[2], this.#trailsControlNormalsFactor[index])),
        totalLength: this.trailsTotalLength,
        intensity: this.trailIntensity,
        boundsMin: vec3.clone(this.trailsBoundsMin),
        boundsMax: vec3.clone(this.trailsBoundsMax)
      };
    }
    GetIntensity() {
      return this.overallIntensity;
    }

    /** Carbon EveBoosterSet2Renderable::HasTransparentBatches is always false
     * (additive batches only, via the instanced geometry provider). */
    HasTransparentBatches() {
      return false;
    }

    /** Carbon EveBoosterSet2Renderable::GetSortValue is the constant one. */
    GetSortValue() {
      return 1;
    }

    /** Carbon EveBoosterSet2Renderable::GetBatches submits the instanced booster geometry (GPU-backed). */
    GetBatches(_accumulator, _batchType, _perObjectData, _reason) {
      throw new Error("EveBoosterSet2Renderable.GetBatches is not implemented in CarbonEngineJS.");
    }

    /** Carbon EveBoosterSet2Renderable::GetPerObjectData (cpp:260-289): the
     * EveBoosterSetPerObjectData composite - a VertexShaderData + PixelShaderData
     * pair uploaded as TWO constant buffers (cpp:1325-1329). Here that is two
     * Allocs returned as a { vs, ps } record. Set(MATRIX) performs Carbon's
     * `Transpose(m_parentTransform)`; both 5-slot trail arrays are fully
     * written, exactly as Carbon's loop. The padding scalars are never written
     * (Carbon leaves them uninitialized). */
    GetPerObjectData(accumulator) {
      const vs = accumulator.Alloc("EveBoosterSetVSData");
      const ps = accumulator.Alloc("EveBoosterSetPSData");
      vs.Set("shipMatrix", this.#parentTransform);
      vs.Set("boosterIntensity", [this.overallIntensity]);
      vs.Set("shipSpeed", [this.parentSpeed]);
      vs.Set("maxBoosterSize", [this.#boosterSet?.maxSize ?? 0]);
      ps.Set("boosterIntensity", [this.overallIntensity]);
      ps.Set("trailIntensity", [this.trailIntensity]);
      ps.Set("warpIntensity", [this.#boosterSet?.warpIntensity ?? 0]);
      for (let index = 0; index < this.#trailsControlPositions.length; index++) {
        const position = this.#trailsControlPositions[index];
        const normal = this.#trailsControlNormals[index];
        vs.Set("trailsControlPositions", [position[0], position[1], position[2], this.#trailsSequenceLength[index]], index);
        vs.Set("trailsControlNormals", [normal[0], normal[1], normal[2], this.#trailsControlNormalsFactor[index]], index);
      }
      return {
        vs,
        ps
      };
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
    UpdateVisibility(updateContext) {
      const frustum = updateContext?.GetFrustum?.();
      if (!frustum || !this.#boosterSet) {
        return false;
      }
      const boundingSphere = this.GetBoundingSphere(_EveBoosterSet2Render.#visibilitySphere);
      const lowDetailThreshold = updateContext.GetLowDetailThreshold();
      const boosterLod = 2 * frustum.GetPixelSizeAccross(boundingSphere);
      this.boosterHighLod = boosterLod > updateContext.GetMediumDetailThreshold() * 1.5;
      this.boostersVisible = boosterLod > lowDetailThreshold;
      const viewPos = frustum.viewPos;
      let closestIndex = 0;
      let closestSqDistance = Infinity;
      for (let index = 0; index < _EveBoosterSet2Render.#controlPointCount; index++) {
        const position = this.#trailsControlPositions[index];
        const sqDistance = vec3.squaredDistance(position, viewPos);
        if (sqDistance < closestSqDistance) {
          closestSqDistance = sqDistance;
          closestIndex = index;
        }
      }
      const trailsSphere = sph3.fromPositionRadius(_EveBoosterSet2Render.#trailsSphere, this.#trailsControlPositions[closestIndex], sph3.radius(boundingSphere));
      const trailsLod = 7.5 * frustum.GetPixelSizeAccross(trailsSphere);
      this.trailsVisible = trailsLod > lowDetailThreshold;
      this.isVisible = frustum.IsSphereVisible(boundingSphere) || frustum.IsBoxVisible(this.trailsBoundsMin, this.trailsBoundsMax);
      return this.isVisible;
    }

    /** Carbon EveBoosterSet2Renderable::GetRenderables (cpp:349-356): submits
     * itself only when UpdateVisibility left it visible. */
    GetRenderables(out = []) {
      if (this.isVisible) {
        out.push(this);
      }
      return out;
    }

    /** Protected-equivalent read of Carbon's m_parentTransform
     * (EveBoosterSet2.h:132) - the owning set's GetLights transforms each
     * booster light position by it (cpp:1305/1314). Returns the live buffer;
     * read-only by convention. */
    GetParentTransform() {
      return this.#parentTransform;
    }

    /** Carbon EveBoosterSet2Renderable::GetBoundingSphere (cpp:295-303): the
     * authored sphere pushed back half a radius to cover the exhaust glow, its
     * centre transformed into world space, and its radius DOUBLED. The radius is
     * set outright rather than run through sph3.transformMat4, because Carbon
     * transforms only the centre (TransformCoord) and never scales w.
     *
     * `out` is required, as in Carbon (`Vector4&`) - this is called per frame and
     * must not allocate. */
    GetBoundingSphere(out) {
      const boosterSet = this.#boosterSet;
      if (!boosterSet) {
        return sph3.empty(out);
      }
      const position = sph3.$position(out);
      vec3.copy(position, boosterSet.boosterBoundingSphereCenter);
      position[2] -= 0.5 * boosterSet.boosterBoundingSphereRadius;
      vec3.transformMat4(position, position, this.#parentTransform);
      out[3] = 2 * boosterSet.boosterBoundingSphereRadius;
      return out;
    }
    #CalculateSplineData(deltaTime) {
      const elapsed = Number(deltaTime);
      if (!(elapsed > 0)) {
        return false;
      }
      const boosterSet = this.#boosterSet;
      const parentPosition = vec3.fromValues(this.#parentTransform[12], this.#parentTransform[13], this.#parentTransform[14]);
      if (boosterSet.physicsUpdate) {
        this.#UpdatePhysicsTrailOffsets(elapsed);
        const stride = Math.trunc(this.trailsTimeDelta / _EveBoosterSet2Render.#positionOffsetDelta);
        let ringIndex = this.#trailsOffsetLatest;
        for (let index = 0; index < _EveBoosterSet2Render.#controlPointCount; index++) {
          vec3.add(this.#trailsControlPositions[index], parentPosition, this.#trailsOffsets[ringIndex]);
          ringIndex = _EveBoosterSet2Render.#WrapOffsetIndex(ringIndex - stride);
        }
      } else {
        const offsets = _EveBoosterSet2Render.#GetStaticOffsets(boosterSet);
        for (let index = 0; index < _EveBoosterSet2Render.#controlPointCount; index++) {
          _EveBoosterSet2Render.#TransformNormal(this.#trailsControlPositions[index], offsets[index], this.#parentTransform);
          vec3.add(this.#trailsControlPositions[index], this.#trailsControlPositions[index], parentPosition);
        }
      }
      this.#UpdateSplineMetrics();
      return true;
    }
    #UpdatePhysicsTrailOffsets(deltaTime) {
      const movement = vec3.transformQuat(vec3.create(), _EveBoosterSet2Render.#zAxis, this.parentRotation);
      vec3.scale(movement, movement, deltaTime * this.parentSpeed);
      this.#trailsTimeToNext += deltaTime;
      vec3.subtract(this.#trailsOffsetAccu, this.#trailsOffsetAccu, movement);
      const iterationCount = Math.trunc(this.#trailsTimeToNext / _EveBoosterSet2Render.#positionOffsetDelta);
      if (!iterationCount) {
        return;
      }
      const fraction = _EveBoosterSet2Render.#positionOffsetDelta / this.#trailsTimeToNext;
      const cumulativeOffset = vec3.scale(vec3.create(), this.#trailsOffsetAccu, fraction * iterationCount);
      if (iterationCount < 20) {
        if (vec3.squaredLength(this.#trailsOffsetAccu) > 0.00001) {
          for (const offset of this.#trailsOffsets) {
            vec3.add(offset, offset, cumulativeOffset);
          }
        }
        for (let index = 0; index < iterationCount; index++) {
          this.#trailsOffsetLatest = _EveBoosterSet2Render.#WrapOffsetIndex(this.#trailsOffsetLatest + 1);
          vec3.scale(this.#trailsOffsets[this.#trailsOffsetLatest], this.#trailsOffsetAccu, (iterationCount - 1 - index) * fraction);
        }
      } else {
        this.#trailsOffsetLatest = _EveBoosterSet2Render.#WrapOffsetIndex(this.#trailsOffsetLatest + 1);
        const partialOffset = vec3.scale(vec3.create(), this.#trailsOffsetAccu, fraction);
        for (let index = 0; index < _EveBoosterSet2Render.#positionOffsetCount; index++) {
          const relativeIndex = _EveBoosterSet2Render.#WrapOffsetIndex(index - this.#trailsOffsetLatest);
          if (relativeIndex < iterationCount) {
            vec3.scale(this.#trailsOffsets[index], partialOffset, iterationCount - 1 - relativeIndex);
          } else {
            vec3.add(this.#trailsOffsets[index], this.#trailsOffsets[index], cumulativeOffset);
          }
        }
        this.#trailsOffsetLatest = _EveBoosterSet2Render.#WrapOffsetIndex(this.#trailsOffsetLatest + iterationCount - 1);
      }
      vec3.subtract(this.#trailsOffsetAccu, this.#trailsOffsetAccu, cumulativeOffset);
      this.#trailsTimeToNext -= _EveBoosterSet2Render.#positionOffsetDelta * iterationCount;
    }
    #UpdateSplineMetrics() {
      this.trailsTotalLength = 0;
      for (let index = 1; index < _EveBoosterSet2Render.#controlPointCount; index++) {
        this.trailsTotalLength += vec3.distance(this.#trailsControlPositions[index], this.#trailsControlPositions[index - 1]);
      }
      vec3.set(this.trailsBoundsMin, Infinity, Infinity, Infinity);
      vec3.set(this.trailsBoundsMax, -Infinity, -Infinity, -Infinity);
      const radius = sph3.radius(this.GetBoundingSphere(_EveBoosterSet2Render.#boundsSphere));
      for (const position of this.#trailsControlPositions) {
        for (let axis = 0; axis < 3; axis++) {
          this.trailsBoundsMin[axis] = Math.min(this.trailsBoundsMin[axis], position[axis] - radius);
          this.trailsBoundsMax[axis] = Math.max(this.trailsBoundsMax[axis], position[axis] + radius);
        }
      }
      const firstLength = Math.min(this.#boosterSet.trailsSmoothing, vec3.distance(this.#trailsControlPositions[1], this.#trailsControlPositions[0]));
      _EveBoosterSet2Render.#TransformNormal(this.#trailsControlNormals[0], [0, 0, -firstLength], this.#parentTransform);
      const lastIndex = _EveBoosterSet2Render.#controlPointCount - 1;
      vec3.subtract(this.#trailsControlNormals[lastIndex], this.#trailsControlPositions[lastIndex], this.#trailsControlPositions[lastIndex - 1]);
      vec3.scale(this.#trailsControlNormals[lastIndex], this.#trailsControlNormals[lastIndex], 0.5);
      for (let index = 1; index < lastIndex; index++) {
        const normal = vec3.subtract(this.#trailsControlNormals[index], this.#trailsControlPositions[index + 1], this.#trailsControlPositions[index - 1]);
        const nextLength = vec3.distance(this.#trailsControlPositions[index + 1], this.#trailsControlPositions[index]);
        const previousLength = vec3.distance(this.#trailsControlPositions[index], this.#trailsControlPositions[index - 1]);
        if (vec3.squaredLength(normal)) {
          vec3.normalize(normal, normal);
        }
        vec3.scale(normal, normal, nextLength);
        this.#trailsControlNormalsFactor[index] = nextLength ? previousLength / nextLength : 0;
      }
      this.#trailsSequenceLength[0] = 0;
      for (let index = 1; index < _EveBoosterSet2Render.#controlPointCount; index++) {
        const length = vec3.distance(this.#trailsControlPositions[index], this.#trailsControlPositions[index - 1]);
        this.#trailsSequenceLength[index] = this.trailsTotalLength ? length / this.trailsTotalLength : 0;
      }
    }

    /** Per-frame visibility scratch - UpdateVisibility must not allocate. */
  }];
  #GetStaticOffsets(boosterSet) {
    return [boosterSet.trailsStaticOffsets0, boosterSet.trailsStaticOffsets1, boosterSet.trailsStaticOffsets2, boosterSet.trailsStaticOffsets3, boosterSet.trailsStaticOffsets4];
  }
  #SinSmooth(value) {
    return Math.sin(value * Math.PI - Math.PI / 2) / 2 + 0.5;
  }
  #TransformNormal(out, value, transform) {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    out[0] = transform[0] * x + transform[4] * y + transform[8] * z;
    out[1] = transform[1] * x + transform[5] * y + transform[9] * z;
    out[2] = transform[2] * x + transform[6] * y + transform[10] * z;
    return out;
  }
  #WrapOffsetIndex(index) {
    const count = _EveBoosterSet2Render.#positionOffsetCount;
    return (index % count + count) % count;
  }
  #zero = Object.freeze([0, 0, 0]);
  #zAxis = Object.freeze([0, 0, 1]);
  #controlPointCount = 5;
  #positionOffsetCount = 300;
  #positionOffsetDelta = 0.0167;
  #trailMinLength = 200;
  #trailMinLengthFade = 1000;
  #trailMaxLength = 50000;
  #trailMaxLengthFade = 20000;
  #floatMax = 3.4028234663852886e38;
  #visibilitySphere = sph3.create();
  #trailsSphere = sph3.create();
  #boundsSphere = sph3.create();
  constructor() {
    super(_EveBoosterSet2Render), _initClass();
  }
}();

export { _EveBoosterSet2Render as EveBoosterSet2Renderable };
//# sourceMappingURL=EveBoosterSet2Renderable.js.map
