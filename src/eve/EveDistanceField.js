// Source: E:\carbonengine\trinity\trinity\Eve\EveDistanceField.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveDistanceField.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../curves/enums.js";
import { Tr2CurveScalar } from "../curves/curve/Tr2CurveScalar.js";
import { TriCurveSet } from "../curves/TriCurveSet.js";


/**
 * Tracks a set of moving points, estimates the volume covering them, and drives
 * a curve set from the eased camera distance to that volume.
 */
@type.define({
  className: "EveDistanceField",
  family: "eve"
})
export class EveDistanceField extends CjsModel
{
  @io.read
  @type.vec3
  dimensions = vec3.create();

  @io.read
  @type.vec3
  midpoint = vec3.create();

  @io.readwrite
  @type.float32
  distanceThreshold = 3;

  @io.readwrite
  @type.float32
  maxXZRatio = 1.5;

  @io.readwrite
  @type.float32
  minYRatio = 0.2;

  @io.readwrite
  @type.float32
  timeAdjustmentSecondsIn = 0.25;

  @io.readwrite
  @type.float32
  timeAdjustmentSecondsOut = 2;

  @io.notify
  @io.read
  @type.list("ITriVectorFunction")
  objects = [];

  @io.readwrite
  @type.objectRef("TriView")
  cameraView = null;

  @io.readwrite
  @type.objectRef("TriCurveSet")
  curveSet = null;

  @io.readwrite
  @type.float32
  distance = -1;

  @io.flag("distanceCurve")
  @io.notify
  @io.readwrite
  @type.float32
  minDistance = 0;

  @io.flag("distanceCurve")
  @io.notify
  @io.readwrite
  @type.float32
  maxDistance = 75000;

  #distanceCurve = null;

  #dirty = true;

  #updateDistanceCurve = false;

  #isDynamic = false;

