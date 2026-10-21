// Source: blueexposure/include/IBlueClasses.h
//
// The class registry as its CONSUMERS see it. Carbon reaches it through its
// own extern, `BeClasses` (`blueexposure/BlueClasses.cpp:28`), which is how a
// subsystem builds an object it does not import: `BlackReader.cpp:347` creates
// every loaded object through `BeClasses->CreateInstanceFromName`.
//
// That is also why it matters here. `resource` and `trinityal` are sibling
// layers that may not import each other; both may import `blue`, so a class
// one of them owns is reached by the other through this registry. A class
// nobody registered is simply not found, and the caller fails at the call.
import { CjsSchema, blue } from "#schema";

/** `IBlueClasses` - class registration and creation by name, per blueexposure/include/IBlueClasses.h. */
export class IBlueClasses
{
  /**
   * `RegisterClasses( const Be::ClassRegistration table[] )` - register every
   * entry of a null-terminated class-registration table.
   *
   * @param {Array<object>} _table Registrations.
   */
  RegisterClasses(_table) {}

  /**
   * `RegisterClasses( std::vector<Be::ClassRegistration>& table )` - register
   * every entry of a registration vector.
   *
   * @param {Array<object>} _table Registrations.
   */
  RegisterClasses__Vector(_table) {}

  /**
   * `UnregisterClasses( const Be::ClassRegistration table[] )` - remove every
   * entry of a null-terminated class-registration table.
   *
   * @param {Array<object>} _table Registrations to remove.
   */
  UnregisterClasses(_table) {}

  /**
   * `UnregisterClasses( std::vector<Be::ClassRegistration>& table )` - remove
   * every entry of a registration vector.
   *
   * @param {Array<object>} _table Registrations to remove.
   */
  UnregisterClasses__Vector(_table) {}

  /** `GetClassRegistration` - the registration for a class id, or null. */
  GetClassRegistration(_clsid) {}

  /**
   * `FindClsid( const char* name )` - the class id registered under a name,
   * or null.
   *
   * @param {string} _name Class name.
   * @returns {*} Class id, or null.
   */
  FindClsid(_name) {}

  /**
   * `FindClsid( Be::Clsid& clsid, const char* module, const char* name )` -
   * the class id registered under a module and name, or null. Carbon writes
   * the id to its `clsid` output parameter and returns whether it found one;
   * the output parameter is the return value here, and null is Carbon's false.
   *
   * @param {string} _module Module name.
   * @param {string} _name Class name.
   * @returns {*} Class id, or null.
   */
  FindClsid__Module(_module, _name) {}

  /** `CreateInstance` - a new instance of the class with this id, or null. */
  CreateInstance(_clsid) {}

  /** `CreateInstanceFromName` - a new instance of the class registered under this name, or null. */
  CreateInstanceFromName(_className) {}

  /**
   * `QueryThisInterface( pThis, riid, ppv, type, options = BEQI_NONE )` - the
   * object when `type`'s exposure table maps the interface, otherwise null.
   * Carbon writes the interface pointer to its `ppv` output parameter; the
   * output parameter is the return value here.
   *
   * @param {object} _self The object to query.
   * @param {Function} _riid The interface or class to ask for.
   * @param {Function|null} _type The class whose exposure table is walked.
   * @param {number} [_options] `BLUEQIOPT` flags; Carbon's default is `BEQI_NONE`.
   * @returns {object|null} The object, or null.
   */
  QueryThisInterface(_self, _riid, _type, _options) {}

  /** `FindVariable` - the exposed member entry for a name on a class type. */
  FindVariable(_name, _type) {}

  /** `UpdateObjectCount` - adjust the live and lock counts of an object's class. */
  UpdateObjectCount(_obj, _inst, _lock) {}

  /**
   * `CopyTo( source, dest )` - copy an object through its persisted members,
   * into `dest` or a new instance, with Carbon's default null callbacks.
   *
   * @param {object} _source The object to copy.
   * @param {object|null} _dest An existing object, or null.
   * @returns {object|null} The destination, or null.
   */
  CopyTo(_source, _dest) {}

  /**
   * `CopyTo( source, dest, copyOverride, overrideContext, postCopy, postCopyContext )`
   * - copy an object through its persisted members, into `dest` or a new
   * instance, with copy callbacks and their contexts. Carbon writes the
   * destination to its `dest` output parameter; the output parameter is the
   * return value here.
   *
   * @param {object} _source The object to copy.
   * @param {object|null} _dest An existing object, or null.
   * @param {Function|null} [_copyOverride] Copy-override callback.
   * @param {*} [_overrideContext] Its context.
   * @param {Function|null} [_postCopy] Post-copy callback.
   * @param {*} [_postCopyContext] Its context.
   * @returns {object|null} The destination, or null.
   */
  CopyTo__Callbacks(_source, _dest, _copyOverride, _overrideContext, _postCopy, _postCopyContext) {}

  /**
   * `CloneTo` - copy an object preserving topology; the same as `CopyTo`.
   *
   * @param {object} _source The object to copy.
   * @param {object|null} _dest An existing object, or null.
   * @returns {object|null} The destination, or null.
   */
  CloneTo(_source, _dest) {}

  /** `ProcessPendingDeletes` - release objects whose deletion was deferred. */
  ProcessPendingDeletes() {}

  /** `ProcessAllPendingDeletes` - release every deferred deletion. */
  ProcessAllPendingDeletes() {}

  /** `SetPendingDeletesEnabled` - turn deferred deletion on or off. */
  SetPendingDeletesEnabled(_enabled) {}

  /** `IsPendingDeletesEnabled` - whether deletion is deferred. */
  IsPendingDeletesEnabled() {}

  /** `RegisterThunker` - register a script method-thunk table for an interface. */
  RegisterThunker(_defs, _riid) {}

  /** `GetRtti` - the runtime type information for a class type. */
  GetRtti(_type) {}
}

for (const method of [
  "RegisterClasses", "RegisterClasses__Vector", "UnregisterClasses", "UnregisterClasses__Vector",
  "GetClassRegistration", "FindClsid", "FindClsid__Module", "CreateInstance",
  "CreateInstanceFromName", "QueryThisInterface", "FindVariable", "UpdateObjectCount", "CopyTo", "CopyTo__Callbacks",
  "CloneTo", "ProcessPendingDeletes", "ProcessAllPendingDeletes", "SetPendingDeletesEnabled",
  "IsPendingDeletesEnabled", "RegisterThunker", "GetRtti"
])
{
  CjsSchema.decorateMethod(IBlueClasses, method, blue.abstract);
}

CjsSchema.exposure.interface("IBlueClasses")(IBlueClasses);
