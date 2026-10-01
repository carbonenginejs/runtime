// Source: blue/src/DictReader.h
// Source: blue/src/DictReader.cpp
// Source: blue/src/YamlReader.cpp (anchors: ExtractAnchorFromMappingStart, ReadIRootClass)
// Source: blue/src/BlackReader.cpp (Initialize after an object's members, :394-403)
//
// Blue's dictionary reader: builds objects from, and reads values into
// objects from, a plain dictionary - the values bag every `SetValues` and
// `from` takes. With `DictWriter` it is the values engine; `CjsModel.get`/`set`
// delegate to the pair.
//
// OUR SPELLING OF BLUE'S DOCUMENT. Carbon's dictionary names its class under
// `type`, and YAML marks shared objects with anchors and aliases. Our bag
// spells these `_type`, `_id` and `{ _ref }` (the interchange contract,
// `docs/specifications/model-values-interchange.md`, Reserved metadata). They
// are read exactly where Carbon reads the originals.
//
// WHAT FOLLOWS CARBON:
// - keys are the SOURCE's, walked in order (`ReadMembers`, :147-186), and a key
//   naming no member throws `InvalidAttributeException`;
// - an object pointer member takes an anchored object, or a new one of the
//   class the bag names (or the member declares) - `ReadIRootClass`;
// - an embedded (struct) member is read into the object it already holds;
// - a new object has its members read and then `Initialize` called, before
//   the next object is read (:79-88): children before parents, in order;
// - an object with `Initialize` receives no `OnModified` during the read; one
//   without receives `OnModified(member)` after each NOTIFY member (:151-158).
//
// WHAT DOES NOT, declared (see the research page `blue-values-engine.md`):
// - `_id` registers BEFORE the object's members are read, and a `{ _ref }` to
//   an id not yet read resolves when the outermost read ends. Carbon registers
//   an anchor after the object is read (YamlReader.cpp:1033-1036) and throws
//   on a cycle (DictReader.cpp:337-341); our interchange contract and clone's
//   topology rule need cycles, self-references and forward references.
// - A class with its own `from` builds through it: that static is the class's
//   factory here, as `BeClasses->CreateInstance` is Carbon's, and several
//   classes normalize their values in it.
// - `from` knows its class, so a root `_type` is optional.
import { CjsSchema, impl } from "#schema";
import { normalizeCarbonValue } from "../schema/types/index.js";
import { IRootReaderBase } from "./IRootReaderBase.js";
import { IRootReaderException } from "./IRootReaderException.js";
import { BeObjectMetadata } from "./BlueObjectMetadata.js";
import { BLUE_OBJECT_METADATA_KEY } from "./IBlueObjectMetadata.js";
import { readDictionaryValue, writeDictionaryValue } from "./dictionaryDeclarations.js";

/** Keys the reader consumes itself rather than as members (Carbon's `type`, plus the anchor keys). */
const RESERVED_KEYS = new Set([ "_type", "_id", "_ref" ]);


/**
 * `DictReader` - reads plain dictionaries into Blue objects.
 */
export class DictReader extends IRootReaderBase
{
  /** m_doInitialize: whether a new object has `Initialize` called after its members. */
  _doInitialize = true;

  /** m_currentSource: the value being read. */
  _currentSource = null;

  /** m_contextStack: member names from the root, for error messages. */
  _contextStack = [];

  /**
   * m_anchorClassMap: `_id` to object for the outermost read, with the
   * `{ _ref }`s waiting for an id not yet read. A caller building several
   * objects as one graph passes its own through `options.importContext`.
   */
  _anchors = null;

  /** Whether this read created `_anchors` and so resolves its waiting references. */
  _ownsAnchors = false;

  /** Options passed to a class's own `from` when it builds a child. */
  _options = {};

  /**
   * @param {object} [options] `importContext` to share an anchor table across
   *   reads; anything else is passed to a class's own `from`.
   */
  constructor(options = {})
  {
    super();
    this._options = options;
    this._anchors = options.importContext ?? CreateAnchorTable();
    this._ownsAnchors = !options.importContext;
  }

