// Source: trinity/trinity/ITr2TextureProvider.h:11-16
import { CjsSchema, meta } from "#schema";

/** Native texture-provider contract; IRoot has no JavaScript base class. */
export class ITr2TextureProvider
{
  /**
   * Returns the provider's borrowed AL texture.
   * @returns {object|null} Texture value supplied by the implementation.
   */
  @meta.abstract
  GetTexture()
  {
    throw new Error("ITr2TextureProvider.GetTexture must be implemented by a texture provider.");
  }

  /**
   * Exposes the provider's texture-change event. Existing JavaScript providers
   * adapt this to listener registration returning an unsubscribe function.
   * @param {Function} _listener Callback used by the JavaScript event adapter.
   * @returns {Function} Unsubscribe function supplied by the implementation.
   */
  @meta.abstract
  OnTextureChange(_listener)
  {
    throw new Error("ITr2TextureProvider.OnTextureChange must be implemented by a texture provider.");
  }
}

CjsSchema.define(ITr2TextureProvider, { className: "ITr2TextureProvider", carbon: "ITr2TextureProvider", family: "trinityCore", fields: {} });
