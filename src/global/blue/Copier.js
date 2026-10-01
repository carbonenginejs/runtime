// Source: blueexposure/include/Copier.h
// Source: blueexposure/Copier.cpp
// Source: blueexposure/BlueVariable.cpp (the per-type Copy<VarType> arms)
//
// Carbon's object copier: copies one object into another, or into a new
// instance of its class, through the members its class exposes as PERSIST.
// `blue.classes.CopyTo`/`CloneTo` construct one per call, as
// BlueClasses.cpp:498-516 does.
//
// TOPOLOGY IS PRESERVED. The first time a source object is copied its new
// destination is recorded before the copier recurses into it
// (Copier.cpp:73-98), so a child the source graph shares is shared in the copy,
// and a cycle closes on itself. The map clears when the outermost CopyTo
// returns. `CloneTo` is `CopyTo` (Copier.cpp:36-40); IBlueClasses.h:81-83
// still describes an older CopyTo that duplicated shared children, and is
// stale.
//
// HOW A MEMBER IS COPIED, by schema kind, following BlueVariable.cpp's arms:
//
// | kind | Carbon VarType | copy |
// |---|---|---|
// | scalars, strings, enum, path | LONG, FLOAT, CSTRING, ... | assign |
// | vectors, matrices, typedArray | FLOATARRAY, DOUBLEARRAY, INTARRAY | written into the existing buffer by SetValues' own in-place writers; a new buffer only when the destination has none of that shape |
// | model, objectRef | IROOTPTR | recursive CopyTo into a NEW object (the old one is released) |
// | struct | IROOT (embedded) | recursive CopyTo into the EXISTING object |
// | list, array of objects | IROOT BlueList + AssignTo | cleared, each item CopyTo'd (BlueListUtil.h:506-540) |
// | map of objects | IROOT BlueDict + AssignTo | cleared, each entry CopyTo'd, failures skipped (BlueDict.h:334-356) |
// | list, array, map, set of values; rawStruct | BlueStructureList + AssignTo | copied by value (BlueStructureList.h:185-195) |
//
// "UNCHANGED" IS A PER-KIND TEST. Carbon skips a member whose bytes are
// identical (`memcmp`, Copier.cpp:141-150) so that OnModified fires only for
// real changes; the skip never affects success. JavaScript has no member
// bytes. Vectors, matrices and typed arrays go through the same in-place
// writers SetValues uses, which report whether anything changed; scalars
// compare with `Object.is`, object references by identity, and containers
// match only when both are empty - two distinct containers' bytes match in
// Carbon only then.
import * as CcpLog from "../logging/ccpLog.js";
import { CjsSchema, carbon, impl } from "#schema";
import { cloneCarbonValue, coerceCarbonMathInto, coerceCarbonTypedArrayInto } from "../schema/types/index.js";
import { ICopier } from "./ICopier.js";
import { mappedInterfaces } from "../compose/interface.js";

const { OverrideResult } = ICopier;

const OBJECT_KINDS = new Set([ "model", "objectRef" ]);
const CONTAINER_KINDS = new Set([ "list", "array", "map", "set" ]);


/** `Copier` - Blue's object copy mechanism, per blueexposure/Copier.cpp. */
export class Copier extends ICopier
{
  /** m_override: the copy-override callback, or null. */
  _override = null;

  /** m_postCopy: the post-copy callback, or null. */
  _postCopy = null;

  /** mLevel: the recursion depth of the CopyTo in progress. */
  _level = 0;

  /** mPointers: source to destination for the current copy, created on first use. */
  _pointers = null;

  /**
   * Installs the copy-override callback (Copier.cpp:24-28). It receives the
   * source and the requested destination (null to create one), and returns
   * `{ result, dest }`: SUCCESS with the object to use, FAILURE, or FALLBACK
   * to let the copier copy it.
   *
   * Adapted: Carbon passes a C callback and a void* context; a JavaScript
   * closure carries its own context, and the callback returns
   * `{ result, dest }` in place of an out-pointer.
   *
   * @param {((source: object, dest: object|null, copier: Copier) => {result: number, dest?: object|null})|null} copyOverride
   */
  SetCopyOverrideCallback(copyOverride)
  {
    this._override = copyOverride;
  }

