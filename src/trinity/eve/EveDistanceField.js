// Source: trinity/trinity/Eve/EveDistanceField.h
// Source: trinity/trinity/Eve/EveDistanceField.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../global/blue/INotify.js";
import { IListNotify } from "../../global/blue/IListNotify.js";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { meta } from "#schema";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../curves/enums.js";
import { Tr2CurveScalar } from "../curves/curve/Tr2CurveScalar.js";
import { TriCurveSet } from "../curves/TriCurveSet.js";


/**
 * Tracks a set of moving points, estimates the volume covering them, and drives
 * a curve set from the eased camera distance to that volume.
 */
@meta.define({
  className: "EveDistanceField",
  family: "eve"
})
@meta.blue.inherit(INotify)
@meta.blue.interface(IListNotify, INotify)
export class EveDistanceField
{
  @meta.blue.read
  @meta.type.vec3
  dimensions = vec3.create();

  @meta.blue.read
  @meta.type.vec3
  midpoint = vec3.create();

  @meta.blue.readwrite
  @meta.type.float32
  distanceThreshold = 3;

  @meta.blue.readwrite
  @meta.type.float32
  maxXZRatio = 1.5;

  @meta.blue.readwrite
  @meta.type.float32
  minYRatio = 0.2;

  @meta.blue.readwrite
  @meta.type.float32
  timeAdjustmentSecondsIn = 0.25;

  @meta.blue.readwrite
  @meta.type.float32
  timeAdjustmentSecondsOut = 2;

  @meta.blue.notify
  @meta.blue.read
  @meta.type.list("ITriVectorFunction")
  objects = [];

  @meta.blue.readwrite
  @meta.type.rootRef("TriView")
  cameraView = null;

  @meta.blue.readwrite
  @meta.type.rootRef("TriCurveSet")
  curveSet = null;

  @meta.blue.readwrite
  @meta.type.float32
  distance = -1;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  minDistance = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  maxDistance = 75000;

  _distanceCurve = null;

  _dirty = true;

  _updateDistanceCurve = false;

  _isDynamic = false;

  /**
   * Configures the field as static, so its extent and midpoint are the authored
   * ones rather than derived from tracked objects, and rebuilds the distance
   * curve set.
   */
  @meta.blue.method
  @meta.adapted
  SetupStaticDistanceField(dimensions, position, distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn)
  {
    this._isDynamic = false;
    vec3.copy(this.dimensions, dimensions);
    vec3.copy(this.midpoint, position);
    this.distanceThreshold = distanceThreshold;
    this.timeAdjustmentSecondsIn = timeAdjustmentSecondsIn;
    this.timeAdjustmentSecondsOut = timeAdjustmentSecondsOut;
    this._CreateCurveSet();
    this._UpdateDistanceCurveSize();
  }

  /**
   * Configures the field as dynamic and marks the coverage dirty, so the
   * midpoint and extent are recomputed from the tracked objects on the next
   * update.
   */
  @meta.blue.method
  @meta.implemented
  @meta.invalidates("#dirty")
  SetupDynamicDistanceField(distanceThreshold, timeAdjustmentSecondsOut, timeAdjustmentSecondsIn)
  {
    this._isDynamic = true;
    this._dirty = true;
    this.distanceThreshold = distanceThreshold;
    this.timeAdjustmentSecondsIn = timeAdjustmentSecondsIn;
    this.timeAdjustmentSecondsOut = timeAdjustmentSecondsOut;
    this._CreateCurveSet();
  }

  /**
   * Measures the camera distance for this frame - to the midpoint when static,
   * to the nearest tracked point when dynamic - eases the stored distance
   * towards it using the in or out time constant depending on which way it
   * moves, and drives the curve set. The distance is the curve set's time axis,
   * not a delta.
   */
  @meta.blue.method
  @meta.adapted
  Update(updateContext)
  {
    // posRef: the camera view's translation, or the origin without one (cpp:112-116).
    const cameraPosition = vec3.set(EveDistanceField._cameraPosition, 0, 0, 0);
    if (this.cameraView)
    {
      const transform = this.cameraView.GetTransform(EveDistanceField._cameraTransform);
      vec3.set(cameraPosition, transform[12], transform[13], transform[14]);
    }
    const time = updateContext.GetTime();
    if (this._updateDistanceCurve)
    {
      this._UpdateDistanceCurveSize();
    }
    if (this.distance < 0)
    {
      this.distance = this.maxDistance;
    }
    const originShift = updateContext.GetOriginShift();
    let distanceNow = this.maxDistance;
    if (this._isDynamic)
    {
      distanceNow = this._CalculateFieldCoverageAndDistance(time, cameraPosition, originShift);
    }
    else
    {
      if (this.objects.length === 1)
      {
        EveDistanceField._sampleObject(this.objects[0], time, this.midpoint);
      }
      else
      {
        vec3.add(this.midpoint, this.midpoint, originShift);
      }
      distanceNow = Math.min(distanceNow, vec3.distance(this.midpoint, cameraPosition));
    }
    const fraction = distanceNow > this.distance ? this.timeAdjustmentSecondsOut : this.timeAdjustmentSecondsIn;
    const delta = Math.min(1, updateContext.GetDeltaT() / (fraction || 1));
    this.distance = Math.min(this.distance * (1 - delta) + distanceNow * delta, this.maxDistance);
    if (this.curveSet)
    {
      if (!this.curveSet.IsPlaying())
      {
        this.curveSet.PlayFrom(this.distance);
      }
      else
      {
        this.curveSet.Update(this.distance, updateContext.renderContext);
      }
    }
  }

