// Source: E:\carbonengine\trinity\trinity\TriFrustumOrtho.h
// Source: E:\carbonengine\trinity\trinity\TriFrustumOrtho.cpp
//
// Native CPU helper (not Blue-exposed in Carbon), plain class like TriFrustum.
// The orthographic frustum is a view-space AABB: DeriveFrustum captures the
// (shadow) view matrix and the bounds, and every test transforms the query
// center into view space with a single-matrix TransformCoord (which is
// vec3.transformMat4 on the shared byte layout - no composition, no operand
// order to swap).
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { TriFrustumTestResult } from "../../generated/trinityCore/enums.js";

const CENTER_SCRATCH = vec3.create();

/**
 * Carbon TriFrustumOrtho (TriFrustumOrtho.h:9-27): orthographic shadow frustum
 * as view matrix + view-space bounds.
 */
export class TriFrustumOrtho
{
  /** m_view - identity until DeriveFrustum. */
  view = mat4.create();

  /** m_boundsMin (view space) */
  boundsMin = vec3.create();

  /** m_boundsMax (view space) */
  boundsMax = vec3.create();

  #eyePos = vec3.create();

  /**
   * Carbon TriFrustumOrtho::DeriveFrustum (cpp:13-18) - copies the view matrix
   * and view-space bounds.
   * @param {Float32Array} view
   * @param {Float32Array} minBounds
   * @param {Float32Array} maxBounds
   */
  DeriveFrustum(view, minBounds, maxBounds)
  {
    mat4.copy(this.view, view);
    vec3.copy(this.boundsMin, minBounds);
    vec3.copy(this.boundsMax, maxBounds);
  }

  /**
   * Carbon's two IsSphereVisibleAndInsideNearPlane overloads (cpp:20-61),
   * dispatched on the second argument like TriFrustum.IsSphereVisible: sphere
   * fully beyond the far bound (z - radius > boundsMax.z) is rejected, then a
   * squared-distance sphere-vs-AABB test in view space.
   * @param {Float32Array} sphereOrCenter - packed (x, y, z, radius) or center
   * @param {Number} [radius]
   * @returns {Boolean}
   */
  IsSphereVisibleAndInsideNearPlane(sphereOrCenter, radius = undefined)
  {
    const r = typeof radius === "number" ? radius : sphereOrCenter[3];
    const center = vec3.transformMat4(CENTER_SCRATCH, sphereOrCenter, this.view);

    if (center[2] - r > this.boundsMax[2])
    {
      return false;
    }

    let d = 0;
    for (let i = 0; i < 3; ++i)
    {
      if (center[i] < this.boundsMin[i])
      {
        const a = center[i] - this.boundsMin[i];
        d += a * a;
      }
      else if (center[i] > this.boundsMax[i])
      {
        const a = center[i] - this.boundsMax[i];
        d += a * a;
      }
    }

    return d <= r * r;
  }

  /**
   * Carbon TriFrustumOrtho::IsSphereVisibleIgnoreFarPlane (cpp:63-93) - same
   * squared-distance test but the +z (far) bound never rejects.
   * @param {Float32Array} sphereOrCenter - packed (x, y, z, radius) or center
   * @param {Number} [radius]
   * @returns {Boolean}
   */
  IsSphereVisibleIgnoreFarPlane(sphereOrCenter, radius = undefined)
  {
    const r = typeof radius === "number" ? radius : sphereOrCenter[3];
    const center = vec3.transformMat4(CENTER_SCRATCH, sphereOrCenter, this.view);

    let d = 0;
    for (let i = 0; i < 3; ++i)
    {
      if (center[i] < this.boundsMin[i])
      {
        const a = center[i] - this.boundsMin[i];
        d += a * a;
      }
      else if (i !== 2 && center[i] > this.boundsMax[i])
      {
        const a = center[i] - this.boundsMax[i];
        d += a * a;
      }
    }

    return d <= r * r;
  }

  /**
   * Carbon TriFrustumOrtho::SphereTestIgnoreFarPlane (cpp:95-135), the
   * XMVector lane math ported scalar-wise: Outside when the clamped
   * squared distance (far bound ignored) exceeds radius^2; Inside when the
   * sphere clears every bound by at least the radius (the far-bound lane is
   * substituted with the radius, so it always passes); Intersect otherwise.
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  SphereTestIgnoreFarPlane(sphere)
  {
    const packed = typeof sphere?.length === "number" && sphere.length >= 4;
    const radius = packed ? sphere[3] : sphere.radius;
    const center = vec3.transformMat4(CENTER_SCRATCH, packed ? sphere : sphere.center, this.view);

    const fromMinX = center[0] - this.boundsMin[0];
    const fromMinY = center[1] - this.boundsMin[1];
    const fromMinZ = center[2] - this.boundsMin[2];
    const fromMaxX = this.boundsMax[0] - center[0];
    const fromMaxY = this.boundsMax[1] - center[1];

    const outsideMinX = Math.min(fromMinX, 0);
    const outsideMinY = Math.min(fromMinY, 0);
    const outsideMinZ = Math.min(fromMinZ, 0);
    const outsideMaxX = Math.min(fromMaxX, 0);
    const outsideMaxY = Math.min(fromMaxY, 0);
    // because we are ignoring far plane, zero out the Z component

    const d = outsideMinX * outsideMinX + outsideMinY * outsideMinY + outsideMinZ * outsideMinZ +
      outsideMaxX * outsideMaxX + outsideMaxY * outsideMaxY;

    if (d > radius * radius)
    {
      return TriFrustumTestResult.Outside;
    }

    const inside = fromMinX >= radius && fromMinY >= radius && fromMinZ >= radius &&
      fromMaxX >= radius && fromMaxY >= radius;
    return inside ? TriFrustumTestResult.Inside : TriFrustumTestResult.Intersect;
  }

  /**
   * Carbon TriFrustumOrtho::GetPixelSize (cpp:137-150) - shadow-map pixel
   * coverage of a packed sphere: diameter over the larger relative frustum
   * extent, scaled by the texture size.
   * @param {Float32Array} sphere - packed (x, y, z, radius)
   * @param {Number} textureSize
   * @returns {Number}
   */
  GetPixelSize(sphere, textureSize)
  {
    const frustumWidth = this.boundsMax[0] - this.boundsMin[0];
    const frustumHeight = this.boundsMax[1] - this.boundsMin[1];

    const dx = (sphere[3] * 2) / frustumWidth;
    const dy = (sphere[3] * 2) / frustumHeight;

    return Math.max(dx, dy) * textureSize;
  }

  /**
   * Carbon TriFrustumOrtho::GetEyePos (cpp:152-155) - the view matrix
   * translation (m_view.GetTranslation(), flat 12..14).
   * @returns {Float32Array}
   */
  GetEyePos()
  {
    this.#eyePos[0] = this.view[12];
    this.#eyePos[1] = this.view[13];
    this.#eyePos[2] = this.view[14];
    return this.#eyePos;
  }
}
