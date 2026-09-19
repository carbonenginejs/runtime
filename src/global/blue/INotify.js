// Source: blueexposure/include/INotify.h:16-39
//
// One method. Carbon's own comment states the calling rule precisely, and it is
// worth keeping because it is what separates this from an event system:
//
//   "Called when a member of an instance is modified. Usually it's Python or
//    Jennifer which calls this function. This function is only called for
//    members that are flagged with Be::NOTIFY in the members mapping."
//
// So it fires when something OUTSIDE the object edits a mapped member - a tool,
// a reader, a script - and the object then sorts itself out. It is not a
// broadcast, it has one implementor per class, and it is not the event emitter.
// The exposure gate above is not universal: explicit callers such as Copier
// have their own selection rules. Keep those rules at the calling site.
//
// A reader calls this OR IInitialize, never both: DictReader.cpp:163-168 casts
// for each and, finding IInitialize, nulls the notify pointer with the comment
// "If IInitialize is provided, don't do individual notifications."

import { CjsSchema, compose, impl } from "#schema";

/** `INotify` - a mapped member of this instance was modified from outside. */
export class INotify
{
  /**
   * `OnModified` - a Be::NOTIFY member changed; re-derive whatever depended on
   * it. Returning false stops the caller, which is what `CjsModel` tests for.
   *
   * @param {string|null} _propertyName The changed member's name in JavaScript.
   * @returns {boolean} False to halt the caller.
   */
  OnModified(_propertyName) {}
}

CjsSchema.decorateMethod(INotify, "OnModified", compose.abstract, impl.abstract);

CjsSchema.define(INotify, {
  className: "INotify", carbon: "INotify", family: "blue", fields: {}
});


/**
 * `IsMatch` - whether the modified member is the one named.
 *
 * Carbon has nine overloads of this (INotify.h:42-83) and they all do one
 * thing: compare the `Be::Var*` against the ADDRESS of a member, taking the
 * inner member for smart pointers and strings so the wrapper's address is never
 * compared by mistake. The overloads exist only to reach that inner member for
 * each wrapper type.
 *
 * @impl.reason C++ compares member addresses; JavaScript has no address to
 * take, so the port identifies the member by NAME instead of a pointer.
 * That collapses all nine overloads into one comparison and removes the trap
 * the overloads exist to prevent, since a name has no wrapper to look past.
 *
 * @param {string|null} propertyName The argument `OnModified` received.
 * @param {string} name The member being tested for.
 * @returns {boolean} True when that member is the one that changed.
 */
export function IsMatch(propertyName, name)
{
  return propertyName === name;
}
