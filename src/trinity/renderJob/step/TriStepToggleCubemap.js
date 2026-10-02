// Source: trinity/trinity/RenderJob/TriStepToggleCubemap.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that turns a scene cubemap display on or off. */
@meta.define({ className: "TriStepToggleCubemap", family: "renderJob" })
export class TriStepToggleCubemap extends TriRenderStep
{

  /** Carbon-private Tr2InteriorScene pointer; runtime-only and not serialized. */
  #scene = null;

  /** m_showCubemap (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  m_showCubemap = true;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @meta.blue.method
  @meta.implemented
  __init__(showCubemap = true, scene = null)
  {
    this.m_showCubemap = Boolean(showCubemap);
    this.#scene = scene;
  }

  /** Enables or disables the interior scene's background cubemap. */
  @meta.blue.method
  @meta.implemented
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.#scene)
    {
      this.#scene.SetRenderBackgroundCubeMap(this.m_showCubemap);
    }
    return TriRenderStep.Result.RS_OK;
  }

}
