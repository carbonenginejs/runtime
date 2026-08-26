// Source: trinity/trinity/RenderJob/TriStepRenderLineGraph.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { TriRenderStep } from "./TriRenderStep.js";

/** A render step that draws a set of line graphs with a shared scale and legend. */
@type.define({ className: "TriStepRenderLineGraph", family: "renderJob" })
export class TriStepRenderLineGraph extends TriRenderStep
{

  /** m_lineGraphs (PTr2LineGraphVector) [READ] */
  @io.read
  @type.list("Tr2LineGraph")
  lineGraphs = [];

  /** m_scale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  scale = 1;

  /** m_legendScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  legendScale = 1;

  /** m_autoScale (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  autoScale = true;

  /** m_showLegend (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  showLegend = true;

  /** m_maxLegend (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxLegend = 1000000000000;

  /** m_scaleChangeCallback (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  scaleChangeCallback = null;

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.implemented
  __init__(graphs = [], legendScale = undefined, scale = undefined, autoScale = undefined)
  {
    this.lineGraphs.push(...graphs);
    if (legendScale !== undefined) this.legendScale = Number(legendScale);
    if (scale !== undefined) this.scale = Number(scale);
    if (autoScale !== undefined) this.autoScale = !!autoScale;
  }

  /**
   * Draws the bound line graphs at the configured scale.
   */
  @carbon.method
  @impl.adapted
  Execute(_realTime, _simTime, executor)
  {
    if (this.autoScale)
    {
      let maxValue = 0;
      for (const graph of this.lineGraphs)
      {
        const value = graph?.GetMaxValue?.() ?? Math.max(0, ...(graph?.GetStatsHistory?.() ?? []));
        if (value > maxValue) maxValue = value;
      }
      if (!maxValue) maxValue = 1;
      maxValue *= 1.1;
      if (maxValue > 1)
      {
        maxValue = Math.ceil(maxValue / 10) * 10;
      }
      else
      {
        maxValue = 1 / maxValue / 10;
        if (maxValue > 1) maxValue = Math.floor(maxValue);
        maxValue = 1 / (maxValue * 10);
      }
      if (maxValue * this.legendScale > this.maxLegend) maxValue = this.maxLegend / this.legendScale;
      const nextScale = 1 / maxValue;
      if (nextScale !== this.scale)
      {
        this.scale = nextScale;
        if (typeof this.scaleChangeCallback === "function") this.scaleChangeCallback();
        else this.scaleChangeCallback?.CallVoid?.();
      }
    }
    executor.RenderLineGraphs(this);
    return TriRenderStep.Result.RS_OK;
  }

}
