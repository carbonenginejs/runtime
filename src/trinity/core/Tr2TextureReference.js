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
import { meta, types } from "#schema";
import { ITr2TextureProvider } from "./ITr2TextureProvider.js";
import { Tr2TextureAL } from "../../trinityal/Tr2TextureAL/index.js";

/**
 * Holds one engine texture so it can be published through a variable store
 * and observed for replacement.
 */
@meta.define({ className: "Tr2TextureReference", family: "trinityCore" })
export class Tr2TextureReference extends ITr2TextureProvider
{

  /**
   * Native by-value AL share; opaque storage, not a Blue resource edge.
   * @type {Tr2TextureAL|null}
   */
  @types.rawStruct("Tr2TextureAL")
  texture = null;

  /**
   * Native event storage declaration; the existing JS listeners carry subscriptions.
   * @type {object|null}
   */
  @types.rawStruct("OnTextureChangeEvent")
  onTextureChange = null;

  /**
   * Class-owned subscriptions for the native texture-change event adapter.
   * @type {Array<(reference: Tr2TextureReference) => void>}
   */
  _listeners = [];

  /**
   * Texture width; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get width()
  {
    return this.GetWidth();
  }

  /**
   * Texture height; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get height()
  {
    return this.GetHeight();
  }

  /**
   * Texture depth; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get depth()
  {
    return this.GetDepth();
  }

  /**
   * Texture type; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get type()
  {
    return this.GetType();
  }

  /**
   * Number of mip levels; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get mipCount()
  {
    return this.GetMipCount();
  }

  /**
   * Pixel format; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get format()
  {
    return this.GetFormat();
  }

  /**
   * Number of textures in the array; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.uint32
  @meta.impl.implemented
  get arraySize()
  {
    return this.GetArraySize();
  }

  /**
   * Texture name; native readonly Blue property.
   * @returns {string} Current texture description value.
   */
  @meta.property()
  @meta.edit.read
  @types.string
  @meta.impl.implemented
  get name()
  {
    return this.GetName();
  }

  /**
   * Returns the referenced AL texture, or null while none is installed
   * (Carbon Tr2TextureReference.cpp:11-14).
   *
   * Carbon returns a pointer to its by-value member; JS textures are factory-made
   * objects, so this returns the installed texture or null.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetTexture()
  {
    return this.texture;
  }

  /**
   * Registers a texture-change listener (Carbon's OnTextureChange event,
   * cpp:16-19).
   *
   * Carbon returns its event object for the caller to attach to; this takes the
   * listener and returns the unsubscribe, matching Tr2DepthStencil and
   * Tr2TextureArray.
   *
   * @param {Function} listener - called with this reference after each change
   * @returns {Function} unsubscribe
   */
  @meta.carbon.method
  @meta.impl.adapted
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
   * the JS form of copying or resetting Carbon's by-value member and then
   * calling OnTextureChange().Broadcast(). The caller keeps its own value;
   * this owner explicitly retains a separate shared value.
   *
   * Carbon owners mutate the by-value Tr2TextureAL in place; JS AL textures are
   * factory-made, so the owner installs the new one here.
   *
   * @param {Object|null} texture - a Tr2TextureAL from the render context factory
   */
  @meta.impl.custom
  SetTexture(texture)
  {
    // Copy before reset also makes assigning GetTexture() to this owner safe.
    const next = texture ? new Tr2TextureAL({ copy: texture }) : null;
    if (this.texture) this.texture.Destroy();
    this.texture = next;
    for (const listener of this._listeners.slice()) listener(this);
  }

  /** Texture width, or 0 with no texture (Carbon GetWidth, cpp:65-68). */
  @meta.carbon.method
  @meta.impl.implemented
  GetWidth()
  {
    return this.texture ? this.texture.GetDesc().GetWidth() : 0;
  }

  /** Texture height, or 0 with no texture (Carbon GetHeight, cpp:70-73). */
  @meta.carbon.method
  @meta.impl.implemented
  GetHeight()
  {
    return this.texture ? this.texture.GetDesc().GetHeight() : 0;
  }

  /** Texture depth, or 0 with no texture (Carbon GetDepth, cpp:75-78). */
  @meta.carbon.method
  @meta.impl.implemented
  GetDepth()
  {
    return this.texture ? this.texture.GetDesc().GetDepth() : 0;
  }

  /** Texture type, or 0 with no texture (Carbon GetType, cpp:80-83). */
  @meta.carbon.method
  @meta.impl.implemented
  GetType()
  {
    return this.texture ? this.texture.GetDesc().GetType() : 0;
  }

  /** Mip level count, or 0 with no texture (Carbon GetMipCount, cpp:85-88). */
  @meta.carbon.method
  @meta.impl.implemented
  GetMipCount()
  {
    return this.texture ? this.texture.GetDesc().GetMipCount() : 0;
  }

  /** Array size, or 0 with no texture (Carbon GetArraySize, cpp:90-93). */
  @meta.carbon.method
  @meta.impl.implemented
  GetArraySize()
  {
    return this.texture ? this.texture.GetDesc().GetArraySize() : 0;
  }

  /** Pixel format, or 0 with no texture (Carbon GetFormat, cpp:95-98). */
  @meta.carbon.method
  @meta.impl.implemented
  GetFormat()
  {
    return this.texture ? this.texture.GetDesc().GetFormat() : 0;
  }

  /** Texture debug name, or "" with no texture (Carbon GetName, cpp:100-104). */
  @meta.carbon.method
  @meta.impl.implemented
  GetName()
  {
    return this.texture ? this.texture.GetName() ?? "" : "";
  }

  /** Saves the referenced texture to disk; needs texture readback and ImageIO saving, neither ported here. */
  @meta.carbon.method
  @meta.impl.notImplemented
  Save(..._args)
  {
    throw new Error("Tr2TextureReference.Save is not implemented in CarbonEngineJS.");
  }

}

meta.carbon.interfaceTable({ interfaces: [Tr2TextureReference, ITr2TextureProvider], chainTo: null })(Tr2TextureReference);
