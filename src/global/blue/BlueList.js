// Source: blueexposure/include/BlueListUtil.h:172-347,459-476,506-781
import { CjsSchema, meta, blue } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { be } from "./blue.js";
import { CjsBlueClasses } from "./CjsBlueClasses.js";
import { IList } from "./IList.js";
import { IListNotify } from "./IListNotify.js";
import { ICopierCustomAssignment } from "./ICopierCustomAssignment.js";


/**
 * A typed object list with Carbon's explicit single-observer mutation methods.
 * Adapted: constructor configuration replaces C++ template parameters; Array
 * storage replaces the native vector and pointer/reference-count machinery.
 * Raw indexing and array methods intentionally bypass admission and notification,
 * matching the native escape hatch (BlueListUtil.h:206-210). Callers using that
 * access must preserve the non-null, correctly typed item invariant. This template
 * is not registered as a concrete native List or an automatically constructible
 * specialization. Callers must supply the element type and copy destination.
 */
export class BlueList extends Array
{
  /**
   * Creates an empty list with an exact element-interface identity.
   * Adapted: className explicitly supplies the optional native element CLSID;
   * it is not inferred from interface registration. listOps is metadata only.
   * @param {Function} ItemType Constructor identity required by QueryInterface.
   * @param {{className?: string|null, listOps?: number}} [options={}] Template facts.
   */
  constructor(ItemType, { className = null, listOps = 0 } = {})
  {
    super();
    if (typeof ItemType !== "function" || !ItemType.prototype)
      throw new TypeError("BlueList requires an element-interface constructor.");
    if (className !== null && (typeof className !== "string" || !className.trim()))
      throw new TypeError("BlueList className must be a non-empty string or null.");
    if (!Number.isInteger(listOps) || listOps < -0x80000000 || listOps > 0xffffffff)
      throw new TypeError("BlueList listOps must be a 32-bit flag word.");
    this._itemType = ItemType;
    this._className = className;
    this._listOps = listOps;
    this._notify = null;
  }

  /** @returns {number} The number of stored items. */
  GetSize()
  {
    return this.length;
  }

  /**
   * Writes the native ListInfo facts without replacing the output record.
   * Adapted: iid is a constructor identity and clsid is the explicit optional
   * class name; JavaScript record names omit the native m prefix.
   * @param {object} info Caller-owned output record.
   * @returns {void}
   */
  GetInfo(info)
  {
    info.iid = this._itemType;
    info.clsid = this._className;
    info.listOps = this._listOps;
    info.notify = this._notify;
  }

  /**
   * Inserts a typed item, then notifies with its actual index.
   * Adapted: exact mapped identities replace native QI pointer conversion.
   * Non-integer keys are rejected rather than coerced into native ssize_t.
   * @param {number} key Insertion index, or -1 for the old list length.
   * @param {object} value Non-null item exposing the element interface.
   * @returns {boolean} False leaves the list unchanged.
   */
  Insert(key, value)
  {
    if (!AcceptsItem(this, value)) return false;
    if (!RangeCheck(key, this.length, true)) return false;
    const index = key === -1 ? this.length : key;
    Array.prototype.splice.call(this, index, 0, value);
    if (this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_INSERTED, index, 0, value, this);
    return true;
  }

  /**
   * Appends a typed item, then reports the post-insert size as the event key.
   * This native quirk differs from Insert(-1) (BlueListUtil.h:610-615).
   * Adapted: mapped constructor identities replace native QI pointer conversion.
   * @param {object} value Non-null item exposing the element interface.
   * @returns {boolean} False leaves the list unchanged.
   */
  Append(value)
  {
    if (!AcceptsItem(this, value)) return false;
    Array.prototype.push.call(this, value);
    if (this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_INSERTED, this.length, 0, value, this);
    return true;
  }

  /**
   * Removes an item after selecting it, or sends UNLOADSTART before clearing.
   * Empty clears and null entries do not notify; clear emits no REMOVED events.
   * Keys failing RangeCheck return false without mutation (BlueListUtil.h:643-646).
   * Adapted: JavaScript references replace native Unlock calls.
   * @param {number} key Item index or -1 to clear.
   * @returns {boolean} Whether the index was valid.
   */
  Remove(key)
  {
    if (key === -1)
    {
      if (!this.length) return true;
      if (this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, this);
      this.length = 0;
      return true;
    }
    if (!RangeCheck(key, this.length, false)) return false;
    const value = this[key];
    Array.prototype.splice.call(this, key, 1);
    if (value && this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_REMOVED, key, 0, value, this);
    return true;
  }

  /**
   * Reads an item, or null when the key fails RangeCheck (BlueListUtil.h:670-678).
   * RangeCheck admits -1, which then reaches vector::at and throws; here that
   * is the RangeError from At. Raw JS holes represent null storage.
   * @param {number} key Item index.
   * @returns {object|null} Item or null.
   * @throws {RangeError} For -1, as vector::at throws std::out_of_range.
   */
  GetAt(key)
  {
    if (!RangeCheck(key, this.length, false)) return null;
    return At(this, key) ?? null;
  }

