// Source: trinity/trinity/TriFrustum.h
// Source: trinity/trinity/TriFrustum.cpp
// Source: math/include/Plane_inline.h (Normalize/DotCoord/DotNormal)
// Source: trinity/trinity/Utilities/MatrixUtils.cpp:28-42 (DeconstructProjectionMatrix)
//
// Native CPU helper (not Blue-exposed in Carbon - no TriFrustum_Blue.cpp
// exists), so no schema registration; plain class per the EveLODHelper /
// CjsBatchManager precedent. Carbon's TRINITYDEV-only test/rejection counters
// are omitted. Matrix element mapping: Carbon row-major _rc lands at flat
// index (r-1)*4+(c-1), which is the SAME flat index in the shared gl-matrix
// byte layout, so every _rc below is ported as m[(r-1)*4+(c-1)] unchanged.
import { meta } from "#schema";
import { box3 } from "#math/box3";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriFrustumTestResult } from "../../generated/trinityCore/enums.js";

/** std::numeric_limits<float>::max() - Carbon's "camera inside sphere" result. */
export const FLOAT_MAX = 3.4028234663852886e38;

const DERIVE_SCRATCH = mat4.create();

/**
 * Carbon DotCoord (Plane_inline.h:123-126), prefixed to keep the flat package
 * namespace unambiguous: plane.a*v.x + plane.b*v.y + plane.c*v.z + plane.d.
 * @param {Float32Array} plane - (a, b, c, d)
 * @param {Float32Array|Array} point
 * @returns {Number}
 */
export function PlaneDotCoord(plane, point)
{
  return plane[0] * point[0] + plane[1] * point[1] + plane[2] * point[2] + plane[3];
}

/**
 * Carbon DotNormal (Plane_inline.h:129-132): plane.a*v.x + plane.b*v.y + plane.c*v.z.
 * @param {Float32Array} plane - (a, b, c, d)
 * @param {Float32Array|Array} v
 * @returns {Number}
 */
export function PlaneDotNormal(plane, v)
{
  return plane[0] * v[0] + plane[1] * v[1] + plane[2] * v[2];
}

/**
 * Carbon TriFrustum (TriFrustum.h:16-77): world-space frustum planes extracted
 * from a composed view*projection matrix, plus the cached projection data used
 * for on-screen pixel-coverage estimates.
 */
export class TriFrustum
{
  /** m_planes[PLANE_COUNT] - normalized world-space planes (a, b, c, d). */
  planes = [
    vec4.create(),
    vec4.create(),
    vec4.create(),
    vec4.create(),
    vec4.create(),
    vec4.create()
  ];

  /** m_projectionMatrix */
  projectionMatrix = mat4.create();

  /** m_viewPos - camera world position supplied to DeriveFrustum. */
  viewPos = vec3.create();

  /** m_viewDir - third column of the view matrix (view->_13/_23/_33). */
  viewDir = vec3.create();

  /** m_halfWidthProjection = projection._11 * viewport.width * 0.5 */
  halfWidthProjection = 0;

  /** m_zNear */
  zNear = 0;

  /** m_zFar */
  zFar = 0;

  /** m_aspectRatio */
  aspectRatio = 1;

  /** m_fov */
  fov = 1;

  /**
   * Carbon TriFrustum::DeriveFrustum (cpp:26-36) - extracts the frustum planes
   * from the view and projection matrix in world coordinates.
   * @param {Float32Array} view
   * @param {Float32Array} viewPos - camera world position
   * @param {Float32Array} projection
   * @param {Object} viewport - TriViewport duck ({ width })
   */
  DeriveFrustum(view, viewPos, projection, viewport)
  {
    this.#CacheTransformationData(view, viewPos, projection, viewport);

    // Carbon (row-vector): worldMat = view * projection - view applied first,
    // then projection, so gl-matrix swaps the operands.
    mat4.multiply(DERIVE_SCRATCH, projection, view);

    this.ExtractFrustum(DERIVE_SCRATCH);
  }