  /**
   * Builds an object from a dictionary (`CreateObject`, DictReader.cpp:17-32).
   *
   * @param {object} source A values bag.
   * @param {Function|null} [Constructor] The class to build when the bag names none.
   * @returns {object} The new object.
   */
  CreateObject(source, Constructor = null)
  {
    this._contextStack.push("CreateObject");
    this._currentSource = source;
    try
    {
      const instance = this._CreateObjectInternal(Constructor);
      this._Finish();
      return instance;
    }
    finally
    {
      this._CleanupAfterCreate();
    }
  }

  /**
   * Reads a dictionary into an existing object: `ReadIRoot` for an object the
   * caller already holds, without the `Initialize` a reader gives an object it
   * built. `SetValues` is this.
   *
   * Adapted: Carbon reads into an existing object only as an embedded member;
   * `SetValues` does it at the root, so the root's `_type` may name the class
   * or a base, `_id` registers the object, and the changed members come back.
   *
   * @param {object} instance The object.
   * @param {object} source A values bag.
   * @param {object|null} notify The INotify told of NOTIFY members, or null.
   * @returns {Set<string>} The members whose values changed.
   */
  ReadInto(instance, source, notify)
  {
    this._currentSource = source;
    try
    {
      if (typeof source._type === "string" && !CjsSchema.isInstanceOf(source._type, instance))
      {
        this._ThrowError(`Values with _type "${source._type}" cannot apply to a ${CjsSchema.getClassName(instance.constructor) ?? "value"}`);
      }
      if (source._id !== undefined && source._id !== null) this._anchors.register(source._id, instance);

      const changed = this.ReadMembers(instance, notify);
      this._Finish();
      return changed;
    }
    finally
    {
      this._currentSource = null;
      this._contextStack.length = 0;
    }
  }

  /**
   * Builds the object the current source describes (`CreateObjectInternal`,
   * :34-90): the class the bag names, else the declared one; members read, then
   * `Initialize`.
   */
  _CreateObjectInternal(Declared)
  {
    const source = this._currentSource;
    if (!IsPlainObject(source)) this._ThrowError("Expected a dictionary");

    const Constructor = this._ResolveClass(source._type, Declared);
    this._contextStack[this._contextStack.length - 1] += `(${CjsSchema.getClassName(Constructor)})`;

    // A class's own `from` is its factory; it reads through a reader sharing
    // this one's anchors.
    if (typeof Constructor.from === "function")
    {
      return Constructor.from(source, { ...this._options, importContext: this._anchors });
    }

    const instance = new Constructor();
    if (source._id !== undefined && source._id !== null) this._anchors.register(source._id, instance);

    const notify = typeof instance.Initialize === "function" ? null : instance;
    this.ReadMembers(instance, typeof notify?.OnModified === "function" ? notify : null);

    if (this._doInitialize && typeof instance.Initialize === "function") instance.Initialize();
    return instance;
  }

  /**
   * Reads every key of the current source into the object (`ReadMembers`,
   * :147-186), skipping the reserved keys.
   *
   * @param {object} instance The object.
   * @param {object|null} notify The INotify to tell, or null.
   * @returns {Set<string>} The members whose values changed.
   */
  ReadMembers(instance, notify)
  {
    const source = this._currentSource;
    const changed = new Set();

    for (const name of Object.keys(source))
    {
      if (RESERVED_KEYS.has(name)) continue;
      if (name === BLUE_OBJECT_METADATA_KEY)
      {
        this.ReadMetadata(instance, source[name]);
        continue;
      }

      this._currentSource = source[name];
      this._contextStack.push(name);
      if (this.HandleAttribute(name, instance, notify)) changed.add(name);
      this._contextStack.pop();
    }

    this._currentSource = source;
    return changed;
  }

  /**
   * Reads an object's metadata dictionary into `BeObjectMetadata`
   * (`ReadMetadata`, :188-213): string keys to string values.
   *
   * @param {object} owner The object.
   * @param {object} metadata The dictionary.
   */
  ReadMetadata(owner, metadata)
  {
    if (!IsPlainObject(metadata)) this._ThrowError("Expected a dictionary");

    for (const [ key, value ] of Object.entries(metadata))
    {
      if (typeof value !== "string") this._ThrowError("Expected strings in metadata");
      BeObjectMetadata.Set(owner, key, value);
    }
  }

