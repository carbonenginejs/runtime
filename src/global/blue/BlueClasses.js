// Source: blueexposure/BlueClasses.h
// Source: blueexposure/BlueClasses.cpp
// Source: blueexposure/include/BlueTypes.h:409-419 (Be::ClassRegistration)
//
// The registry behind `blue.classes` (`BeClasses`).
//
// ONE TABLE, NOT TWO. `CjsSchema` already keeps the by-name constructor table
// (`SetConstructor`/`GetConstructor`) and fills it for every class it defines;
// it currently does four or five Carbon jobs at once (ClassInfo, BeClasses,
// RTTI, the copier, the exposure macros), and its class registry is
// BeClasses' job (operator, 2026-09-22; /docs/architecture/blue-service-ownership.md).
// Until that splits out, this class is the Carbon-named face over the same table, so a
// class registered either way is found either way. A class with no schema
// (HostBitmap, for one) registers here.
//
// It answers truthfully
// before anything is composed - an empty registry finds nothing, which is what
// Carbon returns for a class nobody registered - so the slot holds this class
// directly rather than a throwing interface.
//
// A REGISTRATION IS { name, type, createFn, flags }. `type`, `createFn` and
// `flags` are Carbon's `mType`, `mCreateFn` and `mFlags`. In JavaScript a
// class is its own type information, so `type` is the constructor itself:
// `GetClassRegistration("X").type` is how a caller reaches a class's statics
// or subclasses it without importing it. `name` is the class name Carbon's
// `ClassInfo` carries; it is given explicitly and never read from
// `type.name`, because a minifier renames classes and the lookup would
// then silently miss in production.
//
// A CLASS ID IS THE CLASS NAME. Carbon's `Be::Clsid` is a GUID paired with a
// module and name, and `FindClsid` already ignores the module ("we don't allow
// name clashes between modules", BlueClasses.cpp:340-343). With no GUIDs to
// carry, the name is the only identity there is.
import { CjsSchema, carbon, impl } from "#schema";
import { IBlueClasses } from "./IBlueClasses.js";
import { Copier } from "./Copier.js";


/** `BlueClasses` - the class registry `blue.classes` holds, per blueexposure/BlueClasses.cpp. */
export class BlueClasses extends IBlueClasses
{

  /** Carbon's `Be::ClassRegistration::Flags` (BlueTypes.h:415-418). */
  static Flags = {
    DISABLE_PYTHON_CONSTRUCTION: 1
  };

  /** Carbon's per-registration createFn and flags, where they differ from `new type()` and 0. */
  _extras = new Map();

  /**
   * Register every entry of a table (BlueClasses.cpp:296-302).
   *
   * @param {Array<{name: string, type: Function, createFn?: Function, flags?: number}>} table Registrations.
   */
  RegisterClasses(table)
  {
    for (const registration of table)
    {
      this._RegisterSingleClass(registration);
    }
  }

  /**
   * Remove every entry of a table (BlueClasses.cpp:304-310, 282-294).
   *
   * @param {Array<{name: string}>} table Registrations to remove.
   */
  UnregisterClasses(table)
  {
    for (const registration of table)
    {
      this._extras.delete(registration.name);
      CjsSchema.DeleteConstructor(registration.name);
    }
  }

  /**
   * The registration for a class id, or null (BlueClasses.cpp:331-336).
   *
   * @param {string} clsid Class id, which is the class name.
   * @returns {{name: string, type: Function, createFn: Function, flags: number}|null} Registration.
   */
  GetClassRegistration(clsid)
  {
    const type = CjsSchema.GetConstructor(clsid);

    if (!type) return null;

    const extras = this._extras.get(clsid);

    return {
      name: clsid,
      type,
      createFn: extras?.createFn ?? (() => new type()),
      flags: extras?.flags ?? 0
    };
  }

  /**
   * The class id registered under a name, or null (BlueClasses.cpp:355-364).
   *
   * @param {string} name Class name.
   * @returns {string|null} Class id.
   */
  FindClsid(name)
  {
    return CjsSchema.GetConstructor(name) ? name : null;
  }

  /**
   * A new instance of the class with this id, or null (BlueClasses.cpp:429-445).
   *
   * @param {string} clsid Class id, which is the class name.
   * @returns {object|null} New instance.
   */
  CreateInstance(clsid)
  {
    const registration = this.GetClassRegistration(clsid);

    return registration ? registration.createFn() : null;
  }

  /**
   * A new instance of the class registered under a name, or null (BlueClasses.cpp:448-464).
   *
   * @param {string} className Class name.
   * @returns {object|null} New instance.
   */
  CreateInstanceFromName(className)
  {
    return this.CreateInstance(className);
  }

