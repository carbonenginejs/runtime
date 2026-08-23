// Source: trinity/trinity/PostProcess/Effects/Tr2PPBloomEffect.h
import { vec4 } from "#math/vec4";
import { io, type } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Six-step bloom parameters: per-step blur size and tint, overall brightness and
 * size scale, luminance thresholding, and the grime texture overlaid on the
 * result.
 */
@type.define({ className: "Tr2PPBloomEffect", family: "postProcess" })
export class Tr2PPBloomEffect extends Tr2PPEffect
{
  @io.persist
  @type.float32
  directionalWeight = 0;

  @io.notify
  @io.readwrite
  @type.int32
  steps = 6;

  @io.persist
  @type.float32
  sizeScale = 4;

  @io.persist
  @type.float32
  step1Size = 0.3;

  @io.persist
  @type.color
  step1Tint = vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465);

  @io.persist
  @type.float32
  step2Size = 1;

  @io.persist
  @type.color
  step2Tint = vec4.fromValues(0.138, 0.138, 0.138, 0.138);

  @io.persist
  @type.float32
  step3Size = 2;

  @io.persist
  @type.color
  step3Tint = vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176);

  @io.persist
  @type.float32
  step4Size = 10;

  @io.persist
  @type.color
  step4Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @io.persist
  @type.float32
  step5Size = 30;

  @io.persist
  @type.color
  step5Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @io.persist
  @type.float32
  step6Size = 64;

  @io.persist
  @type.color
  step6Tint = vec4.fromValues(0.061, 0.061, 0.061, 0.061);

  @io.persist
  @type.float32
  brightness = 0.2;

  @io.persist
  @type.boolean
  exposureDependency = false;

  @io.persist
  @type.string
  grimePath = "res:/texture/global/black.dds";

  @io.persist
  @type.float32
  grimeWeight = 0;

  @io.persist
  @type.float32
  luminanceScale = 0.5;

  @io.persist
  @type.float32
  luminanceThreshold = -1;

}
