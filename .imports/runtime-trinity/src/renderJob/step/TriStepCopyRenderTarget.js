// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepCopyRenderTarget.h
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepCopyRenderTarget.cpp
// Source: E:\carbonengine\trinity\trinity\RenderJob\TriStepCopyRenderTarget_Blue.cpp
import { CjsSchema, carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriRenderJob } from "../TriRenderJob.js";
import { TriRenderStep } from "./TriRenderStep.js";


/**
 * Step describing a copy out of one render target into another render target or
 * into a texture resource, including the source and destination sub-rectangles.
 */
@type.define({ className: "TriStepCopyRenderTarget", family: "renderJob" })
export class TriStepCopyRenderTarget extends TriRenderStep
{
  @io.readwrite
  @type.objectRef("Tr2RenderTarget")
  Destination = null;

  @io.readwrite
  @type.objectRef("TriTextureRes")
  destinationTexture = null;

  @io.readwrite
  @type.objectRef("Tr2RenderTarget")
  Source = null;

  @io.readwrite
  @type.objectRef("TriViewport")
  sourceViewport = null;

  @io.readwrite
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
   * Assigns the copy operands, routing a texture-resource destination to
   * destinationTexture and anything else to the render-target destination.
   */
  @carbon.method
  @impl.adapted
  __init__(destination = null, source = null, destinationViewport = null, sourceViewport = null)
  {
    if (destination)
    {
      if (TriStepCopyRenderTarget.#isTextureResource(destination)) this.destinationTexture = destination;
      else this.Destination = destination;
    }
    this.Source = source ?? null;
    this.destinationViewport = destinationViewport ?? null;
    this.sourceViewport = sourceViewport ?? null;
  }

  /**
   * Builds the copy intent and hands it to the executor's CopyRenderTarget;
   * incomplete operands yield no intent and are a no-op that still reports
   * RS_OK, while an explicit false from the executor is RS_FAILED.
   */
  @carbon.method
  @impl.implemented
  Execute(_realTime, _simTime, executor)
  {
    const intent = this.GetCopyIntent();
    if (!intent) return TriRenderJob.StepResult.RS_OK;
    const copied = executor?.CopyRenderTarget?.(intent);
    return copied === false ? TriRenderJob.StepResult.RS_FAILED : TriRenderJob.StepResult.RS_OK;
  }

  /**
   * Carbon TriStepCopyRenderTarget::Execute (cpp:13-95): resolves the operands and viewports into a plain copy description the executor performs, with destinationType distinguishing the render-target path from the texture path.
   * @returns {object|null} the copy intent, or null when the source or both destinations are missing
   */
  @carbon.method
  @impl.adapted
  GetCopyIntent()
  {
    if (!this.Source || (!this.Destination && !this.destinationTexture)) return null;
    const destX = Number(this.destinationViewport?.x) || 0;
    const destY = Number(this.destinationViewport?.y) || 0;
    if (this.Destination)
    {
      return TriStepCopyRenderTarget.#renderTargetIntent(
        this.Source,
        this.Destination,
        this.sourceViewport,
        destX,
        destY
      );
    }
    return {
      source: this.Source,
      destination: this.destinationTexture,
      destinationType: "texture",
      destinationPoint: { x: destX, y: destY },
      sourceRect: this.sourceViewport ? TriStepCopyRenderTarget.#viewportRect(this.sourceViewport) : null
    };
  }

  /**
   * Builds the render-target-to-render-target rectangles: a source viewport with
   * a non-positive extent cancels the copy, and a negative destination origin
   * clamps to zero while trimming the same amount off the source rectangle
   * (Carbon TriStepCopyRenderTarget.cpp:33-73).
   */
  static #renderTargetIntent(source, destination, sourceViewport, destX, destY)
  {
    let x = destX;
    let y = destY;
    let sourceRect;
    if (sourceViewport)
    {
      if (Number(sourceViewport.width) <= 0 || Number(sourceViewport.height) <= 0) return null;
      sourceRect = TriStepCopyRenderTarget.#viewportRect(sourceViewport);
      if (x < 0)
      {
        sourceRect.right -= -x;
        x = 0;
      }
      if (y < 0)
      {
        sourceRect.bottom -= -y;
        y = 0;
      }
    }
    else
    {
      sourceRect = {
        left: 0,
        top: 0,
        right: TriStepCopyRenderTarget.#dimension(source, "Width", "width"),
        bottom: TriStepCopyRenderTarget.#dimension(source, "Height", "height")
      };
      if (x < 0)
      {
        sourceRect.right += x;
        x = 0;
      }
      if (y < 0)
      {
        sourceRect.bottom += y;
        y = 0;
      }
    }
    return {
      source,
      destination,
      destinationType: "renderTarget",
      sourceRect,
      destinationRect: {
        left: x,
        top: y,
        right: x + sourceRect.right - sourceRect.left,
        bottom: y + sourceRect.bottom - sourceRect.top
      }
    };
  }

  /**
   * Converts a viewport's x/y/width/height into a left/top/right/bottom
   * rectangle, treating non-numeric fields as zero.
   */
  static #viewportRect(viewport)
  {
    const left = Number(viewport.x) || 0;
    const top = Number(viewport.y) || 0;
    return {
      left,
      top,
      right: left + (Number(viewport.width) || 0),
      bottom: top + (Number(viewport.height) || 0)
    };
  }

  /**
   * Reads a dimension off a render target through its Get<Name>() accessor or
   * its lower-case property, yielding 0 when neither is present.
   */
  static #dimension(value, method, property)
  {
    return Number(value?.[`Get${method}`]?.() ?? value?.[property]) || 0;
  }

  /**
   * Identifies a destination as a texture resource by its registered class name,
   * a name ending in TextureRes, or the presence of GetTexture.
   */
  static #isTextureResource(value)
  {
    const name = CjsSchema.getClassName(value?.constructor) ?? value?._sourceClassName ?? "";
    return name === "TriTextureRes" || /TextureRes$/.test(name) || typeof value?.GetTexture === "function";
  }
}
