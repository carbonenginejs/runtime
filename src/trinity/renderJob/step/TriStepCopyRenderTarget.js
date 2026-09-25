// Source: trinity/trinity/RenderJob/TriStepCopyRenderTarget.h
// Source: trinity/trinity/RenderJob/TriStepCopyRenderTarget.cpp
// Source: trinity/trinity/RenderJob/TriStepCopyRenderTarget_Blue.cpp
import { CjsSchema, carbon, impl, edit, type } from "#schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";
import { ALResult, Failed, Tr2TextureSubresource } from "#trinityal";
import { TriTextureRes } from "#resource";
import { Tr2RenderTarget } from "../../core/device/Tr2RenderTarget.js";


/**
 * Step describing a copy out of one render target into another render target or
 * into a texture resource, including the source and destination sub-rectangles.
 */
@type.define({ className: "TriStepCopyRenderTarget", family: "renderJob" })
export class TriStepCopyRenderTarget extends TriRenderStep
{
  @edit.readwrite
  @type.objectRef("Tr2RenderTarget")
  Destination = null;

  @edit.readwrite
  @type.objectRef("TriTextureRes")
  destinationTexture = null;

  @edit.readwrite
  @type.objectRef("Tr2RenderTarget")
  Source = null;

  @edit.readwrite
  @type.objectRef("TriViewport")
  sourceViewport = null;

  @edit.readwrite
  @type.objectRef("TriViewport")
  destinationViewport = null;

  /** Reads the destination render target under Carbon's lower-case accessor name. */
  get destination()
  {
    return this.Destination;
  }

  /** Sets the destination render target, normalising a missing value to null. */
  set destination(value)
  {
    this.Destination = value ?? null;
  }

  /** Reads the source render target under Carbon's lower-case accessor name. */
  get source()
  {
    return this.Source;
  }

  /** Sets the source render target, normalising a missing value to null. */
  set source(value)
  {
    this.Source = value ?? null;
  }

  /**
   * Carbon PyInitLowLevel (TriStepCopyRenderTarget_Blue.cpp:14-70): the
   * destination is cast to a render target, else to a texture resource.
   */
  @carbon.method
  @impl.implemented
  __init__(destination = null, source = null, destinationViewport = null, sourceViewport = null)
  {
    if (destination)
    {
      const renderTarget = CjsSchema.cast(destination, Tr2RenderTarget);
      if (renderTarget) this.Destination = renderTarget;
      else
      {
        const texture = CjsSchema.cast(destination, TriTextureRes);
        if (texture) this.destinationTexture = texture;
      }
    }
    this.Source = source ?? null;
    this.destinationViewport = destinationViewport ?? null;
    this.sourceViewport = sourceViewport ?? null;
  }

  /**
   * Carbon Execute (TriStepCopyRenderTarget.cpp:13-95): copy the source render
   * target into the destination render target's texture, or into the
   * destination texture resource's. A negative destination origin clamps to
   * zero and trims the same amount off the copied region; a source viewport
   * with no extent copies nothing.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, renderContext)
  {
    const destinationRT = this.Destination;
    const sourceRT = this.Source;

    if ((!destinationRT && !this.destinationTexture) || !sourceRT) return TriRenderJob.StepResult.RS_OK;

    let destX = this.destinationViewport ? this.destinationViewport.x : 0;
    let destY = this.destinationViewport ? this.destinationViewport.y : 0;
    let result = ALResult.S_OK;

    if (destinationRT)
    {
      if (!this.sourceViewport)
      {
        const dest = Tr2TextureSubresource.ForMipLevel(0);
        dest.SetRect(destX, destY, destX + sourceRT.GetWidth(), destY + sourceRT.GetHeight());

        if (this.destinationViewport)
        {
          if (this.destinationViewport.x < 0)
          {
            dest.m_box.left = 0;
            dest.m_box.right = (sourceRT.GetWidth() + this.destinationViewport.x) >>> 0;
          }
          if (this.destinationViewport.y < 0)
          {
            dest.m_box.top = 0;
            dest.m_box.bottom = (sourceRT.GetHeight() + this.destinationViewport.y) >>> 0;
          }
        }
        result = destinationRT.GetRenderTarget().CopySubresourceRegion(dest, sourceRT.GetRenderTarget(), Tr2TextureSubresource.ForMipLevel(0), renderContext);
      }
      else
      {
        const vp = this.sourceViewport;
        const src = Tr2TextureSubresource.ForMipLevel(0);
        src.SetRect(vp.x >>> 0, vp.y >>> 0, (vp.x + vp.width) >>> 0, (vp.y + vp.height) >>> 0);
        if (vp.width <= 0 || vp.height <= 0) return TriRenderJob.StepResult.RS_OK;

        if (this.destinationViewport)
        {
          if (this.destinationViewport.x < 0)
          {
            destX = 0;
            src.m_box.right -= -this.destinationViewport.x;
          }
          if (this.destinationViewport.y < 0)
          {
            destY = 0;
            src.m_box.bottom -= -this.destinationViewport.y;
          }
        }

        const dest = Tr2TextureSubresource.ForMipLevel(0);
        dest.SetRect(destX, destY, destX + src.m_box.right - src.m_box.left, destY + src.m_box.bottom - src.m_box.top);

        result = destinationRT.GetRenderTarget().CopySubresourceRegion(dest, sourceRT.GetRenderTarget(), src, renderContext);
      }
    }
    else if (this.destinationTexture.GetTexture())
    {
      const destView = new Tr2TextureSubresource();
      destView.m_box.left = destX;
      destView.m_box.top = destY;

      const sourceView = new Tr2TextureSubresource();
      if (this.sourceViewport)
      {
        const vp = this.sourceViewport;
        sourceView.m_box.left = vp.x;
        sourceView.m_box.top = vp.y;
        sourceView.m_box.right = vp.x + vp.width;
        sourceView.m_box.bottom = vp.y + vp.height;
      }

      result = this.destinationTexture.GetTexture().CopySubresourceRegion(destView, sourceRT.GetRenderTarget(), sourceView, renderContext);
    }

    return Failed(result) ? TriRenderJob.StepResult.RS_FAILED : TriRenderJob.StepResult.RS_OK;
  }
}
