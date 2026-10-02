// Source: trinity/trinity/RenderJob/TriStepRenderAtlas.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";
import { vec2 } from "#math/vec2";
import { vec4 } from "#math/vec4";

/** A render step that draws a texture atlas for inspection, focused on one entry. */
@meta.define({ className: "TriStepRenderAtlas", family: "renderJob" })
export class TriStepRenderAtlas extends TriRenderStep
{

  /** m_focus (Tr2AtlasTexture*) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2AtlasTexture")
  focus = null;

  /** m_atlas (Tr2TextureAtlas*) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2TextureAtlas")
  atlas = null;

  /** m_focusColour (Vector4) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec4
  focusColour = vec4.fromValues(1, 0, 1, 1);

  /** m_borderColour (Vector4) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec4
  borderColour = vec4.fromValues(1, 1, 0, 1);

  /** m_freeColour (Vector4) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec4
  freeColour = vec4.fromValues(0, 0.5, 0, 1);

  /** m_brTexCoord (Vector2) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec2
  brTexCoord = vec2.fromValues(1, 1);

  /** m_showFree (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  showFree = false;

  /** m_showUsed (bool) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.boolean
  showUsed = true;

  /** m_tlTexCoord (Vector2) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.vec2
  tlTexCoord = vec2.create();

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS);
   *  the donor body is exactly the two setter calls (TriStepRenderAtlas.cpp:29). */
  @meta.blue.method
  @meta.implemented
  __init__(atlas = null, focus = null)
  {
    this.SetAtlas(atlas);
    this.SetFocus(focus);
  }

  /** Carbon SetAtlas (TriStepRenderAtlas.cpp:104): selects the atlas the step draws. */
  @meta.blue.method
  @meta.implemented
  SetAtlas(atlas)
  {
    this.atlas = atlas;
  }

  /** Carbon SetFocus (TriStepRenderAtlas.cpp:109): the highlighted atlas entry. */
  @meta.blue.method
  @meta.implemented
  SetFocus(texture)
  {
    this.focus = texture;
  }

  /**
   * Draws the bound texture atlas for inspection. Not ported: Carbon draws it
   * itself from Tr2TextureAtlas's free and used areas, which are unported.
   */
  @meta.blue.method
  @meta.notImplemented
  Execute(_realTime, _simTime, _renderContext)
  {
    if (this.atlas) throw new Error("TriStepRenderAtlas.Execute is not ported yet; it needs Tr2TextureAtlas GetFreeAreas/GetUsedAreas/GetMargin.");
    return TriRenderStep.Result.RS_OK;
  }

}
