import { exposure as be } from "#be";
// Source: trinity/trinity/ITr2VolumetricRenderable.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildCloud2_Blue.cpp:7 (BLUE_DEFINE_INTERFACE)
//
// Carbon also registers this as the "VolumetricRenderable" component type
// (ITr2VolumetricRenderable.h:55, REGISTER_COMPONENT_TYPE); the component
// registry is a separate mechanism and is not declared here.
//
// The nested SceneInformation (h:26-36) and ShadowInfo (h:38-43) structs are
// not ported as classes here: callers pass plain records carrying their
// fields (EveChildCloud2.SetSceneInformation, EveSpaceScene).
import { IRoot } from "#blue/IRoot";
import { blue } from "#schema";


/**
 * Carbon ITr2VolumetricRenderable (ITr2VolumetricRenderable.h:22-53): an
 * object the volumetrics renderer sorts, batches, lights and shadows.
 */
@be.interface("ITr2VolumetricRenderable")
@blue.inherit(IRoot)
export class ITr2VolumetricRenderable extends IRoot
{

  /**
   * Carbon's pure virtual `float GetSortValue( const TriFrustum& frustum )`
   * (h:45).
   *
   * Named GetSortValue__Frustum (rule 11): every implementer also takes
   * ITr2Renderable, whose GetSortValue has a different parameter, and the
   * two meet on one JavaScript class.
   * @param {TriFrustum} _frustum The view frustum.
   * @returns {number} The sort value.
   */
  @blue.abstract
  GetSortValue__Frustum(_frustum) {}

  /**
   * Carbon's pure virtual `void GetVolumetricBatches( const TriFrustum&
   * frustum, ITriRenderBatchAccumulator* batches )` (h:46).
   * @param {TriFrustum} _frustum The view frustum.
   * @param {ITriRenderBatchAccumulator} _batches Receives the batches.
   */
  @blue.abstract
  GetVolumetricBatches(_frustum, _batches) {}

  /**
   * Carbon's pure virtual `bool UpdateVolumetricLightmap( Tr2RenderContext&
   * renderContext )` (h:47).
   * @param {Tr2RenderContext} _renderContext The render context.
   * @returns {boolean} Whether the lightmap is up to date.
   */
  @blue.abstract
  UpdateVolumetricLightmap(_renderContext) {}

  /**
   * Carbon's pure virtual `void SetSceneInformation( const SceneInformation&
   * sceneInformation )` (h:48).
   * @param {object} _sceneInformation A SceneInformation record (h:26-36).
   */
  @blue.abstract
  SetSceneInformation(_sceneInformation) {}

  /**
   * Carbon's pure virtual `void GetVolumetricShadowBatches(
   * ITriRenderBatchAccumulator* batches )` (h:49).
   * @param {ITriRenderBatchAccumulator} _batches Receives the batches.
   */
  @blue.abstract
  GetVolumetricShadowBatches(_batches) {}

  /**
   * Carbon's pure virtual `void GetVolumetricShadowInfo( ShadowInfo&
   * shadowInfo, Vector3 sunDir )` (h:50).
   * @param {object} _shadowInfo The ShadowInfo record (h:38-43) to fill.
   * @param {vec3} _sunDir The sun direction.
   */
  @blue.abstract
  GetVolumetricShadowInfo(_shadowInfo, _sunDir) {}

  /**
   * Carbon's pure virtual `bool PrepareCloudShadowMap( Tr2RenderContext&
   * renderContext )` (h:51).
   * @param {Tr2RenderContext} _renderContext The render context.
   * @returns {boolean} Whether the shadow map is ready.
   */
  @blue.abstract
  PrepareCloudShadowMap(_renderContext) {}

  /** Carbon's pure virtual `void SetCloudShadowMapHandle()` (h:52). */
  @blue.abstract
  SetCloudShadowMapHandle() {}
}
