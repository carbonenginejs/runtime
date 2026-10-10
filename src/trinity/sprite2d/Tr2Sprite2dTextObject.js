// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTextObject.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dTextObject.cpp
// Maintained implementation promoted from generated metadata.
import { meta } from "#schema";
import { Tr2SpriteObject } from "./Tr2SpriteObject.js";
import { Tr2SpriteObjectEffect, Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";

/** Defines a 2D text sprite's measured extent, primary texture, picking radius, shadow-effect mode, and tooltip flag. */
@meta.define({ className: "Tr2Sprite2dTextObject", family: "sprite2d", purpose: "Defines a 2D text sprite's measured extent, primary texture, picking radius, shadow-effect mode, and tooltip flag." })
@meta.blue.chainTo(Tr2SpriteObject)
export class Tr2Sprite2dTextObject extends Tr2SpriteObject
{

  /** m_shadowSpriteEffect (Tr2SpriteObjectEffect - enum Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("Tr2SpriteObjectEffect")
  shadowSpriteEffect = 43;

  /** m_hasAuxiliaryTooltip (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  hasAuxiliaryTooltip = false;

  /** m_textHeight (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  textHeight = 0;

  /** m_useSizeFromTexture (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  useSizeFromTexture = false;

  /** m_useShadowSpriteEffect (bool) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.boolean
  useShadowSpriteEffect = false;

  /** m_texturePrimary (ITr2Sprite2dTexturePtr) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.rootRef("ITr2Sprite2dTexture")
  texturePrimary = null;

  /** m_pickRadius (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  pickRadius = 0;

  /** m_textWidth (float) [READWRITE, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  textWidth = 0;

  static Tr2SpriteObjectEffect = Tr2SpriteObjectEffect;


  _fontMeasurer = null;

  /** Native mapped property routes through subscription management. */
  @meta.blue.readwrite
  @meta.type.rootRef("Tr2FontMeasurer")
  get fontMeasurer() { return this.GetFontMeasurer(); }
  /** Replaces the measurer and its change subscription. */
  set fontMeasurer(value) { this.SetFontMeasurer(value); }

  /** Native text constructor selects the font shader effect. */
  constructor()
  {
    super();
    this.spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_FONT;
  }

  /** Changes the measurer subscription and invalidates geometry. */
  @meta.implemented
  SetFontMeasurer(value)
  {
    if (value === this._fontMeasurer) return;
    if (this._fontMeasurer) this._fontMeasurer.UnregisterForChangeNotification(this);
    this._fontMeasurer = value;
    if (value) value.RegisterForChangeNotification(this);
    this.SetDirty();
  }

  /** Returns the subscribed measurer. */
  @meta.implemented
  GetFontMeasurer() { return this._fontMeasurer; }

  /** Invalidates cached geometry after a measurer edit. */
  @meta.implemented
  FontMeasurerChanged(_source) { this.SetDirty(); }

  /** Prepares dirty text then submits it within its native shadow-expanded clip. */
  @meta.implemented
  GatherSprites(renderer)
  {
    if (!this.display || this.textWidth <= 0 || this.textHeight <= 0 || !this._fontMeasurer) return;
    const translation = [this.displayX, this.displayY];
    if (this.isDirty)
    {
      this._fontMeasurer.PrepareSprites(renderer, translation, this.color, this.spriteEffect,
        this.blendMode, this.spriteTarget, this.glowBrightness, this.shadowOffset[0] !== 0 || this.shadowOffset[1] !== 0,
        this.shadowOffset, this.shadowColor, this.useShadowSpriteEffect ? this.shadowSpriteEffect : this.spriteEffect);
      this.isDirty = false;
    }
    const padding = this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_BLUR || this.spriteEffect === Tr2SpriteObjectEffect.TR2_SFX_GLOW ? 1 : 0;
    renderer.PushClipRectangle(translation[0] - padding + Math.min(this.shadowOffset[0], 0),
      translation[1] - padding + Math.min(this.shadowOffset[1], 0),
      this.textWidth + padding * 2 + Math.abs(this.shadowOffset[0]),
      this.textHeight + padding * 2 + Math.abs(this.shadowOffset[1]));
    try { this._fontMeasurer.SubmitSprites(renderer); }
    finally { renderer.PopClipRectangle(); }
  }

  /** Includes auxiliary labels in picking even when normal picking is disabled. */
  @meta.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display) return null;
    if (this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON && !this.hasAuxiliaryTooltip) return null;
    return renderer.IsInside([x, y], [this.displayX, this.displayY], this.displayWidth, this.displayHeight, this.pickRadius) ? this : null;
  }

  /** Reports a tooltip-only hit target. */
  @meta.implemented
  IsAuxMouseover() { return this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON && this.hasAuxiliaryTooltip; }

  /** Returns the attached measurer's vertex budget. */
  @meta.implemented
  GetVertexCount() { return this.display && this._fontMeasurer ? this._fontMeasurer.GetVertexCount() : 0; }

  /** Invalidates geometry and drops cached atlas references. */
  @meta.implemented
  ReleaseResources(_storage)
  {
    this.SetDirty();
    if (this._fontMeasurer) this._fontMeasurer.ClearSprites();
  }

  /** Native preparation has no extra resources of its own. */
  @meta.implemented
  _OnPrepareResources() { return true; }

  /** JS explicit disposal replaces the native destructor's listener removal. */
  @meta.ours
  Destroy() { this.SetFontMeasurer(null); }
}