  /** Register one entry, refusing a name already taken (BlueClasses.cpp:266-280). */
  _RegisterSingleClass(registration)
  {
    const { name, type } = registration;

    if (CjsSchema.GetConstructor(name))
    {
      // Carbon: CCP_LOGERR("Class %s.%s is already registered!") and keeps the
      // first registration (BlueClasses.cpp:272-276).
      return;
    }

    CjsSchema.SetConstructor(name, type);

    if (registration.createFn || registration.flags)
    {
      this._extras.set(name, { createFn: registration.createFn, flags: registration.flags ?? 0 });
    }
  }

  QueryThisInterface() { throw new Error("BlueClasses.QueryThisInterface is not implemented"); }

  FindVariable() { throw new Error("BlueClasses.FindVariable is not implemented"); }

  UpdateObjectCount() { throw new Error("BlueClasses.UpdateObjectCount is not implemented"); }

  /**
   * Copies `source` into `dest`, or into a new instance of its class when
   * `dest` is null, through a fresh Copier (BlueClasses.cpp:498-510).
   *
   * Adapted: Carbon returns bool and writes the destination through an
   * IRoot**, and each callback carries a void* context; JavaScript returns the
   * destination or null, and closures carry their own context.
   *
   * @param {object} source The object to copy.
   * @param {object|null} [dest=null] An existing object of the same class, or null.
   * @param {Function|null} [copyOverride=null] See `Copier.SetCopyOverrideCallback`.
   * @param {Function|null} [postCopy=null] See `Copier.SetPostCopyCallback`.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CopyTo(source, dest = null, copyOverride = null, postCopy = null)
  {
    const copier = new Copier();
    copier.SetCopyOverrideCallback(copyOverride);
    copier.SetPostCopyCallback(postCopy);
    return copier.CopyTo(source, dest);
  }

  /**
   * Copies preserving topology, through a fresh Copier (BlueClasses.cpp:512-516).
   *
   * Adapted: Carbon returns bool and writes the destination through an
   * IRoot**; JavaScript returns the destination or null.
   *
   * @param {object} source The object to copy.
   * @param {object|null} [dest=null] An existing object of the same class, or null.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CloneTo(source, dest = null)
  {
    return new Copier().CloneTo(source, dest);
  }

  ProcessPendingDeletes() { throw new Error("BlueClasses.ProcessPendingDeletes is not implemented"); }

  ProcessAllPendingDeletes() { throw new Error("BlueClasses.ProcessAllPendingDeletes is not implemented"); }

  SetPendingDeletesEnabled() { throw new Error("BlueClasses.SetPendingDeletesEnabled is not implemented"); }

  IsPendingDeletesEnabled() { throw new Error("BlueClasses.IsPendingDeletesEnabled is not implemented"); }

  RegisterThunker() { throw new Error("BlueClasses.RegisterThunker is not implemented"); }

  GetRtti() { throw new Error("BlueClasses.GetRtti is not implemented"); }

}

const NOT_YET = impl.reason("No consumer yet; ported when one needs it.");

CjsSchema.define(BlueClasses, {
  className: "BlueClasses",
  family: "blue",
  fields: {},
  methods: {
    RegisterClasses: [ carbon.method, impl.adapted, impl.reason("Carbon walks a null-terminated array; JavaScript takes any iterable of registrations.") ],
    UnregisterClasses: [ carbon.method, impl.implemented ],
    GetClassRegistration: [ carbon.method, impl.adapted, impl.reason("A class id is the class name: there are no GUIDs to carry, and Carbon already forbids name clashes between modules.") ],
    FindClsid: [ carbon.method, impl.adapted, impl.reason("Carbon's out-parameter overload and its module argument collapse: the id is the name, and Carbon ignores the module.") ],
    CreateInstance: [ carbon.method, impl.adapted, impl.reason("Carbon returns bool and writes the instance through ppv after a QueryInterface for riid; JavaScript returns the instance or null, with no interface id to query.") ],
    CreateInstanceFromName: [ carbon.method, impl.adapted, impl.reason("Carbon returns bool and writes the instance through ppv after a QueryInterface for riid; JavaScript returns the instance or null, with no interface id to query.") ],
    QueryThisInterface: [ carbon.method, impl.notImplemented, NOT_YET ],
    FindVariable: [ carbon.method, impl.notImplemented, NOT_YET ],
    UpdateObjectCount: [ carbon.method, impl.notImplemented, NOT_YET ],
    CopyTo: [ carbon.method, impl.adapted ],
    CloneTo: [ carbon.method, impl.adapted ],
    ProcessPendingDeletes: [ carbon.method, impl.notImplemented, NOT_YET ],
    ProcessAllPendingDeletes: [ carbon.method, impl.notImplemented, NOT_YET ],
    SetPendingDeletesEnabled: [ carbon.method, impl.notImplemented, NOT_YET ],
    IsPendingDeletesEnabled: [ carbon.method, impl.notImplemented, NOT_YET ],
    RegisterThunker: [ carbon.method, impl.notImplemented, NOT_YET ],
    GetRtti: [ carbon.method, impl.notImplemented, NOT_YET ]
  }
});
