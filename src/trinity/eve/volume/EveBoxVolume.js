import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/Volume/EveBoxVolume.h
// Source: trinity/trinity/Eve/Volume/EveBoxVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveBoxVolume_Blue.cpp
import { IsMatch, INotify } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { box3 } from "#math/box3";
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

// GetIntensity scratch (Carbon's stack locals).
const AXIS_ALIGNED_POSITION = vec3.create();
const AXIS_ALIGNED_INNER_POSITION = vec3.create();
const RAY_DIR = vec3.create();
const INNER_TO_OUTER_BOX = mat4.create();


/**
 * Oriented box of influence with a hollow inner box, weighting points by falloff
 * and seeding random points across its shell.
 */
@be.define("EveBoxVolume")
@blue.inherit(IInitialize, INotify)
@be.mapInterface(IEveVolume)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveBoxVolume extends IEveVolume
{
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  position = vec3.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  scaling = vec3.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  innerScaling = vec3.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.quat
  rotation = quat.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE)
  @type.boolean
  debugShowIntersection = false;

  _callbacks = new Map();

  _nextCallbackId = 1;

  /** Carbon m_boxTransform (EveBoxVolume.h:49, identity at cpp:21): Setup builds it (cpp:104). */
  _boxTransform = mat4.create();

  /** Carbon m_innerBoxTransform (EveBoxVolume.h:50, identity at cpp:22): Setup builds it (cpp:105). */
  _innerBoxTransform = mat4.create();

  /** Carbon m_inverseBoxTransform (identity at cpp:23): Setup inverts m_boxTransform into it (cpp:107). */
  _inverseBoxTransform = mat4.create();

  /** Carbon m_inverseInnerBoxTransform (identity at cpp:24): Setup inverts m_innerBoxTransform into it (cpp:108). */
  _inverseInnerBoxTransform = mat4.create();

  /** Carbon m_boundingSphere (zero at cpp:25): Setup fills it (cpp:110-111). */
  _boundingSphere = { center: vec3.create(), radius: 0 };

  /**
   * Carbon m_innerIntersection (EveBoxVolume.h:54, zero at cpp:19): the last
   * GetIntensity's inner-box hit, in outer-box unit space (cpp:80, cpp:83).
   */
  _innerIntersection = vec3.create();

  /**
   * Carbon m_outerIntersection (EveBoxVolume.h:55, zero at cpp:20): the last
   * GetIntensity's outer-box hit, in outer-box unit space (cpp:79).
   */
  _outerIntersection = vec3.create();

  /** Carbon EveBoxVolume::MAX_AABB (EveBoxVolume.h:59, cpp:11). */
  static _MAX_AABB = vec3.fromValues(0.5, 0.5, 0.5);

  /** Carbon EveBoxVolume::MIN_AABB (EveBoxVolume.h:60, cpp:12). */
  static _MIN_AABB = vec3.fromValues(-0.5, -0.5, -0.5);

  /** Carbon Initialize (EveBoxVolume.cpp:35-39): runs Setup. */

  @meta.implemented
  Initialize()
  {
    this.Setup();
    return true;
  }

  /**
   * Carbon GetBoundingSphere (EveBoxVolume.cpp:53-56): the sphere Setup cached,
   * returned by value as a fresh { center, radius }.
   *
   * @returns {{center: vec3, radius: number}}
   */

  @meta.implemented
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this._boundingSphere.center),
      radius: this._boundingSphere.radius
    };
  }

  /**
   * Carbon GetIntensity (EveBoxVolume.cpp:58-86). The point is taken into the
   * unit spaces of the outer and inner boxes through the inverses Setup cached:
   * 0 outside the outer unit box, 1 inside the inner one. Between them a ray
   * from the outer-space point toward the centre, Normalize( -point ), is cast
   * from the outer-space point against the outer unit box (the face behind it)
   * and from the INNER-space point against the inner unit box, along that same
   * outer-space direction; the inner hit is moved into outer unit space and the
   * result is LengthSq( point - outerHit ) / LengthSq( innerHit - outerHit ),
   * all in outer unit space. Both hits are recorded in _outerIntersection and
   * _innerIntersection, which RenderDebugInfo draws.
   *
   * Carbon quirk (CE-180), reproduced: a zero inner scaling on any axis makes the inner
   * box transform singular, and Carbon's Inverse returns a singular matrix
   * unchanged (math/src/Matrix.cpp:12-15), so the inner test reads the point
   * pushed FORWARD through the inner box transform. With the inner scaling all
   * zero - the default - every point maps to the box position, and when each
   * position component lies in [-0.5, 0.5] the whole outer box reads 1.
   *
   * @param {vec3} position Point in the volume's parent space; not modified.
   * @returns {number} The intensity.
   */

  @meta.implemented
  GetIntensity(position)
  {
    const axisAlignedPosition = vec3.transformMat4(AXIS_ALIGNED_POSITION, position, this._inverseBoxTransform);

    // Are we outside the outer box?
    if (!box3.bounds.boundingBoxIsInside(EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB, axisAlignedPosition))
    {
      return 0;
    }

    const axisAlignedInnerPosition = vec3.transformMat4(AXIS_ALIGNED_INNER_POSITION, position, this._inverseInnerBoxTransform);

    // Are we inside the inner box?
    if (box3.bounds.boundingBoxIsInside(EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB, axisAlignedInnerPosition))
    {
      return 1;
    }

    const rayDir = vec3.normalizeCarbon(RAY_DIR, vec3.negate(RAY_DIR, axisAlignedPosition));

    // We are somewhere in between (cpp:79-80); Carbon ignores both hit flags.
    box3.bounds.intersectAxisAlignedBoxRay(this._outerIntersection, EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB, axisAlignedPosition, rayDir);
    box3.bounds.intersectAxisAlignedBoxRay(this._innerIntersection, EveBoxVolume._MIN_AABB, EveBoxVolume._MAX_AABB, axisAlignedInnerPosition, rayDir);

    // Move the inner intersection to the outer box space (cpp:83).
    // Carbon (row-vector): m_innerBoxTransform * m_inverseBoxTransform - inner box first.
    mat4.multiply(INNER_TO_OUTER_BOX, this._inverseBoxTransform, this._innerBoxTransform);
    vec3.transformMat4(this._innerIntersection, this._innerIntersection, INNER_TO_OUTER_BOX);

    return Math.fround(
      vec3.squaredDistance(axisAlignedPosition, this._outerIntersection)
      / vec3.squaredDistance(this._innerIntersection, this._outerIntersection)
    );
  }

  /**
   * Appends random points expressed in box-local space, centred on the box rather than offset by its position, choosing between the inner box and the six shell zones in proportion to their volumes and biasing shell samples outward by fallOffFactor. Generates nothing when any scaling axis is zero.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Drops the inner box from the choice, keeping every point in the shell.
   */

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

  @meta.adapted
  RegisterForChanges(callback)
  {
    const id = this._nextCallbackId++;
    this._callbacks.set(id, callback);
    return id;
  }

  /** Drops a change callback by the id RegisterForChanges returned. */

  @meta.implemented
  UnregisterForChanges(callbackId)
  {
    this._callbacks.delete(callbackId);
  }

  /**
   * Re-runs Setup after an authored change to position, scaling, rotation or
   * inner scaling, then notifies every registered listener.
   */

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
   * The intersection points are the ones the last GetIntensity between the
   * two boxes recorded, in outer-box unit space; m_boxTransform takes them
   * back out. Until such a call both sit at the box centre.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} parentTransform The parent's world transform.
   * @param {vec4} [baseColor] Base colour, Carbon's `const Color&`; defaults to Color( 0xFFFFFFFF ).
   */

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
   * Carbon Setup (EveBoxVolume.cpp:99-112): clamp the scaling to non-negative,
   * clamp the inner scaling into [0, scaling], then cache the outer and inner
   * box transforms, their inverses (Carbon's Inverse, so a singular transform
   * is kept as it is) and the bounding sphere. Box's Setup does NOT fire
   * change callbacks - OnModified does (cpp:194-215), unlike the ellipsoid,
   * whose Setup fires them itself.
   */

  @meta.implemented
  Setup()
  {
    // XMVectorMax( m_scaling, 0 ) and XMVectorMin( XMVectorMax( m_innerScaling, 0 ), m_scaling )
    // are SSE maxps / minps: (a > b) ? a : b and (a < b) ? a : b per lane.
    for (let i = 0; i < 3; i++)
    {
      const scaling = this.scaling[i] > 0 ? this.scaling[i] : 0;
      const innerScaling = this.innerScaling[i] > 0 ? this.innerScaling[i] : 0;
      this.scaling[i] = scaling;
      this.innerScaling[i] = innerScaling < scaling ? innerScaling : scaling;
    }

    // Carbon m_boxTransform = TransformationMatrix( m_scaling, m_rotation, m_position )
    // (cpp:104): row-vector S * R * T.
    mat4.fromRotationTranslationScale(this._boxTransform, this.rotation, this.position, this.scaling);

    // Carbon m_innerBoxTransform = TransformationMatrix( m_innerScaling, m_rotation, m_position )
    // (cpp:105): row-vector S * R * T.
    mat4.fromRotationTranslationScale(this._innerBoxTransform, this.rotation, this.position, this.innerScaling);

    mat4.inverseCarbon(this._inverseBoxTransform, this._boxTransform);
    mat4.inverseCarbon(this._inverseInnerBoxTransform, this._innerBoxTransform);

    vec3.copy(this._boundingSphere.center, this.position);
    this._boundingSphere.radius = Math.fround(Math.fround(vec3.length(this.scaling)) * 0.5);
  }
}
