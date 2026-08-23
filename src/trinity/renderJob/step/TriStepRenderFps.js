// Source: trinity/trinity/RenderJob/TriStepRenderFps.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A step that averages the frame rate over a quarter second and reports it as text with a threshold colour. */
@type.define({ className: "TriStepRenderFps", family: "renderJob" })
export class TriStepRenderFps extends TriRenderStep
{

  /** m_alignBottom (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  alignBottom = true;

  /** m_alignRight (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  alignRight = true;

  /** m_displayX (int) [READWRITE] */
  @io.readwrite
  @type.int32
  displayX = 0;

  /** m_displayY (int) [READWRITE] */
  @io.readwrite
  @type.int32
  displayY = 0;

  /** m_averageFPS - the last computed average, held between recalculations. */
  averageFPS = 0;

  /** m_averageMSPerFrame - the same average expressed as milliseconds. */
  averageMSPerFrame = 0;

  #sumFPSValues = 0;

  #fpsValuesCount = 0;

  #nextCalculationTime = 0;

  // Carbon TriStepRenderFps.cpp:84-150. Every frame contributes one sample;
  // the average is only RECOMPUTED every quarter second, and the value in
  // between is the previous average, so the display does not flicker.
  //
  // Carbon reads the frame rate and the clock from its OS layer and draws the
  // text through the debug renderer. Neither is Trinity's: the sample and the
  // time come in as arguments and the caller draws the text, so what remains
  // here is the averaging and the colour choice, which is the part with a
  // right answer.
  //
  // The zero guard matters: Carbon reports zero milliseconds rather than
  // dividing by an average below 1e-5.

  /**
   * Adds one frame-rate sample and recomputes the average when the quarter
   * second has elapsed; returns the average currently being displayed.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon samples its OS layer for the frame rate and clock and draws through the debug renderer; both are host concerns, so the sample and time are supplied and the text is the caller's.")
  Sample(framesPerSecond, nowSeconds)
  {
    this.#fpsValuesCount += 1;
    this.#sumFPSValues += Number(framesPerSecond) || 0;

    if (nowSeconds >= this.#nextCalculationTime)
    {
      this.#nextCalculationTime = nowSeconds + TriStepRenderFps.CALCULATION_INTERVAL;
      this.averageFPS = this.#sumFPSValues / this.#fpsValuesCount;
      this.averageMSPerFrame = this.averageFPS < 1e-5 ? 0 : 1 / this.averageFPS * 1000;
      this.#sumFPSValues = 0;
      this.#fpsValuesCount = 0;
    }

    return this.averageFPS;
  }

  /**
   * The text colour for the current average: green above sixty, orange down to
   * thirty, red below that.
   */
  @carbon.method
  @impl.implemented
  GetTextColor()
  {
    if (this.averageFPS > 59.9) return TriStepRenderFps.Color.GOOD;
    if (this.averageFPS > 29.5) return TriStepRenderFps.Color.FAIR;
    return TriStepRenderFps.Color.POOR;
  }

  /**
   * The screen rectangle the text occupies within a viewport, inset by the
   * configured display offsets.
   */
  @carbon.method
  @impl.implemented
  GetDisplayRect(viewport, out = {})
  {
    const x = viewport?.x ?? 0;
    const y = viewport?.y ?? 0;

    out.left = x + this.displayX;
    out.top = y + this.displayY;
    out.right = x + (viewport?.width ?? 0) - this.displayX;
    out.bottom = y + (viewport?.height ?? 0) - this.displayY;
    return out;
  }

  /** Carbon's fixed recalculation interval, in seconds. */
  static CALCULATION_INTERVAL = 0.25;

  /** Carbon's frame-rate threshold colours, as packed ARGB. */
  static Color = Object.freeze({
    GOOD: 0xff00ff00,
    FAIR: 0xffff9900,
    POOR: 0xffff0000
  });

}
