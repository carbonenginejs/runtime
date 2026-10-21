import { IRoot } from "./IRoot.js";
// Source: blue/include/IBlueObjectProxy.h:10-27
//
// A holder for one object that can be built on demand and dropped again after
// a period of disuse. Every member is pure in Carbon; `BlueObjectProxy` is the
// one implementation.
import { CjsSchema, blue } from "#schema";

/** `IBlueObjectProxy` - a lazily built, unloadable holder for one object. */
export class IBlueObjectProxy extends IRoot
{
  /**
   * `SetBuilder` - who builds the object, and the marker that names it.
   *
   * @param {import("./IBlueObjectBuilder.js").IBlueObjectBuilder|null} _builder The builder.
   * @param {number} _objectMarker Marker passed back to the builder.
   * @returns {void}
   */
  SetBuilder(_builder, _objectMarker) {}

  /**
   * `GetObject` - the object, reloaded or built first if needed.
   *
   * @returns {object|null} The object, or null when there is none and no builder.
   */
  GetObject() {}

  /**
   * `IsResident` - whether the proxy holds an object.
   *
   * @returns {boolean} True while an object is held.
   */
  IsResident() {}

  /**
   * `Freeze` - build the object now and let go of the builder, so the object
   * is never unloaded.
   *
   * @returns {void}
   */
  Freeze() {}

  /**
   * `ClearObject` - drop the object, telling the builder.
   *
   * @returns {void}
   */
  ClearObject() {}

  /**
   * `Update` - unload the object after `timeout` of disuse.
   *
   * @param {number} _time Simulation time in Blue ticks.
   * @param {number} _timeout Disuse period in Blue ticks; zero never unloads.
   * @returns {boolean} True when the object was unloaded by this call.
   */
  Update(_time, _timeout) {}

  /**
   * `SetObject` - hold this object and let go of the builder.
   *
   * @param {object|null} _obj The object.
   * @returns {void}
   */
  SetObject(_obj) {}

  /**
   * `SetObjectFromBuilder` - replace the object without notifying the builder
   * or letting go of it.
   *
   * @param {object|null} _obj The object.
   * @returns {void}
   */
  SetObjectFromBuilder(_obj) {}

  /**
   * `SetTemporary` - mark the held object as a temporary placeholder, even
   * though IsResident may be true.
   *
   * @param {boolean} _isTemporary Whether the object is a placeholder.
   * @returns {void}
   */
  SetTemporary(_isTemporary) {}

  /**
   * `IsTemporary` - whether the held object is a temporary placeholder.
   *
   * @returns {boolean} True for a placeholder.
   */
  IsTemporary() {}

  /**
   * `OnSelected` - the proxy's object is in use, as the active level of detail.
   *
   * @returns {void}
   */
  OnSelected() {}
}

for (const name of [ "SetBuilder", "GetObject", "IsResident", "Freeze", "ClearObject", "Update",
  "SetObject", "SetObjectFromBuilder", "SetTemporary", "IsTemporary", "OnSelected" ])
{
  CjsSchema.decorateMethod(IBlueObjectProxy, name, blue.abstract);
}

CjsSchema.exposure.interface("IBlueObjectProxy")(IBlueObjectProxy);
