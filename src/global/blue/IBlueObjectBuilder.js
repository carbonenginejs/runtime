// Source: blue/include/IBlueObjectBuilder.h:8-25
//
// What builds the object behind a BlueObjectProxy. The proxy hands back the
// marker it was given in SetBuilder, so one builder (a reader holding a whole
// file) can serve many proxies. BlackReader is Carbon's own builder
// (BlackReader.cpp:198-208); here `CjsBlackReader` and the resource manager's
// object builders already describe themselves as this interface.
//
// Two members have bodies in Carbon (`{}`): OnObjectDestroyed and OnSelected.
// They stay concrete here, so an implementer that does not care about them
// inherits the empty body, as a C++ subclass does.
import { CjsSchema, meta } from "#schema";

/** `IBlueObjectBuilder` - creates the object a proxy stands for, from a marker. */
export class IBlueObjectBuilder
{
  /**
   * `CreateObjectWithYield` - create the object from its marker; may yield the
   * calling tasklet.
   *
   * @param {number} _objectMarker Marker the proxy was given in SetBuilder.
   * @param {object} _callingProxy The proxy asking.
   * @returns {object|null} The new object, or null; GetErrorMessage then says why.
   */
  CreateObjectWithYield(_objectMarker, _callingProxy) {}

  /**
   * `CreateObject` - create the object from its marker, without yielding.
   *
   * @param {number} _objectMarker Marker the proxy was given in SetBuilder.
   * @param {object} _callingProxy The proxy asking.
   * @returns {object|null} The new object, or null; GetErrorMessage then says why.
   */
  CreateObject(_objectMarker, _callingProxy) {}

  /**
   * `OnObjectDestroyed` - the proxy is about to drop the object this builder
   * made, so an asynchronous build for it can stop. Empty in Carbon.
   *
   * @param {number} _objectMarker Marker of the object being dropped.
   * @param {object} _callingProxy The proxy dropping it.
   * @returns {void}
   */
  OnObjectDestroyed(_objectMarker, _callingProxy) {}

  /**
   * `OnSelected` - the proxy's object is now the active level of detail. Empty
   * in Carbon.
   *
   * @param {number} _objectMarker Marker of the selected object.
   * @param {object} _callingProxy The proxy that was selected.
   * @returns {void}
   */
  OnSelected(_objectMarker, _callingProxy) {}

  /**
   * `GetErrorMessage` - why CreateObject returned null.
   *
   * Adapted: Carbon writes into a `std::string&`; JavaScript returns the text.
   *
   * @returns {string} The error message.
   */
  GetErrorMessage() {}
}

for (const name of [ "CreateObjectWithYield", "CreateObject", "GetErrorMessage" ])
{
  CjsSchema.decorateMethod(IBlueObjectBuilder, name, meta.requires, meta.abstract);
}
CjsSchema.decorateMethod(IBlueObjectBuilder, "OnObjectDestroyed", meta.implemented);
CjsSchema.decorateMethod(IBlueObjectBuilder, "OnSelected", meta.implemented);

CjsSchema.blue.define(IBlueObjectBuilder, {
  className: "IBlueObjectBuilder",
  fields: {}
});
