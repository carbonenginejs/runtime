// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// DROPPED. Metal's work queue takes depth bias through SetDepthBias and needs a
// record to hold the three floats together, because its API sets them together.
// Nothing here needs that bundle: the values travel as authored render state
// from end to end.
//
// WHERE THEY ACTUALLY LIVE, which is the point of writing this class down:
//
//   RS_DEPTHBIAS (195) and RS_SLOPESCALEDEPTHBIAS (175) are Carbon's own render
//   states (Tr2RenderContextEnum.h:309,328), ported in
//   global/consts/renderContext/presentation.js - in consts precisely so a
//   backend can reach the vocabulary without importing another backend's
//   classes.
//
//   Tr2RenderStateSetup maps them to its depth.bias and depth.slopeScaledBias,
//   and GetWebgpuRecipe projects all three onto the pipeline's depthStencil
//   state as depthBias, depthBiasSlopeScale and depthBiasClamp. The constant
//   bias is truncated to an integer, as Carbon's DX11 backend does
//   (Tr2RenderContextDx11.cpp:1831-1839), for every depth format.
//
// depthBiasClamp is projected as 0 because Carbon's render-state vocabulary has
// no clamp slot at all - Metal's struct carries one only because Metal's API
// does. That is a faithful zero, not an unfinished one.
//
// WebGL has no equivalent projection yet. When it needs one it comes from the
// same Tr2RenderStateSetup and the same consts, not from this struct.
import { meta } from "#schema";

/** Carbon's Metal depth-bias triple; dropped because the authored render states already carry these values through Tr2RenderStateSetup into the pipeline. */
@meta.define({ className: "MetalDepthBias", carbon: "MetalDepthBias", family: "trinityal" })
export class MetalDepthBias
{

  /** depthBias (float) -> RS_DEPTHBIAS -> GPUDepthStencilState.depthBias */
  @meta.type.float32
  depthBias = 0;

  /** slopeScale (float) -> RS_SLOPESCALEDEPTHBIAS -> depthBiasSlopeScale */
  @meta.type.float32
  slopeScale = 0;

  /** clamp (float) - Metal API only; Carbon has no render state for it. */
  @meta.type.float32
  clamp = 0;

}
