// Source: blueexposure/BlueClasses.h
// Source: blueexposure/BlueClasses.cpp
// Source: blueexposure/include/BlueTypes.h:409-419 (Be::ClassRegistration)
//
// The registry behind `blue.classes` (`BeClasses`).
//
// The classes/registry leaf owns complete registration records for every
// CjsBlueClasses instance and for CjsSchema. Class metadata remains schema-owned;
// registering or removing a name never creates or discards that metadata.
// The first registration wins, and replacement requires explicit removal.
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
import { registerClass, unregisterClass, getClassRegistration } from "./classes/registry.js";
import { CjsSchema, meta } from "#schema";
import { IBlueClasses } from "./IBlueClasses.js";
import { Copier } from "./Copier.js";


/** `CjsBlueClasses` - the class registry `blue.classes` holds, per blueexposure/BlueClasses.cpp. */
export class CjsBlueClasses extends IBlueClasses
{

  /** Carbon's `Be::ClassRegistration::Flags` (BlueTypes.h:415-418). */
  static Flags = {
    DISABLE_PYTHON_CONSTRUCTION: 1
  };

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
      unregisterClass(registration.name);
    }
  }

  /**
   * A copy of the shared registration, or null (BlueClasses.cpp:331-336).
   * Changing this returned record does not mutate the registered entry.
   *
   * @param {string} clsid Class id, which is the class name.
   * @returns {{name: string, type: Function, createFn: Function, flags: number}|null} Registration.
   */
  GetClassRegistration(clsid)
  {
    return getClassRegistration(clsid);
  }

  /**
   * The class id registered under a name, or null (BlueClasses.cpp:355-364).
   *
   * @param {string} name Class name.
   * @returns {string|null} Class id.
   */
  FindClsid(name)
  {
    return getClassRegistration(name)?.name ?? null;
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
    registerClass(registration);
  }

  /** Throws because querying an object's native interface is not implemented. */
  QueryThisInterface() { throw new Error("CjsBlueClasses.QueryThisInterface is not implemented"); }

  /** Throws because native variable lookup is not implemented. */
  FindVariable() { throw new Error("CjsBlueClasses.FindVariable is not implemented"); }

  /** Throws because native object-count accounting is not implemented. */
  UpdateObjectCount() { throw new Error("CjsBlueClasses.UpdateObjectCount is not implemented"); }

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

  /**
   * Throws because processing the native pending-deletion queue is not
   * implemented.
   */
  ProcessPendingDeletes() { throw new Error("CjsBlueClasses.ProcessPendingDeletes is not implemented"); }

  /** Throws because draining all native pending deletions is not implemented. */
  ProcessAllPendingDeletes() { throw new Error("CjsBlueClasses.ProcessAllPendingDeletes is not implemented"); }

  /**
   * Throws because changing native deferred-deletion enablement is not
   * implemented.
   */
  SetPendingDeletesEnabled() { throw new Error("CjsBlueClasses.SetPendingDeletesEnabled is not implemented"); }

  /**
   * Throws because querying native deferred-deletion enablement is not
   * implemented.
   */
  IsPendingDeletesEnabled() { throw new Error("CjsBlueClasses.IsPendingDeletesEnabled is not implemented"); }

  /** Throws because registering a native thunk is not implemented. */
  RegisterThunker() { throw new Error("CjsBlueClasses.RegisterThunker is not implemented"); }

  /** Throws because native runtime type-information lookup is not implemented. */
  GetRtti() { throw new Error("CjsBlueClasses.GetRtti is not implemented"); }

}

const NOT_YET = meta.reason("No consumer yet; ported when one needs it.");

CjsSchema.define(CjsBlueClasses, {
  className: "CjsBlueClasses",
  carbon: "BlueClasses",
  family: "blue",
  fields: {},
  methods: {
    RegisterClasses: [ meta.blue.method, meta.adapted, meta.reason("Carbon walks a null-terminated array; JavaScript takes any iterable of registrations.") ],
    UnregisterClasses: [ meta.blue.method, meta.implemented ],
    GetClassRegistration: [ meta.blue.method, meta.adapted, meta.reason("A class id is the class name: there are no GUIDs to carry, and Carbon already forbids name clashes between modules.") ],
    FindClsid: [ meta.blue.method, meta.adapted, meta.reason("Carbon's out-parameter overload and its module argument collapse: the id is the name, and Carbon ignores the module.") ],
    CreateInstance: [ meta.blue.method, meta.adapted, meta.reason("Carbon returns bool and writes the instance through ppv after a QueryInterface for riid; JavaScript returns the instance or null, with no interface id to query.") ],
    CreateInstanceFromName: [ meta.blue.method, meta.adapted, meta.reason("Carbon returns bool and writes the instance through ppv after a QueryInterface for riid; JavaScript returns the instance or null, with no interface id to query.") ],
    QueryThisInterface: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    FindVariable: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    UpdateObjectCount: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    CopyTo: [ meta.blue.method, meta.adapted ],
    CloneTo: [ meta.blue.method, meta.adapted ],
    ProcessPendingDeletes: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    ProcessAllPendingDeletes: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    SetPendingDeletesEnabled: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    IsPendingDeletesEnabled: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    RegisterThunker: [ meta.blue.method, meta.notImplemented, NOT_YET ],
    GetRtti: [ meta.blue.method, meta.notImplemented, NOT_YET ]
  }
});
