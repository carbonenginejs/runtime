import { meta } from "#schema";
import { blue } from "#schema";
// Source: trinity/trinity/Eve/IEveShadowCaster.h
// Methods implemented from IEveShadowCaster.h:107-135 (TriShadowFrustum, the
// perspective IEveShadowFrustum adapter). Transient per-shadow-pass CPU cull
// adapter - NOT a registry component and never a scene member
// (ECS-VISIBILITY-SPEC-2026-07-23 "Shadow frustums"). The shadow member is a
// TriFrustum owned by value and copied in, as Carbon's member is (ruling 16).
import { TriFrustum } from "../../../core/view/TriFrustum.js";
import { IEveShadowFrustum } from "./IEveShadowFrustum.js";

/** Carbon's native perspective-shadow frustum adapter. */
@meta.carbon("TriShadowFrustum")
@blue.inherit(IEveShadowFrustum)
export class TriShadowFrustum
{

  /** m_shadow (TriFrustum), by value. */
  shadow = new TriFrustum();

  /**
   * Carbon's only constructor (h:112-115): copies the shadow frustum. Carbon
   * has no default constructor; the JavaScript one leaves the frustum at
   * TriFrustum's defaults.
   * @param {TriFrustum} shadow
   * @returns {TriShadowFrustum}
   */
  static create__Shadow(shadow)
  {
    const frustum = new TriShadowFrustum();
    frustum.shadow.Copy(shadow);
    return frustum;
  }

  /**
   * Carbon TriShadowFrustum::IsVisible (h:116-121) - the shadow frustum's own
   * sphere test; Carbon leaves camera-based culling as a TODO ("do something
   * smart to cull the shadowcasting sphere using the camera frustum").
   * @param {Object} _camera - TriFrustum duck (unused, Carbon parity)
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Boolean}
   */
  @blue.method
  IsVisible(_camera, boundingSphere)
  {
    return this.shadow.IsSphereVisible(boundingSphere);
  }

  /**
   * Carbon TriShadowFrustum::GetSizeInShadow (h:122-125).
   * @param {Float32Array} boundingSphere - packed (x, y, z, radius)
   * @returns {Number}
   */
  @blue.method
  GetSizeInShadow(boundingSphere)
  {
    return this.shadow.GetPixelSizeAccross(boundingSphere);
  }

  /**
   * Carbon TriShadowFrustum::GetEyePos (h:126-129) - the shadow frustum's
   * m_viewPos.
   * @returns {Float32Array}
   */
  @blue.method
  GetEyePos()
  {
    return this.shadow.viewPos;
  }

  /**
   * Carbon TriShadowFrustum::SphereTest (h:131-134) - delegates to the shadow
   * frustum's six-plane classification (camera unused, Carbon parity).
   * @param {Object} _camera - TriFrustum duck (unused)
   * @param {Object|Float32Array} sphere - { center, radius } or packed vec4
   * @returns {Number} TriFrustumTestResult
   */
  @blue.method
  SphereTest(_camera, sphere)
  {
    return this.shadow.SphereTest(sphere);
  }


}
