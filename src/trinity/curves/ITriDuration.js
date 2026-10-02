// Source: trinity/trinity/Include/ITriDuration.h:9-28
import { CjsSchema, meta } from "#schema";


/**
 * Timing and editing contract shared by curves, but not all functions.
 * Carbon derives it from IRoot; this plain registered JavaScript interface
 * supplies only the native method obligations. Be::Time and TRIEXTRAPOLATION
 * representations remain the concrete class's responsibility.
 */
export class ITriDuration
{
  /**
   * Returns the curve's start time.
   * Native signature: Be::Time Start() = 0.
   * @returns {number|bigint} The concrete implementation's native Be::Time representation.
   */
  Start()
  {
  }

  /**
   * Sets the curve's start time.
   * Native signature: void SetStartTime(Be::Time startTime) = 0.
   * @param {number|bigint} _startTime The concrete implementation's native Be::Time representation.
   * @returns {void}
   */
  SetStartTime(_startTime)
  {
  }

  /**
   * Sorts curve data; Carbon notes that scaling time does not re-sort it.
   * Native signature: void Sort() = 0.
   * @returns {void}
   */
  Sort()
  {
  }

  /**
   * Scales curve time coordinates.
   * Native signature: void ScaleTime(float s) = 0.
   * @param {number} _s Native float scale.
   * @returns {void}
   */
  ScaleTime(_s)
  {
  }

  /**
   * Reverses the curve.
   * Native signature: void Reverse() = 0.
   * @returns {void}
   */
  Reverse()
  {
  }

  /**
   * Scales curve values.
   * Native signature: void ScaleValue(float s) = 0.
   * @param {number} _s Native float scale.
   * @returns {void}
   */
  ScaleValue(_s)
  {
  }

  /**
   * Returns the curve's length.
   * Native signature: float Length() = 0.
   * @returns {number} Native float length.
   */
  Length()
  {
  }

  /**
   * Returns the curve's extrapolation mode.
   * Native signature: TRIEXTRAPOLATION Extrapolation() = 0.
   * @returns {number} Native TRIEXTRAPOLATION value.
   */
  Extrapolation()
  {
  }
}

for (const method of [ "Start", "SetStartTime", "Sort", "ScaleTime", "Reverse", "ScaleValue", "Length", "Extrapolation" ])
{
  CjsSchema.decorateMethod(ITriDuration, method, meta.requires, meta.abstract);
}
CjsSchema.define(ITriDuration, {
  className: "ITriDuration", carbon: "ITriDuration", family: "curves", fields: {}
});
