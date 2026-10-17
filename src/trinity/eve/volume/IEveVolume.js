import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/Volume/IEveVolume.h
import { blue } from "#schema";


/** Required EVE volume contract (IEveVolume.h:10-20). */
@blue.define("IEveVolume")
@blue.inherit(IRoot)
export class IEveVolume
{

  /**
   * Carbon `GetIntensity( Vector3 position )` (IEveVolume.h:13): the volume
   * intensity at a position.
   *
   * @param {vec3} _position The position.
   * @returns {number} The intensity.
   */
  @blue.abstract
  GetIntensity(_position) {}

  /**
   * Carbon `RegisterForChanges( const std::function<void()>& callBack )`
   * (IEveVolume.h:14): registers a change callback.
   *
   * @param {Function} _callBack Called when the volume changes.
   * @returns {number} The callback ID.
   */
  @blue.abstract
  RegisterForChanges(_callBack) {}

  /**
   * Carbon `UnregisterForChanges( uint32_t callbackID )` (IEveVolume.h:15).
   *
   * @param {number} _callbackID An ID `RegisterForChanges` returned.
   */
  @blue.abstract
  UnregisterForChanges(_callbackID) {}

  /**
   * Carbon `GeneratePointsInVolume( std::vector<Vector3>& points, size_t
   * howManyToAdd, bool excludeInnerVolume, float fallOffFactor )`
   * (IEveVolume.h:16-17): appends points in the volume, each facing the
   * closest outward surface.
   *
   * @param {Array<vec3>} _points Caller-owned list the points are appended to.
   * @param {number} _howManyToAdd How many points to append.
   * @param {boolean} _excludeInnerVolume Whether to skip the inner volume.
   * @param {number} _fallOffFactor Falloff weighting.
   */
  @blue.abstract
  GeneratePointsInVolume(_points, _howManyToAdd, _excludeInnerVolume, _fallOffFactor) {}

  /**
   * Carbon `RenderDebugInfo( ITr2DebugRenderer2& renderer, const Matrix&
   * parentTransform, const Color& baseColor = 0xFFFFFFFF )` (IEveVolume.h:18).
   *
   * @param {ITr2DebugRenderer2} _renderer The debug renderer.
   * @param {mat4} _parentTransform The parent's world transform.
   * @param {vec4} [_baseColor] Base colour, Carbon's `const Color&`; defaults to Color( 0xFFFFFFFF ).
   */
  @blue.abstract
  RenderDebugInfo(_renderer, _parentTransform, _baseColor) {}

  /**
   * Carbon `const CcpMath::Sphere GetBoundingSphere() const`
   * (IEveVolume.h:19).
   *
   * @returns {{center: vec3, radius: number}} The volume's bounding sphere.
   */
  @blue.abstract
  GetBoundingSphere() {}

}