  /**
   * Finds the first matching exposed object identity at or after keyFrom.
   * Follows Carbon's order (BlueListUtil.h:681-711): a null value, then
   * RangeCheck on a nonzero keyFrom, then the interface query, each returning -1.
   * RangeCheck admits -1, and Carbon then iterates from begin() - 1 unchecked;
   * that start throws a RangeError here (ruling 11).
   * Adapted: mapped identities replace QI.
   * @param {object} value Item to find.
   * @param {number} [keyFrom=0] First index to search.
   * @returns {number} Index or -1.
   * @throws {RangeError} For keyFrom -1 with an admitted value.
   */
  FindKey(value, keyFrom = 0)
  {
    if (value === null || value === undefined) return -1;
    if (keyFrom !== 0 && !RangeCheck(keyFrom, this.length, false)) return -1;
    if (!AcceptsItem(this, value)) return -1;

    if (keyFrom < 0) throw new RangeError(`BlueList.FindKey: keyFrom ${keyFrom} is before the first item.`);
    return Array.prototype.indexOf.call(this, value, keyFrom);
  }

  /**
   * Swaps items and sends SWAPPED, including when both indexes are equal.
   * Keys failing RangeCheck return false (BlueListUtil.h:714-735). RangeCheck
   * admits -1, which then reaches vector::at and throws before any write.
   * @param {number} key1 First index.
   * @param {number} key2 Second index.
   * @returns {boolean} Whether both indexes passed RangeCheck.
   * @throws {RangeError} For -1, as vector::at throws std::out_of_range.
   */
  Swap(key1, key2)
  {
    if (!RangeCheck(key1, this.length, false)) return false;
    if (!RangeCheck(key2, this.length, false)) return false;

    const value = At(this, key1);
    this[key1] = At(this, key2);
    this[key2] = value;
    if (this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_SWAPPED, key1, key2, null, this);
    return true;
  }

  /**
   * Moves an item by shifting the items between, then sends MOVED, including
   * when from equals to. Keys failing RangeCheck return false
   * (BlueListUtil.h:739-768). RangeCheck admits -1, which then reaches
   * vector::at and throws: before any write for from, and after the items
   * above it have shifted for to, exactly as Carbon's loop does.
   * @param {number} from Original index.
   * @param {number} to Destination index.
   * @returns {boolean} Whether both indexes passed RangeCheck.
   * @throws {RangeError} For -1, as vector::at throws std::out_of_range.
   */
  Move(from, to)
  {
    if (!RangeCheck(from, this.length, false)) return false;
    if (!RangeCheck(to, this.length, false)) return false;

    let i = from;
    const value = At(this, from);
    for (; i < to; i++) this[i] = At(this, i + 1);
    for (; i > to; i--) this[i] = At(this, i - 1);
    this[to] = value;
    if (this._notify) this._notify.OnListModified(BLUELISTEVENT.BELIST_MOVED, from, to, null, this);
    return true;
  }

  /**
   * Sorts without notification, passing the opaque context to every comparison.
   * Adapted: Carbon's boolean less-than predicate becomes Array.sort's numeric
   * comparator; equivalent elements use JavaScript's stable ordering.
   * @param {Function} compare Called as (context, a, b), returning whether a < b.
   * @param {*} context Caller-owned comparison context.
   * @returns {void}
   */
  Sort(compare, context)
  {
    Array.prototype.sort.call(this, (a, b) => compare(context, a, b) ? -1 : compare(context, b, a) ? 1 : 0);
  }

  /**
   * Replaces the list's one observer without sending an event.
   * Adapted: C++ accepts an IListNotify pointer; JS checks nominal composition,
   * independently of the observer's exposed QueryInterface table.
   * @param {IListNotify|null} notify Observer or null.
   * @returns {void}
   */
  SetNotify(notify)
  {
    if (notify !== null && !CjsSchema.cast(notify, IListNotify))
      throw new TypeError("BlueList.SetNotify requires IListNotify or null.");
    this._notify = notify;
  }

  /**
   * Returns borrowed storage and a snapshot of its size.
   * Adapted: the native pointer/size pair is a named JavaScript record; items is
   * this same array and raw mutations do not emit list notifications.
   * @returns {{items: BlueList, size: number}} Borrowed storage and captured size.
   */
  GetAllItems()
  {
    return { items: this, size: this.length };
  }

  /** @returns {boolean} Whether clearing succeeded. */
  Clear()
  {
    return this.Remove(-1);
  }

