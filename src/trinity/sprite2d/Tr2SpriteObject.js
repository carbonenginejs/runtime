// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.h
// Source: trinity/trinity/Sprite2d/Tr2SpriteObject.cpp
import { meta, type, blue } from "#schema";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";
import { color } from "#math/color";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";
import { Tr2SpriteObjectBlendMode, Tr2SpriteObjectEffect, Tr2SpriteTarget } from "../generated/sprite2d/enums.js";

/** Provides shared color, depth, blending, effect, glow, outline, shadow, and render-target state for drawable 2D sprites. */
@blue.define({ className: "Tr2SpriteObject", abstract: true, purpose: "Provides shared color, depth, blending, effect, glow, outline, shadow, and render-target state for drawable 2D sprites." })
@blue.chainTo(Tr2SpriteObjectBase)
export class Tr2SpriteObject extends Tr2SpriteObjectBase
{

  /** m_blendMode (Tr2SpriteObjectBlendMode - enum Tr2SpriteObjectBlendMode) [READWRITE, ENUM, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("Tr2SpriteObjectBlendMode")
  blendMode = 0;

  /** m_spriteEffect (Tr2SpriteObjectEffect - enum Tr2SpriteObjectEffect) [READWRITE, ENUM, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("Tr2SpriteObjectEffect")
  // Carbon TR2_SFX_COPY aliases ONE_TEXTURE.
  spriteEffect = Tr2SpriteObjectEffect.TR2_SFX_ONE_TEXTURE;

  /** m_target (Tr2SpriteTarget - enum Tr2SpriteTarget) [READWRITE, ENUM, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.int32
  @type.enum("Tr2SpriteTarget")
  spriteTarget = 1;

  /** m_color (Color) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_depth (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  depth = 0;

  /** m_glowBrightness (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  glowBrightness = 1;

  /** m_glowColor (Color) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.color
  glowColor = vec4.fromValues(1, 1, 1, 1);

  /** m_glowExpand (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  glowExpand = 0;

  /** m_glowFactor (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  glowFactor = 0;

  /** m_shadowOffset (Vector2) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.vec2
  shadowOffset = vec2.create();

  /** m_outlineColor (Color) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.color
  outlineColor = color.createLinear();

  /** m_outlineThreshold (float) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.float32
  outlineThreshold = 0;

  /** m_shadowColor (Color) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.color
  shadowColor = color.createLinear();

  static Tr2SpriteObjectBlendMode = Tr2SpriteObjectBlendMode;

  static Tr2SpriteObjectEffect = Tr2SpriteObjectEffect;

  static Tr2SpriteTarget = Tr2SpriteTarget;


  /** Sets the regular draw state for this sprite. */
  @meta.implemented
  @blue.method
  _SetRegularRenderState(renderer)
  {
    renderer.SetBlendmode(this.blendMode);
    renderer.SetSpriteTarget(this.spriteTarget);
    renderer.SetGlowBrightness(this.glowBrightness);
    renderer.SetColor(this.color);
    renderer.SetDepth(this.depth);
  }

  /** Sets additive glow state without mutating the authored tint. */
  @meta.implemented
  @blue.method
  _SetGlowRenderState(renderer)
  {
    const tint = vec4.alloc();
    try
    {
      vec4.copy(tint, this.glowColor);
      tint[3] *= this.color[3];
      renderer.SetBlendmode(Tr2SpriteObjectBlendMode.TR2_SBM_ADDX2);
      renderer.SetSpriteTarget(this.spriteTarget);
      renderer.SetGlowBrightness(this.glowBrightness);
      renderer.SetColor(tint);
      renderer.SetDepth(this.depth);
    }
    finally { vec4.unalloc(tint); }
  }

  /** Sets shadow state, combining shadow and sprite opacity. */
  @meta.implemented
  @blue.method
  _SetShadowRenderState(renderer)
  {
    const tint = vec4.alloc();
    try
    {
      vec4.copy(tint, this.shadowColor);
      tint[3] *= this.color[3];
      renderer.SetBlendmode(this.blendMode);
      renderer.SetSpriteTarget(this.spriteTarget);
      renderer.SetGlowBrightness(this.glowBrightness);
      renderer.SetColor(tint);
      renderer.SetDepth(this.depth);
    }
    finally { vec4.unalloc(tint); }
  }

  /** Supplies the outline tint and alpha threshold. */
  @meta.implemented
  @blue.method
  _SetOutlineRenderState(renderer)
  {
    const tint = vec4.alloc();
    try
    {
      vec4.copy(tint, this.outlineColor);
      tint[3] *= this.color[3];
      renderer.SetOutlineColor(tint);
      renderer.SetOutlineThreshold(this.outlineThreshold);
    }
    finally { vec4.unalloc(tint); }
  }

  /** Returns the native color value by copy. */
  @meta.implemented
  @blue.method
  GetColor()
  {
    return vec4.clone(this.color); // alloc: native value return belongs to the caller
  }

  /** Copies a changed color and invalidates ancestors. */
  @meta.implemented
  @blue.method
  SetColor(value)
  {
    if (this.color[0] === value[0] && this.color[1] === value[1] && this.color[2] === value[2] && this.color[3] === value[3]) return;

    vec4.copy(this.color, value);
    this.SetDirty();
  }
}
