// Source: blueexposure/include/IList.h:16-35,69-165
import { CjsSchema, meta } from "#schema";


/** Native IRoot-derived typed object-list contract, represented as a plain JS interface. */
export class IList
{
  /** @returns {number} The number of items. */
  GetSize() {}

  /**
   * Writes the list's type, operation and observer information.
   * @param {object} _info Caller-owned output record.
   * @returns {void}
   */
  GetInfo(_info) {}

  /**
   * Inserts a correctly typed item; key -1 appends it.
   * @param {number} _key Insertion index or -1.
   * @param {object} _value Non-null item exposing the declared element interface.
   * @returns {boolean} Whether the insertion succeeded.
   */
  Insert(_key, _value) {}

  /**
   * Removes one item, or all items when key is -1.
   * @param {number} _key Item index or -1.
   * @returns {boolean} Whether removal succeeded.
   */
  Remove(_key) {}

  /**
   * Appends a correctly typed item.
   * @param {object} _value Non-null item exposing the declared element interface.
   * @returns {boolean} Whether insertion succeeded.
   */
  Append(_value) {}

  /**
   * Returns one item or null for an invalid index.
   * @param {number} _key Item index.
   * @returns {object|null} The item.
   */
  GetAt(_key) {}

  /**
   * Finds an item by identity, beginning at the supplied index.
   * @param {object} _value Item to find.
   * @param {number} [_keyFrom=0] First index to examine.
   * @returns {number} Its index or -1.
   */
  FindKey(_value, _keyFrom = 0) {}

  /**
   * Swaps two items.
   * @param {number} _key1 First index.
   * @param {number} _key2 Second index.
   * @returns {boolean} Whether the swap succeeded.
   */
  Swap(_key1, _key2) {}

  /**
   * Sorts using Carbon's context-first boolean less-than comparison.
   * @param {Function} _compare Called as (context, a, b).
   * @param {*} _context Opaque comparison context.
   * @returns {void}
   */
  Sort(_compare, _context) {}

  /**
   * Replaces the one observer, or clears it with null.
   * @param {IListNotify|null} _notify Observer.
   * @returns {void}
   */
  SetNotify(_notify) {}

  /**
   * Moves an item to another existing index.
   * @param {number} _from Original index.
   * @param {number} _to Destination index.
   * @returns {boolean} Whether the move succeeded.
   */
  Move(_from, _to) {}

  /** @returns {{items: object[]|null, size: number}} Borrowed item storage and its current size. */
  GetAllItems() {}

  /** Native list-operation metadata; the concrete BlueList methods do not enforce these flags. */
  static LISTOPS = Object.freeze({
    LIST_NOINSERT: 0x1,
    LIST_NOREMOVE: 0x2,
    LIST_NOSWAP: 0x4,
    LIST_READONLY: 0x7,
    LIST_FORCELONG: 0xffffffff
  });
}

for (const name of [ "GetSize", "GetInfo", "Insert", "Remove", "Append", "GetAt", "FindKey", "Swap", "Sort", "SetNotify", "Move", "GetAllItems" ])
{
  CjsSchema.decorateMethod(IList, name, meta.compose.abstract, meta.impl.abstract);
}
CjsSchema.define(IList, { className: "IList", carbon: "IList", family: "blue", fields: {} });