  /** Whether the current source is a live object of a registered class. */
  IsObjectSource()
  {
    const source = this._currentSource;
    return source !== null && typeof source === "object" && !IsPlainObject(source)
      && CjsSchema.getClassName(source.constructor) !== null;
  }

  /** Whether the current source is a bag naming its class. */
  IsTypedSource()
  {
    return IsPlainObject(this._currentSource) && typeof this._currentSource._type === "string";
  }

  /** Whether the current source is a `{ _ref }` alias. */
  IsReferenceSource()
  {
    return IsReference(this._currentSource);
  }

  /** `ReadValue`: the current source value, as the member's kind normalizes it. */
  ReadValue()
  {
    return this._currentSource;
  }

  /**
   * Whether a value's plain records hold an alias or a `_type` bag anywhere
   * below its top level. Carbon's typed members cannot nest objects in a
   * value; ours can (a raw struct's records, `Tr2EffectPassParameters.stageInput`),
   * and the writer anchors every object it reaches.
   */
  HasNestedObjects(value)
  {
    if (Array.isArray(value)) return value.some(item => IsObjectItem(item) || this.HasNestedObjects(item));
    if (!IsPlainObject(value)) return false;
    for (const key in value)
    {
      const item = value[key];
      if (item && typeof item === "object" && (IsObjectItem(item) || this.HasNestedObjects(item))) return true;
    }
    return false;
  }

  /**
   * A value with objects in its records, rebuilt with each alias resolved (or
   * filled at the end of the read) and each `_type` bag built - registering
   * its `_id` - as a list item is. Live objects are kept.
   */
  ReadNestedObjects(value)
  {
    if (Array.isArray(value))
    {
      const list = new Array(value.length);
      for (let i = 0; i < value.length; i++) list[i] = this._ReadNestedItem(value[i], list, i);
      return list;
    }
    const record = {};
    for (const key of Object.keys(value)) record[key] = this._ReadNestedItem(value[key], record, key);
    return record;
  }

  /** One slot of a nested value: an alias, a `_type` bag, a record to descend, or a value. */
  _ReadNestedItem(item, container, key)
  {
    if (IsReference(item))
    {
      const resolved = this._anchors.byId.get(item._ref);
      if (resolved !== undefined) return resolved;
      this._anchors.defer(item._ref, object => { container[key] = object; });
      return null;
    }
    if (IsPlainObject(item) && typeof item._type === "string")
    {
      const saved = this._currentSource;
      this._currentSource = item;
      try
      {
        return this.ReadIRootClass(null, null);
      }
      finally
      {
        this._currentSource = saved;
      }
    }
    if ((Array.isArray(item) || IsPlainObject(item)) && this.HasNestedObjects(item)) return this.ReadNestedObjects(item);
    return item;
  }

  /**
   * An object pointer member (`HandlePropertyIRootPtr`, IRootReader.cpp:223-245):
   * null, an anchored object, a live object assigned as a reference, or a new
   * object from a dictionary.
   *
   * @returns {boolean} Whether the member changed.
   */
  ReadIRootPtr(instance, field)
  {
    const source = this._currentSource;
    const current = readDictionaryValue(instance, field);

    if (source === null || source === undefined)
    {
      writeDictionaryValue(instance, field, null);
      return current !== null && current !== undefined;
    }
    if (IsReference(source))
    {
      const resolved = this._anchors.byId.get(source._ref);
      if (resolved === undefined)
      {
        this._anchors.defer(source._ref, object => { writeDictionaryValue(instance, field, object); });
        return true;
      }
      writeDictionaryValue(instance, field, resolved);
      return resolved !== current;
    }
    // A non-plain object in an object member is a reference to it (values
    // transport ruling 3, 2026-09-14): the declared type decides, not the value.
    if (typeof source === "object" && !IsPlainObject(source) && !Array.isArray(source) && !ArrayBuffer.isView(source))
    {
      writeDictionaryValue(instance, field, source);
      return source !== current;
    }

    // A scalar or list is not an object (IRootReader.cpp:229).
    if (!IsPlainObject(source)) this._ThrowError("Incorrect type for member");

    const created = this.ReadIRootClass(field);
    writeDictionaryValue(instance, field, created);
    return true;
  }