  /**
   * Carbon TriFrustum::ExtractFrustum (cpp:38-119) - Gribb/Hartmann plane
   * extraction by adding/subtracting matrix columns, then normalizing.
   * Carbon _rc flat indices: col1 = (0, 4, 8, 12), col2 = (1, 5, 9, 13),
   * col3 = (2, 6, 10, 14), col4 = (3, 7, 11, 15).
   * @param {Float32Array} proj - composed view*projection (or projection alone)
   */
  ExtractFrustum(proj)
  {
    const planes = this.planes;

    // front: the near-plane normal is column 3 (proj->_13/_23/_33/_43)
    vec4.set(planes[TriFrustum.PLANE_FRONT], proj[2], proj[6], proj[10], proj[14]);
    // left: col4 + col1
    vec4.set(planes[TriFrustum.PLANE_LEFT], proj[3] + proj[0], proj[7] + proj[4], proj[11] + proj[8], proj[15] + proj[12]);
    // top: col4 - col2
    vec4.set(planes[TriFrustum.PLANE_TOP], proj[3] - proj[1], proj[7] - proj[5], proj[11] - proj[9], proj[15] - proj[13]);
    // right: col4 - col1
    vec4.set(planes[TriFrustum.PLANE_RIGHT], proj[3] - proj[0], proj[7] - proj[4], proj[11] - proj[8], proj[15] - proj[12]);
    // bottom: col4 + col2
    vec4.set(planes[TriFrustum.PLANE_BOTTOM], proj[3] + proj[1], proj[7] + proj[5], proj[11] + proj[9], proj[15] + proj[13]);
    // back: col4 - col3
    vec4.set(planes[TriFrustum.PLANE_BACK], proj[3] - proj[2], proj[7] - proj[6], proj[11] - proj[10], proj[15] - proj[14]);

    for (let i = 0; i < TriFrustum.PLANE_COUNT; i++)
    {
      // Plane Normalize (Plane_inline.h:112-120): scale by 1/|normal|.
      const plane = planes[i];
      const scale = 1 / Math.hypot(plane[0], plane[1], plane[2]);
      plane[0] *= scale;
      plane[1] *= scale;
      plane[2] *= scale;
      plane[3] *= scale;
    }
  }

  /**
   * Carbon's IsSphereVisible( const Vector4* sphere, cullBackPlane ) (cpp:121):
   * the packed (x, y, z, radius) form.
   * @param {Float32Array} sphere - packed (x, y, z, radius)
   * @param {Boolean} [cullBackPlane]
   * @returns {Boolean}
   */
  IsSphereVisible(sphere, cullBackPlane = false)
  {
    return this.IsSphereVisible__CenterRadius(sphere, sphere[3], cullBackPlane);
  }

  /**
   * Carbon's IsSphereVisible( center, radius, cullBackPlane ) (cpp:121-148),
   * named by the parameters that replace sphere (docs 22d1237). Returns true if
   * any part of the sphere is inside the frustum. Carbon deliberately skips the
   * back plane unless cullBackPlane ("For some reason the old code ignored the
   * back plane").
   * @param {Float32Array} center
   * @param {Number} radius
   * @param {Boolean} [cullBackPlane]
   * @returns {Boolean}
   */
  IsSphereVisible__CenterRadius(center, radius, cullBackPlane = false)
  {
    const sphereOrCenter = center;
    const cullBack = cullBackPlane;

    if (TriFrustum.frustumCullingDisabled)
    {
      return true;
    }

    const planeCount = (TriFrustum.PLANE_COUNT - 1) + (cullBack ? 1 : 0);
    for (let i = 0; i < planeCount; i++)
    {
      if (PlaneDotCoord(this.planes[i], sphereOrCenter) < -radius)
      {
        return false;
      }
    }
    return true;
  }

  /**
   * Carbon TriFrustum::SphereTest (cpp:150-166) - full six-plane classification.
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  SphereTest(sphere)
  {
    const packed = typeof sphere?.length === "number" && sphere.length >= 4;
    const center = packed ? sphere : sphere.center;
    const radius = packed ? sphere[3] : sphere.radius;

    let result = TriFrustumTestResult.Inside;
    for (let i = 0; i < TriFrustum.PLANE_COUNT; i++)
    {
      const d = PlaneDotCoord(this.planes[i], center);
      if (d < -radius)
      {
        return TriFrustumTestResult.Outside;
      }
      if (d < radius)
      {
        result = TriFrustumTestResult.Intersect;
      }
    }
    return result;
  }

  /**
   * Carbon TriFrustum::IsPointVisible (cpp:168-174) - wraps the sphere test
   * with a radius of zero.
   * @param {Float32Array} point
   * @returns {Boolean}
   */
  IsPointVisible(point)
  {
    return this.IsSphereVisible__CenterRadius(point, 0);
  }

