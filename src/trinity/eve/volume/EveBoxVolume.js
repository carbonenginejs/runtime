import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/Volume/EveBoxVolume.h
// Source: trinity/trinity/Eve/Volume/EveBoxVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveBoxVolume_Blue.cpp
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { color } from "#math/color";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { IEveVolume } from "./IEveVolume.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_BASE_COLOR = color.create();
const DEBUG_COLOR = color.create();

// IEveVolume.h:18's default baseColor, Color( 0xFFFFFFFF ).
const DEFAULT_BASE_COLOR = color.fromARGB(color.create(), 0xFFFFFFFF);
// Carbon scales baseColor by the float literals 0.5f and 0.6f.
const OUTER_COLOR_SCALE = 0.5;
const INNER_COLOR_SCALE = Math.fround(0.6);

// Scratch for the intersection centres moved into box space.
const DEBUG_POSITION = vec3.create();


/**
 * Oriented box of influence with a hollow inner box, weighting points by falloff
 * and seeding random points across its shell.
 */
@blue.define("EveBoxVolume")
@blue.inherit(IInitialize, INotify)
@blue.interface(IEveVolume, INotify, IInitialize)
export class EveBoxVolume extends IEveVolume
{
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  scaling = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  innerScaling = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @type.boolean
  debugShowIntersection = false;

  _callbacks = new Map();

  _nextCallbackId = 1;

  _inverseRotation = quat.create();

  /** Carbon m_boxTransform (EveBoxVolume.h:49, identity at cpp:21): Setup builds it (cpp:104). */
  _boxTransform = mat4.create();

  /** Carbon m_innerBoxTransform (EveBoxVolume.h:50, identity at cpp:22): Setup builds it (cpp:105). */
  _innerBoxTransform = mat4.create();

  /**
   * Carbon m_innerIntersection (EveBoxVolume.h:54, zero at cpp:19). Carbon
   * writes it in GetIntensity (cpp:80, cpp:83); this port's adapted GetIntensity
   * does not, so it stays at the origin.
   */
  _innerIntersection = vec3.create();

  /**
   * Carbon m_outerIntersection (EveBoxVolume.h:55, zero at cpp:20). Carbon
   * writes it in GetIntensity (cpp:79); this port's adapted GetIntensity does
   * not, so it stays at the origin.
   */
  _outerIntersection = vec3.create();

  /** Carbon EveBoxVolume::MAX_AABB (EveBoxVolume.h:59, cpp:11). */
  static _MAX_AABB = vec3.fromValues(0.5, 0.5, 0.5);

  /** Carbon EveBoxVolume::MIN_AABB (EveBoxVolume.h:60, cpp:12). */
  static _MIN_AABB = vec3.fromValues(-0.5, -0.5, -0.5);

