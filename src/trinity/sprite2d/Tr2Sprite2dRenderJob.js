import { exposure as be } from "#be";
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; all portable behavior is implemented here.
import { vec2 } from "#math/vec2";
import { meta, type, blue } from "#schema";
import { ITr2SpriteObject } from "./ITr2SpriteObject.js";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";

/** A Sprite2D leaf that executes an authored render job. */
@be.define("Tr2Sprite2dRenderJob")
@be.mapInterface(ITr2SpriteObject)
@be.exposureChainTo(Tr2SpriteObjectBase)
export class Tr2Sprite2dRenderJob extends Tr2SpriteObjectBase
{

  /** Carbon method GatherSprites. */
  @meta.implemented
  @blue.method
  GatherSprites(renderer)
  {
    if (this.renderJob && this.display)
    {
      renderer.RunJob(this.renderJob);
    }
  }

  /** Carbon method PickPoint. */
  @meta.implemented
  @blue.method
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      return null;
    }

    vec2.set(this._point, x, y);
    vec2.set(this._translation, this.displayX, this.displayY);
    if (!renderer.IsInside(
      this._point,
      this._translation,
      this.displayWidth,
      this.displayHeight,
      0
    ))
    {
      return null;
    }

    if (this.pickingMask && !this.pickingMask.SampleMask(
      renderer.InverseTransformPoint(this._point),
      this._translation,
      this.displayWidth,
      this.displayHeight
    ))
    {
      return null;
    }

    return this;
  }

  /** Carbon method GetVertexCount. */
  @meta.implemented
  @blue.method
  GetVertexCount()
  {
    return 0;
  }

  /** m_renderJob (TriRenderJobPtr) [READWRITE] */
  @blue.readwrite
  @type.rootRef("TriRenderJob")
  renderJob = null;

  /** PickPoint's Vector2( x, y ) temporary (Tr2Sprite2dRenderJob.cpp:36); Carbon has no member. @type {Float32Array} */
  _point = vec2.create();

  /** PickPoint's m_translation as a Vector2 (Tr2Sprite2dRenderJob.cpp:36); Carbon has no member. @type {Float32Array} */
  _translation = vec2.create();

}
