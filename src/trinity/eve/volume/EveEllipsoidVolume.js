import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.h
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume_Blue.cpp
import { INotify } from "../../../global/blue/INotify.js";
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

// Scratch for the TransformationMatrix temporaries.
const DEBUG_SHAPE_TRANSFORM = mat4.create();


/**
 * Oriented ellipsoid of influence with a hollow inner ellipsoid, weighting
 * points by falloff and seeding random points between the two shells.
 */
@blue.define("EveEllipsoidVolume")
@blue.inherit(INotify, IInitialize)
@blue.interface(IEveVolume, INotify)
export class EveEllipsoidVolume extends IEveVolume
{
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  innerShape = vec3.create();

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  shape = vec3.create();

  @blue.readwrite
  @type.boolean
  debugShowIntersection = false;

  _callbacks = new Map();

  _nextCallbackId = 1;

  _inverseRotation = quat.create();

  /** Carbon m_rotationMatrix (EveEllipsoidVolume.h:51, identity at cpp:17): Setup builds it (cpp:42). */
  _rotationMatrix = mat4.create();

  /**
   * Carbon m_innerIntersection (EveEllipsoidVolume.h:47, zero at cpp:14).
   * Carbon writes it in GetIntensity (cpp:89, cpp:95); this port's adapted
   * GetIntensity does not, so it stays at the origin.
   */
  _innerIntersection = vec3.create();

  /**
   * Carbon m_outerIntersection (EveEllipsoidVolume.h:48, zero at cpp:15).
   * Carbon writes it in GetIntensity (cpp:92); this port's adapted
   * GetIntensity does not, so it stays at the origin.
   */
  _outerIntersection = vec3.create();

