// Source: blueexposure/include/BlueTypes.h:483-510 (IRoot).
// Source: blueexposure/include/BlueClass.h (RootQIImpl and lifetime wrappers).
// Source: blueexposure/BlueClasses.cpp:376-415 (interface query).
import { CjsSchema, meta } from "#schema";
import { mappedInterfaces } from "../compose/interface.js";
import * as CcpLog from "../logging/ccpLog.js";

/**
 * Common Blue object base. JavaScript constructors serve as ClassInfo/IID
 * identities; interface exposure remains explicitly declared by each class.
 *
 * Native reference counting is replaced by JavaScript reachability. The lifetime
 * methods do not retain, dispose or release resources. GetRefCount reports zero
 * native locks, not the number of JavaScript references. Resource owners still
 * perform their explicit cleanup separately.
 */
export class IRoot
{
  /** Adapted: the constructor is this object's ClassInfo in JavaScript. */
  ClassType()
  {
    return this.constructor;
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

  /** Adapted: JavaScript references retain objects; there is no native lock. */
  Lock() {}

  /** Adapted: JavaScript GC releases objects; this does not dispose resources. */
  Unlock() {}

  /** Adapted: no native automatic-variable or parent-lock ownership flags. */
  GetFlags()
  {
    return 0;
  }

  /** Adapted: zero native locks; JavaScript reference counts are not observable. */
  GetRefCount()
  {
    return 0;
  }

  /** Adapted: JavaScript has one object identity, without base-pointer offsets. */
  GetRootObject()
  {
    return this;
  }

  /** Adapted: protected native deletion is handled by JavaScript GC. */
  _FinalDelete() {}
}

for (const name of ["ClassType", "QueryInterface", "Lock", "Unlock", "GetFlags", "GetRefCount", "GetRootObject", "_FinalDelete"])
{
  CjsSchema.decorateMethod(IRoot, name, meta.blue.method, meta.adapted);
}
CjsSchema.define(IRoot, { className: "IRoot", carbon: "IRoot", fields: {} });
meta.blue.interface()(IRoot);
