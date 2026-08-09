import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriRenderStep as _TriRenderStep } from './TriRenderStep.js';

let _initProto, _initClass, _init_alignBottom, _init_extra_alignBottom, _init_alignRight, _init_extra_alignRight, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY;

/** A step that averages the frame rate over a quarter second and reports it as text with a threshold colour. */
let _TriStepRenderFps;
new class extends _identity {
  static [class TriStepRenderFps extends _TriRenderStep {
    static {
      ({
        e: [_init_alignBottom, _init_extra_alignBottom, _init_alignRight, _init_extra_alignRight, _init_displayX, _init_extra_displayX, _init_displayY, _init_extra_displayY, _initProto],
        c: [_TriStepRenderFps, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriStepRenderFps",
        family: "renderJob"
      })], [[[io, io.readwrite, type, type.boolean], 16, "alignBottom"], [[io, io.readwrite, type, type.boolean], 16, "alignRight"], [[io, io.readwrite, type, type.int32], 16, "displayX"], [[io, io.readwrite, type, type.int32], 16, "displayY"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon samples its OS layer for the frame rate and clock and draws through the debug renderer; both are host concerns, so the sample and time are supplied and the text is the caller's.")], 18, "Sample"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTextColor"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplayRect"]], 0, void 0, _TriRenderStep));
    }
    /** m_alignBottom (bool) [READWRITE] */
    alignBottom = (_initProto(this), _init_alignBottom(this, true));

    /** m_alignRight (bool) [READWRITE] */
    alignRight = (_init_extra_alignBottom(this), _init_alignRight(this, true));

    /** m_displayX (int) [READWRITE] */
    displayX = (_init_extra_alignRight(this), _init_displayX(this, 0));

    /** m_displayY (int) [READWRITE] */
    displayY = (_init_extra_displayX(this), _init_displayY(this, 0));

    /** m_averageFPS - the last computed average, held between recalculations. */
    averageFPS = (_init_extra_displayY(this), 0);

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
    Sample(framesPerSecond, nowSeconds) {
      this.#fpsValuesCount += 1;
      this.#sumFPSValues += Number(framesPerSecond) || 0;
      if (nowSeconds >= this.#nextCalculationTime) {
        this.#nextCalculationTime = nowSeconds + _TriStepRenderFps.CALCULATION_INTERVAL;
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
    GetTextColor() {
      if (this.averageFPS > 59.9) return _TriStepRenderFps.Color.GOOD;
      if (this.averageFPS > 29.5) return _TriStepRenderFps.Color.FAIR;
      return _TriStepRenderFps.Color.POOR;
    }

    /**
     * The screen rectangle the text occupies within a viewport, inset by the
     * configured display offsets.
     */
    GetDisplayRect(viewport, out = {}) {
      const x = viewport?.x ?? 0;
      const y = viewport?.y ?? 0;
      out.left = x + this.displayX;
      out.top = y + this.displayY;
      out.right = x + (viewport?.width ?? 0) - this.displayX;
      out.bottom = y + (viewport?.height ?? 0) - this.displayY;
      return out;
    }

    /** Carbon's fixed recalculation interval, in seconds. */

    /** Carbon's frame-rate threshold colours, as packed ARGB. */
  }];
  CALCULATION_INTERVAL = 0.25;
  Color = Object.freeze({
    GOOD: 0xff00ff00,
    FAIR: 0xffff9900,
    POOR: 0xffff0000
  });
  constructor() {
    super(_TriStepRenderFps), _initClass();
  }
}();

export { _TriStepRenderFps as TriStepRenderFps };
//# sourceMappingURL=TriStepRenderFps.js.map