  /**
   * Carbon's IsBoxVisible( const CcpMath::AxisAlignedBox& aabb ) (cpp:187): a
   * packed box3; an empty box is not visible.
   * @param {Float32Array} aabb - box3
   * @returns {Boolean}
   */
  IsBoxVisible(aabb)
  {
    if (box3.isEmpty(aabb))
    {
      return false;
    }
    return this.IsBoxVisible__BoundsMinMax(box3.$min(aabb), box3.$max(aabb));
  }

  /**
   * Carbon's IsBoxVisible( boundsMin, boundsMax ) (cpp:187-232), named by the
   * parameters that replace aabb (docs 22d1237, 2b749d3). Frustum-AABB test via
   * the positive vertex; may return false positives, never false negatives.
   * @param {Float32Array} min - boundsMin
   * @param {Float32Array} max - boundsMax
   * @returns {Boolean}
   */
  IsBoxVisible__BoundsMinMax(min, max)
  {
    for (let i = 0; i < TriFrustum.PLANE_COUNT; i++)
    {
      const plane = this.planes[i];
      const vmaxX = plane[0] > 0 ? max[0] : min[0];
      const vmaxY = plane[1] > 0 ? max[1] : min[1];
      const vmaxZ = plane[2] > 0 ? max[2] : min[2];
      if (plane[0] * vmaxX + plane[1] * vmaxY + plane[2] * vmaxZ + plane[3] < 0)
      {
        return false;
      }
    }
    return true;
  }

  /**
   * Carbon's GetPixelSizeAccross( const Vector4* sphere ) (cpp:234-237): the
   * pixel coverage of a packed (x, y, z, radius) sphere on screen.
   * Carbon defect CE-04, reproduced: this family's overloads disagree off-axis
   * (the Sphere and AxisAlignedBox forms use the Est maths).
   * @param {Float32Array} sphere
   * @returns {Number}
   */
  GetPixelSizeAccross(sphere)
  {
    return this.GetPixelSizeAccross__CenterRadius(sphere, sphere[3]);
  }

