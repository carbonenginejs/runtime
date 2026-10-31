import { IRoot } from "./IRoot.js";
// Source: blueexposure/include/IPythonMethods.h:11-27
//
// The Python host's attribute hooks. JavaScript has no Python object protocol, so a class that maps it answers
// every hook as "not handled", which is what Carbon's own classes do when no Python bridge is present.
import { CjsSchema, meta } from "#schema";

/**
 * `IPythonMethods` - Python attribute, assignment and repr hooks.
 *
 * @abstract
 */
export class IPythonMethods extends IRoot
{
  /**
   * `Destroy` - releases the Python-side wrapper.
   *
   * @abstract
   */
  Destroy() {}

  /**
   * `GetAttr` - the Python attribute `name`.
   *
   * @abstract
   * @param {string} name The attribute name.
   * @returns {*} The value, or null when not handled.
   */
  GetAttr(name) {}

  /**
   * `SetAttr` - assigns the Python attribute `name`.
   *
   * @abstract
   * @param {string} name The attribute name.
   * @param {*} value The value.
   * @returns {boolean} True when handled.
   */
  SetAttr(name, value) {}

  /**
   * `Repr` - the Python repr.
   *
   * @abstract
   * @returns {string|null} The text, or null when not handled.
   */
  Repr() {}
}

for (const name of [ "Destroy", "GetAttr", "SetAttr", "Repr" ])
{
  CjsSchema.decorateMethod(IPythonMethods, name, meta.abstract);
}

CjsSchema.meta.abstract(IPythonMethods);
CjsSchema.exposure.interface("IPythonMethods")(IPythonMethods);
