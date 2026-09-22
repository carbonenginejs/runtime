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
import { CjsSchema, compose, impl } from "#schema";

/** `IBlueClasses` - class registration and creation by name, per blueexposure/include/IBlueClasses.h. */
export class IBlueClasses
{
  /** `RegisterClasses` - register every entry of a class-registration table. */
  RegisterClasses(_table) {}

  /** `UnregisterClasses` - remove every entry of a class-registration table. */
  UnregisterClasses(_table) {}

  /** `GetClassRegistration` - the registration for a class id, or null. */
  GetClassRegistration(_clsid) {}

  /** `FindClsid` - the class id registered under a name, or null. */
  FindClsid(_name) {}

  /** `CreateInstance` - a new instance of the class with this id, or null. */
  CreateInstance(_clsid) {}

  /** `CreateInstanceFromName` - a new instance of the class registered under this name, or null. */
  CreateInstanceFromName(_className) {}

  /** `QueryThisInterface` - cast an object to an interface it implements. */
  QueryThisInterface(_self, _riid) {}

  /** `FindVariable` - the exposed member entry for a name on a class type. */
  FindVariable(_name, _type) {}

  /** `UpdateObjectCount` - adjust the live and lock counts of an object's class. */
  UpdateObjectCount(_obj, _inst, _lock) {}

  /** `CopyTo` - deep-copy an object through its exposed members. */
  CopyTo(_source) {}

  /** `CloneTo` - clone an object through its exposed members. */
  CloneTo(_source) {}

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
  "RegisterClasses", "UnregisterClasses", "GetClassRegistration", "FindClsid", "CreateInstance",
  "CreateInstanceFromName", "QueryThisInterface", "FindVariable", "UpdateObjectCount", "CopyTo",
  "CloneTo", "ProcessPendingDeletes", "ProcessAllPendingDeletes", "SetPendingDeletesEnabled",
  "IsPendingDeletesEnabled", "RegisterThunker", "GetRtti"
])
{
  CjsSchema.decorateMethod(IBlueClasses, method, compose.abstract, impl.abstract);
}

CjsSchema.define(IBlueClasses, { className: "IBlueClasses", carbon: "IBlueClasses", family: "blue", fields: {} });
