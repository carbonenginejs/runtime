// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/IEveShadowCaster.h
// Methods implemented from IEveShadowCaster.h:107-135 (TriShadowFrustum, the
// perspective IEveShadowFrustum adapter). Transient per-shadow-pass CPU cull
// adapter - NOT a registry component and never a scene member
// (ECS-VISIBILITY-SPEC-2026-07-23 "Shadow frustums"). The shadow member is a
// TriFrustum held by reference (Carbon copies by value into the transient).
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { TriFrustumTestResult } from "../../../generated/trinityCore/enums.js";

/** Carbon's native perspective-shadow frustum adapter. */
export class TriShadowFrustum
{

  /** m_shadow (TriFrustum) */
  shadow = null;

  /**
   * Carbon's constructor (h:112-115); optional to keep the shell
   * default-constructible.
   * @param {Object|null} [shadow] - TriFrustum
   */
  constructor(shadow = null)
  {
    this.shadow = shadow ?? null;
  }

  /**
   * Carbon TriShadowFrustum::IsVisible (h:116-121) - the shadow frustum's own
   * sphere test; Carbon leaves camera-based culling as a TODO ("do something
   * smart to cull the shadowcasting sphere using the camera frustum").
   * @param {Object} _camera - TriFrustum duck (unused, Carbon parity)
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Boolean}
   */
  IsVisible(_camera, boundingSphere)
  {
    return !!this.shadow?.IsSphereVisible(boundingSphere);
  }

  /**
   * Carbon TriShadowFrustum::GetSizeInShadow (h:122-125).
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Number}
   */
  GetSizeInShadow(boundingSphere)
  {
    return this.shadow ? this.shadow.GetPixelSizeAccross(boundingSphere) : 0;
  }

  /**
   * Carbon TriShadowFrustum::GetEyePos (h:126-129) - the shadow frustum's
   * m_viewPos.
   * @returns {Float32Array}
   */
  GetEyePos()
  {
    return this.shadow ? this.shadow.viewPos : TriShadowFrustum.#zeroEyePos;
  }

  /**
   * Carbon TriShadowFrustum::SphereTest (h:131-134) - delegates to the shadow
   * frustum's six-plane classification (camera unused, Carbon parity).
   * @param {Object} _camera - TriFrustum duck (unused)
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  SphereTest(_camera, sphere)
  {
    return this.shadow ? this.shadow.SphereTest(sphere) : TriFrustumTestResult.Outside;
  }

  static #zeroEyePos = vec3.create();

}
