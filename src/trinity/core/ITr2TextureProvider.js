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
   * Returns the provider's texture-change event (ITr2TextureProvider.h:16),
   * a Tr2Event broadcast with no arguments.
   * @returns {import("./Tr2Event.js").Tr2Event} The provider's m_onTextureChange.
   */
  @meta.abstract
  OnTextureChange()
  {
    throw new Error("ITr2TextureProvider.OnTextureChange must be implemented by a texture provider.");
  }
}

CjsSchema.blue.define(ITr2TextureProvider, { className: "ITr2TextureProvider", fields: {} });
