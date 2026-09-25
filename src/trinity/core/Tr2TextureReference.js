// Source: trinity/trinity/Tr2TextureReference.h
// Source: trinity/trinity/Tr2TextureReference.cpp
// Source: trinity/trinity/Tr2TextureReference_Blue.cpp
// Hand-maintained from Carbon source.
//
// Carbon holds the Tr2TextureAL BY VALUE and owners create or reset it in
// place through GetTexture(). CarbonEngineJS AL textures come from the render
// context's factory as new objects, so an owner installs the texture it made
// with SetTexture, which also raises the change event the owner broadcasts in
// Carbon. GetTexture returns null while nothing is installed; a variable-store
// consumer binds that as "no texture", as Carbon binds an invalid one.
import { carbon, impl, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Holds one engine texture so it can be published through a variable store
 * and observed for replacement.
 */
@type.define({ className: "Tr2TextureReference", family: "trinityCore" })
export class Tr2TextureReference extends CjsModel
{

  /** m_texture (Tr2TextureAL) */
  @type.rawStruct("Tr2TextureAL")
  texture = null;

  /** m_onTextureChange (OnTextureChangeEvent) */
  @type.rawStruct("OnTextureChangeEvent")
  onTextureChange = null;

  _listeners = [];

  /**
   * Returns the referenced AL texture, or null while none is installed
   * (Carbon Tr2TextureReference.cpp:11-14).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns a pointer to its by-value member; JS textures are factory-made objects, so this returns the installed texture or null.")
  GetTexture()
  {
    return this.texture;
  }

  /**
   * Registers a texture-change listener (Carbon's OnTextureChange event,
   * cpp:16-19).
   * @param {Function} listener - called with this reference after each change
   * @returns {Function} unsubscribe
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon returns its event object for the caller to attach to; this takes the listener and returns the unsubscribe, matching Tr2DepthStencil and Tr2TextureArray.")
  OnTextureChange(listener)
  {
    this._listeners.push(listener);
    return () =>
    {
      const at = this._listeners.indexOf(listener);
      if (at !== -1) this._listeners.splice(at, 1);
    };
  }

  /**
   * Installs the owner's texture (null releases it) and broadcasts the change,
   * the JS form of an owner creating or resetting Carbon's by-value member and
   * then calling OnTextureChange().Broadcast(). Named after Carbon's
   * Tr2TransientTextureReference::SetTexture (cpp:122-126), which does exactly
   * this for a borrowed texture.
   * @param {Object|null} texture - a Tr2TextureAL from the render context factory
   */
  @impl.custom
  @impl.reason("Carbon owners mutate the by-value Tr2TextureAL in place; JS AL textures are factory-made, so the owner installs the new one here.")
  SetTexture(texture)
  {
    this.texture = texture ?? null;
    for (const listener of this._listeners.slice()) listener(this);
  }

  /** Texture width, or 0 with no texture (Carbon GetWidth, cpp:65-68). */
  @carbon.method
  @impl.implemented
  GetWidth()
  {
    return this.texture ? this.texture.GetDesc().GetWidth() : 0;
  }

  /** Texture height, or 0 with no texture (Carbon GetHeight, cpp:70-73). */
  @carbon.method
  @impl.implemented
  GetHeight()
  {
    return this.texture ? this.texture.GetDesc().GetHeight() : 0;
  }

  /** Texture depth, or 0 with no texture (Carbon GetDepth, cpp:75-78). */
  @carbon.method
  @impl.implemented
  GetDepth()
  {
    return this.texture ? this.texture.GetDesc().GetDepth() : 0;
  }

  /** Texture type, or 0 with no texture (Carbon GetType, cpp:80-83). */
  @carbon.method
  @impl.implemented
  GetType()
  {
    return this.texture ? this.texture.GetDesc().GetType() : 0;
  }

  /** Mip level count, or 0 with no texture (Carbon GetMipCount, cpp:85-88). */
  @carbon.method
  @impl.implemented
  GetMipCount()
  {
    return this.texture ? this.texture.GetDesc().GetMipCount() : 0;
  }

  /** Array size, or 0 with no texture (Carbon GetArraySize, cpp:90-93). */
  @carbon.method
  @impl.implemented
  GetArraySize()
  {
    return this.texture ? this.texture.GetDesc().GetArraySize() : 0;
  }

  /** Pixel format, or 0 with no texture (Carbon GetFormat, cpp:95-98). */
  @carbon.method
  @impl.implemented
  GetFormat()
  {
    return this.texture ? this.texture.GetDesc().GetFormat() : 0;
  }

  /** Texture debug name, or "" with no texture (Carbon GetName, cpp:100-104). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.texture ? this.texture.GetName() ?? "" : "";
  }

  /** Saves the referenced texture to disk; needs texture readback and ImageIO saving, neither ported here. */
  @carbon.method
  @impl.notImplemented
  Save(..._args)
  {
    throw new Error("Tr2TextureReference.Save is not implemented in CarbonEngineJS.");
  }

}