  /**
   * Installs the post-copy callback (Copier.cpp:30-34), called with the source
   * and the destination after every successful copy, nested ones included.
   *
   * Adapted: Carbon passes a C callback and a void* context; a JavaScript
   * closure carries its own context.
   *
   * @param {((source: object, dest: object, copier: Copier) => void)|null} postCopy
   */
  SetPostCopyCallback(postCopy)
  {
    this._postCopy = postCopy;
  }

  /**
   * Copies `source` into `dest`, or into a new instance of its class when
   * `dest` is null (Copier.cpp:46-120).
   *
   * Adapted: Carbon returns bool and writes the destination through an
   * IRoot**; JavaScript returns the destination or null, as the Python CopyTo
   * returns the copy. Generic lists require an existing, equally configured
   * destination: JavaScript template arguments are instance data, not a
   * registered native class that can be constructed without arguments. The
   * outer operation releases its memo on failure or exception as well as
   * success, so a later call cannot reuse a partially copied graph.
   *
   * @param {object} source The object to copy.
   * @param {object|null} [dest=null] An existing object of the same class, or null.
   * @returns {object|null} The destination, or null when the copy failed.
   */
  CopyTo(source, dest = null)
  {
    if (this._override)
    {
      const outcome = this._override(source, dest, this);
      if (outcome?.result === OverrideResult.SUCCESS) return outcome.dest ?? dest;
      if (outcome?.result === OverrideResult.FAILURE) return null;
    }

    const sourceIsList = Copier._isList(source);
    if ((sourceIsList || Copier._isList(dest)) && !Copier._sameListType(source, dest)) return null;

    const className = CjsSchema.getClassName(source.constructor);
    let target = dest;

    if (!target)
    {
      const existing = this._pointers?.get(source);
      if (existing) return existing;

      target = className ? CjsSchema.GetConstructor(className) : null;
      target = target ? new target() : null;
      if (!target) return null;

      // Recorded before recursing, so shared children and cycles resolve here.
      (this._pointers ??= new Map()).set(source, target);
    }
    else if (!sourceIsList && CjsSchema.getClassName(target.constructor) !== className)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("blue"), "%s", `In CopyTo, 'source' and 'dest' must be of same type. Source is ${className}, dest is ${CjsSchema.getClassName(target.constructor)}`);
      return null;
    }

    this._level++;
    let result;
    try
    {
      result = this._CopyToInternal(source, target);
    }
    finally
    {
      this._level--;
      if (this._level === 0) this._pointers?.clear();
    }
    if (!result) return null;

    this._postCopy?.(source, target, this);
    return target;
  }

  /**
   * Copies preserving topology - which `CopyTo` already does (Copier.cpp:36-40).
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
    return this.CopyTo(source, dest);
  }

  /**
   * Copies every PERSIST member, then the class's custom assignment, then
   * initializes the destination (Copier.cpp:138-213).
   *
   * A mapped IInitialize suppresses per-member INotify. Otherwise every changed
   * PERSIST member is notified, without requiring NOTIFY; false aborts the copy.
   * Source ICopierCustomAssignment runs after members, and Initialize runs last.
   *
   * Adapted: native member offsets select explicit JavaScript backing keys and
   * optional indexes. Canonical members retain derived-to-base declaration order;
   * live properties are not storage, and their accessors are never invoked.
   */
  _CopyToInternal(source, dest)
  {
    const initialize = Copier._mapsInterface(dest.constructor, "IInitialize");
    const notify = !initialize && Copier._mapsInterface(dest.constructor, "INotify");

    // Runtime-only resources stay owned by the destination. A derived stored
    // declaration also blocks an inherited persisted route with the same name.
    const runtimeNames = new Set();
    for (const field of CjsSchema.getSchema(dest.constructor).members)
    {
      if (runtimeNames.has(field.name)) continue;
      if (field.type?.runtimeOnly === true)
      {
        runtimeNames.add(field.name);
        continue;
      }
      if (!(field.edit?.persist || field.edit?.persistOnly)) continue;

      const kind = field.type?.kind;
      const from = Copier._memberStorage(source, field).value;
      const storage = Copier._memberStorage(dest, field);
      const to = storage.value;

      // Template configuration is type identity even when both lists are empty.
      // An explicit list must never fall back to replacing its owned storage.
      if ((kind === "list" || kind === "array")
        && (Copier._isList(from) || Copier._isList(to))
        && !Copier._sameListType(from, to)) return false;

      // Buffers: SetValues' in-place writers copy AND report a change, or
      // answer null when the member is not a buffer of the declared shape.
      const written = coerceCarbonMathInto(to, from, field.type)
        ?? coerceCarbonTypedArrayInto(to, from, field.type);
      if (written === false) continue;
      if (written === null)
      {
        if (Copier._IsUnchanged(kind, from, to)) continue;
        if (!this._CopyMember(field, kind, from, to, storage)) return false;
      }

      if (notify && dest.OnModified(field.name) === false) return false;
    }

    if (Copier._mapsInterface(source.constructor, "ICopierCustomAssignment")
      && source.AssignTo(dest, this) === false) return false;

    return initialize ? dest.Initialize() !== false : true;
  }

  /** One member, by kind - the BlueVariable.cpp `Copy<VarType>` arms. */
  _CopyMember(field, kind, from, to, storage)
  {
    // Nominal IList dispatch precedes the content heuristic, including an
    // empty source whose element interface has no registered constructor.
    if ((kind === "list" || kind === "array") && Copier._isList(from))
    {
      return this._AssignList(storage, from);
    }

    if (OBJECT_KINDS.has(kind))
    {
      // Copy<IROOTPTR> (BlueVariable.cpp:417-434): the old object is released
      // first, and a NULL source FAILS the copy. That fails any copy whose
      // source cleared a member the destination still holds; it is Carbon's
      // behaviour and is kept.
      storage.target[storage.key] = null;
      if (!from) return false;
      const copy = this.CopyTo(from, null);
      if (!copy) return false;
      storage.target[storage.key] = copy;
      return true;
    }

    if (kind === "struct")
    {
      // Copy<IROOT> (BlueVariable.cpp:338-343): an embedded object is copied
      // into the one the destination already holds.
      if (!from) return false;
      const copy = this.CopyTo(from, to && typeof to === "object" ? to : null);
      if (!copy) return false;
      storage.target[storage.key] = copy;
      return true;
    }

    if (CONTAINER_KINDS.has(kind) && Copier._HoldsObjects(field.type, from))
    {
      return kind === "map"
        ? this._AssignMap(storage, from)
        : this._AssignList(storage, from);
    }

    // Copy<IROOTWEAKREF> assigns the referent (BlueVariable.cpp:869-875).
    // This preserves identity without introducing a JavaScript lifetime policy.
    storage.target[storage.key] = kind === "weakRef" ? from : cloneCarbonValue(from);
    return true;
  }

  /**
   * Dispatches configured IList storage through native custom assignment.
   * Adapted: unmigrated plain arrays retain their existing replacement path.
   */
  _AssignList(storage, from)
  {
    if (Copier._isList(from)) return this.CopyTo(from, storage.value) === storage.value;

    const items = [];
    storage.target[storage.key] = items;
    for (const item of from ?? [])
    {
      const copy = item ? this.CopyTo(item, null) : null;
      if (!copy) return false; // Carbon resizes to the items copied so far.
      items.push(copy);
    }
    return true;
  }

  /** BlueDict AssignTo (BlueDict.h:334-356): cleared, entries copied, failures skipped. */
  _AssignMap(storage, from)
  {
    const entries = new Map();
    storage.target[storage.key] = entries;
    for (const [ key, item ] of from ?? [])
    {
      const copy = item ? this.CopyTo(item, null) : null;
      if (copy) entries.set(key, copy);
    }
    return true;
  }

  /** Queries native exposure mappings by their stable declared identity. */
  static _mapsInterface(Constructor, name)
  {
    for (const Interface of mappedInterfaces(Constructor))
    {
      const identity = CjsSchema.getClassName(Interface);
      if (!identity) throw new TypeError("Copier interface mappings require a declared class identity.");
      if (identity === name) return true;
    }
    return false;
  }

  /** Queries the declared native list contract without accepting array-shaped objects. */
  static _isList(value)
  {
    return value !== null && typeof value === "object" && Copier._mapsInterface(value.constructor, "IList");
  }

  /**
   * Adapts native template-class equality for an explicitly configured list.
   * Constructor and ItemType/IID identity, optional CLSID and list-operation
   * flags must agree; observer ownership is deliberately not copied.
   * Only the source's mapped custom-assignment contract supplies the operation.
   */
  static _sameListType(source, dest)
  {
    if (!Copier._isList(source) || !Copier._isList(dest)
      || source.constructor !== dest.constructor
      || !Copier._mapsInterface(source.constructor, "ICopierCustomAssignment")) return false;
    const sourceInfo = {};
    const destInfo = {};
    source.GetInfo(sourceInfo);
    dest.GetInfo(destInfo);
    return sourceInfo.iid === destInfo.iid && sourceInfo.clsid === destInfo.clsid
      && sourceInfo.listOps === destInfo.listOps;
  }

  /** Resolves a stored member's JavaScript equivalent of its native offset. */
  static _memberStorage(instance, member)
  {
    if (member.role !== "member" || typeof member.key !== "string" || !member.key)
    {
      throw new TypeError("Copier storage requires a canonical member and JavaScript key.");
    }
    let target = instance;
    let key = member.key;
    let value = Copier._dataValue(target, key);
    if (member.index !== undefined)
    {
      if (!Number.isInteger(member.index) || member.index < 0)
      {
        throw new TypeError(`Copier member ${member.name} has an invalid storage index.`);
      }
      if (!Array.isArray(value) && !(ArrayBuffer.isView(value) && !(value instanceof DataView)))
      {
        throw new TypeError(`Copier member ${member.name} requires existing indexed storage.`);
      }
      if (member.index >= value.length)
      {
        throw new RangeError(`Copier member ${member.name} exceeds its indexed storage length.`);
      }
      target = value;
      key = member.index;
      value = Copier._dataValue(target, key);
    }
    return { target, key, value };
  }

  /** Reads data through the prototype chain without executing an accessor. */
  static _dataValue(target, key)
  {
    for (let current = target; current !== null; current = Object.getPrototypeOf(current))
    {
      const descriptor = Object.getOwnPropertyDescriptor(current, key);
      if (!descriptor) continue;
      if (!Object.hasOwn(descriptor, "value"))
      {
        throw new TypeError(`Copier storage ${String(key)} is an accessor; declare its backing key.`);
      }
      return descriptor.value;
    }
    return undefined;
  }

  /** The `memcmp` skip (Copier.cpp:171-181), asked per kind. */
  static _IsUnchanged(kind, from, to)
  {
    if (Object.is(from, to)) return true;
    if (CONTAINER_KINDS.has(kind))
    {
      return Copier._IsEmpty(from) && Copier._IsEmpty(to);
    }
    return false;
  }

  /**
   * Treats nullish values as empty and otherwise checks length, then size,
   * defaulting to zero.
   */
  static _IsEmpty(value)
  {
    if (value == null) return true;
    return (value.length ?? value.size ?? 0) === 0;
  }

  /**
   * Whether a container holds objects, not values. Carbon's member type says
   * so: a BlueList of IRoot pointers copies every item through the copier
   * (BlueListUtil.h:507-540), whatever interface it is typed by. Here the
   * declared item class may be an interface nothing registers
   * (`ITr2ValueBinding`, `ITriFunction`), so the items themselves decide
   * when the declaration cannot.
   */
  static _HoldsObjects(type, items)
  {
    const item = type?.valueType ?? type?.itemType;
    if (typeof item === "string" && CjsSchema.GetConstructor(item) !== null) return true;
    if (OBJECT_KINDS.has(item?.kind) || item?.kind === "struct") return true;
    for (const value of (items instanceof Map ? items.values() : items) ?? [])
    {
      if (value && typeof value === "object" && CjsSchema.getClassName(value.constructor) !== null) return true;
    }
    return false;
  }
}

CjsSchema.define(Copier, {
  className: "Copier",
  carbon: "Copier",
  family: "blue",
  fields: {},
  methods: {
    SetCopyOverrideCallback: [ carbon.method, impl.adapted ],
    SetPostCopyCallback: [ carbon.method, impl.adapted ],
    CopyTo: [ carbon.method, impl.adapted ],
    CloneTo: [ carbon.method, impl.adapted ],
    _CopyToInternal: [ impl.adapted ]
  }
});
