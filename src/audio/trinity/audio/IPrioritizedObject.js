// Source: audio/src/IPrioritizedObject.h:13-74.
import { CjsSchema, meta } from "#schema";

/**
 * Supplies the position, weight, and culling operations used by audio
 * prioritization. Carbon declares a plain C++ interface, with no Blue class
 * registration or exposure table.
 */
export class IPrioritizedObject
{
  /** @returns {number} The Wwise game-object identifier. */
  GetID() {}

  /** @returns {Float32Array} The object's three-component world position. */
  GetPosition() {}

  /** @param {number} _distanceSq Squared distance to the listener. */
  SetDistanceSqFromListener(_distanceSq) {}

  /**
   * Recalculates the object's priority weight.
   * @param {number} _now Monotonic milliseconds, adapting Carbon's steady-clock time point.
   */
  CalculateCullingWeight(_now) {}

  /** @returns {number} The last calculated culling weight. */
  GetCullingWeight() {}

  /** @returns {boolean} Whether the object is currently culled. */
  IsCulled() {}

  /** Activates this object for audio playback. */
  Wake() {}

  /** Deactivates this object for audio playback. */
  Cull() {}
}

for (const method of [
  "GetID", "GetPosition", "SetDistanceSqFromListener", "CalculateCullingWeight",
  "GetCullingWeight", "IsCulled", "Wake", "Cull"
])
{
  CjsSchema.decorateMethod(IPrioritizedObject, method, meta.compose.abstract, meta.impl.abstract);
}
