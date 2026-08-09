import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2CurveInterpolation, Tr2CurveTangentType } from '../curves/enums.js';
import { Tr2CurveScalar as _Tr2CurveScalar } from '../curves/curves/Tr2CurveScalar.js';
import { TriCurveSet as _TriCurveSet } from '../curves/TriCurveSet.js';

let _initProto, _initClass, _init_dimensions, _init_extra_dimensions, _init_midpoint, _init_extra_midpoint, _init_distanceThreshold, _init_extra_distanceThreshold, _init_maxXZRatio, _init_extra_maxXZRatio, _init_minYRatio, _init_extra_minYRatio, _init_timeAdjustmentSecondsIn, _init_extra_timeAdjustmentSecondsIn, _init_timeAdjustmentSecondsOut, _init_extra_timeAdjustmentSecondsOut, _init_objects, _init_extra_objects, _init_cameraView, _init_extra_cameraView, _init_curveSet, _init_extra_curveSet, _init_distance, _init_extra_distance, _init_minDistance, _init_extra_minDistance, _init_maxDistance, _init_extra_maxDistance;

/**
 * Tracks a set of moving points, estimates the volume covering them, and drives
 * a curve set from the eased camera distance to that volume.
 */
let _EveDistanceField;
new class extends _identity {
  static [class EveDistanceField extends CjsModel {
    static {
      ({
        e: [_init_dimensions, _init_extra_dimensions, _init_midpoint, _init_extra_midpoint, _init_distanceThreshold, _init_extra_distanceThreshold, _init_maxXZRatio, _init_extra_maxXZRatio, _init_minYRatio, _init_extra_minYRatio, _init_timeAdjustmentSecondsIn, _init_extra_timeAdjustmentSecondsIn, _init_timeAdjustmentSecondsOut, _init_extra_timeAdjustmentSecondsOut, _init_objects, _init_extra_objects, _init_cameraView, _init_extra_cameraView, _init_curveSet, _init_extra_curveSet, _init_distance, _init_extra_distance, _init_minDistance, _init_extra_minDistance, _init_maxDistance, _init_extra_maxDistance, _initProto],
        c: [_EveDistanceField, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveDistanceField",
        family: "eve"
      })], [[[io, io.read, type, type.vec3], 16, "dimensions"], [[io, io.read, type, type.vec3], 16, "midpoint"], [[io, io.readwrite, type, type.float32], 16, "distanceThreshold"], [[io, io.readwrite, type, type.float32], 16, "maxXZRatio"], [[io, io.readwrite, type, type.float32], 16, "minYRatio"], [[io, io.readwrite, type, type.float32], 16, "timeAdjustmentSecondsIn"], [[io, io.readwrite, type, type.float32], 16, "timeAdjustmentSecondsOut"], [[io, io.notify, io, io.read, void 0, type.list("ITriVectorFunction")], 16, "objects"], [[io, io.readwrite, void 0, type.objectRef("TriView")], 16, "cameraView"], [[io, io.readwrite, void 0, type.objectRef("TriCurveSet")], 16, "curveSet"], [[io, io.readwrite, type, type.float32], 16, "distance"], [[void 0, io.flag("distanceCurve"), io, io.notify, io, io.readwrite, type, type.float32], 16, "minDistance"], [[void 0, io.flag("distanceCurve"), io, io.notify, io, io.readwrite, type, type.float32], 16, "maxDistance"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetupStaticDistanceField"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetupDynamicDistanceField"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnListModified"], [[carbon, carbon.method, impl, impl.noop], 18, "RenderDebugInfo"]], 0, void 0, CjsModel));
    }
    dimensions = (_initProto(this), _init_dimensions(this, vec3.create()));
    midpoint = (_init_extra_dimensions(this), _init_midpoint(this, vec3.create()));
    distanceThreshold = (_init_extra_midpoint(this), _init_distanceThreshold(this, 3));
    maxXZRatio = (_init_extra_distanceThreshold(this), _init_maxXZRatio(this, 1.5));
    minYRatio = (_init_extra_maxXZRatio(this), _init_minYRatio(this, 0.2));
    timeAdjustmentSecondsIn = (_init_extra_minYRatio(this), _init_timeAdjustmentSecondsIn(this, 0.25));
    timeAdjustmentSecondsOut = (_init_extra_timeAdjustmentSecondsIn(this), _init_timeAdjustmentSecondsOut(this, 2));
    objects = (_init_extra_timeAdjustmentSecondsOut(this), _init_objects(this, []));
    cameraView = (_init_extra_objects(this), _init_cameraView(this, null));
    curveSet = (_init_extra_cameraView(this), _init_curveSet(this, null));
    distance = (_init_extra_curveSet(this), _init_distance(this, -1));
    minDistance = (_init_extra_distance(this), _init_minDistance(this, 0));
    maxDistance = (_init_extra_minDistance(this), _init_maxDistance(this, 75000));
    #distanceCurve = (_init_extra_maxDistance(this), null);
    #dirty = true;
    #updateDistanceCurve = false;
    #isDynamic = false;

    /**
     * Configures the field as static, so its extent and midpoint are the authored
     * ones rather than derived from tracked objects, and rebuilds the distance
     * curve set.
     */
    SetupStaticDistanceField(dimensions, position, distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn) {
      this.#isDynamic = false;
      vec3.copy(this.dimensions, dimensions);
      vec3.copy(this.midpoint, position);
      this.distanceThreshold = distanceThreshold;
      this.timeAdjustmentSecondsIn = timeAdjustmentSecondsIn;
      this.timeAdjustmentSecondsOut = timeAdjustmentSecondsOut;
      this.#createCurveSet();
      this.#updateDistanceCurveSize();
    }

    /**
     * Configures the field as dynamic and marks the coverage dirty, so the
     * midpoint and extent are recomputed from the tracked objects on the next
     * update.
     */
    SetupDynamicDistanceField(distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn) {
      this.#isDynamic = true;
      this.#dirty = true;
      this.distanceThreshold = distanceThreshold;
      this.timeAdjustmentSecondsIn = timeAdjustmentSecondsIn;
      this.timeAdjustmentSecondsOut = timeAdjustmentSecondsOut;
      this.#createCurveSet();
    }

    /**
     * Measures the camera distance for this frame - to the midpoint when static,
     * to the nearest tracked point when dynamic - eases the stored distance
     * towards it using the in or out time constant depending on which way it
     * moves, and drives the curve set. The distance is the curve set's time axis,
     * not a delta.
     */
    Update(updateContext) {
      const cameraPosition = _EveDistanceField.#getCameraPosition(this.cameraView);
      const time = _EveDistanceField.#getTime(updateContext);
      if (this.#updateDistanceCurve) {
        this.#updateDistanceCurveSize();
      }
      if (this.distance < 0) {
        this.distance = this.maxDistance;
      }
      const originShift = _EveDistanceField.#getOriginShift(updateContext);
      let distanceNow = this.maxDistance;
      if (this.#isDynamic) {
        distanceNow = this.#calculateFieldCoverageAndDistance(time, cameraPosition, originShift);
      } else {
        if (this.objects.length === 1) {
          _EveDistanceField.#sampleObject(this.objects[0], time, this.midpoint);
        } else {
          vec3.add(this.midpoint, this.midpoint, originShift);
        }
        distanceNow = Math.min(distanceNow, vec3.distance(this.midpoint, cameraPosition));
      }
      const fraction = distanceNow > this.distance ? this.timeAdjustmentSecondsOut : this.timeAdjustmentSecondsIn;
      const delta = Math.min(1, _EveDistanceField.#getDeltaT(updateContext) / (fraction || 1));
      this.distance = Math.min(this.distance * (1 - delta) + distanceNow * delta, this.maxDistance);
      if (this.curveSet) {
        if (!this.curveSet.IsPlaying()) {
          this.curveSet.PlayFrom(this.distance);
        } else {
          this.curveSet.Update(this.distance);
        }
      }
    }

    /**
     * Defers a distance-curve rebuild to the next update when the minimum or
     * maximum distance changed.
     */
    OnModified(_options = {}) {
      if (this.__state.flags.delete("distanceCurve")) {
        this.#updateDistanceCurve = true;
      }
      return true;
    }

    /**
     * Marks the coverage dirty when a tracked object is inserted, and resets the
     * midpoint and extent once the last one is removed; events for other lists are
     * ignored.
     */
    OnListModified(event, _key = 0, _key2 = 0, _value = null, list = this.objects) {
      if (list !== this.objects) {
        return;
      }
      switch (event & 0x0f) {
        case 0x08:
          this.#dirty = true;
          break;
        case 0x09:
          if (this.objects.length === 0) {
            this.#setNeutralValues();
          }
          break;
      }
    }

    /** Debug rendering hook; this package produces no debug geometry. */
    RenderDebugInfo() {}

    /**
     * Builds the curve set the field drives: a single named scalar curve falling
     * linearly from 1 to 0 across the distance range.
     */
    #createCurveSet() {
      this.curveSet = new _TriCurveSet();
      this.#distanceCurve = new _Tr2CurveScalar();
      this.#distanceCurve.SetName("DistanceCurve");
      this.#distanceCurve.AddKey(0, 1, Tr2CurveInterpolation.LINEAR, 0, 0, Tr2CurveTangentType.AUTO);
      this.#distanceCurve.AddKey(50000, 0, Tr2CurveInterpolation.LINEAR, 0, 0, Tr2CurveTangentType.AUTO);
      this.#distanceCurve.SetTimeOffset(0);
      this.curveSet.AddCurve(this.#distanceCurve);
    }

    /**
     * Moves the distance curve's two keys onto the current minimum and maximum
     * distance and clears the pending-rebuild flag.
     */
    #updateDistanceCurveSize() {
      const keys = this.#distanceCurve?.GetKeys?.() ?? [];
      if (keys.length === 2) {
        keys[0].time = this.minDistance;
        keys[1].time = this.maxDistance;
        this.#distanceCurve.OnKeysChanged();
      }
      this.#distanceCurve?.SetTimeOffset?.(0);
      this.#updateDistanceCurve = false;
    }

    /** Zeroes the midpoint and extent once nothing is being tracked. */
    #setNeutralValues() {
      vec3.zero(this.midpoint);
      vec3.zero(this.dimensions);
    }

    /**
     * Samples every tracked object and returns the distance from the camera to the
     * nearest of them, capped at the maximum distance. While the coverage is dirty
     * it also rebuilds the midpoint and extent from the points lying within
     * distanceThreshold of the mean spread, enforcing the maximum X/Z ratio and
     * the minimum Y ratio.
     */
    #calculateFieldCoverageAndDistance(time, cameraPosition, originShift) {
      if (this.objects.length === 0) {
        vec3.add(this.midpoint, this.midpoint, originShift);
        return vec3.length(cameraPosition);
      }
      const positions = this.objects.map(object => _EveDistanceField.#sampleObject(object, time, vec3.create()));
      const average = vec3.create();
      let distanceNowSq = this.maxDistance * this.maxDistance;
      for (const position of positions) {
        vec3.scaleAndAdd(average, average, position, 1 / positions.length);
        distanceNowSq = Math.min(distanceNowSq, vec3.squaredDistance(position, cameraPosition));
      }
      if (this.#dirty) {
        let averageDistance = 0;
        for (const position of positions) {
          averageDistance += vec3.distance(position, average) / positions.length;
        }
        const accepted = positions.filter(position => this.distanceThreshold === 0 || vec3.distance(position, average) <= this.distanceThreshold * averageDistance);
        const minBounds = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
        const maxBounds = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
        for (const position of accepted) {
          vec3.min(minBounds, minBounds, position);
          vec3.max(maxBounds, maxBounds, position);
        }
        vec3.scale(this.midpoint, vec3.add(this.midpoint, minBounds, maxBounds), 0.5);
        vec3.subtract(this.dimensions, maxBounds, minBounds);
        if (this.maxXZRatio && this.dimensions[0] / this.dimensions[2] > this.maxXZRatio) {
          this.dimensions[2] = this.dimensions[0] / this.maxXZRatio;
        } else if (this.maxXZRatio && this.dimensions[2] / this.dimensions[0] > this.maxXZRatio) {
          this.dimensions[0] = this.dimensions[2] / this.maxXZRatio;
        }
        const horizontal = Math.max(this.dimensions[0], this.dimensions[2]);
        if (this.minYRatio && this.dimensions[1] / horizontal < this.minYRatio) {
          this.dimensions[1] = horizontal * this.minYRatio;
        }
        this.#dirty = false;
      } else {
        vec3.add(this.midpoint, this.midpoint, originShift);
      }
      return Math.sqrt(distanceNowSq);
    }

    /**
     * Evaluates a tracked vector curve at time into out, leaving out unchanged
     * when the curve yields nothing usable.
     */

    /**
     * Camera position from the view, falling back to the translation of its
     * transform and then to the origin.
     */

    /**
     * Reads the current time from an update context, accepting the
     * GetTime()/currentTime/time spellings.
     */

    /**
     * Reads the frame delta from an update context, deriving it from the current
     * and last times when the context exposes no delta directly; the first frame
     * yields zero.
     */

    /**
     * Reads the scene's floating-origin shift from an update context, or a zero
     * vector when it has none.
     */
  }];
  #sampleObject(object, time, out) {
    const result = object?.GetValueAt?.(time, out);
    return result?.length >= 3 ? vec3.copy(out, result) : out;
  }
  #getCameraPosition(cameraView) {
    const direct = cameraView?.GetPosition?.();
    if (direct?.length >= 3) {
      return vec3.clone(direct);
    }
    const transform = cameraView?.GetTransform?.() ?? cameraView?.transform;
    return transform?.length >= 16 ? vec3.fromValues(transform[12], transform[13], transform[14]) : vec3.create();
  }
  #getTime(context) {
    return Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
  }
  #getDeltaT(context) {
    const direct = context?.GetDeltaT?.() ?? context?.deltaT;
    if (direct !== null && direct !== undefined) {
      return Number(direct) || 0;
    }
    const lastTime = Number(context?.lastTime ?? 0);
    return lastTime === 0 ? 0 : Number(context?.currentTime ?? 0) - lastTime;
  }
  #getOriginShift(context) {
    const value = context?.GetOriginShift?.() ?? context?.originShift;
    return value?.length >= 3 ? value : vec3.create();
  }
  constructor() {
    super(_EveDistanceField), _initClass();
  }
}();

export { _EveDistanceField as EveDistanceField };
//# sourceMappingURL=EveDistanceField.js.map
