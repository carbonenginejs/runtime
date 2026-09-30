// Source: trinity/trinity/Resources/Procedural/SolidColorTexture.cpp
//
// Carbon registers this constructor at static-initialisation time, inside its
// own translation unit (SolidColorTexture.cpp:17-32). As with
// RegisterShaderResources, we do not self-register at module scope: a module
// side effect fires on import rather than on composition and cannot be tested in
// isolation. Whoever composes a manager calls RegisterSolidColorTexture.
import { IBlueDynamicResourceConstructor } from "#blue";
import { TriTextureRes } from "./TriTextureRes.js";
import { ColorPrefix } from "./solidColorTexture.js";

/**
 * Carbon's `SolidColorTextureConstructor`: builds the texture a
 * `dynamic:/color/<query>` path names. TriTextureRes.Initialize recognises the
 * prefix and rasterizes the colour itself.
 */
export class SolidColorTextureConstructor extends IBlueDynamicResourceConstructor
{
  /**
   * A solid colour is four numbers in its own path; kept for good once built
   * (operator, 2026-09-24).
   *
   * @returns {boolean} Always true.
   */
  IsCacheable()
  {
    return true;
  }

  /**
   * `IBlueDynamicResourceConstructor::GetResource` (SolidColorTexture.cpp:23-29).
   *
   * @param {string} query Text after `dynamic:/color/`.
   * @returns {TriTextureRes} The texture resource.
   */
  GetResource(query)
  {
    const texture = new TriTextureRes();
    texture.Initialize(ColorPrefix + query, "");
    return texture;
  }
}

/**
 * Registers the `color` dynamic constructor on one manager.
 *
 * @param {import("../../global/blue/IBlueResMan.js").IBlueResMan} resourceManager
 *   Any IBlueResMan; only RegisterResourceConstructor is called.
 * @returns {object} The same manager, for chaining.
 */
export function RegisterSolidColorTexture(resourceManager)
{
  resourceManager.RegisterResourceConstructor("color", new SolidColorTextureConstructor());
  return resourceManager;
}
