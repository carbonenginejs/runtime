// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob.h
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob.cpp
// Source: trinity/trinity/Sprite2d/Tr2Sprite2dRenderJob_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; all portable behavior is implemented here.
import { vec2 } from "#math/vec2";
import { carbon, impl, io, type } from "#schema";
import { Tr2SpriteObjectPickState } from "../generated/sprite2d/enums.js";
import { Tr2SpriteObjectBase } from "./Tr2SpriteObjectBase.js";

/** A Sprite2D leaf that executes an authored render job. */
@type.define({ className: "Tr2Sprite2dRenderJob", family: "sprite2d" })
export class Tr2Sprite2dRenderJob extends Tr2SpriteObjectBase
{

  /** Carbon method GatherSprites. */
  @carbon.method
  @impl.implemented
  GatherSprites(renderer)
  {
    if (this.renderJob && this.display)
    {
      renderer.RunJob(this.renderJob);
    }
  }

  /** Carbon method PickPoint. */
  @carbon.method
  @impl.implemented
  PickPoint(x, y, renderer)
  {
    if (!this.display || this.pickState !== Tr2SpriteObjectPickState.TR2_SPS_ON)
    {
      return null;
    }

    vec2.set(this.#point, x, y);
    vec2.set(this.#translation, this.displayX, this.displayY);
    if (!renderer.IsInside(
      this.#point,
      this.#translation,
      this.displayWidth,
      this.displayHeight,
      0
    ))
    {
      return null;
    }

    if (this.pickingMask && !this.pickingMask.SampleMask(
      renderer.InverseTransformPoint(this.#point),
      this.#translation,
      this.displayWidth,
      this.displayHeight
    ))
    {
      return null;
    }

    return this;
  }

  /** Carbon method GetVertexCount. */
  @carbon.method
  @impl.implemented
  GetVertexCount()
  {
    return 0;
  }

  /** m_renderJob (TriRenderJobPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("TriRenderJob")
  renderJob = null;

  #point = vec2.create();
  #translation = vec2.create();

}