  /**
   * Carbon's GetPixelSizeAccross( const CcpMath::Sphere& sphere ) (cpp:295-298):
   * delegates to GetPixelSizeAccrossEst - CE-04, kept.
   * @param {{ center: Float32Array, radius: Number }} sphere
   * @returns {Number}
   */
  GetPixelSizeAccross__Sphere(sphere)
  {
    return this.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius);
  }

  /**
   * Carbon's GetPixelSizeAccross( const CcpMath::AxisAlignedBox& box )
   * (cpp:300-307): 0 for an empty box, else the box's bounding sphere through
   * the Sphere overload, so the Est maths - CE-04, kept.
   * @param {Float32Array} box - box3
   * @returns {Number}
   */
  GetPixelSizeAccross__AxisAlignedBox(box)
  {
    if (box3.isEmpty(box)) return 0;
    const boxRadius = box3.toPositionRadius(box, TriFrustum.#boxCenterScratch);
    return this.GetPixelSizeAccrossEst__CenterRadius(TriFrustum.#boxCenterScratch, boxRadius);
  }

  /**
   * Carbon's GetPixelSizeAccrossEst( const Vector4* sphere ) (cpp:239-242):
   * cheaper distance-based estimate of a packed sphere's pixel size. CE-04.
   * @param {Float32Array} sphere
   * @returns {Number}
   */
  GetPixelSizeAccrossEst(sphere)
  {
    return this.GetPixelSizeAccrossEst__CenterRadius(sphere, sphere[3]);
  }

  /**
   * Carbon TriFrustum::GetPixelSizeAccross(center, radius) (cpp:245-272). CE-04:
   * disagrees off-axis with the Est form, kept.
   * @param {Float32Array} center
   * @param {Number} radius
   * @returns {Number}
   */
  GetPixelSizeAccross__CenterRadius(center, radius)
  {
    // Carbon: Vector3 d(center - m_viewPos); d = -d; => d = viewPos - center.
    const dx = this.viewPos[0] - center[0];
    const dy = this.viewPos[1] - center[1];
    const dz = this.viewPos[2] - center[2];

    if (dx * dx + dy * dy + dz * dz < radius * radius)
    {
      return FLOAT_MAX;
    }

    let depth = this.viewDir[0] * dx + this.viewDir[1] * dy + this.viewDir[2] * dz;
    // clamp values close to zero and below
    const epsilon = 1e-5;
    if (depth < epsilon)
    {
      depth = epsilon;
    }

    if (radius < epsilon)
    {
      return 0;
    }

    return (radius / depth) * this.halfWidthProjection * 2;
  }

  /**
   * Carbon TriFrustum::GetPixelSizeAccrossEst(center, radius) (cpp:274-293).
   * @param {Float32Array} center
   * @param {Number} radius
   * @returns {Number}
   */
  GetPixelSizeAccrossEst__CenterRadius(center, radius)
  {
    if (radius <= 0)
    {
      return 0;
    }

    const dx = center[0] - this.viewPos[0];
    const dy = center[1] - this.viewPos[1];
    const dz = center[2] - this.viewPos[2];
    const lengthSqrd = dx * dx + dy * dy + dz * dz;
    const radiusSqrd = radius * radius;
    if (lengthSqrd < radiusSqrd)
    {
      // The camera is inside the object, it essentially has infinite screen size.
      return FLOAT_MAX;
    }

    // adjusted distance based on the visible part of the sphere
    const distance = Math.sqrt(lengthSqrd - radiusSqrd);
    return (radius / distance) * this.halfWidthProjection * 2;
  }

  /**
   * Carbon TriFrustum::CacheTransformationData (cpp:309-325, private) - stores
   * the view/projection data needed for pixel-diameter extraction, then
   * DeconstructProjectionMatrix (MatrixUtils.cpp:28-42) recovers aspect, fov
   * and the clip planes from the projection matrix.
   * @param {Float32Array} view
   * @param {Float32Array} viewPos
   * @param {Float32Array} projection
   * @param {Object} viewport
   */
  #CacheTransformationData(view, viewPos, projection, viewport)
  {
    mat4.copy(this.projectionMatrix, projection);
    vec3.copy(this.viewPos, viewPos);

    // m_viewDir = view->_13/_23/_33 (flat 2/6/10) - third column of the
    // row-vector view matrix; single-matrix data, no composition involved.
    this.viewDir[0] = view[2];
    this.viewDir[1] = view[6];
    this.viewDir[2] = view[10];

    // m_halfWidthProjection = projection->_11 (flat 0) * viewport.width * 0.5
    this.halfWidthProjection = projection[0] * viewport.width * 0.5;

    // DeconstructProjectionMatrix: asp = _22/_11, fov = 2*atan(1/_22),
    // frontClip = _43/_33, backClip = frontClip*_33/(_33+1).
    this.aspectRatio = projection[0] ? projection[5] / projection[0] : 0;
    this.fov = projection[5] ? 2 * Math.atan(1 / projection[5]) : 0;
    this.zNear = projection[10] ? projection[14] / projection[10] : 0;
    this.zFar = this.zNear * projection[10] / (projection[10] + 1);
  }

  /** Carbon TriFrustum plane-index enum (TriFrustum.h:19-28). */
  static PLANE_FRONT = 0;

  static PLANE_LEFT = 1;

  static PLANE_TOP = 2;

  static PLANE_RIGHT = 3;

  static PLANE_BOTTOM = 4;

  static PLANE_BACK = 5;

  static PLANE_COUNT = 6;

  /** g_frustumCullingDisabled (TRI_REGISTER_SETTING "frustumCullingDisabled",
   * cpp:9-10) - debug escape hatch that forces every sphere test to pass. */
  @meta.setting("frustumCullingDisabled")
  static frustumCullingDisabled = false;

  static #boxCenterScratch = vec3.create();
}
