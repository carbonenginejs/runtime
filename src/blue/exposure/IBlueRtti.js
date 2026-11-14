// Source: blueexposure/include/IBlueRtti.h:28-35
//
// A class's run-time type information as its consumers see it. Carbon's is a bare struct of pure virtuals, not an
// IRoot, so this interface has no base: no capability and no lifetime record.
import { CjsSchema, meta } from "#schema";

/**
 * `IBlueRtti` - name lookups over a class's exposed members and methods.
 * Carbon: IBlueRtti (blueexposure/include/IBlueRtti.h:28-35)
 */
export class IBlueRtti
{
  /**
   * `virtual PyObject* GetMethodsAsList() = 0` (IBlueRtti.h:30-32), declared under `BLUE_WITH_PYTHON`.
   *
   * @abstract
   * @adapted JavaScript stands in for Python under BLUE_WITH_PYTHON, so the list is an array of names.
   * @returns {string[]} Method names.
   */
  GetMethodsAsList() {}

  /**
   * `virtual BlueRttiValue* FindAttribute( const char* name ) = 0` (IBlueRtti.h:33).
   *
   * @abstract
   * @param {string} _name Exposed name.
   * @returns {import("./BlueRttiValue.js").BlueRttiValue|null} The member or property, or null.
   */
  FindAttribute(_name) {}

  /**
   * `virtual BlueRttiValue* FindMethod( const char* name ) = 0` (IBlueRtti.h:34).
   *
   * @abstract
   * @param {string} _name Exposed name.
   * @returns {import("./BlueRttiValue.js").BlueRttiValue|null} The entry, or null.
   */
  FindMethod(_name) {}
}

for (const method of [ "GetMethodsAsList", "FindAttribute", "FindMethod" ])
{
  CjsSchema.decorateMethod(IBlueRtti, method, meta.abstract);
}

CjsSchema.exposure.interface("IBlueRtti")(IBlueRtti);
