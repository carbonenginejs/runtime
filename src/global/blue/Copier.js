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
import { CjsSchema, carbon, impl } from "#schema";
import { cloneCarbonValue, coerceCarbonMathInto, coerceCarbonTypedArrayInto } from "../schema/types/index.js";
import { ICopier } from "./ICopier.js";

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
    else if (CjsSchema.getClassName(target.constructor) !== className)
    {
      // Carbon: CCP_LOGERR("In CopyTo, 'source' and 'dest must be of same type...").
      console.error(
        `In CopyTo, 'source' and 'dest' must be of same type. Source is ${className}, dest is ${CjsSchema.getClassName(target.constructor)}`
      );
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
    }
    if (!result) return null;

    if (this._level === 0) this._pointers?.clear();

    this._postCopy?.(source, target, this);
    return target;
  }

  /**
   * Copies preserving topology - which `CopyTo` already does (Copier.cpp:36-40).
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
   * initializes the destination (Copier.cpp:124-213).
   *
   * A destination that implements `Initialize` gets no per-member
   * `OnModified`; one that does not is notified for each member that changed.
   */
  _CopyToInternal(source, dest)
  {
    const initialize = typeof dest.Initialize === "function";
    const notify = !initialize && typeof dest.OnModified === "function";

    for (const field of CjsSchema.getSchema(dest.constructor).fields)
    {
      if (!(field.edit?.persist || field.edit?.persistOnly)) continue;

      const kind = field.type?.kind;
      const from = source[field.name];
      const to = dest[field.name];

      // Buffers: SetValues' in-place writers copy AND report a change, or
      // answer null when the member is not a buffer of the declared shape.
      const written = coerceCarbonMathInto(to, from, field.type)
        ?? coerceCarbonTypedArrayInto(to, from, field.type);
      if (written === false) continue;
      if (written === null)
      {
        if (Copier.#IsUnchanged(kind, from, to)) continue;
        if (!this._CopyMember(field, kind, from, to, dest)) return false;
      }

      if (notify && dest.OnModified(field.name) === false) return false;
    }

    if (typeof source.AssignTo === "function" && source.AssignTo(dest, this) === false) return false;

    return initialize ? dest.Initialize() !== false : true;
  }

  /** One member, by kind - the BlueVariable.cpp `Copy<VarType>` arms. */
  _CopyMember(field, kind, from, to, dest)
  {
    if (OBJECT_KINDS.has(kind))
    {
      // Copy<IROOTPTR> (BlueVariable.cpp:417-434): the old object is released
      // first, and a NULL source FAILS the copy. That fails any copy whose
      // source cleared a member the destination still holds; it is Carbon's
      // behaviour and is kept.
      dest[field.name] = null;
      if (!from) return false;
      const copy = this.CopyTo(from, null);
      if (!copy) return false;
      dest[field.name] = copy;
      return true;
    }

    if (kind === "struct")
    {
      // Copy<IROOT> (BlueVariable.cpp:338-343): an embedded object is copied
      // into the one the destination already holds.
      if (!from) return false;
      const copy = this.CopyTo(from, to && typeof to === "object" ? to : null);
      if (!copy) return false;
      dest[field.name] = copy;
      return true;
    }

    if (CONTAINER_KINDS.has(kind) && Copier.#HoldsObjects(field.type))
    {
      return kind === "map"
        ? this._AssignMap(field, from, dest)
        : this._AssignList(field, from, dest);
    }

    dest[field.name] = cloneCarbonValue(from);
    return true;
  }

  /** BlueList AssignTo (BlueListUtil.h:506-540): cleared, then every item copied. */
  _AssignList(field, from, dest)
  {
    const items = [];
    dest[field.name] = items;
    for (const item of from ?? [])
    {
      const copy = item ? this.CopyTo(item, null) : null;
      if (!copy) return false; // Carbon resizes to the items copied so far.
      items.push(copy);
    }
    return true;
  }

  /** BlueDict AssignTo (BlueDict.h:334-356): cleared, entries copied, failures skipped. */
  _AssignMap(field, from, dest)
  {
    const entries = new Map();
    dest[field.name] = entries;
    for (const [ key, item ] of from ?? [])
    {
      const copy = item ? this.CopyTo(item, null) : null;
      if (copy) entries.set(key, copy);
    }
    return true;
  }

  /** The `memcmp` skip (Copier.cpp:141-150), asked per kind. */
  static #IsUnchanged(kind, from, to)
  {
    if (Object.is(from, to)) return true;
    if (CONTAINER_KINDS.has(kind))
    {
      return Copier.#IsEmpty(from) && Copier.#IsEmpty(to);
    }
    return false;
  }

  static #IsEmpty(value)
  {
    if (value == null) return true;
    return (value.length ?? value.size ?? 0) === 0;
  }

  /** Whether a container's declared items are objects, not values. */
  static #HoldsObjects(type)
  {
    const item = type?.valueType ?? type?.itemType;
    if (typeof item === "string") return CjsSchema.GetConstructor(item) !== null;
    return OBJECT_KINDS.has(item?.kind) || item?.kind === "struct";
  }
}

CjsSchema.define(Copier, {
  className: "Copier",
  carbon: "Copier",
  family: "blue",
  fields: {},
  methods: {
    SetCopyOverrideCallback: [ carbon.method, impl.adapted, impl.reason("Carbon passes a C callback and a void* context; a JavaScript closure carries its own context, and the callback returns { result, dest } in place of an out-pointer.") ],
    SetPostCopyCallback: [ carbon.method, impl.adapted, impl.reason("Carbon passes a C callback and a void* context; a JavaScript closure carries its own context.") ],
    CopyTo: [ carbon.method, impl.adapted, impl.reason("Carbon returns bool and writes the destination through an IRoot**; JavaScript returns the destination or null, as the Python CopyTo returns the copy.") ],
    CloneTo: [ carbon.method, impl.adapted, impl.reason("Carbon returns bool and writes the destination through an IRoot**; JavaScript returns the destination or null.") ]
  }
});
