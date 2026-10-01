// Source: blueexposure/include/IList.h:57-65
// BLUELISTEVENT remains shared vocabulary in #consts/blue.
import { CjsSchema, compose, impl } from "#schema";

/** `IListNotify` - the single observer a Blue list notifies. */
export class IListNotify
{
  /**
   * `OnListModified` - the list changed.
   *
   * Ordinary insertion, removal, swap and move events follow the mutation.
   * UNLOADSTART precedes clearing a nonempty list; LOADFINISHED follows a
   * successful nonempty bulk copy. The event may carry a load or unload flag,
   * so mask with BELIST_EVENTMASK before comparing.
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
