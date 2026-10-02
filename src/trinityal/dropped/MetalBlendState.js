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
import { meta } from "#schema";

/** Carbon's hashable Metal blend record; dropped because WebGPU folds blending into the render pipeline. */
@meta.define({ className: "MetalBlendState", carbon: "MetalBlendState", family: "trinityal" })
export class MetalBlendState
{

  /** blendType (MetalBlendType) */
  @meta.type.unknown
  blendType = null;

  /** alphaCoverageEnable (bool) */
  @meta.type.boolean
  alphaCoverageEnable = false;

  /** rgbBlendOp (MTLBlendOperation) */
  @meta.type.unknown
  rgbBlendOp = null;

  /** alphaBlendOp (MTLBlendOperation) */
  @meta.type.unknown
  alphaBlendOp = null;

  /** srcColorFactor (MTLBlendFactor) */
  @meta.type.unknown
  srcColorFactor = null;

  /** destColorFactor (MTLBlendFactor) */
  @meta.type.unknown
  destColorFactor = null;

  /** srcAlphaFactor (MTLBlendFactor) */
  @meta.type.unknown
  srcAlphaFactor = null;

  /** destAlphaFactor (MTLBlendFactor) */
  @meta.type.unknown
  destAlphaFactor = null;

  /** blendColor (MetalColor) */
  @meta.type.unknown
  blendColor = null;

  /** writeMask (MTLColorWriteMask) */
  @meta.type.unknown
  writeMask = null;

  /** hashValue (size_t) */
  @meta.type.unknown
  hashValue = 0;

}
