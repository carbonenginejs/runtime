// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/IEveShadowCaster.h
// Methods implemented from IEveShadowCaster.h:28-105 (TriShadowOrthoFrustum,
// the cascaded-shadow-map IEveShadowFrustum adapter). Transient per-shadow-pass
// CPU cull adapter - NOT a registry component and never a scene member
// (ECS-VISIBILITY-SPEC-2026-07-23 "Shadow frustums"). The camera argument is a
// TriFrustum duck (world-space planes array); the shadow member is a
// TriFrustumOrtho held by reference (Carbon copies by value into the
// transient).
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { PlaneDotCoord, PlaneDotNormal } from "../../../trinityCore/TriFrustum.js";
import { TriFrustumTestResult } from "../../../generated/trinityCore/enums.js";

/** Carbon's native orthographic-shadow frustum adapter. */
export class TriShadowOrthoFrustum
{

  /** m_shadow (TriFrustumOrtho) */
  shadow = null;

  /** m_shadowMapSize (uint32_t) */
  shadowMapSize = 0;

  /** m_sunDir (Vector3) */
  sunDir = vec3.create();

  /**
   * Carbon's argument constructor (h:42-47); all arguments optional to keep
   * the default-constructible shell contract (h:35-40).
   * @param {Object|null} [shadow] - TriFrustumOrtho
   * @param {Number} [shadowMapSize]
   * @param {Float32Array|null} [sunDir]
   */
  constructor(shadow = null, shadowMapSize = 0, sunDir = null)
  {
    this.shadow = shadow ?? null;
    this.shadowMapSize = Number(shadowMapSize) >>> 0;
    if (sunDir)
    {
      vec3.copy(this.sunDir, sunDir);
    }
  }

  /**
   * Carbon TriShadowOrthoFrustum::IsVisible (h:48-69): the sphere must be
   * visible in the ortho shadow frustum (far plane ignored), and for every
   * camera plane facing away from the sun (DotNormal(plane, sunDir) < 0) the
   * sphere must not be entirely behind that plane. (Carbon's unused local
   * `val` on the negated center is dead code and is omitted.)
   * @param {Object} camera - TriFrustum duck ({ planes })
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Boolean}
   */
  IsVisible(camera, boundingSphere)
  {
    if (!this.shadow)
    {
      return false;
    }
    const sphereIsVisible = this.shadow.IsSphereVisibleIgnoreFarPlane(boundingSphere, boundingSphere[3]);
    if (sphereIsVisible)
    {
      const planes = camera?.planes ?? [];
      for (let j = 0; j < 6; ++j)
      {
        // first check if sun direction is perpendicular of the plane
        const d = PlaneDotNormal(planes[j], this.sunDir);
        // if it's not perpendicular then check if the object is "behind" the plane
        if (d < 0)
        {
          if (PlaneDotCoord(planes[j], boundingSphere) < -boundingSphere[3])
          {
            return false;
          }
        }
      }
    }
    return sphereIsVisible;
  }

  /**
   * Carbon TriShadowOrthoFrustum::GetSizeInShadow (h:70-73) - shadow-map pixel
   * coverage via TriFrustumOrtho.GetPixelSize.
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Number}
   */
  GetSizeInShadow(boundingSphere)
  {
    return this.shadow ? this.shadow.GetPixelSize(boundingSphere, this.shadowMapSize) : 0;
  }

  /**
   * Carbon TriShadowOrthoFrustum::GetEyePos (h:74-77).
   * @returns {Float32Array}
   */
  GetEyePos()
  {
    return this.shadow ? this.shadow.GetEyePos() : TriShadowOrthoFrustum.#zeroEyePos;
  }

  /**
   * Carbon TriShadowOrthoFrustum::SphereTest (h:79-104): the ortho
   * classification (far plane ignored), demoted per sun-facing camera plane -
   * Outside when fully behind one, Intersect when straddling one.
   * @param {Object} camera - TriFrustum duck ({ planes })
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  SphereTest(camera, sphere)
  {
    if (!this.shadow)
    {
      return TriFrustumTestResult.Outside;
    }
    let orthoResult = this.shadow.SphereTestIgnoreFarPlane(sphere);
    if (orthoResult !== TriFrustumTestResult.Outside)
    {
      const packed = typeof sphere?.length === "number" && sphere.length >= 4;
      const center = packed ? sphere : sphere.center;
      const radius = packed ? sphere[3] : sphere.radius;
      const planes = camera?.planes ?? [];
      for (let j = 0; j < 6; ++j)
      {
        // first check if sun direction is perpendicular of the plane
        const d = PlaneDotNormal(planes[j], this.sunDir);
        // if it's not perpendicular then check if the object is "behind" the plane
        if (d < 0)
        {
          const val = PlaneDotCoord(planes[j], center);
          if (val < -radius)
          {
            return TriFrustumTestResult.Outside;
          }
          if (val < radius)
          {
            orthoResult = TriFrustumTestResult.Intersect;
          }
        }
      }
    }
    return orthoResult;
  }

  static #zeroEyePos = vec3.create();

}