  /**
   * Configures the field as static, so its extent and midpoint are the authored
   * ones rather than derived from tracked objects, and rebuilds the distance
   * curve set.
   */
  @carbon.method
  @impl.adapted
  SetupStaticDistanceField(dimensions, position, distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn)
  {
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
  @carbon.method
  @impl.implemented
  SetupDynamicDistanceField(distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn)
  {
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
  @carbon.method
  @impl.adapted
  Update(updateContext)
  {
    const cameraPosition = EveDistanceField.#getCameraPosition(this.cameraView);
    const time = EveDistanceField.#getTime(updateContext);
    if (this.#updateDistanceCurve)
    {
      this.#updateDistanceCurveSize();
    }
    if (this.distance < 0)
    {
      this.distance = this.maxDistance;
    }
    const originShift = EveDistanceField.#getOriginShift(updateContext);
    let distanceNow = this.maxDistance;
    if (this.#isDynamic)
    {
      distanceNow = this.#calculateFieldCoverageAndDistance(time, cameraPosition, originShift);
    }
    else
    {
      if (this.objects.length === 1)
      {
        EveDistanceField.#sampleObject(this.objects[0], time, this.midpoint);
      }
      else
      {
        vec3.add(this.midpoint, this.midpoint, originShift);
      }
      distanceNow = Math.min(distanceNow, vec3.distance(this.midpoint, cameraPosition));
    }
    const fraction = distanceNow > this.distance ? this.timeAdjustmentSecondsOut : this.timeAdjustmentSecondsIn;
    const delta = Math.min(1, EveDistanceField.#getDeltaT(updateContext) / (fraction || 1));
    this.distance = Math.min(this.distance * (1 - delta) + distanceNow * delta, this.maxDistance);
    if (this.curveSet)
    {
      if (!this.curveSet.IsPlaying())
      {
        this.curveSet.PlayFrom(this.distance);
      }
      else
      {
        this.curveSet.Update(this.distance);
      }
    }
  }

  /**
   * Defers a distance-curve rebuild to the next update when the minimum or
   * maximum distance changed.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.__state.flags.delete("distanceCurve"))
    {
      this.#updateDistanceCurve = true;
    }
    return true;
  }

  /**
   * Marks the coverage dirty when a tracked object is inserted, and resets the
   * midpoint and extent once the last one is removed; events for other lists are
   * ignored.
   */
  @carbon.method
  @impl.adapted
  OnListModified(event, _key = 0, _key2 = 0, _value = null, list = this.objects)
  {
    if (list !== this.objects)
    {
      return;
    }
    switch (event & 0x0f)
    {
      case 0x08:
        this.#dirty = true;
        break;
      case 0x09:
        if (this.objects.length === 0)
        {
          this.#setNeutralValues();
        }
        break;
    }
  }

  /** Debug rendering hook; this package produces no debug geometry. */
  @carbon.method
  @impl.noop
  RenderDebugInfo()
  {
  }

  /**
   * Builds the curve set the field drives: a single named scalar curve falling
   * linearly from 1 to 0 across the distance range.
   */
  #createCurveSet()
  {
    this.curveSet = new TriCurveSet();
    this.#distanceCurve = new Tr2CurveScalar();
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
  #updateDistanceCurveSize()
  {
    const keys = this.#distanceCurve?.GetKeys?.() ?? [];
    if (keys.length === 2)
    {
      keys[0].time = this.minDistance;
      keys[1].time = this.maxDistance;
      this.#distanceCurve.OnKeysChanged();
    }
    this.#distanceCurve?.SetTimeOffset?.(0);
    this.#updateDistanceCurve = false;
  }

  /** Zeroes the midpoint and extent once nothing is being tracked. */
  #setNeutralValues()
  {
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
  #calculateFieldCoverageAndDistance(time, cameraPosition, originShift)
  {
    if (this.objects.length === 0)
    {
      vec3.add(this.midpoint, this.midpoint, originShift);
      return vec3.length(cameraPosition);
    }
    const positions = this.objects.map(object => EveDistanceField.#sampleObject(object, time, vec3.create()));
    const average = vec3.create();
    let distanceNowSq = this.maxDistance * this.maxDistance;
    for (const position of positions)
    {
      vec3.scaleAndAdd(average, average, position, 1 / positions.length);
      distanceNowSq = Math.min(distanceNowSq, vec3.squaredDistance(position, cameraPosition));
    }
    if (this.#dirty)
    {
      let averageDistance = 0;
      for (const position of positions)
      {
        averageDistance += vec3.distance(position, average) / positions.length;
      }
      const accepted = positions.filter(position => this.distanceThreshold === 0 || vec3.distance(position, average) <= this.distanceThreshold * averageDistance);
      const minBounds = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
      const maxBounds = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
      for (const position of accepted)
      {
        vec3.min(minBounds, minBounds, position);
        vec3.max(maxBounds, maxBounds, position);
      }
      vec3.scale(this.midpoint, vec3.add(this.midpoint, minBounds, maxBounds), 0.5);
      vec3.subtract(this.dimensions, maxBounds, minBounds);
      if (this.maxXZRatio && this.dimensions[0] / this.dimensions[2] > this.maxXZRatio)
      {
        this.dimensions[2] = this.dimensions[0] / this.maxXZRatio;
      }
      else if (this.maxXZRatio && this.dimensions[2] / this.dimensions[0] > this.maxXZRatio)
      {
        this.dimensions[0] = this.dimensions[2] / this.maxXZRatio;
      }
      const horizontal = Math.max(this.dimensions[0], this.dimensions[2]);
      if (this.minYRatio && this.dimensions[1] / horizontal < this.minYRatio)
      {
        this.dimensions[1] = horizontal * this.minYRatio;
      }
      this.#dirty = false;
    }
    else
    {
      vec3.add(this.midpoint, this.midpoint, originShift);
    }
    return Math.sqrt(distanceNowSq);
  }

  /**
   * Evaluates a tracked vector curve at time into out, leaving out unchanged
   * when the curve yields nothing usable.
   */
  static #sampleObject(object, time, out)
  {
    const result = object?.GetValueAt?.(time, out);
    return result?.length >= 3 ? vec3.copy(out, result) : out;
  }

  /**
   * Camera position from the view, falling back to the translation of its
   * transform and then to the origin.
   */
  static #getCameraPosition(cameraView)
  {
    const direct = cameraView?.GetPosition?.();
    if (direct?.length >= 3)
    {
      return vec3.clone(direct);
    }
    const transform = cameraView?.GetTransform?.() ?? cameraView?.transform;
    return transform?.length >= 16 ? vec3.fromValues(transform[12], transform[13], transform[14]) : vec3.create();
  }

  /**
   * Reads the current time from an update context, accepting the
   * GetTime()/currentTime/time spellings.
   */
  static #getTime(context)
  {
    return Number(context?.GetTime?.() ?? context?.currentTime ?? context?.time ?? 0);
  }

  /**
   * Reads the frame delta from an update context, deriving it from the current
   * and last times when the context exposes no delta directly; the first frame
   * yields zero.
   */
  static #getDeltaT(context)
  {
    const direct = context?.GetDeltaT?.() ?? context?.deltaT;
    if (direct !== null && direct !== undefined)
    {
      return Number(direct) || 0;
    }
    const lastTime = Number(context?.lastTime ?? 0);
    return lastTime === 0 ? 0 : Number(context?.currentTime ?? 0) - lastTime;
  }

  /**
   * Reads the scene's floating-origin shift from an update context, or a zero
   * vector when it has none.
   */
  static #getOriginShift(context)
  {
    const value = context?.GetOriginShift?.() ?? context?.originShift;
    return value?.length >= 3 ? value : vec3.create();
  }
}