  /**
   * Removes first, then inserts the replacement, as native Replace does.
   * Native quirk: an invalid replacement can therefore leave the old item
   * removed (BlueListUtil.h:273-278); it is not an atomic operation.
   * @param {number} key Item index.
   * @param {object} value Replacement item.
   * @returns {boolean} Whether removal and insertion both succeeded.
   */
  Replace(key, value)
  {
    if (!this.Remove(key)) return false;
    return this.Insert(key, value);
  }

  /**
   * Clears then shares the items from a list of the same configured type.
   * Adapted: JS references replace native Lock calls; generic-template equality
   * is checked explicitly. No per-item insertion or LOADFINISHED event is sent.
   * @param {BlueList} other Source list with identical template facts.
   * @returns {void}
   */
  AssignFrom(other)
  {
    if (!SameListType(this, other)) throw new TypeError("BlueList.AssignFrom requires the same configured list type.");
    this.Remove(-1);
    for (let i = 0; i < other.length; i++) Array.prototype.push.call(this, other[i]);
  }

  /**
   * Copies items into an existing list, retaining its observer.
   * Clear notifies before pre-sizing; each copied item must expose ItemType.
   * A null copy result or rejected copied type leaves the copied prefix without
   * LOADFINISHED. Nonempty success
   * sends exactly one LOADFINISHED on the destination; empty success sends none.
   * Adapted: CopyTo returns the copied object or null rather than bool plus an
   * IRoot out-pointer. Constructor/configuration equality replaces a C++ template
   * cast. An outer Copier.CopyTo call owns memoization and recursive topology.
   * Raw nulls or holes violate the typed-list invariant and can throw through
   * Copier; exceptions propagate without LOADFINISHED or a rollback guarantee.
   * @param {BlueList} other Existing destination with identical template facts.
   * @param {ICopier} copier Copier running the outer operation.
   * @returns {boolean} Whether all items copied and exposed the required type.
   */
  AssignTo(other, copier)
  {
    if (!SameListType(this, other)) return false;
    if (!other.Remove(-1)) return false;
    other.length = this.length;
    Array.prototype.fill.call(other, null);
    let i = 0;
    for (; i < this.length; i++)
    {
      const copy = copier.CopyTo(this[i], null);
      if (!AcceptsItem(this, copy))
      {
        other.length = i;
        return false;
      }
      other[i] = copy;
    }
    if (i && other._notify) other._notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, other);
    return true;
  }
}

/** Native QI admission, represented by the exact constructor identity in the exposure table. */
function AcceptsItem(list, value)
{
  return value !== null && typeof value === "object" && be.classes.QueryThisInterface(value, list._itemType, value.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT) !== null;
}

/**
 * Ports BlueListBase::RangeCheck (BlueListUtil.h:90-125): -1 is admitted, and
 * insert also admits one past the end. Failure returns false; Carbon also sets a
 * Python IndexError, which has no JS counterpart.
 * Adapted: Carbon's key is ssize_t; a JS Number can be non-integer, so a
 * non-integer key fails the check rather than being coerced.
 * @param {number} key Item key.
 * @param {number} size List size.
 * @param {boolean} insert Whether one past the end is admitted.
 * @returns {boolean} Whether the key is admitted.
 */
function RangeCheck(key, size, insert)
{
  if (!Number.isInteger(key)) return false;
  return insert ? key >= -1 && key <= size : key >= -1 && key < size;
}

/**
 * Ports vector::at: an index outside the stored items throws, as
 * std::out_of_range does, instead of reading undefined.
 * @param {BlueList} list List storage.
 * @param {number} index Item index.
 * @returns {object|null|undefined} Stored item; a raw hole reads as undefined.
 * @throws {RangeError} When index is outside [0, length).
 */
function At(list, index)
{
  if (index < 0 || index >= list.length) throw new RangeError(`BlueList: index ${index} out of range, size is ${list.length}.`);
  return list[index];
}

/** C++ fixes these facts in the list's template type; JavaScript stores them on each list. */
function SameListType(source, dest)
{
  return Array.isArray(dest) && dest.constructor === source.constructor
    && dest._itemType === source._itemType && dest._className === source._className
    && dest._listOps === source._listOps;
}

// Array methods create ordinary arrays, never pass a result length as ItemType.
Object.defineProperty(BlueList, Symbol.species, { value: Array });
blue.inherit(IList, ICopierCustomAssignment)(BlueList, { kind: "class" });
blue.interface(IList, ICopierCustomAssignment)(BlueList);
for (const name of [ "GetSize", "Clear", "Replace" ]) CjsSchema.decorateMethod(BlueList, name, blue.method, meta.implemented);
for (const name of [ "GetInfo", "Insert", "Append", "Remove", "GetAt", "FindKey", "Swap", "Move", "Sort", "SetNotify", "GetAllItems", "AssignFrom", "AssignTo" ])
{
  CjsSchema.decorateMethod(BlueList, name, blue.method, meta.adapted);
}
