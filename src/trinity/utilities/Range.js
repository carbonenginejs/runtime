// Source: trinity/trinity/Utilities/Range.h
// Source: trinity/trinity/Utilities/Range.cpp
// Source: trinity/trinity/Utilities/Range_Blue.cpp
import { carbon, impl, edit, type } from "#schema";


/**
 * A center point with a lower and an upper range point, optionally kept
 * symmetric about the center, and clamped for display against separate slider
 * bounds. Native Range derives only from IRoot and maps its own interface.
 * Read-only property order follows Range_Blue.cpp; none are persistent.
 * Existing JS fields cache native getter results and are refreshed by setters;
 * direct dictionary writes do not invoke those setters. This cache and Number
 * arithmetic (rather than native float intermediates) are retained adapters.
 */
@type.define({
  className: "Range",
  family: "utilities"
})
export class Range
{
  /**
   * Reference point from which both range distances are measured, in the
   * caller's range units. SetCenterPoint moves the endpoints with it.
   * @type {number}
   */
  @edit.read
  @type.float32
  centerPoint = 0;

  /**
   * Cached lower display point: the lesser of the internal lower point and
   * the slider minimum. Range setters refresh this value in the caller's units.
   * @type {number}
   */
  @edit.read
  @type.float32
  minRangePoint = 0;

  /**
   * Cached upper display point: the lesser of the internal upper point and
   * the slider maximum. Range setters refresh this value in the caller's units.
   * @type {number}
   */
  @edit.read
  @type.float32
  maxRangePoint = 0;

  /**
   * Symmetry mode used by range setters to mirror endpoint edits around
   * centerPoint. Assigning this field directly does not rebalance the endpoints.
   * @type {boolean}
   */
  @edit.read
  @type.boolean
  isUniform = true;

  _minRange = 0;

  _maxRange = 0;

  _sliderRangeMin = 0;

  _sliderRangeMax = 0;

  /** Moves the range while preserving both distances from its center. */
  @carbon.method
  @impl.adapted
  SetCenterPoint(value)
  {
    const delta = value - this.centerPoint;
    this.centerPoint = value;
    this._minRange += delta;
    this._maxRange += delta;
    this._syncRangePoints();
  }

  /** Configures the symmetric range and its slider bounds. */
  @carbon.method
  @impl.adapted
  Setup(rangeCenterPoint, rangeDeltaFromCenter, sliderMin, sliderMax)
  {
    this.centerPoint = rangeCenterPoint;
    this._minRange = this.centerPoint - rangeDeltaFromCenter;
    this._maxRange = this.centerPoint + rangeDeltaFromCenter;
    this._sliderRangeMin = sliderMin;
    this._sliderRangeMax = sliderMax;
    this._syncRangePoints();
  }

  /** Sets the lower range point and mirrors it when uniform. */
  @carbon.method
  @impl.adapted
  SetMinRangePoint(value)
  {
    this._minRange = Math.min(value, this.centerPoint);
    if (this.isUniform)
    {
      this._maxRange = this.centerPoint + (this.centerPoint - this._minRange);
    }
    this._syncRangePoints();
  }

  /** Sets the upper range point and mirrors it when uniform. */
  @carbon.method
  @impl.adapted
  SetMaxRangePoint(value)
  {
    this._maxRange = Math.max(value, this.centerPoint);
    if (this.isUniform)
    {
      this._minRange = this.centerPoint - (this._maxRange - this.centerPoint);
    }
    this._syncRangePoints();
  }

  /** Returns the point both range points are measured from. */
  @carbon.method
  @impl.implemented
  GetCenterPoint()
  {
    return this.centerPoint;
  }

  /** Preserves Carbon's exact lower-bound comparison behavior. */
  @carbon.method
  @impl.adapted
  GetMinRangePoint()
  {
    return this.minRangePoint;
  }

  /**
   * Returns the upper range point after Carbon's clamp, which is a min against
   * the slider maximum, not a max (Range.cpp:68-71).
   */
  @carbon.method
  @impl.adapted
  GetMaxRangePoint()
  {
    return this.maxRangePoint;
  }

  /**
   * Flips symmetric mode, and when turning it on collapses both sides to the
   * smaller of the two distances from the center.
   */
  @carbon.method
  @impl.implemented
  ToggleIsUniform()
  {
    this.isUniform = !this.isUniform;
    if (this.isUniform)
    {
      this.FixUniformity();
    }
  }

  /**
   * Sets symmetric mode, fixing up the range points immediately when enabling
   * it.
   */
  @carbon.method
  @impl.implemented
  SetIsUniform(value)
  {
    this.isUniform = value;
    if (this.isUniform)
    {
      this.FixUniformity();
    }
  }

  /**
   * Makes the range symmetric by adopting the smaller of the two distances from
   * the center on both sides, so uniformity narrows rather than widens.
   */
  @carbon.method
  @impl.implemented
  FixUniformity()
  {
    const minRangeDelta = this.centerPoint - this._minRange;
    const maxRangeDelta = this._maxRange - this.centerPoint;
    const newDelta = Math.min(minRangeDelta, maxRangeDelta);
    this.SetMinRangePoint(this.centerPoint - newDelta);
    this.SetMaxRangePoint(this.centerPoint + newDelta);
  }

  /**
   * Reports whether the two range points are being kept symmetric about the
   * center.
   */
  @carbon.method
  @impl.implemented
  GetIsUniform()
  {
    return this.isUniform;
  }

  /**
   * Sets the lower slider bound the exposed range points are clamped against,
   * and re-clamps them.
   */
  @carbon.method
  @impl.adapted
  SetSliderMin(value)
  {
    this._sliderRangeMin = value;
    this._syncRangePoints();
  }

  /**
   * Sets the upper slider bound the exposed range points are clamped against,
   * and re-clamps them.
   */
  @carbon.method
  @impl.adapted
  SetSliderMax(value)
  {
    this._sliderRangeMax = value;
    this._syncRangePoints();
  }

  /** Returns the lower slider bound used when clamping the exposed range points. */
  @carbon.method
  @impl.implemented
  GetSliderMin()
  {
    return this._sliderRangeMin;
  }

  /** Returns the upper slider bound used when clamping the exposed range points. */
  @carbon.method
  @impl.implemented
  GetSliderMax()
  {
    return this._sliderRangeMax;
  }

  /**
   * Recomputes the exposed minRangePoint and maxRangePoint from the internal
   * range and the slider bounds; Carbon derives these on read (Range.cpp:63-71)
   * and clamps both with min, which is reproduced here rather than corrected.
   */
  @impl.custom
  _syncRangePoints()
  {
    this.minRangePoint = Math.min(this._minRange, this._sliderRangeMin);
    this.maxRangePoint = Math.min(this._maxRange, this._sliderRangeMax);
  }
}

carbon.interfaceTable({ interfaces: [Range], chainTo: null })(Range);
