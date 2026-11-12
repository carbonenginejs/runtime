// Source: trinity/trinity/RenderJob/TriStepToggleCubemap.h
import { exposure as be } from "#be";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that turns a scene cubemap display on or off. */
@be.define("TriStepToggleCubemap")

@be.exposureChainTo(TriRenderStep)
export class TriStepToggleCubemap extends TriRenderStep
{

  /** Carbon-private Tr2InteriorScene pointer; runtime-only and not serialized. */
  _scene = null;

  /** m_showCubemap (bool) [READWRITE]; Carbon exposes the member name itself (TriStepToggleCubemap_Blue.cpp:17). */
  @be.mapAttribute(be.READWRITE, "m_showCubemap")

  @type.boolean
  showCubemap = true;

  /**
   * Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS).
   *
   * @implemented
   */
  @be.mapMethodAndWrapOptionalArgs(2)
  __init__(showCubemap = true, scene = null)
  {
    this.showCubemap = Boolean(showCubemap);
    this._scene = scene;
  }

  /**
   * Enables or disables the interior scene's background cubemap.
   *
   * @implemented
   */

  Execute(_realTime, _simTime, _renderContext)
  {
    if (this._scene)
    {
      this._scene.SetRenderBackgroundCubeMap(this.showCubemap);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
