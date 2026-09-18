// Source: blueexposure/include/IInitialize.h:12-15
//
// One pure method. The interface is three lines; the whole contract is in who
// calls it and when.
//
// A READER CALLS THIS INSTEAD OF INotify, NEVER BOTH. Every reader casts for
// each and, finding this one, drops the notify pointer - DictReader.cpp:163-168
// says it outright: "If IInitialize is provided, don't do individual
// notifications." So a class implementing this is asking to be told ONCE, after
// every member has been written, rather than once per member as it is written.
// That is the entire reason it exists.
//
// The call comes after ReadMembers returns (DictReader.cpp:82-91,
// BlackReader.cpp:395-401, and the same shape in YamlReader), and only when the
// reader's own m_doInitialize flag is set - a reader can be configured to skip
// it and leave the object uninitialised.
//
// THE RETURN VALUE HAS TWO AUDIENCES. The readers discard it. The paths that
// build or duplicate an object honour it: BlueClasses_Blue.cpp:57 fails
// construction on false, and Copier.cpp:209 returns it as the copy's own
// result. Subclasses chain - `return EveChildMesh::Initialize();` is the
// donor's own idiom (EveChildTurret.cpp:59).

import { CjsSchema, compose, impl } from "#schema";

/** `IInitialize` - everything has been written; link it up. */
export class IInitialize
{
  /**
   * `Initialize` - called once after a read fills every member, in place of
   * per-member notification.
   *
   * @returns {boolean} False when initialization failed. Readers ignore this;
   * object construction and copying do not.
   */
  Initialize() {}
}

CjsSchema.decorateMethod(IInitialize, "Initialize", compose.abstract, impl.abstract);

CjsSchema.define(IInitialize, {
  className: "IInitialize", carbon: "IInitialize", family: "blue", fields: {}
});
