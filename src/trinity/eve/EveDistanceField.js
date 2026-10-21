import { exposure as be } from "#be";
import { ITr2DebugRenderable } from "../../global/interfaces/ITr2DebugRenderable.js";
// Source: trinity/trinity/Eve/EveDistanceField.h
// Source: trinity/trinity/Eve/EveDistanceField.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../global/blue/INotify.js";
import { IListNotify } from "../../global/blue/IListNotify.js";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { color } from "#math/color";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { TriDebugFont } from "../core/TriDebugTextRenderer.js";
import { Tr2CurveInterpolation, Tr2CurveTangentType } from "../curves/enums.js";
import { Tr2CurveScalar } from "../curves/curve/Tr2CurveScalar.js";
import { TriCurveSet } from "../curves/TriCurveSet.js";


/**
 * Tracks a set of moving points, estimates the volume covering them, and drives
 * a curve set from the eased camera distance to that volume.
 */
@be.define("EveDistanceField")
@blue.inherit(IListNotify, INotify, ITr2DebugRenderable)
@be.mapInterface(IListNotify)
@be.mapInterface(INotify)
export class EveDistanceField
{
  @blue.read
  @type.vec3
  dimensions = vec3.create();

  @blue.read
  @type.vec3
  midpoint = vec3.create();

  @blue.readwrite
  @type.float32
  distanceThreshold = 3;

  @blue.readwrite
  @type.float32
  maxXZRatio = 1.5;

  @blue.readwrite
  @type.float32
  minYRatio = 0.2;

  @blue.readwrite
  @type.float32
  timeAdjustmentSecondsIn = 0.25;

  @blue.readwrite
  @type.float32
  timeAdjustmentSecondsOut = 2;

  @blue.notify
  @blue.read
  @type.list("ITriVectorFunction")
  objects = [];

  @blue.readwrite
  @type.rootRef("TriView")
  cameraView = null;

  @blue.readwrite
  @type.rootRef("TriCurveSet")
  curveSet = null;

  @blue.readwrite
  @type.float32
  distance = -1;

  @blue.notify
  @blue.readwrite
  @type.float32
  minDistance = 0;

  @blue.notify
  @blue.readwrite
  @type.float32
  maxDistance = 75000;

  _distanceCurve = null;

  _dirty = true;

  _updateDistanceCurve = false;

  _isDynamic = false;

  /**
   * m_debug (EveDistanceField.h:97): raised by RenderDebugInfo so the next
   * Update records the tracked positions. Carbon's constructor leaves it
   * uninitialised (cpp:15-30); false is the defined start.
   */
  _debug = false;

  /** m_debugPositions (EveDistanceField.h:98): the tracked positions recorded for debug drawing. */
  _debugPositions = [];

  /**
   * Configures the field as static, so its extent and midpoint are the authored
   * ones rather than derived from tracked objects, and rebuilds the distance
   * curve set.
   */
  @blue.method
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
  @blue.method
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
  @blue.method
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
        this.curveSet.Update(this.distance);
      }
    }

    // Carbon (cpp:170-180): after a debug draw, record every tracked position once.
    // The vectors are reused across frames instead of Carbon's clear() and push_back().
    if (this._debug)
    {
      const positions = this._debugPositions;
      positions.length = this.objects.length;
      for (let i = 0; i < this.objects.length; i++)
      {
        if (!positions[i])
        {
          positions[i] = vec3.create();
        }
        EveDistanceField._sampleObject(this.objects[i], time, positions[i]);
      }
      this._debug = false;
    }
  }

  /**
   * Defers a distance-curve rebuild to the next update when the minimum or
   * maximum distance changed.
   */
  @blue.method
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
  @blue.method
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

  /**
   * Carbon EveDistanceField::GetDebugOptions (EveDistanceField.cpp:297-300).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("DistanceField");
  }

  /**
   * Carbon EveDistanceField::RenderDebugInfo (EveDistanceField.cpp:304-328):
   * under "DistanceField", raises the debug flag so the next Update records the
   * tracked positions, then draws a 1000-unit sphere at the midpoint, the
   * field's box, the object count as text at the midpoint, and for each
   * recorded position a line from the midpoint with its minimum- and
   * maximum-distance spheres.
   *
   * The text goes through renderer.DrawText as Carbon's does; the renderer
   * decides whether it can draw it.
   * @param {ITr2DebugRenderer2} renderer
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (!renderer.HasOption(this, "DistanceField"))
    {
      return;
    }
    this._debug = true;

    // Show the dimension and midpoint of the field
    const aabbMin = vec3.scaleAndAdd(EveDistanceField._debugMin, this.midpoint, this.dimensions, -0.5);
    const aabbMax = vec3.scaleAndAdd(EveDistanceField._debugMax, this.midpoint, this.dimensions, 0.5);
    renderer.DrawSphere__CenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      this.midpoint,
      1000,
      3,
      ITr2DebugRenderer2.Effect.Wireframe,
      Tr2DebugColor.create__Uint32(0xff00ff00));
    renderer.DrawBox__MinMax(
      Tr2DebugObjectReference.create__Object(this),
      aabbMin,
      aabbMax,
      ITr2DebugRenderer2.Effect.Wireframe,
      Tr2DebugColor.create__Uint32(0xff00ff00));
    const str = "Object Count: " + this.objects.length;
    renderer.DrawText(
      TriDebugFont.TRI_DBG_FONT_LARGE,
      this.midpoint,
      color.fromARGB(EveDistanceField._debugTextColor, 0xff00ff00),
      str);

    for (const pos of this._debugPositions)
    {
      renderer.DrawLine(
        Tr2DebugObjectReference.create__Object(this),
        this.midpoint,
        pos,
        Tr2DebugColor.create__Uint32(0x7f00ff00));
      renderer.DrawSphere__CenterRadius(
        Tr2DebugObjectReference.create__Object(this),
        pos,
        this.minDistance,
        8,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0x3f3f3f3f));
      renderer.DrawSphere__CenterRadius(
        Tr2DebugObjectReference.create__Object(this),
        pos,
        this.maxDistance,
        8,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0x1f1f1f1f));
    }
  }

  /**
   * Builds the curve set the field drives: a single named scalar curve falling
   * linearly from 1 to 0 across the distance range.
   */
  @blue.method
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
  @blue.method
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
  @blue.method
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
  @blue.method
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

  // RenderDebugInfo scratch (debug drawing is single-threaded).
  static _debugMin = vec3.create();
  static _debugMax = vec3.create();
  static _debugTextColor = color.create();
}

// Exact native Blue exposure: only these identities participate in loading.
