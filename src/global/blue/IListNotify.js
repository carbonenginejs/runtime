// Source: blueexposure/include/IList.h:56-66
//
// The `IList` container interface shares this header and is not ported.
//
// BLUELISTEVENT, declared just above IListNotify in the donor, is NOT a static
// here. The enum-placement rule makes class ownership the default, and this
// enum has exactly one owner - nothing consumes it but code implementing this
// interface. Our layering forbids it anyway: `global/blue` may import only
// `global/schema`, and `global/model` may not import `global/blue` at all,
// while `CjsModel` is what fires these events. So it lands under the rule's
// other clause, as cross-layer vocabulary in the leaf layer everything may
// read: `#consts/blue`. Carbon has no such constraint, being one binary.

import { CjsSchema, compose, impl } from "#schema";

/** `IListNotify` - the single observer a Blue list notifies. */
export class IListNotify
{
  /**
   * `OnListModified` - the list changed.
   *
   * Every event fires AFTER the mutation, which is what the donor's own
   * comments say (`//after insertion`, `//after removal`). The event may carry
   * a load or unload flag, so mask with `BELIST_EVENTMASK` before comparing.
   *
   * @param {number} _event A `BLUELISTEVENT` value from `#consts/blue`.
   * @param {number} _key The index acted on.
   * @param {number} _key2 The second index, for swaps and moves.
   * @param {*} _value The item inserted, removed or moved.
   * @param {*} _theList The list that changed, so one observer can serve several.
   * @returns {void}
   */
  OnListModified(_event, _key, _key2, _value, _theList) {}
}

CjsSchema.decorateMethod(IListNotify, "OnListModified", compose.abstract, impl.abstract);

CjsSchema.define(IListNotify, {
  className: "IListNotify", carbon: "IListNotify", family: "blue", fields: {}
});