  /**
   * An embedded object member read into the object it holds (`ReadIRoot`,
   * :92-145). A live object of the member's class is copied by its values.
   *
   * @returns {boolean} Whether the member changed.
   */
  ReadIRoot(current, field)
  {
    let source = this._currentSource;
    if (source === null || source === undefined) return false;

    if (!IsPlainObject(source))
    {
      if (typeof source !== "object" || Array.isArray(source) || ArrayBuffer.isView(source))
      {
        this._ThrowError(`${field.name} requires an object value for struct ${field.type.className ?? ""}`);
      }
      source = CjsSchema.getValues(source);
    }
    if (typeof source._type === "string" && !CjsSchema.isInstanceOf(source._type, current))
    {
      this._ThrowError(`Expected type '${CjsSchema.getClassName(current.constructor)}' but got object of type '${source._type}'`);
    }

    // The embedded object reads through its own SetValues when it has one,
    // sharing this read's anchors.
    if (typeof current.SetValues === "function")
    {
      const result = current.SetValues(source, { ...this._options, importContext: this._anchors });
      return result instanceof Set ? result.size > 0 : result === true;
    }

    const saved = this._currentSource;
    this._currentSource = source;
    const changed = this.ReadMembers(current, typeof current.OnModified === "function" ? current : null);
    this._currentSource = saved;
    return changed.size > 0;
  }

  /**
   * Builds the object the current source describes for a member or list item
   * (`ReadIRootClass`, :329-352).
   *
   * @param {object|null} field The member, whose declared class is the fallback.
   * @param {string|null} [itemClassName] A list's declared item class.
   * @returns {object} The new object.
   */
  ReadIRootClass(field, itemClassName = null)
  {
    const declared = itemClassName ?? field?.type?.className ?? null;
    const Declared = declared ? CjsSchema.GetConstructor(declared) : null;
    return this._CreateObjectInternal(Declared);
  }

  /**
   * A list member (`ReadList`, :354-393). A list of objects builds each item as
   * `ReadIRootClass` does; a list of values is read by value.
   *
   * Adapted: the member's list is refilled in place, as `Remove( -1 )` then
   * `Append` does, and a null item is kept rather than skipped, which our
   * values contract allows.
   *
   * @returns {boolean} Whether the list changed.
   */
  ReadList(instance, field)
  {
    const source = this._currentSource;
    const current = readDictionaryValue(instance, field);

    if (source === null || source === undefined)
    {
      writeDictionaryValue(instance, field, normalizeCarbonValue(source, field.type));
      return current !== readDictionaryValue(instance, field);
    }
    if (!Array.isArray(source)) this._ThrowError("Expected a list");

    const itemType = field.type.itemType;
    const itemClassName = typeof itemType === "string" ? itemType : itemType?.className ?? null;
    // A list typed by an interface nothing registers (`ITr2ValueBinding`) still
    // holds objects when its items say so: an alias, a `_type` bag, or a live
    // object, which the value path would clone into a plain one.
    const holdsObjects = (itemClassName && CjsSchema.GetConstructor(itemClassName)) || source.some(IsObjectItem);

    if (!holdsObjects)
    {
      const next = normalizeCarbonValue(source, field.type);
      writeDictionaryValue(instance, field, next);
      return !IRootReaderBase.areEquivalent(current, next);
    }

    // Refilled in place, as Remove( -1 ) then Append; the old items are kept
    // aside only to report whether anything changed.
    const inPlace = Array.isArray(current) && current !== source;
    const list = inPlace ? current : [];
    const before = inPlace ? current.slice() : current;
    list.length = source.length;

    const parent = this._contextStack.pop() ?? field.name;
    for (let i = 0; i < source.length; i++)
    {
      this._contextStack.push(`${parent} [${i}]`);
      list[i] = this._ReadListItem(source[i], itemClassName, list, i);
      this._contextStack.pop();
    }
    this._contextStack.push(parent);
    this._currentSource = source;

    if (!inPlace) writeDictionaryValue(instance, field, list);
    return !IRootReaderBase.areEquivalent(before, list);
  }

