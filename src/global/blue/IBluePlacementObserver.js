// Source: blue/include/IBluePlacementObserver.h:31-34
// Source: blue/src/IBluePlacementObserver_Blue.cpp:6
import { CjsSchema, meta } from "#schema";


/**
 * Receives orientation and position from another subsystem. Carbon derives this
 * interface from IRoot; the JavaScript contract follows Blue's plain-class convention.
 */
export class IBluePlacementObserver
{
  /**
   * Receives a placement's forward vector, up vector and position, in that order.
   * Native signature: void UpdatePlacement(const Vector3& front, const Vector3& top, const Vector3& pos) = 0.
   * @param {Float32Array} _front The caller's forward vector.
   * @param {Float32Array} _top The caller's up vector.
   * @param {Float32Array} _position The caller's position vector.
   * @returns {void}
   */
  UpdatePlacement(_front, _top, _position)
  {
  }
}

CjsSchema.decorateMethod(IBluePlacementObserver, "UpdatePlacement", meta.requires, meta.abstract);
// Carbon defines an IID, not a class factory. JavaScript registers the interface
// constructor so named declarations and nominal composition resolve one identity.
CjsSchema.define(IBluePlacementObserver, {
  className: "IBluePlacementObserver", carbon: "IBluePlacementObserver", family: "blue", fields: {}
});
