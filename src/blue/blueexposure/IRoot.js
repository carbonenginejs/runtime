// Source: blueexposure/include/BlueTypes.h:483-510 (IRoot).
// Source: blueexposure/include/BlueClass.h:31-161 (RootQIImpl, RootRefLock: the bodies Carbon wraps around a class).
import { CjsSchema } from "#schema/CjsSchema";
import { BeClasses } from "./classes/registry.js";
import { ClassInfo } from "./ClassInfo.js";

/**
 * Carbon's `IRoot`: the interface every Blue object implements. Carbon's is
 * pure virtual and the `RootQIImpl` and `RootRefLock` templates supply the
 * bodies; JavaScript has one class, so the bodies live here. `QueryInterface`
 * forwards to `BeClasses`, as `RootQIImpl` does, and the reference-counting
 * half is not supported: garbage collection decides lifetimes.
 *
 * Carbon: IRoot (blueexposure/include/BlueTypes.h:483-510)
 */
export class IRoot
{
  /**
   * `ClassType()`: the class's Blue type information, from the class-info
   * store (`ClassInfo.exposeToBlue`), as Carbon's `ClassType_()` returns the
   * `Be::ClassInfo` its exposure macros built.
   *
   * @adapted Carbon's is generated per class by `EXPOSE_TO_BLUE`; one body
   *   serves every class here, keyed by the object's constructor.
   * @returns {ClassInfo} The concrete class's information.
   */
  ClassType()
  {
    return ClassInfo.exposeToBlue(this.constructor);
  }

  /**
   * `QueryInterface( riid, ppv, options )`: `RootQIImpl` forwards to
   * `BeClasses->QueryThisInterface( this, riid, ppv, ClassType_(), options )`
   * (BlueClass.h:38-40), and so does this.
   *
   * @adapted the object or null is the return value in place of Carbon's
   *   out-pointer and bool, and the class itself stands for `ClassType_()`, as
   *   `BlueClasses.QueryThisInterface` takes it.
   * @param {Function} riid Requested interface identity.
   * @param {number} [options=0] `BLUEQIOPT` flags; `BEQI_SILENT` suppresses the miss log.
   * @returns {object|null} The object, or null.
   */
  QueryInterface(riid, options = 0)
  {
    return BeClasses.QueryThisInterface(this, riid, this.constructor, options);
  }

  /**
   * `Lock()`: `RootRefLock` adds a reference (BlueClass.h:85-89).
   *
   * @notSupported JavaScript garbage collection decides an object's lifetime,
   *   so there is no reference count to add to.
   * @returns {never}
   * @throws {Error} Always.
   */
  Lock()
  {
    throw new Error("IRoot.Lock: JavaScript garbage collection decides object lifetimes, so there is no reference count.");
  }

  /**
   * `Unlock()`: `RootRefLock` releases a reference and deletes the object at
   * zero (BlueClass.h:91-98).
   *
   * @notSupported JavaScript garbage collection decides an object's lifetime,
   *   so there is no reference count to release.
   * @returns {never}
   * @throws {Error} Always.
   */
  Unlock()
  {
    throw new Error("IRoot.Unlock: JavaScript garbage collection decides object lifetimes, so there is no reference count.");
  }

  /**
   * `GetFlags()`: the reference-lock flags (BlueClass.h:100-103).
   *
   * @notSupported the flags belong to the reference count, which garbage
   *   collection replaces.
   * @returns {never}
   * @throws {Error} Always.
   */
  GetFlags()
  {
    throw new Error("IRoot.GetFlags: JavaScript garbage collection decides object lifetimes, so there are no reference-lock flags.");
  }

  /**
   * `GetRefCount()` (BlueClass.h:105-108).
   *
   * @notSupported JavaScript garbage collection decides an object's lifetime
   *   and reports no reference count.
   * @returns {never}
   * @throws {Error} Always.
   */
  GetRefCount()
  {
    throw new Error("IRoot.GetRefCount: JavaScript garbage collection decides object lifetimes and reports no reference count.");
  }

  /**
   * `GetRootObject()`: the object's base pointer (BlueClass.h:42-45).
   *
   * @adapted JavaScript has one object identity, without base-pointer offsets.
   * @returns {IRoot} This object.
   */
  GetRootObject()
  {
    return this;
  }

  /**
   * `FinalDelete()` (protected): the delayed delete `BlueClasses` runs once a
   * reference count reaches zero (BlueClass.h:146-161).
   *
   * @notSupported JavaScript garbage collection frees objects; nothing reaches
   *   a zero count to delete.
   * @returns {never}
   * @throws {Error} Always.
   */
  _FinalDelete()
  {
    throw new Error("IRoot.FinalDelete: JavaScript garbage collection frees objects, so there is no delayed delete.");
  }
}

const { blue } = CjsSchema;

for (const name of [ "ClassType", "QueryInterface", "Lock", "Unlock", "GetFlags", "GetRefCount", "GetRootObject", "_FinalDelete" ])
{
  CjsSchema.decorateMethod(IRoot, name, blue.method);
}
CjsSchema.blue.define(IRoot, { className: "IRoot", fields: {} });
blue.interface()(IRoot);