  /**
   * Defers a distance-curve rebuild to the next update when the minimum or
   * maximum distance changed.
   */
  @meta.blue.method
  @meta.implemented
  @meta.invalidates("#updateDistanceCurve")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "minDistance") || IsMatch(propertyName, "maxDistance"))
    {
      this._updateDistanceCurve = true;
    }
    return true;
  }

  /**
   * Marks the coverage dirty when a tracked object is inserted, and resets the
   * midpoint and extent once the last one is removed; events for other lists are
   * ignored.
   */
  @meta.blue.method
  @meta.adapted
  @meta.invalidates("#dirty")
  OnListModified(event, _key = 0, _key2 = 0, _value = null, list = this.objects)
  {
    if (list !== this.objects)
    {
      return;
    }
    switch (event & 0x0f)
    {
      case 0x08:
        this._dirty = true;
        break;
      case 0x09:
        if (this.objects.length === 0)
        {
          this._SetNeutralValues();
        }
        break;
    }
  }

  /** Debug rendering hook; this package produces no debug geometry. */
  @meta.blue.method
  @meta.noop
  RenderDebugInfo()
  {
  }

  /**
   * Builds the curve set the field drives: a single named scalar curve falling
   * linearly from 1 to 0 across the distance range.
   */
  _CreateCurveSet()
  {
    this.curveSet = new TriCurveSet();
    this._distanceCurve = new Tr2CurveScalar();
    this._distanceCurve.SetName("DistanceCurve");
    this._distanceCurve.AddKey(0, 1, Tr2CurveInterpolation.LINEAR, 0, 0, Tr2CurveTangentType.AUTO);
    this._distanceCurve.AddKey(50000, 0, Tr2CurveInterpolation.LINEAR, 0, 0, Tr2CurveTangentType.AUTO);
    this._distanceCurve.SetTimeOffset(0);
    this.curveSet.AddCurve(this._distanceCurve);
  }

  /**
   * Moves the distance curve's two keys onto the current minimum and maximum
   * distance and clears the pending-rebuild flag.
   */
  _UpdateDistanceCurveSize()
  {
    // Carbon retains the resize request until the curve exists.
    if (!this._distanceCurve) return;
    const keys = this._distanceCurve.GetKeys();
    if (keys.length === 2)
    {
      keys[0].time = this.minDistance;
      keys[1].time = this.maxDistance;
      this._distanceCurve.OnKeysChanged();
    }
    this._distanceCurve.SetTimeOffset(0);
    this._updateDistanceCurve = false;
  }

  /** Zeroes the midpoint and extent once nothing is being tracked. */
  _SetNeutralValues()
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
  _CalculateFieldCoverageAndDistance(time, cameraPosition, originShift)
  {
    if (this.objects.length === 0)
    {
      vec3.add(this.midpoint, this.midpoint, originShift);
      return vec3.length(cameraPosition);
    }
    const positions = this.objects.map(object => EveDistanceField._sampleObject(object, time, vec3.create()));
    const average = vec3.create();
    let distanceNowSq = this.maxDistance * this.maxDistance;
    for (const position of positions)
    {
      vec3.scaleAndAdd(average, average, position, 1 / positions.length);
      distanceNowSq = Math.min(distanceNowSq, vec3.squaredDistance(position, cameraPosition));
    }
    if (this._dirty)
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
      this._dirty = false;
    }
    else
    {
      vec3.add(this.midpoint, this.midpoint, originShift);
    }
    return Math.sqrt(distanceNowSq);
  }

  /**
   * Samples a tracked vector function through its Be::Time overload (EveDistanceField.cpp:52-72, 138).
   * @param {ITriVectorFunction} object Tracked function.
   * @param {number} time Scene time in Blue 100ns ticks.
   * @param {Float32Array} out Caller-owned position.
   * @returns {Float32Array} out
   */
  static _sampleObject(object, time, out)
  {
    return object.GetValueAt__Ticks(time, out);
  }

  static _cameraPosition = vec3.create();
  static _cameraTransform = mat4.create();
}

// Exact native Blue exposure: only these identities participate in loading.
