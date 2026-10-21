import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPVignetteEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPVignetteEffect.json.).
import { type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** Carries the shape, detail textures, scrolling, color, opacity, and oscillation settings for a post-process vignette. */
@be.define("Tr2PPVignetteEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPVignetteEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  intensity = 0;

  /** m_color (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_detail1Scroll (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  detail1Scroll = vec2.create();

  /** m_detail1Size (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  detail1Size = vec2.fromValues(16, 16);

  /** m_detail2Scroll (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  detail2Scroll = vec2.create();

  /** m_detail2Size (Vector2) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec2
  detail2Size = vec2.fromValues(16, 16);

  /** m_detailPath (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriTextureRes")
  detailPath = "res:/texture/global/white.dds";

  /** m_opacity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  opacity = 0;

  /** m_shapePath (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriTextureRes")
  shapePath = "res:/texture/global/black.dds";

  /** m_sineFrequency (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  sineFrequency = 1;

  /** m_sineMaximum (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  sineMaximum = 1;

  /** m_sineMinimum (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  sineMinimum = 0;

  /** Carbon Tr2PPVignetteEffect::IsActive override. */
  @blue.method
  IsActive()
  {
    return this.display && this.intensity > 0 && this.opacity > 0;
  }

}
