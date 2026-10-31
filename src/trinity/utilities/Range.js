import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Utilities/Range.h
// Source: trinity/trinity/Utilities/Range.cpp
// Source: trinity/trinity/Utilities/Range_Blue.cpp
import { type, blue } from "#schema";


/**
 * A center point with a lower and an upper range point, optionally kept
 * symmetric about the center, and clamped for display against separate slider
 * bounds. Native Range derives only from IRoot and maps its own interface.
 * Read-only property order follows Range_Blue.cpp; none are persistent.
 * The two range points are derived on read, as Carbon's getters do, and exposed as
 * properties over them. Number arithmetic (rather than native float intermediates)
 * is a retained adapter.
 */
@be.define("Range")
@be.inherit(IRoot)
export class Range extends IRoot
{
  /**
   * Reference point from which both range distances are measured, in the
   * caller's range units. SetCenterPoint moves the endpoints with it.
   * @type {number}
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Utilities/Range_Blue.cpp:15); getter GetCenterPoint only reads m_centerPoint.
   */
  @be.mapPropertyReadOnly__Field()
  @type.float32
  centerPoint = 0;

  /**
   * Symmetry mode used by range setters to mirror endpoint edits around
   * centerPoint. Assigning this field directly does not rebalance the endpoints.
   * @type {boolean}
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Utilities/Range_Blue.cpp:18); getter GetIsUniform only reads m_isUniform.
   */
  @be.mapPropertyReadOnly__Field()
  @type.boolean
  isUniform = true;

  _minRange = 0;

  _maxRange = 0;

  _sliderRangeMin = 0;

  _sliderRangeMax = 0;

  /**
   * Moves the range while preserving both distances from its center.
   *
   * @adapted
   */

  SetCenterPoint(value)
  {
    const delta = value - this.centerPoint;
    this.centerPoint = value;
    this._minRange += delta;
    this._maxRange += delta;
  }

  /**
   * Configures the symmetric range and its slider bounds.
   *
   * @adapted
   */

  Setup(rangeCenterPoint, rangeDeltaFromCenter, sliderMin, sliderMax)
  {
    this.centerPoint = rangeCenterPoint;
    this._minRange = this.centerPoint - rangeDeltaFromCenter;
    this._maxRange = this.centerPoint + rangeDeltaFromCenter;
    this._sliderRangeMin = sliderMin;
    this._sliderRangeMax = sliderMax;
  }

  /**
   * Sets the lower range point and mirrors it when uniform.
   *
   * @adapted
   */

  SetMinRangePoint(value)
  {
    this._minRange = Math.min(value, this.centerPoint);
    if (this.isUniform)
    {
      this._maxRange = this.centerPoint + (this.centerPoint - this._minRange);
    }
  }

  /**
   * Sets the upper range point and mirrors it when uniform.
   *
   * @adapted
   */

  SetMaxRangePoint(value)
  {
    this._maxRange = Math.max(value, this.centerPoint);
    if (this.isUniform)
    {
      this._minRange = this.centerPoint - (this._maxRange - this.centerPoint);
    }
  }

  /**
   * Returns the point both range points are measured from.
   *
   * @implemented
   */

  GetCenterPoint()
  {
    return this.centerPoint;
  }

  /**
   * Preserves Carbon's exact lower-bound comparison behavior.
   *
   * @adapted
   */

  GetMinRangePoint()
  {
    return Math.min(this._minRange, this._sliderRangeMin);
  }

  /**
   * minRangePoint (MAP_PROPERTY_READONLY): Carbon's property over GetMinRangePoint, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Utilities/Range_Blue.cpp:16).
   *
   * @adapted
   */
  @be.mapPropertyReadOnly()
  get minRangePoint()
  {
    return this.GetMinRangePoint();
  }

  /**
   * Returns the upper range point after Carbon's clamp, which is a min against
   * the slider maximum, not a max (Range.cpp:68-71).
   *
   * @adapted
   */

  GetMaxRangePoint()
  {
    return Math.min(this._maxRange, this._sliderRangeMax);
  }

  /**
   * maxRangePoint (MAP_PROPERTY_READONLY): Carbon's property over GetMaxRangePoint, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Utilities/Range_Blue.cpp:17).
   *
   * @adapted
   */
  @be.mapPropertyReadOnly()
  get maxRangePoint()
  {
    return this.GetMaxRangePoint();
  }

  /**
   * Flips symmetric mode, and when turning it on collapses both sides to the
   * smaller of the two distances from the center.
   *
   * @implemented
   */

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
   *
   * @implemented
   */

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
   *
   * @implemented
   */

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
   *
   * @implemented
   */

  GetIsUniform()
  {
    return this.isUniform;
  }

  /**
   * Sets the lower slider bound the exposed range points are clamped against,
   * and re-clamps them.
   *
   * @adapted
   */

  SetSliderMin(value)
  {
    this._sliderRangeMin = value;
  }

  /**
   * Sets the upper slider bound the exposed range points are clamped against,
   * and re-clamps them.
   *
   * @adapted
   */

  SetSliderMax(value)
  {
    this._sliderRangeMax = value;
  }

  /**
   * Returns the lower slider bound used when clamping the exposed range points.
   *
   * @implemented
   */

  GetSliderMin()
  {
    return this._sliderRangeMin;
  }

  /**
   * Returns the upper slider bound used when clamping the exposed range points.
   *
   * @implemented
   */

  GetSliderMax()
  {
    return this._sliderRangeMax;
  }
}
