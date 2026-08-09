// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPFogEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPFogEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** Tr2PPFogEffect (postProcess) - generated from schema shapeHash e09c106e.... */
@type.define({ className: "Tr2PPFogEffect", family: "postProcess" })
export class Tr2PPFogEffect extends Tr2PPEffect
{

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 1;

  /** m_totalAmount (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  totalAmount = 0;

  /** m_totalPower (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  totalPower = 1;

  /** m_backgroundOcclusion (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  backgroundOcclusion = 1;

  /** m_brightnessThreshold0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightnessThreshold0 = 0;

  /** m_brightnessThreshold1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightnessThreshold1 = 0.5;

  /** m_brightnessAdjustmentAmount (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightnessAdjustmentAmount = 1;

  /** m_blendDistance0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendDistance0 = 2000;

  /** m_blendBias0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendBias0 = 0;

  /** m_blendAmount0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendAmount0 = 0.2;

  /** m_blendPower0 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendPower0 = 2;

  /** m_blendDistance1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendDistance1 = 25000;

  /** m_blendBias1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendBias1 = 0.6;

  /** m_blendAmount1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendAmount1 = 0.35;

  /** m_blendPower1 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendPower1 = 1;

  /** m_blendDistance2 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendDistance2 = 120000;

  /** m_blendBias2 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendBias2 = 1;

  /** m_blendAmount2 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendAmount2 = 0.5;

  /** m_blendPower2 (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendPower2 = 0.2;

  /** m_areaSize (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  areaSize = vec3.fromValues(69142.0859375, 13828.4169922, 66337.203125);

  /** m_areaScale (Vector2) [READWRITE, PERSIST] */
  @io.persist
  @type.vec2
  areaScale = vec2.fromValues(30, 20);

  /** m_areaCenter (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  areaCenter = vec3.fromValues(-27042.2988281, -633.4446411, 11896.0957031);

  /** m_colorInfluence (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  colorInfluence = 0.125;

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 0.4235294, 0, 1);

  /** m_nebulaInfluence (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  nebulaInfluence = 0.5;

  /** m_nebulaBlur (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  nebulaBlur = 7;

  /** m_originalBrightenOnly (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  originalBrightenOnly = 0.5;

  /** Carbon Tr2PPFogEffect::IsActive override. */
  IsActive()
  {
    return this.display && this.intensity > 0;
  }

}
