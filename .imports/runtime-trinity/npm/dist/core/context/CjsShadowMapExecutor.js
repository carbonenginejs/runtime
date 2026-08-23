/**
 * Nominal backend contract for realizing Trinity's cascaded-shadow intents.
 *
 * Trinity owns split calculation and the call order. Engine implementations
 * extend this class and realize the physical atlas, render passes and optional
 * denoising. Every base method throws so an incomplete engine integration is
 * visible immediately.
 */
class CjsShadowMapExecutor {
  /** Allocates and prepares the physical cascaded-shadow atlas. */
  PrepareShadowRendering(_shadowMap, _renderContext) {
    throw new Error("CjsShadowMapExecutor.PrepareShadowRendering must be implemented by an engine.");
  }

  /** Begins rendering one logical split into its atlas cell. */
  BeginShadowRendering(_shadowMap, _splitIndex, _renderContext) {
    throw new Error("CjsShadowMapExecutor.BeginShadowRendering must be implemented by an engine.");
  }

  /** Restores engine render state after the cascaded-shadow pass. */
  EndShadowRendering(_shadowMap, _renderContext) {
    throw new Error("CjsShadowMapExecutor.EndShadowRendering must be implemented by an engine.");
  }

  /** Produces the screen-space shadow result and applies optional denoising. */
  DrawToShadowMapResult(_shadowMap, _depthMap, _cascadedShadowDepth, _upscaling, _renderContext) {
    throw new Error("CjsShadowMapExecutor.DrawToShadowMapResult must be implemented by an engine.");
  }
}

export { CjsShadowMapExecutor };
//# sourceMappingURL=CjsShadowMapExecutor.js.map
