import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepResolve.h
// Source: trinity/trinity/RenderJob/TriStepResolve.cpp
import { meta, type, blue } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";
import { Failed } from "#trinityal";


/**
 * Step that resolves one render target into another, optionally regenerating the
 * destination's mip chain afterwards.
 */
@be.define("TriStepResolve")
@be.mapInterface(TriRenderStep)
@be.exposureChainTo(TriRenderStep)
export class TriStepResolve extends TriRenderStep
{
  @blue.readwrite
  @type.boolean
  generateMipmap = false;

  @blue.readwrite
  @type.rootRef("Tr2RenderTarget")
  source = null;

  @blue.readwrite
  @type.rootRef("Tr2RenderTarget")
  destination = null;

  /** Stores the resolve operands in Carbon's destination-first argument order. */
  @blue.method
  @meta.adapted
  __init__(destination = null, source = null)
  {
    this.destination = destination ?? null;
    this.source = source ?? null;
  }

  /**
   * Carbon Execute (TriStepResolve.cpp:13-33): resolve the source's texture
   * into the destination's and, when asked, regenerate the destination's mips.
   * Missing or invalid operands are a no-op; a failed resolve is RS_FAILED.
   */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    if (!this.source || !this.destination
      || !this.source.GetRenderTarget()?.IsValid() || !this.destination.GetRenderTarget()?.IsValid())
    {
      return TriRenderJob.StepResult.RS_OK;
    }
    if (Failed(this.source.GetRenderTarget().Resolve(this.destination.GetRenderTarget(), renderContext)))
    {
      return TriRenderJob.StepResult.RS_FAILED;
    }
    if (this.generateMipmap) this.destination.GetRenderTarget().GenerateMipMaps(renderContext);
    return TriRenderJob.StepResult.RS_OK;
  }
}