  /**
   * Clamps the authored scalings and caches the inverse rotation the intensity
   * test needs.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.Setup();
    return true;
  }

  /**
   * Returns a fresh sphere centred on the box position whose radius is half the
   * length of the scaling vector.
   */
  @blue.method
  @meta.adapted
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this.position),
      radius: vec3.length(this.scaling) * 0.5
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: the
   * point is moved into box-local space with the cached inverse rotation, then
   * compared radially against the inner and outer boxes - 1 inside the inner
   * box, 0 outside the outer one, and a squared ramp between them.
   *
   * Carbon (EveBoxVolume.cpp:58-86) intersects a ray with both boxes and
   * records the hits in m_outerIntersection/m_innerIntersection, which
   * RenderDebugInfo draws; this port does not record them, so
   * _outerIntersection/_innerIntersection stay at the origin.
   */
  @blue.method
  @meta.adapted
  GetIntensity(position)
  {
    const local = EveBoxVolume._toLocal(position, this.position, this._inverseRotation);
    const outer = EveBoxVolume._radialBoxDistance(local, this.scaling);
    const distance = vec3.length(local);
    if (!(outer > 0) || distance > outer)
    {
      return 0;
    }
    const inner = EveBoxVolume._radialBoxDistance(local, this.innerScaling);
    if (inner > 0 && distance <= inner)
    {
      return 1;
    }
    const span = outer - inner;
    const ratio = span > 0 ? (outer - distance) / span : 0;
    return ratio * ratio;
  }

  /**
   * Appends random points expressed in box-local space, centred on the box rather than offset by its position, choosing between the inner box and the six shell zones in proportion to their volumes and biasing shell samples outward by fallOffFactor. Generates nothing when any scaling axis is zero.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Drops the inner box from the choice, keeping every point in the shell.
   */
  @blue.method
  @meta.adapted
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor)
  {
    if (this.scaling[0] === 0 || this.scaling[1] === 0 || this.scaling[2] === 0)
    {
      return;
    }

    const leftRightSideSize = (this.scaling[0] - this.innerScaling[0])
      * this.scaling[1] * this.scaling[2];
    const topBottomSize = this.innerScaling[0]
      * (this.scaling[1] - this.innerScaling[1]) * this.scaling[2];
    const frontBackLidSize = this.innerScaling[0] * this.innerScaling[1]
      * (this.scaling[2] - this.innerScaling[2]);
    const outerSidesSize = 2 * (leftRightSideSize + topBottomSize + frontBackLidSize);
    let innerToOuterSizeRatio = 0;

    if (!excludeInnerVolume)
    {
      const rangeX = this.scaling[0] - this.innerScaling[0];
      const rangeY = this.scaling[1] - this.innerScaling[1];
      const rangeZ = this.scaling[2] - this.innerScaling[2];
      const adjustedOuterCubeSize = (this.innerScaling[0] + 0.5 * rangeX)
        * (this.innerScaling[1] + 0.5 * rangeY)
        * (this.innerScaling[2] + 0.5 * rangeZ);
      innerToOuterSizeRatio = this.innerScaling[0] * this.innerScaling[1]
        * this.innerScaling[2] / adjustedOuterCubeSize;
      innerToOuterSizeRatio = 1 - Math.pow(
        1 - innerToOuterSizeRatio,
        0.8 + 0.2 * fallOffFactor
      );
    }

    const count = Math.max(0, Math.trunc(howManyToAdd));
    for (let i = 0; i < count; i++)
    {
      let zonePicker = carbonRandom.triRand();
      if (zonePicker < innerToOuterSizeRatio)
      {
        points.push(vec3.fromValues(
          this.innerScaling[0] * carbonRandom.triRand() - 0.5 * this.innerScaling[0],
          this.innerScaling[1] * carbonRandom.triRand() - 0.5 * this.innerScaling[1],
          this.innerScaling[2] * carbonRandom.triRand() - 0.5 * this.innerScaling[2]
        ));
        continue;
      }

      zonePicker *= outerSidesSize;
      const position = vec3.create();
      if (zonePicker < 2 * leftRightSideSize)
      {
        const distance = 0.5 * this.innerScaling[0]
          + Math.pow(carbonRandom.triRand(), fallOffFactor)
          * (this.scaling[0] - this.innerScaling[0]) * 0.5;
        position[0] = zonePicker < leftRightSideSize ? distance : -distance;
        position[1] = carbonRandom.triRand() * this.scaling[1] - 0.5 * this.scaling[1];
        position[2] = carbonRandom.triRand() * this.scaling[2] - 0.5 * this.scaling[2];
      }
      else if (zonePicker < 2 * (leftRightSideSize + topBottomSize))
      {
        const distance = 0.5 * this.innerScaling[1]
          + Math.pow(carbonRandom.triRand(), fallOffFactor)
          * (this.scaling[1] - this.innerScaling[1]) * 0.5;
        position[0] = carbonRandom.triRand() * this.innerScaling[0] - 0.5 * this.innerScaling[0];
        position[1] = zonePicker < 2 * leftRightSideSize + topBottomSize ? distance : -distance;
        position[2] = carbonRandom.triRand() * this.scaling[2] - 0.5 * this.scaling[2];
      }
      else
      {
        // Carbon uses the Y dimensions for the front/back distance here.
        const distance = 0.5 * this.innerScaling[1]
          + Math.pow(carbonRandom.triRand(), fallOffFactor)
          * (this.scaling[1] - this.innerScaling[1]) * 0.5;
        position[0] = carbonRandom.triRand() * this.innerScaling[0] - 0.5 * this.innerScaling[0];
        position[1] = carbonRandom.triRand() * this.innerScaling[1] - 0.5 * this.innerScaling[1];
        position[2] = zonePicker < outerSidesSize - frontBackLidSize ? distance : -distance;
      }
      points.push(position);
    }
  }

  /**
   * Registers a callback fired whenever the volume changes, returning the id
   * needed to unregister it again.
   */
  @blue.method
  @meta.adapted
  RegisterForChanges(callback)
  {
    const id = this._nextCallbackId++;
    this._callbacks.set(id, callback);
    return id;
  }

  /** Drops a change callback by the id RegisterForChanges returned. */
  @blue.method
  @meta.implemented
  UnregisterForChanges(callbackId)
  {
    this._callbacks.delete(callbackId);
  }

  /**
   * Re-clamps the scalings and the cached inverse rotation after an authored
   * change, then notifies every registered listener.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (["position", "scaling", "rotation", "innerScaling"].some(name => IsMatch(propertyName, name))) this.Setup();
    for (const callback of this._callbacks.values())
    {
      callback?.();
    }
    return true;
  }

  /**
   * Carbon EveBoxVolume::RenderDebugInfo (EveBoxVolume.cpp:41-51): the outer
   * and inner boxes as wireframe unit boxes (MIN_AABB to MAX_AABB) under the
   * transforms Setup caches, at 0.5 and 0.6 of baseColor - Carbon's
   * Color * float scales all four channels, alpha included
   * (Color_inline.h:125-128) - and, when debugShowIntersection is set, the
   * intersection points as solid spheres of radius 1.
   *
   * The intersection points are Carbon's members, but this port's adapted
   * GetIntensity never writes them, so with debugShowIntersection on both
   * spheres sit at the box centre.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} parentTransform The parent's world transform.
   * @param {vec4} [baseColor] Base colour, Carbon's `const Color&`; defaults to Color( 0xFFFFFFFF ).
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, baseColor = DEFAULT_BASE_COLOR)
  {
    const owner = Tr2DebugObjectReference.create__Object(this);
    color.copy(DEBUG_BASE_COLOR, baseColor);

    // Carbon m_boxTransform * parentTransform (row-vector).
    mat4.multiply(DEBUG_TRANSFORM, parentTransform, this._boxTransform);
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, OUTER_COLOR_SCALE);
    renderer.DrawBox__Transform(owner, DEBUG_TRANSFORM, EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));

    // Carbon m_innerBoxTransform * parentTransform (row-vector).
    mat4.multiply(DEBUG_TRANSFORM, parentTransform, this._innerBoxTransform);
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, INNER_COLOR_SCALE);
    renderer.DrawBox__Transform(owner, DEBUG_TRANSFORM, EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));

    if (this.debugShowIntersection)
    {
      // Carbon TransformCoord( m_innerIntersection, m_boxTransform ).
      vec3.transformMat4(DEBUG_POSITION, this._innerIntersection, this._boxTransform);
      renderer.DrawSphere__TransformCenterRadius(owner, parentTransform, DEBUG_POSITION, 1, 16,
        ITr2DebugRenderer2.Effect.Solid, Tr2DebugColor.create__Uint32(0xff555555));

      // Carbon TransformCoord( m_outerIntersection, m_boxTransform ).
      vec3.transformMat4(DEBUG_POSITION, this._outerIntersection, this._boxTransform);
      renderer.DrawSphere__TransformCenterRadius(owner, parentTransform, DEBUG_POSITION, 1, 16,
        ITr2DebugRenderer2.Effect.Solid, Tr2DebugColor.create__Uint32(0xffffff00));
    }
  }

  /**
   * Carbon Setup (EveBoxVolume.cpp:99-112): clamp the scalings, keep the
   * inner scaling inside the outer, refresh the cached derived state.
   * Carbon caches four full matrices plus the bounding sphere; this port
   * caches the box and inner box transforms RenderDebugInfo reads
   * (cpp:104-105) and the inverse rotation its intensity test reads, and
   * derives the inverses and the sphere on demand. Box's Setup does NOT
   * fire change callbacks - OnModified does (cpp:194-215), unlike the
   * ellipsoid, whose Setup fires them itself.
   *
   * Adapted: Carbon caches the two inverse box transforms and the bounding sphere; this
   * port's GetIntensity and GetBoundingSphere derive their own state on demand, so Setup
   * refreshes the clamps, the two box transforms and the cached inverse rotation.
   */
  @blue.method
  @meta.adapted
  Setup()
  {
    for (let i = 0; i < 3; i++)
    {
      this.scaling[i] = Math.max(0, this.scaling[i]);
      this.innerScaling[i] = Math.min(Math.max(0, this.innerScaling[i]), this.scaling[i]);
    }
    quat.invert(this._inverseRotation, this.rotation);

    // Carbon m_boxTransform = TransformationMatrix( m_scaling, m_rotation, m_position )
    // (cpp:104): row-vector S * R * T.
    mat4.fromRotationTranslationScale(this._boxTransform, this.rotation, this.position, this.scaling);

    // Carbon m_innerBoxTransform = TransformationMatrix( m_innerScaling, m_rotation, m_position )
    // (cpp:105): row-vector S * R * T.
    mat4.fromRotationTranslationScale(this._innerBoxTransform, this.rotation, this.position, this.innerScaling);
  }

  /**
   * Moves a point into box-local space by subtracting the box centre and
   * applying the inverse rotation.
   */
  static _toLocal(position, center, inverseRotation)
  {
    const local = vec3.subtract(vec3.create(), position, center);
    return vec3.transformQuat(local, local, inverseRotation);
  }

  /**
   * Returns how far the box surface lies from the centre along the direction of
   * the given local point, falling back to half the smallest extent when the
   * point sits at the centre.
   */
  static _radialBoxDistance(position, scaling)
  {
    const length = vec3.length(position);
    if (length === 0)
    {
      return Math.min(scaling[0], scaling[1], scaling[2]) * 0.5;
    }
    let distance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 3; i++)
    {
      const direction = Math.abs(position[i] / length);
      if (direction > 0)
      {
        distance = Math.min(distance, scaling[i] * 0.5 / direction);
      }
    }
    return Number.isFinite(distance) ? distance : 0;
  }
}
