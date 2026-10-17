// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.h
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.cpp
import { Tr2SpriteObjectEffect } from "../generated/sprite2d/enums.js";
import { meta, type, blue } from "#schema";
import { Tr2SpriteObject } from "./Tr2SpriteObject.js";
import { ITr2Sprite2dTextureNotifyTarget } from "./ITr2Sprite2dTextureNotifyTarget.js";

/** Adds primary and secondary texture bindings to the shared 2D sprite render state. */
@blue.define({ className: "Tr2TexturedSpriteObject", abstract: true, purpose: "Adds primary and secondary texture bindings to the shared 2D sprite render state." })
@blue.chainTo(Tr2SpriteObject)
@blue.inherit(ITr2Sprite2dTextureNotifyTarget)
export class Tr2TexturedSpriteObject extends Tr2SpriteObject
{

  /** m_texturePrimary (ITr2Sprite2dTexturePtr) */
  @blue.property()
  @type.rootRef("ITr2Sprite2dTexture")
  get texturePrimary()
  {
    return this.GetTexturePrimary();
  }
  /** Replaces the primary texture and its change subscription. */
  set texturePrimary(value)
  {
    this.SetTexturePrimary(value);
  }

  /** m_textureSecondary (ITr2Sprite2dTexturePtr) */
  @blue.property()
  @type.rootRef("ITr2Sprite2dTexture")
  get textureSecondary()
  {
    return this.GetTextureSecondary();
  }
  /** Replaces the secondary texture and its change subscription. */
  set textureSecondary(value)
  {
    this.SetTextureSecondary(value);
  }


  /** Primary texture and its native change subscription. @type {ITr2Sprite2dTexture|null} */
  _texturePrimary = null;

  /** Secondary texture and its native change subscription. @type {ITr2Sprite2dTexture|null} */
  _textureSecondary = null;

  /** Invalidates prepared vertices after a texture changes. */
  @meta.implemented
  @blue.method
  Sprite2dTextureChanged(_texture)
  {
    this.SetDirty();
  }

  /** Replaces the primary subscription and invalidates prepared vertices. */
  @meta.implemented
  @blue.method
  SetTexturePrimary(texture)
  {
    if (texture === this._texturePrimary) return;

    if (this._texturePrimary) this._texturePrimary.UnregisterForChangeNotification(this);
    this._texturePrimary = texture;
    if (texture) texture.RegisterForChangeNotification(this);
    this.SetDirty();
  }

  /** Returns the current primary texture. */
  @meta.implemented
  @blue.method
  GetTexturePrimary()
  {
    return this._texturePrimary;
  }

  /** Replaces the secondary subscription and invalidates prepared vertices. */
  @meta.implemented
  @blue.method
  SetTextureSecondary(texture)
  {
    if (texture === this._textureSecondary) return;

    if (this._textureSecondary) this._textureSecondary.UnregisterForChangeNotification(this);
    this._textureSecondary = texture;
    if (texture) texture.RegisterForChangeNotification(this);
    this.SetDirty();
  }

  /** Returns the current secondary texture. */
  @meta.implemented
  @blue.method
  GetTextureSecondary()
  {
    return this._textureSecondary;
  }

  /** Validates required textures and applies their current renderer settings. */
  @meta.implemented
  @blue.method
  _ValidateAndSetTextures(renderer)
  {
    if (this.spriteEffect >= Tr2SpriteObjectEffect.TR2_SFX_ONE_TEXTURE)
    {
      if (!this._texturePrimary || !this._texturePrimary.IsGood()) return false;

      this._texturePrimary.Apply(renderer, 0);
      if (this.spriteEffect >= Tr2SpriteObjectEffect.TR2_SFX_TWO_TEXTURES)
      {
        if (!this._textureSecondary || !this._textureSecondary.IsGood()) return false;

        this._textureSecondary.Apply(renderer, 1);
      }
    }

    return true;
  }

  /** Reapplies bindings for vertices already validated while dirty. */
  @meta.implemented
  @blue.method
  _SetValidatedTextures(renderer)
  {
    if (this.spriteEffect < Tr2SpriteObjectEffect.TR2_SFX_ONE_TEXTURE) return;

    this._texturePrimary.Apply(renderer, 0);
    if (this.spriteEffect >= Tr2SpriteObjectEffect.TR2_SFX_TWO_TEXTURES) this._textureSecondary.Apply(renderer, 1);
  }

  /** Explicit cleanup adapts the native texture-listener destructor to JS. */
  Destroy()
  {
    if (this._texturePrimary) this._texturePrimary.UnregisterForChangeNotification(this);
    if (this._textureSecondary) this._textureSecondary.UnregisterForChangeNotification(this);
    this._texturePrimary = null;
    this._textureSecondary = null;
  }
}
