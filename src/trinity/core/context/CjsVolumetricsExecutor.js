import { impl } from "#schema";


/**
 * Nominal backend contract for realizing Trinity's volumetric and froxel-fog
 * intents.
 *
 * Trinity owns fog blending, quality policy, logical state and constant-data
 * production. Engine implementations extend this class and realize physical
 * textures, passes, variable-store texture publication and shadow draws.
 * Every base method throws so incomplete engine composition fails visibly.
 */
export class CjsVolumetricsExecutor
{
  /** Realizes Carbon's volumetric-renderable pass and returns its texture. */
  @impl.abstract
  RenderVolumetrics(
    _renderer,
    _registry,
    _frustum,
    _sceneDepth,
    _froxelFog,
    _sunDirection,
    _depthSlices,
    _raytracingEnabled,
    _gpuResourcePool,
    _renderContext
  )
  {
    throw new Error("CjsVolumetricsExecutor.RenderVolumetrics must be implemented by an engine.");
  }

  /** Returns the backend's shared empty volumetric texture. */
  @impl.abstract
  GetEmptyVolumetricTexture(_gpuResourcePool)
  {
    throw new Error("CjsVolumetricsExecutor.GetEmptyVolumetricTexture must be implemented by an engine.");
  }

  /** Realizes the primary-view froxel fog pass and returns its texture. */
  @impl.abstract
  RenderFog(
    _renderer,
    _renderContext,
    _gpuResourcePool,
    _width,
    _height,
    _cascadedShadowMap,
    _raytracingGeometry,
    _shadowQuality,
    _sunDirection,
    _sunColor,
    _origin,
    _originShift,
    _view,
    _projection,
    _viewLast,
    _projectionLast
  )
  {
    throw new Error("CjsVolumetricsExecutor.RenderFog must be implemented by an engine.");
  }

  /** Realizes the reflection-view froxel fog pass and returns its texture. */
  @impl.abstract
  RenderFogIntoReflectionMap(
    _renderer,
    _renderContext,
    _gpuResourcePool,
    _width,
    _height,
    _sunDirection,
    _sunColor,
    _origin,
    _view,
    _projection
  )
  {
    throw new Error("CjsVolumetricsExecutor.RenderFogIntoReflectionMap must be implemented by an engine.");
  }

  /** Returns the backend's shared empty fog texture. */
  @impl.abstract
  GetEmptyFogTexture(_gpuResourcePool)
  {
    throw new Error("CjsVolumetricsExecutor.GetEmptyFogTexture must be implemented by an engine.");
  }

  /** Realizes the Mie environment-map update. */
  @impl.abstract
  UpdateFogEnvironmentMap(_renderer, _renderContext)
  {
    throw new Error("CjsVolumetricsExecutor.UpdateFogEnvironmentMap must be implemented by an engine.");
  }

  /** Publishes the engine's realized fog textures to its variable store. */
  @impl.abstract
  UpdateVariableStore(_renderer, _renderContext)
  {
    throw new Error("CjsVolumetricsExecutor.UpdateVariableStore must be implemented by an engine.");
  }

  /** Realizes volumetric shadow batches. */
  @impl.abstract
  RenderShadows(_renderer, _registry, _shadowMap, _renderContext)
  {
    throw new Error("CjsVolumetricsExecutor.RenderShadows must be implemented by an engine.");
  }
}
