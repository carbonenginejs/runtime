// Source: blueexposure/include/BlueTypes.h:483-510 (IRoot).
// Source: blueexposure/include/BlueClass.h (RootQIImpl and lifetime wrappers).
// Source: blueexposure/BlueClasses.cpp:376-415 (interface query).
import { CjsSchema, meta, blue } from "#schema";
import { mappedInterfaces } from "../compose/interface.js";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * Common Blue object base. ClassType returns shared class metadata; JavaScript
 * constructors identify interfaces explicitly exposed by each class.
 *
 * Native reference counting and deletion are not implemented here. Destruction
 * and deterministic resource release belong to each class and its owner; the
 * separate resource cache Lock/Unlock protocol is not an IRoot lifetime API.
 */
export class IRoot
{
  /**
   * Adapted: retrieves the shared CjsClassInfo record through its current owner.
   *
   * @returns {CjsClassInfo} Metadata for this object's concrete class.
   */
  ClassType()
  {
    return CjsSchema.getSchema(this.constructor);
  }

  /**
   * Adapted: returns the same object or null instead of an adjusted out-pointer.
   * Shared by CjsBlueClasses so instance and service queries have one path.
   *
   * @param {Function} riid Requested interface identity.
   * @param {number} [options=0] BLUEQIOPT flags; bit one suppresses miss logging.
   * @returns {object|null} The exposed object, or null.
   */
  QueryInterface(riid, options = 0)
  {
    if (mappedInterfaces(this.constructor).has(riid)) return this;
    if ((options & 0x1) === 0)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "Interface %s not found on class %s",
        CjsSchema.getClassName(riid), CjsSchema.getClassName(this.constructor));
    }
    return null;
  }

  /** Adapted: JavaScript has one object identity, without base-pointer offsets. */
  GetRootObject()
  {
    return this;
  }
}

for (const name of ["ClassType", "QueryInterface", "GetRootObject"])
{
  CjsSchema.decorateMethod(IRoot, name, blue.method, meta.adapted);
}
CjsSchema.blue.define(IRoot, { className: "IRoot", fields: {} });
blue.interface()(IRoot);
