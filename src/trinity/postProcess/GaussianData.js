// Source: trinity/trinity/PostProcess/Tr2PostProcessRenderer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema postProcess/GaussianData.json.).
import { type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** Carries the packed weights, offsets, and tap count for one Gaussian blur pass. */
@type.define({ className: "GaussianData", family: "postProcess" })
export class GaussianData extends CjsModel
{

  /** overallWeight (Vector3) */
  @type.vec3
  overallWeight = vec3.create();

  /** count (uint32_t) */
  @type.uint32
  count = 0;

  /** weightOffset (Vector4) */
  @type.vec4
  weightOffset = vec4.create();

}
