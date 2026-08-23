// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/PostProcess/Effects/Tr2PPDynamicExposureEffect.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/Tr2PPDynamicExposureEffect.json.).
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";

/** Tr2PPDynamicExposureEffect (postProcess) - generated from schema shapeHash a2cdf599.... */
@type.define({ className: "Tr2PPDynamicExposureEffect", family: "postProcess" })
export class Tr2PPDynamicExposureEffect extends Tr2PPEffect
{

  /** m_debug (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  debug = false;

  /** m_adjustment (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  adjustment = 0;

  /** m_influence (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  influence = 1;

  /** m_minBrightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minBrightness = 0.9;

  /** m_maxLuminance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxLuminance = 10;

  /** m_maxExposure (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxExposure = 10;

  /** m_middleValue (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  middleValue = 0.55;

  /** m_minLuminance (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minLuminance = 0.4649;

  /** m_minExposure (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minExposure = -3.7;

  /** m_decreaseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decreaseSpeed = 1.5;

  /** m_increaseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  increaseSpeed = 2;

  /** m_maxBrightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxBrightness = 0.98;

}
