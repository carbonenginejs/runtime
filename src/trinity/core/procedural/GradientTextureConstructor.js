// Source: trinity/trinity/Resources/Procedural/GradientTexture.cpp
//
// Carbon registers this constructor at static-initialisation time
// (GradientTexture.cpp:26-44). As with RegisterShaderResources and
// RegisterSolidColorTexture, registration here is an explicit composition call.
import { TriTextureRes } from "#resource";
import { GradientPrefix, RasterizeGradient } from "./gradientTexture.js";

/**
 * Carbon's `GradientTextureConstructor`: builds the texture a
 * `dynamic:/gradient_1d/<query>` path names.
 *
 * Carbon's constructor only creates the resource and calls Initialize, which
 * rasterizes (TriTextureRes.cpp:223-229). Ours rasterizes here, because
 * TriTextureRes is in the resource layer and cannot reach the curves - see the
 * head comment of gradientTexture.js.
 */
export class GradientTextureConstructor
{
  /**
   * `IBlueDynamicResourceConstructor::GetResource` (GradientTexture.cpp:32-38).
   *
   * @param {string} query Base64 text after `dynamic:/gradient_1d/`.
   * @returns {TriTextureRes} The texture resource, failed when the path is invalid.
   */
  GetResource(query)
  {
    const path = GradientPrefix + query;
    const texture = new TriTextureRes();
    texture.Initialize(path, "");

    const bitmap = RasterizeGradient(path);
    if (!bitmap)
    {
      // Carbon logs "Failed to parse dynamic:/gradient_1d/ texture path" (or the
      // zero-width variant) and leaves the bitmap invalid, so the texture is
      // never prepared.
      const error = new Error(`Failed to parse ${path} texture path`);
      error.code = "CJS_TEXTURE_PROCEDURAL_PATH_INVALID";
      error.path = path;
      texture.SetError(error);
      return texture;
    }
    texture.SetPayload(bitmap);
    texture.MarkPrepared();
    return texture;
  }
}

/**
 * Registers the `gradient_1d` dynamic constructor on one manager.
 *
 * @param {object} resourceManager Manager to register on.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterGradientTexture(resourceManager)
{
  if (typeof resourceManager?.RegisterResourceConstructor !== "function")
  {
    throw new TypeError("RegisterGradientTexture requires a CjsResMan.");
  }
  resourceManager.RegisterResourceConstructor("gradient_1d", new GradientTextureConstructor());
  return resourceManager;
}