  /** One list item: null, an anchored object, a live object, or a new one. */
  _ReadListItem(item, itemClassName, list, index)
  {
    if (item === null || item === undefined) return item;
    if (IsReference(item))
    {
      const resolved = this._anchors.byId.get(item._ref);
      if (resolved !== undefined) return resolved;
      this._anchors.defer(item._ref, object => { list[index] = object; });
      return null;
    }
    if (!IsPlainObject(item)) return item;

    this._currentSource = item;
    return this.ReadIRootClass(null, itemClassName);
  }

  /** The class a dictionary names, else the declared one; throws when there is neither. */
  _ResolveClass(typeName, Declared)
  {
    if (typeof typeName === "string")
    {
      const Named = CjsSchema.GetConstructor(typeName);
      if (!Named) this._ThrowError(`Type '${typeName}' not found in the Blue class registry`);
      return Named;
    }
    if (typeof Declared === "function") return Declared;
    this._ThrowError("Dictionary must have a '_type' item");
  }

  /** The end of an outermost read: every waiting `{ _ref }` resolves, or the read fails. */
  _Finish()
  {
    if (this._ownsAnchors) this._anchors.finalize();
  }

  /** `CleanupAfterCreate` (:600-605). */
  _CleanupAfterCreate()
  {
    this._contextStack.length = 0;
    this._currentSource = null;
  }

  /** `ThrowError` (:584-598): the message, prefixed with the member path. */
  _ThrowError(message)
  {
    const path = this._contextStack.map(entry => `\t${entry}\n`).join("");
    throw new IRootReaderException(`${path}${message}`);
  }
}


/**
 * An anchor table: `_id` to object, and the `{ _ref }`s waiting for an id.
 * `CjsModel`'s import context is a superset of this shape.
 */
export function CreateAnchorTable()
{
  const byId = new Map();
  const pending = [];

  return {
    byId,
    register(id, instance)
    {
      const existing = byId.get(id);
      if (existing === instance) return;
      if (existing !== undefined) throw new IRootReaderException(`Duplicate _id ${JSON.stringify(id)} in imported values.`);
      byId.set(id, instance);
    },
    defer(id, assign)
    {
      pending.push({ id, assign });
    },
    finalize()
    {
      const unresolved = new Set();
      for (const entry of pending)
      {
        const instance = byId.get(entry.id);
        if (instance === undefined) unresolved.add(entry.id);
        else entry.assign(instance);
      }
      pending.length = 0;
      if (unresolved.size)
      {
        throw new IRootReaderException(`Unresolved _ref ids: ${Array.from(unresolved, id => JSON.stringify(id)).join(", ")}. Every { _ref } must match a { _id } in the same import operation.`);
      }
    }
  };
}

/** Whether a value is a `{ _ref }` alias. */
function IsReference(value)
{
  return IsPlainObject(value) && value._ref !== undefined;
}

/** Whether a list item is an object: an alias, a `_type` bag, or a live object of a registered class. */
function IsObjectItem(item)
{
  if (IsPlainObject(item)) return item._ref !== undefined || typeof item._type === "string";
  return item !== null && typeof item === "object" && CjsSchema.getClassName(item.constructor) !== null;
}

/** Whether a value is a plain dictionary. */
function IsPlainObject(value)
{
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

CjsSchema.define(DictReader, { className: "DictReader", carbon: "DictReader" });
CjsSchema.decorateMethod(DictReader, "CreateObject", impl.adapted);
CjsSchema.decorateMethod(DictReader, "ReadInto", impl.custom);
CjsSchema.decorateMethod(DictReader, "ReadList", impl.adapted);