  /**
   * Clamps the authored shapes, caches the inverse rotation and fires the change
   * callbacks.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.Setup();
    return true;
  }

  /**
   * Returns a fresh sphere centred on the volume position with the largest shape
   * radius, so it covers the ellipsoid on every axis.
   */
  @blue.method
  @meta.adapted
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this.position),
      radius: Math.max(this.shape[0], this.shape[1], this.shape[2])
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: the
   * point is moved into ellipsoid-local space with the cached inverse rotation,
   * then compared radially against the inner and outer shapes - 1 inside the
   * inner ellipsoid, 0 outside the outer one, and a squared ramp between them.
   *
   * Carbon (EveEllipsoidVolume.cpp:77-98) intersects a ray with both
   * ellipsoids and records the hits in m_outerIntersection/m_innerIntersection,
   * which RenderDebugInfo draws; this port does not record them, so
   * _outerIntersection/_innerIntersection stay at the origin.
   */
  @blue.method
  @meta.adapted
  GetIntensity(position)
  {
    const local = vec3.subtract(vec3.create(), position, this.position);
    vec3.transformQuat(local, local, this._inverseRotation);
    const outer = EveEllipsoidVolume._radialDistance(local, this.shape);
    const distance = vec3.length(local);
    if (!(outer > 0) || distance > outer)
    {
      return 0;
    }
    const inner = EveEllipsoidVolume._radialDistance(local, this.innerShape);
    if (inner > 0 && distance <= inner)
    {
      return 1;
    }
    const span = outer - inner;
    const ratio = span > 0 ? (outer - distance) / span : 0;
    return ratio * ratio;
  }

  /**
   * Appends random points expressed in ellipsoid-local space, centred on the ellipsoid rather than offset by its position, split between the inner ellipsoid and the shell by their volume ratio biased with fallOffFactor.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Keeps every point in the shell between the inner and outer shapes.
   */
  @blue.method
  @meta.adapted
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor)
  {
    const count = Math.max(0, Math.trunc(howManyToAdd));
    let innerSelectionChance = 0;
    if (!excludeInnerVolume)
    {
      innerSelectionChance = this.innerShape[0] * this.innerShape[1] * this.innerShape[2]
        / (this.shape[0] * this.shape[1] * this.shape[2]);
      innerSelectionChance = 1 - Math.pow(
        1 - innerSelectionChance,
        0.6 + 0.4 * fallOffFactor
      );
    }

    for (let i = 0; i < count; i++)
    {
      const angle = Math.PI * 2 * carbonRandom.triFloatRandom01();
      const z = carbonRandom.triFloatRandom01() * 2 - 1;
      const radial = Math.sqrt(1 - z * z);
      const direction = vec3.normalize(vec3.create(), vec3.fromValues(
        radial * Math.cos(angle),
        radial * Math.sin(angle),
        z
      ));

      const position = vec3.create();
      if (carbonRandom.triFloatRandom01() > innerSelectionChance)
      {
        const distance = Math.pow(carbonRandom.triFloatRandom01(), 0.75 * fallOffFactor);
        for (let axis = 0; axis < 3; axis++)
        {
          position[axis] = direction[axis]
            * (this.innerShape[axis] + (this.shape[axis] - this.innerShape[axis]) * distance);
        }
      }
      else
      {
        const distance = Math.pow(carbonRandom.triFloatRandom01(), 1 / 3);
        for (let axis = 0; axis < 3; axis++)
        {
          position[axis] = direction[axis] * this.innerShape[axis] * distance;
        }
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
   * Re-clamps the shapes and the cached inverse rotation after an authored
   * change, and notifies every registered listener.
   */
  @blue.method
  @meta.implemented
  OnModified()
  {
    this.Setup();
    return true;
  }

  /**
   * Carbon EveEllipsoidVolume::RenderDebugInfo (EveEllipsoidVolume.cpp:57-70):
   * the outer and inner ellipsoids as 20-segment wireframe unit spheres under
   * TransformationMatrix( shape, rotation, position ), owned by area 200 of
   * this volume, at 0.5 and 0.6 of baseColor - Carbon's Color * float scales
   * all four channels, alpha included (Color_inline.h:125-128) - and, when
   * debugShowIntersection is set, the intersection points as solid spheres of
   * radius 1 under the rotation matrix alone, as Carbon draws them.
   *
   * The intersection points are Carbon's members, but this port's adapted
   * GetIntensity never writes them, so with debugShowIntersection on both
   * spheres sit at the parent origin.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} parentTransform The parent's world transform.
   * @param {vec4} [baseColor] Base colour, Carbon's `const Color&`; defaults to Color( 0xFFFFFFFF ).
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, baseColor = DEFAULT_BASE_COLOR)
  {
    color.copy(DEBUG_BASE_COLOR, baseColor);

    // Carbon outerTransform = TransformationMatrix( m_shape, m_rotation, m_position ) * parentTransform
    // (row-vector S * R * T * parent).
    mat4.fromRotationTranslationScale(DEBUG_SHAPE_TRANSFORM, this.rotation, this.position, this.shape);
    mat4.multiply(DEBUG_TRANSFORM, parentTransform, DEBUG_SHAPE_TRANSFORM);
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, OUTER_COLOR_SCALE);
    renderer.DrawSphere__Transform(Tr2DebugObjectReference.create__ObjectArea(this, 200), DEBUG_TRANSFORM, 20,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));

    // Carbon innerTransform = TransformationMatrix( m_innerShape, m_rotation, m_position ) * parentTransform
    // (row-vector S * R * T * parent).
    mat4.fromRotationTranslationScale(DEBUG_SHAPE_TRANSFORM, this.rotation, this.position, this.innerShape);
    mat4.multiply(DEBUG_TRANSFORM, parentTransform, DEBUG_SHAPE_TRANSFORM);
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, INNER_COLOR_SCALE);
    renderer.DrawSphere__Transform(Tr2DebugObjectReference.create__ObjectArea(this, 200), DEBUG_TRANSFORM, 20,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));

    if (this.debugShowIntersection)
    {
      const owner = Tr2DebugObjectReference.create__Object(this);

      // Carbon m_rotationMatrix * parentTransform (row-vector).
      mat4.multiply(DEBUG_TRANSFORM, parentTransform, this._rotationMatrix);
      renderer.DrawSphere__TransformCenterRadius(owner, DEBUG_TRANSFORM, this._innerIntersection, 1, 15,
        ITr2DebugRenderer2.Effect.Solid, Tr2DebugColor.create__Uint32(0xffff0000));
      renderer.DrawSphere__TransformCenterRadius(owner, DEBUG_TRANSFORM, this._outerIntersection, 1, 15,
        ITr2DebugRenderer2.Effect.Solid, Tr2DebugColor.create__Uint32(0xffffff00));
    }
  }

  /**
   * Carbon Setup (EveEllipsoidVolume.cpp:35-55): clamp the shape to
   * non-negative radii, fit the inner shape inside it, refresh the cached
   * inverse rotation, and fire EVERY change callback - the ellipsoid's
   * callback fan-out lives INSIDE Setup, opposite to the box's, whose
   * OnModified fires them. Carbon also caches the rotation matrix pair and
   * the bounding sphere; this port caches the rotation matrix RenderDebugInfo
   * reads (cpp:42) and derives the inverse and the sphere on demand.
   *
   * Adapted: Carbon caches the inverse rotation matrix and bounding sphere; this port's
   * GetIntensity and GetBoundingSphere derive their own state on demand, so Setup refreshes
   * the clamps, the rotation matrix and the cached inverse rotation quaternion. The callback
   * fan-out matches Carbon's placement inside Setup.
   */
  @blue.method
  @meta.adapted
  Setup()
  {
    for (let i = 0; i < 3; i++)
    {
      this.shape[i] = Math.max(0, this.shape[i]);
      this.innerShape[i] = Math.min(Math.max(0, this.innerShape[i]), this.shape[i]);
    }
    quat.invert(this._inverseRotation, this.rotation);

    // Carbon m_rotationMatrix = RotationMatrix( m_rotation ) (cpp:42): a single
    // matrix, so the byte layout ports unchanged.
    mat4.fromQuat(this._rotationMatrix, this.rotation);

    for (const callback of this._callbacks.values())
    {
      callback?.();
    }
  }

  /**
   * Returns how far the ellipsoid surface lies from the centre along the
   * direction of the given local point, the smallest radius when the point sits
   * at the centre, and 0 when the direction has an extent-less axis.
   */
  static _radialDistance(position, radii)
  {
    const length = vec3.length(position);
    if (length === 0)
    {
      return Math.min(radii[0], radii[1], radii[2]);
    }
    let denominator = 0;
    for (let i = 0; i < 3; i++)
    {
      if (radii[i] <= 0 && position[i] !== 0)
      {
        return 0;
      }
      if (radii[i] > 0)
      {
        const direction = position[i] / length;
        denominator += direction * direction / (radii[i] * radii[i]);
      }
    }
    return denominator > 0 ? 1 / Math.sqrt(denominator) : 0;
  }
}

// Exact native Blue exposure: only these identities participate in loading.
