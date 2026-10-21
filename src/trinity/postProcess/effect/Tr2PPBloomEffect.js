import { exposure as be } from "#be";
// Source: trinity/trinity/PostProcess/Effects/Tr2PPBloomEffect.h
import { vec4 } from "#math/vec4";
import { type, blue } from "#schema";
import { Tr2PPEffect } from "./Tr2PPEffect.js";


/**
 * Six-step bloom parameters: per-step blur size and tint, overall brightness and
 * size scale, luminance thresholding, and the grime texture overlaid on the
 * result.
 */
@be.define("Tr2PPBloomEffect")
@be.exposureChainTo(Tr2PPEffect)
@be.mapInterface(Tr2PPEffect)
export class Tr2PPBloomEffect extends Tr2PPEffect
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  directionalWeight = 0;

  @be.mapAttribute(be.READWRITE | be.NOTIFY)

  @type.int32
  steps = 6;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  sizeScale = 4;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step1Size = 0.3;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step1Tint = vec4.fromValues(0.3465, 0.3465, 0.3465, 0.3465);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step2Size = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step2Tint = vec4.fromValues(0.138, 0.138, 0.138, 0.138);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step3Size = 2;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step3Tint = vec4.fromValues(0.1176, 0.1176, 0.1176, 0.1176);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step4Size = 10;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step4Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step5Size = 30;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step5Tint = vec4.fromValues(0.066, 0.066, 0.066, 0.066);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  step6Size = 64;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  step6Tint = vec4.fromValues(0.061, 0.061, 0.061, 0.061);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  brightness = 0.2;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  exposureDependency = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriTextureRes")
  grimePath = "res:/texture/global/black.dds";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  grimeWeight = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  luminanceScale = 0.5;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  luminanceThreshold = -1;

  /** `Bloom::MAX_BLOOM_STEPS` (h:9): the step count Carbon's arrays are sized to. */
  static MAX_BLOOM_STEPS = 6;

}
