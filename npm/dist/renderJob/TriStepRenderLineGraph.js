import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_lineGraphs, _init_extra_lineGraphs, _init_scale, _init_extra_scale, _init_legendScale, _init_extra_legendScale, _init_autoScale, _init_extra_autoScale, _init_showLegend, _init_extra_showLegend, _init_maxLegend, _init_extra_maxLegend, _init_scaleChangeCallback, _init_extra_scaleChangeCallback;

/** A render step that draws a set of line graphs with a shared scale and legend. */
let _TriStepRenderLineGra;
class TriStepRenderLineGraph extends _TriRenderStep {
  static {
    ({
      e: [_init_lineGraphs, _init_extra_lineGraphs, _init_scale, _init_extra_scale, _init_legendScale, _init_extra_legendScale, _init_autoScale, _init_extra_autoScale, _init_showLegend, _init_extra_showLegend, _init_maxLegend, _init_extra_maxLegend, _init_scaleChangeCallback, _init_extra_scaleChangeCallback, _initProto],
      c: [_TriStepRenderLineGra, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "TriStepRenderLineGraph",
      family: "renderJob"
    })], [[[io, io.read, void 0, type.list("Tr2LineGraph")], 16, "lineGraphs"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.persist, type, type.float32], 16, "legendScale"], [[io, io.persist, type, type.boolean], 16, "autoScale"], [[io, io.persist, type, type.boolean], 16, "showLegend"], [[io, io.persist, type, type.float32], 16, "maxLegend"], [[io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "scaleChangeCallback"], [[carbon, carbon.method, impl, impl.implemented], 18, "__init__"], [[carbon, carbon.method, impl, impl.adapted], 18, "Execute"]], 0, void 0, _TriRenderStep));
  }
  constructor(...args) {
    super(...args);
    _init_extra_scaleChangeCallback(this);
  }
  /** m_lineGraphs (PTr2LineGraphVector) [READ] */
  lineGraphs = (_initProto(this), _init_lineGraphs(this, []));

  /** m_scale (float) [READWRITE, PERSIST] */
  scale = (_init_extra_lineGraphs(this), _init_scale(this, 1));

  /** m_legendScale (float) [READWRITE, PERSIST] */
  legendScale = (_init_extra_scale(this), _init_legendScale(this, 1));

  /** m_autoScale (bool) [READWRITE, PERSIST] */
  autoScale = (_init_extra_legendScale(this), _init_autoScale(this, true));

  /** m_showLegend (bool) [READWRITE, PERSIST] */
  showLegend = (_init_extra_autoScale(this), _init_showLegend(this, true));

  /** m_maxLegend (float) [READWRITE, PERSIST] */
  maxLegend = (_init_extra_showLegend(this), _init_maxLegend(this, 1000000000000));

  /** m_scaleChangeCallback (BlueScriptCallback) [READWRITE] */
  scaleChangeCallback = (_init_extra_maxLegend(this), _init_scaleChangeCallback(this, null));

  /** Carbon method __init__ -> py__init__ (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  __init__(graphs = [], legendScale = undefined, scale = undefined, autoScale = undefined) {
    this.lineGraphs.push(...graphs);
    if (legendScale !== undefined) this.legendScale = Number(legendScale);
    if (scale !== undefined) this.scale = Number(scale);
    if (autoScale !== undefined) this.autoScale = !!autoScale;
  }

  /**
   * Draws the bound line graphs at the configured scale.
   */
  Execute(_realTime, _simTime, executor) {
    if (this.autoScale) {
      let maxValue = 0;
      for (const graph of this.lineGraphs) {
        const value = graph?.GetMaxValue?.() ?? Math.max(0, ...(graph?.GetStatsHistory?.() ?? []));
        if (value > maxValue) maxValue = value;
      }
      if (!maxValue) maxValue = 1;
      maxValue *= 1.1;
      if (maxValue > 1) {
        maxValue = Math.ceil(maxValue / 10) * 10;
      } else {
        maxValue = 1 / maxValue / 10;
        if (maxValue > 1) maxValue = Math.floor(maxValue);
        maxValue = 1 / (maxValue * 10);
      }
      if (maxValue * this.legendScale > this.maxLegend) maxValue = this.maxLegend / this.legendScale;
      const nextScale = 1 / maxValue;
      if (nextScale !== this.scale) {
        this.scale = nextScale;
        if (typeof this.scaleChangeCallback === "function") this.scaleChangeCallback();else this.scaleChangeCallback?.CallVoid?.();
      }
    }
    executor?.RenderLineGraphs?.(this);
    return _TriRenderStep.Result.RS_OK;
  }
  static {
    _initClass();
  }
}

export { _TriStepRenderLineGra as TriStepRenderLineGraph };
//# sourceMappingURL=TriStepRenderLineGraph.js.map
