// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/RenderJob/TriStepRenderAtlas.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "@carbonenginejs/runtime-utils/vec2";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

/** A render step that draws a texture atlas for inspection, focused on one entry. */
@type.define({ className: "TriStepRenderAtlas", family: "renderJob" })
export class TriStepRenderAtlas extends TriRenderStep
{

  /** m_focus (Tr2AtlasTexture*) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2AtlasTexture")
  focus = null;

  /** m_atlas (Tr2TextureAtlas*) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2TextureAtlas")
  atlas = null;

  /** m_focusColour (Vector4) [READWRITE] */
  @io.readwrite
  @type.vec4
  focusColour = vec4.fromValues(1, 0, 1, 1);

  /** m_borderColour (Vector4) [READWRITE] */
  @io.readwrite
  @type.vec4
  borderColour = vec4.fromValues(1, 1, 0, 1);

  /** m_freeColour (Vector4) [READWRITE] */
  @io.readwrite
  @type.vec4
  freeColour = vec4.fromValues(0, 0.5, 0, 1);

  /** m_brTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  brTexCoord = vec2.fromValues(1, 1);

  /** m_showFree (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  showFree = false;

  /** m_showUsed (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  showUsed = true;

  /** m_tlTexCoord (Vector2) [READWRITE] */
  @io.readwrite
  @type.vec2
  tlTexCoord = vec2.create();

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(atlas = null, focus = null)
  {
    this.atlas = atlas;
    this.focus = focus;
  }

  /**
   * Draws the bound texture atlas for inspection.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    if (this.atlas) executor?.RenderAtlas?.(this);
    return TriRenderStep.Result.RS_OK;
  }

}
