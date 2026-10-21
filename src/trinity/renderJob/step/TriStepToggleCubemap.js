import { exposure as be } from "#be";
// Source: trinity/trinity/RenderJob/TriStepToggleCubemap.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that turns a scene cubemap display on or off. */
@be.define("TriStepToggleCubemap")

@be.exposureChainTo(TriRenderStep)
export class TriStepToggleCubemap extends TriRenderStep
{

  /** Carbon-private Tr2InteriorScene pointer; runtime-only and not serialized. */
  #scene = null;

  /** m_showCubemap (bool) [READWRITE]; Carbon exposes the member name itself (TriStepToggleCubemap_Blue.cpp:17). */
  @be.mapAttribute(be.READWRITE, "m_showCubemap")

  @type.boolean
  showCubemap = true;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  __init__(showCubemap = true, scene = null)
  {
    this.showCubemap = Boolean(showCubemap);
    this.#scene = scene;
  }

  /** Enables or disables the interior scene's background cubemap. */
  @blue.method
  @meta.implemented
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.#scene)
    {
      this.#scene.SetRenderBackgroundCubeMap(this.showCubemap);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
