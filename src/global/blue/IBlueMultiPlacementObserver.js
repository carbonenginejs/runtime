// Source: blue/include/IBluePlacementObserver.h:46-51
// Source: blue/src/IBluePlacementObserver_Blue.cpp:7
import { CjsSchema, meta } from "#schema";


/**
 * Receives multiple forward vectors and positions from another subsystem.
 * Carbon derives this interface from IRoot; JavaScript uses a plain class.
 */
export class IBlueMultiPlacementObserver
{
  /**
   * Receives the caller's ordered placement records.
   * Native signature: void UpdatePlacements(const PositionDescriptionVector& positions) = 0.
   * @param {Array<import("./PositionDescription.js").PositionDescription>} _positions The caller's records, adapting std::vector<PositionDescription>.
   * @returns {void}
   */
  UpdatePlacements(_positions)
  {
  }
}

CjsSchema.decorateMethod(IBlueMultiPlacementObserver, "UpdatePlacements", meta.requires, meta.abstract);
// Carbon defines an IID, not a class factory. JavaScript registers the interface
// constructor so named declarations and nominal composition resolve one identity.
CjsSchema.define(IBlueMultiPlacementObserver, {
  className: "IBlueMultiPlacementObserver", carbon: "IBlueMultiPlacementObserver", family: "blue", fields: {}
});
