// Source: trinity/trinityal/metal/MetalWorkQueue.h
//
// NOT A DELIBERATE DROP. THIS IS A GAP, AND IT IS WRITTEN DOWN HERE BECAUSE
// NOTHING ELSE RECORDS IT.
//
// Carbon's work queue takes depth bias as three floats through SetDepthBias,
// and WebGPU accepts exactly those three on GPUDepthStencilState as depthBias,
// depthBiasSlopeScale and depthBiasClamp. Our abstraction layer projects NONE of
// them: at 2026-09-13 a search for depthBias, slopeScale or polygonOffset across
// src/trinityal and src/trinity/core returns nothing at all, and
// CjsWebgpuPsoDescription carries only a depth FORMAT.
//
// WHY IT MATTERS: depth bias is the standard fix for shadow acne, and this
// organization has already been bitten once by a bias that was being zeroed
// before it reached the device. On the WebGPU backend it cannot reach the device
// at all, because there is no path for it. Any shadow work on that backend needs
// this before it needs anything else.
//
// Porting it means projecting the three values through
// Tr2RenderStateSetup.GetWebgpuRecipe into the pipeline's depthStencil state,
// the same route MetalBlendState's fields take.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Carbon's three depth-bias floats; UNPORTED, and the WebGPU backend has no path for them at all. */
@type.define({ className: "MetalDepthBias", carbon: "MetalDepthBias", family: "trinityal" })
export class MetalDepthBias extends CjsModel
{

  /** depthBias (float) -> WebGPU GPUDepthStencilState.depthBias */
  @type.float32
  depthBias = 0;

  /** slopeScale (float) -> WebGPU GPUDepthStencilState.depthBiasSlopeScale */
  @type.float32
  slopeScale = 0;

  /** clamp (float) -> WebGPU GPUDepthStencilState.depthBiasClamp */
  @type.float32
  clamp = 0;

}
