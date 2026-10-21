import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.h
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveEllipsoidVolume_Blue.cpp
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { color } from "#math/color";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
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

// GetIntensity scratch: Carbon's by-value position parameter and its ray direction.
const POSITION = vec3.create();
const RAY_DIR = vec3.create();


/**
 * Oriented ellipsoid of influence with a hollow inner ellipsoid, weighting
 * points by falloff and seeding random points between the two shells.
 */
@be.define("EveEllipsoidVolume")
@blue.inherit(INotify, IInitialize)
@be.mapInterface(IEveVolume)
@be.mapInterface(INotify)
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

  /** Carbon m_rotationMatrix (EveEllipsoidVolume.h:51, identity at cpp:17): Setup builds it (cpp:42). */
  _rotationMatrix = mat4.create();

  /** Carbon m_inverseRotationMatrix (identity at cpp:18): Setup inverts m_rotationMatrix into it (cpp:43). */
  _inverseRotationMatrix = mat4.create();

  /** Carbon m_boundingSphere (zero at cpp:20): Setup fills it (cpp:45-46). */
  _boundingSphere = { center: vec3.create(), radius: 0 };

  /**
   * Carbon m_innerIntersection (EveEllipsoidVolume.h:47, zero at cpp:14): the
   * last GetIntensity's inner-ellipsoid hit in the inverse-rotated frame, or
   * the origin when the inner shape is zero (cpp:89, cpp:95).
   */
  _innerIntersection = vec3.create();

  /**
   * Carbon m_outerIntersection (EveEllipsoidVolume.h:48, zero at cpp:15): the
   * last GetIntensity's outer-ellipsoid hit in the inverse-rotated frame
   * (cpp:92).
   */
  _outerIntersection = vec3.create();

  /** Carbon Initialize (EveEllipsoidVolume.cpp:29-33): runs Setup. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.Setup();
    return true;
  }

  /**
   * Carbon GetBoundingSphere (EveEllipsoidVolume.cpp:72-75): the sphere Setup
   * cached, returned by value as a fresh { center, radius }.
   *
   * @returns {{center: vec3, radius: number}}
   */
  @blue.method
  @meta.implemented
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this._boundingSphere.center),
      radius: this._boundingSphere.radius
    };
  }

  /**
   * Carbon GetIntensity (EveEllipsoidVolume.cpp:77-98). The point is rotated by
   * the cached inverse rotation matrix, then tested against axis-aligned
   * ellipsoids centred on position: 0 outside the outer shape, 1 inside the
   * inner one. Between them a ray toward the centre is intersected with both
   * shapes, keeping each line's root nearest the point (behind it for the
   * outer shape), and the result is LengthSq( point - outerHit ) /
   * LengthSq( innerHit - outerHit ). A zero inner shape leaves the inner hit at
   * the origin. Both hits are recorded in _outerIntersection and
   * _innerIntersection, which RenderDebugInfo draws.
   *
   * Carbon quirk (CE-181), reproduced: the inverse rotation turns the point about the
   * ORIGIN, not about position, so with both a rotation and a position the
   * volume Carbon tests is centred on position * RotationMatrix( rotation ),
   * not on the position RenderDebugInfo draws it at.
   *
   * @param {vec3} position Point in the volume's parent space; not modified.
   * @returns {number} The intensity.
   */
  @blue.method
  @meta.implemented
  GetIntensity(position)
  {
    const f = Math.fround;
    const point = vec3.transformMat4(POSITION, position, this._inverseRotationMatrix);

    if (!sph3.isPointInsideEllipsoid(this.position, this.shape, point))
    {
      return 0;
    }
    if (sph3.isPointInsideEllipsoid(this.position, this.innerShape, point))
    {
      return 1;
    }

    vec3.set(this._innerIntersection, 0, 0, 0);

    const rayDir = vec3.normalizeCarbon(RAY_DIR, vec3.subtract(RAY_DIR, this.position, point));
    sph3.intersectEllipsoidRayClosest(this._outerIntersection, this.position, this.shape, point, rayDir);

    // LengthSq( m_innerShape ) != 0, in float.
    const innerShape = this.innerShape;
    if (f(f(f(innerShape[0] * innerShape[0]) + f(innerShape[1] * innerShape[1])) + f(innerShape[2] * innerShape[2])) !== 0)
    {
      sph3.intersectEllipsoidRayClosest(this._innerIntersection, this.position, this.innerShape, point, rayDir);
    }

    return f(
      vec3.squaredDistance(point, this._outerIntersection)
      / vec3.squaredDistance(this._innerIntersection, this._outerIntersection)
    );
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
   * Carbon OnModified (EveEllipsoidVolume.cpp:148-152): re-runs Setup, which
   * also notifies every registered listener.
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
   * The intersection points are the ones the last GetIntensity between the
   * two shapes recorded, in the inverse-rotated frame the rotation matrix
   * takes back out. Until such a call both sit at the parent origin.
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
   * non-negative radii, fit the inner shape inside it, cache the rotation
   * matrix, its inverse (Carbon's Inverse) and the bounding sphere, and fire
   * EVERY change callback - the ellipsoid's callback fan-out lives INSIDE
   * Setup, opposite to the box's, whose OnModified fires them.
   */
  @blue.method
  @meta.implemented
  Setup()
  {
    // XMVectorMax( 0, m_shape ) and XMVectorMax( 0, XMVectorMin( m_innerShape, m_shape ) ) are
    // SSE maxps / minps: (a > b) ? a : b and (a < b) ? a : b per lane.
    for (let i = 0; i < 3; i++)
    {
      const shape = 0 > this.shape[i] ? 0 : this.shape[i];
      const innerShape = this.innerShape[i] < shape ? this.innerShape[i] : shape;
      this.shape[i] = shape;
      this.innerShape[i] = 0 > innerShape ? 0 : innerShape;
    }

    // Carbon m_rotationMatrix = RotationMatrix( m_rotation ) (cpp:42): a single
    // matrix, so the byte layout ports unchanged.
    mat4.fromQuat(this._rotationMatrix, this.rotation);
    mat4.inverseCarbon(this._inverseRotationMatrix, this._rotationMatrix);

    // max( m_shape.x, max( m_shape.y, m_shape.z ) ): std::max(a, b) is (a < b) ? b : a.
    const shapeYZ = this.shape[1] < this.shape[2] ? this.shape[2] : this.shape[1];
    vec3.copy(this._boundingSphere.center, this.position);
    this._boundingSphere.radius = this.shape[0] < shapeYZ ? shapeYZ : this.shape[0];

    for (const callback of this._callbacks.values())
    {
      callback?.();
    }
  }
}

// Exact native Blue exposure: only these identities participate in loading.
