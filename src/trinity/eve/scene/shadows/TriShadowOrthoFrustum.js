import { meta } from "#schema";
import { blue } from "#schema";
// Source: trinity/trinity/Eve/IEveShadowCaster.h
// Methods implemented from IEveShadowCaster.h:28-105 (TriShadowOrthoFrustum,
// the cascaded-shadow-map IEveShadowFrustum adapter). Transient per-shadow-pass
// CPU cull adapter - NOT a registry component and never a scene member
// (ECS-VISIBILITY-SPEC-2026-07-23 "Shadow frustums"). The camera argument is a
// TriFrustum; the shadow member is a TriFrustumOrtho owned by value and
// copied in, as Carbon's member is (ruling 16).
import { vec3 } from "#math/vec3";
import { TriFrustumOrtho } from "../../../core/view/TriFrustumOrtho.js";
import { PlaneDotCoord, PlaneDotNormal } from "../../../core/view/TriFrustum.js";
import { TriFrustumTestResult } from "../../../generated/trinityCore/enums.js";
import { IEveShadowFrustum } from "./IEveShadowFrustum.js";

/** Carbon's native orthographic-shadow frustum adapter. */
@meta.carbon("TriShadowOrthoFrustum")
@blue.inherit(IEveShadowFrustum)
export class TriShadowOrthoFrustum
{

  /** m_shadow (TriFrustumOrtho), by value. */
  shadow = new TriFrustumOrtho();

  /** m_shadowMapSize (uint32_t) */
  shadowMapSize = 0;

  /** m_sunDir (Vector3) */
  sunDir = vec3.create();

  /**
   * Carbon's argument constructor (h:42-47): copies the ortho frustum and the
   * sun direction. The JavaScript constructor is Carbon's default one
   * (h:35-40), whose values are the field initializers.
   * @param {TriFrustumOrtho} shadow
   * @param {number} shadowMapSize
   * @param {Float32Array} sunDir
   * @returns {TriShadowOrthoFrustum}
   */
  static create__AllFields(shadow, shadowMapSize, sunDir)
  {
    const frustum = new TriShadowOrthoFrustum();
    frustum.shadow.Copy(shadow);
    frustum.shadowMapSize = shadowMapSize >>> 0;
    vec3.copy(frustum.sunDir, sunDir);
    return frustum;
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
  @blue.method
  IsVisible(camera, boundingSphere)
  {
    const sphereIsVisible = this.shadow.IsSphereVisibleIgnoreFarPlane(boundingSphere, boundingSphere[3]);
    if (sphereIsVisible)
    {
      const planes = camera.planes;
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
  @blue.method
  GetSizeInShadow(boundingSphere)
  {
    return this.shadow.GetPixelSize(boundingSphere, this.shadowMapSize);
  }

  /**
   * Carbon TriShadowOrthoFrustum::GetEyePos (h:74-77).
   * @returns {Float32Array}
   */
  @blue.method
  GetEyePos()
  {
    return this.shadow.GetEyePos();
  }

  /**
   * Carbon TriShadowOrthoFrustum::SphereTest (h:79-104): the ortho
   * classification (far plane ignored), demoted per sun-facing camera plane -
   * Outside when fully behind one, Intersect when straddling one.
   * @param {Object} camera - TriFrustum duck ({ planes })
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  @blue.method
  SphereTest(camera, sphere)
  {
    let orthoResult = this.shadow.SphereTestIgnoreFarPlane(sphere);
    if (orthoResult !== TriFrustumTestResult.Outside)
    {
      const packed = typeof sphere?.length === "number" && sphere.length >= 4;
      const center = packed ? sphere : sphere.center;
      const radius = packed ? sphere[3] : sphere.radius;
      const planes = camera.planes;
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


}
