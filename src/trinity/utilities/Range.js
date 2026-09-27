// Source: trinity/trinity/Utilities/Range.h
// Source: trinity/trinity/Utilities/Range.cpp
// Source: trinity/trinity/Utilities/Range_Blue.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";


/**
 * A center point with a lower and an upper range point, optionally kept
 * symmetric about the center, and clamped for display against separate slider
 * bounds.
 */
@type.define({
  className: "Range",
  family: "utilities"
})
export class Range extends CjsModel
{
  @edit.read
  @type.boolean
  isUniform = true;

  @edit.read
  @type.float32
  centerPoint = 0;

  @edit.read
  @type.float32
  minRangePoint = 0;

  @edit.read
  @type.float32
  maxRangePoint = 0;

  _minRange = 0;

  _maxRange = 0;

  _sliderRangeMin = 0;

  _sliderRangeMax = 0;

  /** Moves the range while preserving both distances from its center. */
  @carbon.method
  @impl.implemented
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
  @impl.implemented
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
  @impl.implemented
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
  @impl.implemented
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
  @impl.implemented
  GetMinRangePoint()
  {
    return this.minRangePoint;
  }

  /**
   * Returns the upper range point after Carbon's clamp, which is a min against
   * the slider maximum, not a max (Range.cpp:68-71).
   */
  @carbon.method
  @impl.implemented
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
  @impl.implemented
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
  @impl.implemented
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
  _syncRangePoints()
  {
    this.minRangePoint = Math.min(this._minRange, this._sliderRangeMin);
    this.maxRangePoint = Math.min(this._maxRange, this._sliderRangeMax);
  }
}
