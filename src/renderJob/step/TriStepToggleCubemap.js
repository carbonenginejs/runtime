// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/RenderJob/TriStepToggleCubemap.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that turns a scene cubemap display on or off. */
@type.define({ className: "TriStepToggleCubemap", family: "renderJob" })
export class TriStepToggleCubemap extends TriRenderStep
{

  /** Carbon-private Tr2InteriorScene pointer; runtime-only and not serialized. */
  #scene = null;

  /** m_showCubemap (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  m_showCubemap = true;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(showCubemap = true, scene = null)
  {
    this.m_showCubemap = Boolean(showCubemap);
    this.#scene = scene;
  }

  /** Enables or disables the interior scene's background cubemap. */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.#scene)
    {
      this.#scene.SetRenderBackgroundCubeMap(this.m_showCubemap);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
