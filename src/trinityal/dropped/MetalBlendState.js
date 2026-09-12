// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// DROPPED AS A RECORD, LIVE IN THE PIPELINE. Metal sets blend state on the work
// queue, so it needs a hashable record of it; WebGPU has no per-state setter at
// all and folds blending into the render pipeline. Ours is projected by
// Tr2RenderStateSetup.GetWebgpuRecipe and reaches the GPU as
// `targets[].blend` in CjsWebgpuPsoDescription and CjsWebgpuTrinityBatchResolver.
//
// Its hashValue member has a live counterpart too: the pipeline cache keys on
// the whole PSO description rather than on blend state alone.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's hashable Metal blend record; dropped because WebGPU folds blending into the render pipeline. */
@type.define({ className: "MetalBlendState", carbon: "MetalBlendState", family: "trinityal" })
export class MetalBlendState extends CjsModel
{

  /** blendType (MetalBlendType) */
  @type.unknown
  blendType = null;

  /** alphaCoverageEnable (bool) */
  @type.boolean
  alphaCoverageEnable = false;

  /** rgbBlendOp (MTLBlendOperation) */
  @type.unknown
  rgbBlendOp = null;

  /** alphaBlendOp (MTLBlendOperation) */
  @type.unknown
  alphaBlendOp = null;

  /** srcColorFactor (MTLBlendFactor) */
  @type.unknown
  srcColorFactor = null;

  /** destColorFactor (MTLBlendFactor) */
  @type.unknown
  destColorFactor = null;

  /** srcAlphaFactor (MTLBlendFactor) */
  @type.unknown
  srcAlphaFactor = null;

  /** destAlphaFactor (MTLBlendFactor) */
  @type.unknown
  destAlphaFactor = null;

  /** blendColor (MetalColor) */
  @type.unknown
  blendColor = null;

  /** writeMask (MTLColorWriteMask) */
  @type.unknown
  writeMask = null;

  /** hashValue (size_t) */
  @type.unknown
  hashValue = 0;

}
