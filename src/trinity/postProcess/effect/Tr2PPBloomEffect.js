// Source: trinity/trinity/PostProcess/Effects/Tr2PPBloomEffect.h
import { vec4 } from "#math/vec4";
import { meta } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Six-step bloom parameters: per-step blur size and tint, overall brightness and
 * size scale, luminance thresholding, and the grime texture overlaid on the
 * result.
 */
@meta.define({ className: "Tr2PPBloomEffect", family: "postProcess" })
export class Tr2PPBloomEffect extends Tr2PPEffect
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  directionalWeight = 0;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.int32
  steps = 6;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  sizeScale = 4;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step1Size = 0.3;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step1Tint = vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step2Size = 1;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step2Tint = vec4.fromValues(0.138, 0.138, 0.138, 0.138);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step3Size = 2;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step3Tint = vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step4Size = 10;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step4Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step5Size = 30;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step5Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  step6Size = 64;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  step6Tint = vec4.fromValues(0.061, 0.061, 0.061, 0.061);

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  brightness = 0.2;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  exposureDependency = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  grimePath = "res:/texture/global/black.dds";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  grimeWeight = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  luminanceScale = 0.5;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  luminanceThreshold = -1;

  /** `Bloom::MAX_BLOOM_STEPS` (h:9): the step count Carbon's arrays are sized to. */
  static MAX_BLOOM_STEPS = 6;

}
