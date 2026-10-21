import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2TextureReference.h
// Source: trinity/trinity/Tr2TextureReference.cpp
// Source: trinity/trinity/Tr2TextureReference_Blue.cpp
// Hand-maintained from Carbon source.
//
// Carbon holds its AL texture by value. Create/Destroy mutate that value;
// owners broadcast its native event after each change.
import { Tr2Event } from "./Tr2Event.js";
import { meta, type, blue } from "#schema";
import { ITr2TextureProvider } from "./ITr2TextureProvider.js";
import { Tr2TextureAL } from "../../trinityal/Tr2TextureAL/index.js";

/**
 * Holds one engine texture so it can be published through a variable store
 * and observed for replacement.
 */
@be.define("Tr2TextureReference")
@be.mapInterface(ITr2TextureProvider)
export class Tr2TextureReference extends ITr2TextureProvider
{

  /**
   * Native by-value AL share; opaque storage, not a Blue resource edge.
   * @type {Tr2TextureAL|null}
   */
  @type.rawStruct("Tr2TextureAL")
  texture = new Tr2TextureAL();

  /**
   * Native event storage declaration; the existing JS listeners carry subscriptions.
   * @type {object|null}
   */
  @type.rawStruct("OnTextureChangeEvent")
  onTextureChange = new Tr2Event();

  /**
   * Texture width; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get width()
  {
    return this.GetWidth();
  }

  /**
   * Texture height; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get height()
  {
    return this.GetHeight();
  }

  /**
   * Texture depth; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get depth()
  {
    return this.GetDepth();
  }

  /**
   * Texture type; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get type()
  {
    return this.GetType();
  }

  /**
   * Number of mip levels; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get mipCount()
  {
    return this.GetMipCount();
  }

  /**
   * Pixel format; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get format()
  {
    return this.GetFormat();
  }

  /**
   * Number of textures in the array; native readonly Blue property.
   * @returns {number} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.uint32
  @meta.implemented
  get arraySize()
  {
    return this.GetArraySize();
  }

  /**
   * Texture name; native readonly Blue property.
   * @returns {string} Current texture description value.
   */
  @be.mapPropertyReadOnly()
  @type.string
  @meta.implemented
  get name()
  {
    return this.GetName();
  }

  /** Returns the borrowed native by-value texture (Tr2TextureReference.cpp:11-14). */
  @blue.method
  @meta.implemented
  GetTexture()
  {
    return this.texture;
  }

  /** Returns the owned native change event (Tr2TextureReference.cpp:16-19). */
  @blue.method
  @meta.implemented
  OnTextureChange()
  {
    return this.onTextureChange;
  }

  /**
   * Existing compatibility wrapper for callers awaiting direct native value mutation.
   * This method has no Tr2TextureReference donor (only Tr2TransientTextureReference
   * has SetTexture); cloud owners use GetTexture().Create/Destroy and Broadcast.
   */
  SetTexture(texture)
  {
    const next = texture ? new Tr2TextureAL({ copy: texture }) : new Tr2TextureAL();
    this.texture.Destroy();
    this.texture = next;
    this.onTextureChange.Broadcast();
  }

  /** Texture width, or 0 with no texture (Carbon GetWidth, cpp:65-68). */
  @blue.method
  @meta.implemented
  GetWidth()
  {
    return this.texture ? this.texture.GetDesc().GetWidth() : 0;
  }

  /** Texture height, or 0 with no texture (Carbon GetHeight, cpp:70-73). */
  @blue.method
  @meta.implemented
  GetHeight()
  {
    return this.texture ? this.texture.GetDesc().GetHeight() : 0;
  }

  /** Texture depth, or 0 with no texture (Carbon GetDepth, cpp:75-78). */
  @blue.method
  @meta.implemented
  GetDepth()
  {
    return this.texture ? this.texture.GetDesc().GetDepth() : 0;
  }

  /** Texture type, or 0 with no texture (Carbon GetType, cpp:80-83). */
  @blue.method
  @meta.implemented
  GetType()
  {
    return this.texture ? this.texture.GetDesc().GetType() : 0;
  }

  /** Mip level count, or 0 with no texture (Carbon GetMipCount, cpp:85-88). */
  @blue.method
  @meta.implemented
  GetMipCount()
  {
    return this.texture ? this.texture.GetDesc().GetMipCount() : 0;
  }

  /** Array size, or 0 with no texture (Carbon GetArraySize, cpp:90-93). */
  @blue.method
  @meta.implemented
  GetArraySize()
  {
    return this.texture ? this.texture.GetDesc().GetArraySize() : 0;
  }

  /** Pixel format, or 0 with no texture (Carbon GetFormat, cpp:95-98). */
  @blue.method
  @meta.implemented
  GetFormat()
  {
    return this.texture ? this.texture.GetDesc().GetFormat() : 0;
  }

  /** Texture debug name, or "" with no texture (Carbon GetName, cpp:100-104). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.texture ? this.texture.GetName() ?? "" : "";
  }

  /** Saves the referenced texture to disk; needs texture readback and ImageIO saving, neither ported here. */
  @be.mapMethodAndWrap()
  @meta.notImplemented
  Save(..._args)
  {
    throw new Error("Tr2TextureReference.Save is not implemented in CarbonEngineJS.");
  }

}

