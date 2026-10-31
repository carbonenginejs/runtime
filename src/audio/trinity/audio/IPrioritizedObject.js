import { meta } from "#schema";
// Source: audio/src/IPrioritizedObject.h:13-74.

/**
 * Supplies the position, weight, and culling operations used by audio
 * prioritization. Carbon declares a plain C++ interface, with no Blue class
 * registration or exposure table.
 */
export class IPrioritizedObject
{
  /**
   * @abstract
   * @returns {number} The Wwise game-object identifier.
   */
  @meta.abstract
  GetID() {}

  /**
   * @abstract
   * @returns {Float32Array} The object's three-component world position.
   */
  @meta.abstract
  GetPosition() {}

  /**
   * @abstract
   * @param {number} _distanceSq Squared distance to the listener.
   */
  @meta.abstract
  SetDistanceSqFromListener(distanceSq) {}

  /**
   * Recalculates the object's priority weight.
   *
   * @abstract
   * @param {number} _now Monotonic milliseconds, adapting Carbon's steady-clock time point.
   */
  @meta.abstract
  CalculateCullingWeight(now) {}

  /**
   * @abstract
   * @returns {number} The last calculated culling weight.
   */
  @meta.abstract
  GetCullingWeight() {}

  /**
   * @abstract
   * @returns {boolean} Whether the object is currently culled.
   */
  @meta.abstract
  IsCulled() {}

  /**
   * Activates this object for audio playback.
   *
   * @abstract
   */
  @meta.abstract
  Wake() {}

  /**
   * Deactivates this object for audio playback.
   *
   * @abstract
   */
  @meta.abstract
  Cull() {}
}
