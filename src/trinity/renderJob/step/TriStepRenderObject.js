// Source: trinity/trinity/RenderJob/TriStepRenderObject.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that renders a single renderable, optionally overriding its material. */
@type.define({ className: "TriStepRenderObject", family: "renderJob" })
export class TriStepRenderObject extends TriRenderStep
{

  /** m_effectOverride (Tr2MaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Material")
  effectOverride = null;

  /** m_typeEnabled[3] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderAdditive = true;

  /** m_typeEnabled[1] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderDecal = true;

  /** m_typeEnabled[0] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderOpaque = true;

  /** m_typeEnabled[2] (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  renderTransparent = true;

  /** m_renderable (ITr2RenderablePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("ITr2Renderable")
  renderable = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(renderable = null)
  {
    this.renderable = renderable;
  }

  /**
   * Renders the bound renderable, applying the override material when one is set.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, renderContext)
  {
    if (this.renderable)
    {
      renderContext.RenderObject(this.renderable, {
        effectOverride: this.effectOverride,
        renderOpaque: this.renderOpaque,
        renderDecal: this.renderDecal,
        renderTransparent: this.renderTransparent,
        renderAdditive: this.renderAdditive
      });
    }
    return TriRenderStep.Result.RS_OK;
  }

}
