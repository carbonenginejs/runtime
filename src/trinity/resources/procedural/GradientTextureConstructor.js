import { CjsSchema } from "#schema/CjsSchema";
// Source: trinity/trinity/Resources/Procedural/GradientTexture.cpp
//
// Carbon registers this constructor at static-initialisation time
// (GradientTexture.cpp:26-44). As with CjsLibrary's effect configuration and
// RegisterSolidColorTexture, registration here is an explicit composition call.
import { IBlueDynamicResourceConstructor } from "#blue";
import { TriTextureRes } from "#trinity/resources";
import { GradientPrefix } from "./gradientTexture.js";

/**
 * Carbon's `GradientTextureConstructor`: builds the texture a
 * `dynamic:/gradient_1d/<query>` path names.
 *
 * Carbon's constructor only creates the resource and calls Initialize, which
 * rasterizes (TriTextureRes.cpp:223-229). The resource now owns
 * rasterization too, so explicit reload follows the same native path.
 */
export class GradientTextureConstructor extends IBlueDynamicResourceConstructor
{
  /**
   * Carbon GradientTextureConstructor::GetResource: initialize its native procedural path.
   *
   * @adapted
   * @param {string} query Authored dynamic texture recipe after its registered prefix.
   * @returns {TriTextureRes} Initialized texture with a recipe retained for same-handle reload.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    texture.Initialize(GradientPrefix + query, "");
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
  resourceManager.RegisterResourceConstructor("gradient_1d", new GradientTextureConstructor());
  return resourceManager;
}

CjsSchema.decorateMethod(GradientTextureConstructor, "GetResource", CjsSchema.meta.adapted);
