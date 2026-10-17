// Source: trinity/trinity/Eve/IEveShadowCaster.h
import { blue } from "#schema";


/**
 * Carbon IEveShadowFrustum (IEveShadowCaster.h:15-26): the cull view of one
 * shadow pass, implemented by TriShadowOrthoFrustum and TriShadowFrustum.
 */
@blue.define("IEveShadowFrustum")
export class IEveShadowFrustum
{

  /**
   * Carbon's `bool IsVisible( const TriFrustum& camera, const Vector4& boundingSphere ) const`.
   * @param {TriFrustum} _camera
   * @param {vec4} _boundingSphere
   * @returns {boolean}
   */
  @blue.abstract
  IsVisible(_camera, _boundingSphere) {}

  /**
   * Carbon's `float GetSizeInShadow( const Vector4& boundingSphere ) const`.
   * @param {vec4} _boundingSphere
   * @returns {number}
   */
  @blue.abstract
  GetSizeInShadow(_boundingSphere) {}

  /**
   * Carbon's `const Vector3& GetEyePos() const`.
   * @returns {vec3}
   */
  @blue.abstract
  GetEyePos() {}

  /**
   * Carbon's `TriFrustumTestResult SphereTest( const TriFrustum& camera, const CcpMath::Sphere& sphere ) const`.
   * @param {TriFrustum} _camera
   * @param {sph3} _sphere
   * @returns {number} A TriFrustumTestResult value.
   */
  @blue.abstract
  SphereTest(_camera, _sphere) {}

}
