import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass, _init_isUniform, _init_extra_isUniform, _init_centerPoint, _init_extra_centerPoint, _init_minRangePoint, _init_extra_minRangePoint, _init_maxRangePoint, _init_extra_maxRangePoint;

/**
 * A center point with a lower and an upper range point, optionally kept
 * symmetric about the center, and clamped for display against separate slider
 * bounds.
 */
let _Range;
class Range extends CjsModel {
  static {
    ({
      e: [_init_isUniform, _init_extra_isUniform, _init_centerPoint, _init_extra_centerPoint, _init_minRangePoint, _init_extra_minRangePoint, _init_maxRangePoint, _init_extra_maxRangePoint, _initProto],
      c: [_Range, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Range",
      family: "utilities"
    })], [[[type, type.boolean], 16, "isUniform"], [[type, type.float32], 16, "centerPoint"], [[type, type.float32], 16, "minRangePoint"], [[type, type.float32], 16, "maxRangePoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCenterPoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMinRangePoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMaxRangePoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCenterPoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMinRangePoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaxRangePoint"], [[carbon, carbon.method, impl, impl.implemented], 18, "ToggleIsUniform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetIsUniform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetIsUniform"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSliderMin"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSliderMax"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSliderMin"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSliderMax"]], 0, void 0, CjsModel));
  }
  isUniform = (_initProto(this), _init_isUniform(this, true));
  centerPoint = (_init_extra_isUniform(this), _init_centerPoint(this, 0));
  minRangePoint = (_init_extra_centerPoint(this), _init_minRangePoint(this, 0));
  maxRangePoint = (_init_extra_minRangePoint(this), _init_maxRangePoint(this, 0));
  #minRange = (_init_extra_maxRangePoint(this), 0);
  #maxRange = 0;
  #sliderRangeMin = 0;
  #sliderRangeMax = 0;

  /** Moves the range while preserving both distances from its center. */
  SetCenterPoint(value) {
    const delta = value - this.centerPoint;
    this.centerPoint = value;
    this.#minRange += delta;
    this.#maxRange += delta;
    this.#syncRangePoints();
  }

  /** Configures the symmetric range and its slider bounds. */
  Setup(rangeCenterPoint, rangeDeltaFromCenter, sliderMin, sliderMax) {
    this.centerPoint = rangeCenterPoint;
    this.#minRange = this.centerPoint - rangeDeltaFromCenter;
    this.#maxRange = this.centerPoint + rangeDeltaFromCenter;
    this.#sliderRangeMin = sliderMin;
    this.#sliderRangeMax = sliderMax;
    this.#syncRangePoints();
  }

  /** Sets the lower range point and mirrors it when uniform. */
  SetMinRangePoint(value) {
    this.#minRange = Math.min(value, this.centerPoint);
    if (this.isUniform) {
      this.#maxRange = this.centerPoint + (this.centerPoint - this.#minRange);
    }
    this.#syncRangePoints();
  }

  /** Sets the upper range point and mirrors it when uniform. */
  SetMaxRangePoint(value) {
    this.#maxRange = Math.max(value, this.centerPoint);
    if (this.isUniform) {
      this.#minRange = this.centerPoint - (this.#maxRange - this.centerPoint);
    }
    this.#syncRangePoints();
  }

  /** Returns the point both range points are measured from. */
  GetCenterPoint() {
    return this.centerPoint;
  }

  /** Preserves Carbon's exact lower-bound comparison behavior. */
  GetMinRangePoint() {
    return this.minRangePoint;
  }

  /**
   * Returns the upper range point after Carbon's clamp, which is a min against
   * the slider maximum, not a max (Range.cpp:68-71).
   */
  GetMaxRangePoint() {
    return this.maxRangePoint;
  }

  /**
   * Flips symmetric mode, and when turning it on collapses both sides to the
   * smaller of the two distances from the center.
   */
  ToggleIsUniform() {
    this.isUniform = !this.isUniform;
    if (this.isUniform) {
      this.FixUniformity();
    }
  }

  /**
   * Sets symmetric mode, fixing up the range points immediately when enabling
   * it.
   */
  SetIsUniform(value) {
    this.isUniform = value;
    if (this.isUniform) {
      this.FixUniformity();
    }
  }

  /**
   * Makes the range symmetric by adopting the smaller of the two distances from
   * the center on both sides, so uniformity narrows rather than widens.
   */
  FixUniformity() {
    const minRangeDelta = this.centerPoint - this.#minRange;
    const maxRangeDelta = this.#maxRange - this.centerPoint;
    const newDelta = Math.min(minRangeDelta, maxRangeDelta);
    this.SetMinRangePoint(this.centerPoint - newDelta);
    this.SetMaxRangePoint(this.centerPoint + newDelta);
  }

  /**
   * Reports whether the two range points are being kept symmetric about the
   * center.
   */
  GetIsUniform() {
    return this.isUniform;
  }

  /**
   * Sets the lower slider bound the exposed range points are clamped against,
   * and re-clamps them.
   */
  SetSliderMin(value) {
    this.#sliderRangeMin = value;
    this.#syncRangePoints();
  }

  /**
   * Sets the upper slider bound the exposed range points are clamped against,
   * and re-clamps them.
   */
  SetSliderMax(value) {
    this.#sliderRangeMax = value;
    this.#syncRangePoints();
  }

  /** Returns the lower slider bound used when clamping the exposed range points. */
  GetSliderMin() {
    return this.#sliderRangeMin;
  }

  /** Returns the upper slider bound used when clamping the exposed range points. */
  GetSliderMax() {
    return this.#sliderRangeMax;
  }

  /**
   * Recomputes the exposed minRangePoint and maxRangePoint from the internal
   * range and the slider bounds; Carbon derives these on read (Range.cpp:63-71)
   * and clamps both with min, which is reproduced here rather than corrected.
   */
  #syncRangePoints() {
    this.minRangePoint = Math.min(this.#minRange, this.#sliderRangeMin);
    this.maxRangePoint = Math.min(this.#maxRange, this.#sliderRangeMax);
  }
  static {
    _initClass();
  }
}

export { _Range as Range };
//# sourceMappingURL=Range.js.map
