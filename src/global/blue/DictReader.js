// Source: blue/src/DictReader.h
// Source: blue/src/DictReader.cpp
// Source: blue/src/YamlReader.cpp (anchors: ExtractAnchorFromMappingStart, ReadIRootClass)
// Source: blue/src/BlackReader.cpp (Initialize after an object's members, :394-403)
//
// Blue's dictionary reader: builds objects from, and reads values into
// objects from, a plain dictionary - the values bag every `SetValues` and
// `from` takes. CjsSchema routes values operations to this reader and DictWriter.
//
// OUR SPELLING OF BLUE'S DOCUMENT. Carbon's dictionary names its class under
// `type`, and YAML marks shared objects with anchors and aliases. Our bag
// spells these `_type`, `_id` and `{ _ref }` (the interchange's reserved
// metadata keys). They
// are read exactly where Carbon reads the originals.
//
// WHAT FOLLOWS CARBON:
// - keys are the SOURCE's, walked in order (`ReadMembers`, :147-186), and a key
//   naming no member throws `InvalidAttributeException`;
// - an object pointer member takes an anchored object, or a new one of the
//   class the bag names (or the member declares) - `ReadIRootClass`;
// - an embedded (struct) member is read into the object it already holds;
// - mapped IInitialize suppresses member notifications; otherwise mapped
//   INotify receives OnModified(member) for NOTIFY members (:151-158).
//
// WHAT DOES NOT, declared (see the research page `blue-values-engine.md`):
// - completion waits until shared references resolve, then initializes newly
//   created dependencies before their parents (rather than during recursion).
// - `_id` registers BEFORE the object's members are read, and a `{ _ref }` to
//   an id not yet read resolves when the outermost read ends. Carbon registers
//   an anchor after the object is read (YamlReader.cpp:1033-1036) and throws
//   on a cycle (DictReader.cpp:337-341); our interchange contract and clone's
//   topology rule need cycles, self-references and forward references.
// - A class with its own `from` builds through it: that static is the class's
//   factory here, as `BeClasses->CreateInstance` is Carbon's, and several
//   classes normalize their values in it.
// - `from` knows its class, so a root `_type` is optional.
//
// DECLARED OPERATIONS. `declarations: true` selects exact Blue registration
// factories and canonical member population, without class values helpers.
// Each public operation owns fresh anchors. After references resolve, mapped
// IInitialize runs once on its factory results, dependencies first. Existing
// roots, embedded storage and supplied live objects remain borrowed.
import { CjsSchema, meta } from "#schema";
import { omitRuntimeValues } from "../schema/CjsSchema.js";
import { normalizeCarbonValue } from "../schema/types/index.js";
import { IRootReaderBase } from "./IRootReaderBase.js";
import { IRootReaderException } from "./IRootReaderException.js";
import { BeObjectMetadata } from "./BlueObjectMetadata.js";
import { BLUE_OBJECT_METADATA_KEY } from "./IBlueObjectMetadata.js";
import { getDictionaryDeclarations, readDictionaryValue, writeDictionaryValue } from "./dictionaryDeclarations.js";
import { getClassRegistration } from "./classes/registry.js";
// Exposure is read from the table directly, not through be.classes: the standalone
// format readers import this file and must load without the blue singleton
// (test/resource/format-standalone.test.js). Carbon's DictReader has no IList query.
import { mappedInterfaces } from "../compose/interface.js";
import { finalizeReaderObject } from "../schema/hydration.js";
import { BLUELISTEVENT } from "#consts/blue";
import { IList } from "./IList.js";
import { IListNotify } from "./IListNotify.js";

/** Keys the reader consumes itself rather than as members (Carbon's `type`, plus the anchor keys). */
const RESERVED_KEYS = new Set([ "_type", "_id", "_ref" ]);

/** Pending list population by destination, so a later read can supersede it across readers. */
const PENDING_LIST_READS = new WeakMap();


/**
 * `DictReader` - reads plain dictionaries into Blue objects.
 */
export class DictReader extends IRootReaderBase
{
  /** m_doInitialize: whether the reader initializes newly allocated objects. */
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

  /** Pending populations for this reader's IList references and completion. */
  _pendingListReads = null;

  /** Optional values-service population policy, separate from native reader notifications. */
  _populate = null;

  /** Instances allocated by the current declared operation, in allocation order. */
  _created = null;

  /** Selected live properties populated by this operation, for dependency ordering. */
  _readFields = null;

  /** Set entries whose deferred references must be filled before initialization. */
  _afterReferences = null;

  /** Existing ordinary-array edits published after new dependencies initialize. */
  _listEdits = [];

  /** Per-call metadata-key matching plans; never retained on the edited graph. */
  _listPatches = null;

  /**
   * @param {object} [options] `importContext` to share an anchor table across
   *   legacy reads; anything else is passed to a class's own `from`.
   * @param {boolean} [options.declarations=false] Use isolated declaration-driven construction.
   * @param {boolean} [options.initialize=true] Initialize owned declared objects after references resolve.
   * @param {Function|null} [populate=null] Optional values-service population policy.
   */
  constructor(options = {}, populate = null)
  {
    super();
    if (options.declarations === true && options.importContext != null)
    {
      throw new TypeError("Declared dictionary reads cannot share a legacy importContext.");
    }
    this._options = options;
    this._populate = populate;
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
    this._BeginDeclaredOperation();
    this._contextStack.push("CreateObject");
    this._currentSource = source;
    try
    {
      const instance = this._CreateObjectInternal(Constructor);
      this._Finish();
      return instance;
    }
    catch (error)
    {
      this._CancelPendingListReads();
      throw error;
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
   * @param {Function|null} [onWrite=null] Optional successful root-write observer.
   * @returns {Set<string>} The members whose values changed.
   */
  ReadInto(instance, source, notify, onWrite = null)
  {
    this._BeginDeclaredOperation();
    this._currentSource = source;
    try
    {
      if (this._options.lists !== undefined && !["replace", "patch"].includes(this._options.lists))
      {
        throw new TypeError("Values lists must be 'replace' or 'patch'.");
      }
      if (this._options.lists === "patch") this._currentSource = source = this._PrepareListPatches(instance, source);
      if (this._options.declarations === true && !IsPlainObject(source)) this._ThrowError("Expected a dictionary");
      if (this._options.declarations === true && IsReference(source)) this._ThrowError("ReadInto requires member values, not a root _ref");
      if (typeof source._type === "string" && !CjsSchema.isInstanceOf(source._type, instance))
      {
        this._ThrowError(`Values with _type "${source._type}" cannot apply to a ${CjsSchema.getClassName(instance.constructor) ?? "value"}`);
      }
      if (source._id !== undefined && source._id !== null) this._anchors.register(source._id, instance);

      const changed = this.ReadMembers(instance, this._options.declarations === true ? this._DeclaredNotify(instance) : notify, onWrite);
      this._Finish();
      return changed;
    }
    catch (error)
    {
      this._CancelPendingListReads();
      throw error;
    }
    finally
    {
      this._listPatches = null;
      this._CleanupAfterCreate();
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
    if (this._options.declarations === true)
    {
      if (this.IsObjectSource()) return source;
      if (!IsPlainObject(source)) this._ThrowError("Expected a dictionary");
      if (IsReference(source)) this._ThrowError(`Unresolved root _ref ${JSON.stringify(source._ref)}`);
      const registration = this._ResolveRegistration(source._type, Declared);
      this._contextStack[this._contextStack.length - 1] += `(${registration.name})`;
      const instance = registration.createFn();
      if (!instance || typeof instance !== "object" || typeof instance.then === "function")
      {
        this._ThrowError(`Factory '${registration.name}' must return a synchronous object`);
      }
      this._created.add(instance);
      if (source._id !== undefined && source._id !== null) this._anchors.register(source._id, instance);
      this.ReadMembers(instance, this._DeclaredNotify(instance));
      return instance;
    }
    if (!IsPlainObject(source)) this._ThrowError("Expected a dictionary");
    if (IsReference(source)) this._ThrowError(`Unresolved root _ref ${JSON.stringify(source._ref)}`);

    const Constructor = this._ResolveClass(source._type, Declared);
    this._contextStack[this._contextStack.length - 1] += `(${CjsSchema.getClassName(Constructor)})`;

    // A class's own `from` is its factory; it reads through a reader sharing
    // this one's anchors.
    if (typeof Constructor.from === "function")
    {
      return Constructor.from(source, { ...this._options, importContext: this._anchors });
    }

    const instance = new Constructor();
    // Shared references resolve before each created object receives its mapped
    // native Initialize, dependencies first. Borrowed/default objects are not owned.
    this._anchors.registerCreated(instance, () =>
    {
      finalizeReaderObject(instance, { initialize: this._doInitialize && this._options.initialize !== false });
    });
    if (source._id !== undefined && source._id !== null) this._anchors.register(source._id, instance);

    const notify = this._DeclaredNotify(instance);
    const options = notify ? this._options : { ...this._options, notify: false };
    if (typeof instance.SetValues === "function")
    {
      instance.SetValues(source, { ...options, importContext: this._anchors });
    }
    else if (this._populate)
    {
      const writes = [];
      this.ReadMembers(instance, null, (field, changed) => writes.push([field, changed]));
      const complete = () => this._populate(instance, options, recordWrite =>
      {
        for (const [field, changed] of writes) recordWrite(field, changed);
      });
      if (this._anchors.hasListEdits()) this._anchors.deferValuesCompletion(complete);
      else complete();
    }
    else this.ReadMembers(instance, notify);

    return instance;
  }

  /**
   * Reads every key of the current source into the object (`ReadMembers`,
   * :147-186), skipping the reserved keys.
   *
   * @param {object} instance The object.
   * @param {object|null} notify The INotify to tell, or null.
   * @param {Function|null} [onWrite=null] Optional successful-write observer.
   * @returns {Set<string>} The members whose values changed.
   */
  ReadMembers(instance, notify, onWrite = null)
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

      // Runtime-only declarations still claim their exposed names/aliases,
      // but even reading an incoming getter would transport resource state.
      const field = this.FindEntry(name, instance.constructor);
      if (field?.type?.runtimeOnly === true) continue;

      this._currentSource = source[name];
      this._contextStack.push(name);
      const recordWrite = didChange =>
      {
        if (didChange) changed.add(name);
        if (onWrite && field && CjsSchema.isFieldWritable(field)) onWrite(field, didChange);
      };
      // Structure aliases copy by value after their source records are filled.
      // Report the settled comparison, not a guessed change for a forward ref.
      if (field?.type?.kind === "structList" && CjsSchema.isFieldWritable(field))
        this.ReadStructureList(instance, field, notify, recordWrite);
      else recordWrite(this.HandleAttribute(name, instance, notify));
      if (field && CjsSchema.isFieldWritable(field)) this._anchors.recordRead(instance, field);
      if (this._options.declarations === true && field && CjsSchema.isFieldWritable(field))
      {
        let fields = this._readFields.get(instance);
        if (!fields) this._readFields.set(instance, fields = new Set());
        fields.add(field);
      }
      this._contextStack.pop();
    }

    this._currentSource = source;
    return changed;
  }

  /**
   * Reads dictionary structure records using this operation's anchor table.
   * Adapted: our _id/_ref values can name a packed Carbon struct by its fields.
   * Resolve those fields before initialization, copying into distinct retained
   * slots rather than turning BlueStructureList storage into object pointers.
   * @param {object} instance List owner.
   * @param {object} field Structure-list declaration.
   * @param {object|null} [notify=null] Native member notification target.
   * @param {Function|null} [onRead=null] Receives the settled changed result.
   * @returns {boolean} Immediate changes; deferred changes reach onRead at finalization.
   */
  ReadStructureList(instance, field, notify = null, onRead = null)
  {
    const source = this._currentSource;
    const current = readDictionaryValue(instance, field);
    const pending = current && PENDING_LIST_READS.get(current);
    if (pending) pending.cancel();
    if (source === current)
    {
      if (notify && field.edit?.notify) notify.OnModified(field.name);
      if (onRead) onRead(false);
      return false;
    }
    const records = source ?? [];
    if (!Array.isArray(records)) this._ThrowError(`Struct list ${field.name} requires an array`);
    const className = field.type.className;
    const Item = CjsSchema.GetConstructor(className);
    if (!Item) this._ThrowError(`Struct list ${field.name}: class ${className} is not registered`);
    const list = Array.isArray(current) ? current : [];
    const anchors = this._anchors;
    let changed = list !== current || list.length !== records.length;
    const next = [], aliases = [];
    const readRecord = (item, values) =>
    {
      if (values._type !== undefined && !CjsSchema.isInstanceOf(values._type, item))
        this._ThrowError(`Struct list ${field.name} requires ${className}, not ${String(values._type)}`);
      const previous = this._currentSource;
      this._currentSource = values;
      try { if (this.ReadMembers(item, null).size) changed = true; }
      finally { this._currentSource = previous; }
    };
    for (let index = 0; index < records.length; index++)
    {
      const record = records[index];
      if (!record || typeof record !== "object" || Array.isArray(record) || ArrayBuffer.isView(record))
        this._ThrowError(`Struct list ${field.name}[${index}] requires a record`);
      const reuse = CjsSchema.isInstanceOf(className, list[index]);
      const item = reuse ? list[index] : new Item();
      if (!reuse) changed = true;
      next.push(item);
      if (IsReference(record)) aliases.push({ id: record._ref, item });
      else
      {
        const liveType = CjsSchema.getClassName(record.constructor);
        if (liveType && !CjsSchema.isInstanceOf(className, record))
          this._ThrowError(`Struct list ${field.name} requires ${className}, not ${liveType}`);
        // Flat (refs: false): this export is read into the document being read,
        // whose anchor table its own _id/_ref numbering would collide with.
        const values = liveType ? CjsSchema.getValues(record, {}, { refs: false }) : record;
        if (values._id !== undefined && values._id !== null) anchors.register(values._id, item);
        readRecord(item, values);
      }
    }
    list.length = 0;
    for (const item of next) list.push(item);
    if (list !== current) writeDictionaryValue(instance, field, list);
    const complete = () =>
    {
      if (notify && field.edit?.notify) notify.OnModified(field.name);
      if (onRead) onRead(changed);
    };
    if (!aliases.length) complete();
    else
    {
      let active = true, remaining = aliases.length;
      // A marker keeps nested values notifications behind reference resolution.
      // Actual population happens in finalize, BEFORE owner initialization.
      const cancel = () =>
      {
        active = false;
        if (PENDING_LIST_READS.get(list) === edit) PENDING_LIST_READS.delete(list);
      };
      const edit = { cancel, finish: cancel };
      PENDING_LIST_READS.set(list, edit);
      this._listEdits.push(edit);
      if (this._options.declarations !== true) anchors.deferListEdit(edit);
      for (const { id, item } of aliases) anchors.defer(id, resolved =>
      {
        if (!active) return;
        if (!CjsSchema.isInstanceOf(className, resolved))
          this._ThrowError(`Struct list ${field.name}: _ref ${JSON.stringify(id)} requires ${className}`);
        // Flat (refs: false): this export is read into the document being read,
        // whose anchor table its own _id/_ref numbering would collide with.
        const values = CjsSchema.getValues(resolved, {}, { refs: false });
        delete values._id;
        readRecord(item, values);
        if (--remaining === 0) complete();
      });
    }
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
   * @param {object} instance Destination object.
   * @param {object} field Selected reference declaration.
   * @param {object|null} [notification=null] Mapped declared-read notification to send after a deferred write.
   * @returns {boolean} Whether the member changed.
   */
  ReadIRootPtr(instance, field, notification = null)
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
        if (notification) notification.deferred = true;
        this._anchors.defer(source._ref, object =>
        {
          writeDictionaryValue(instance, field, object);
          // JavaScript forward aliases postpone the write; the native
          // write-then-NOTIFY order therefore belongs to this callback.
          if (notification) notification.target.OnModified(field.name);
        });
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

    // Editor values patch: the enclosing matched object owns this single slot.
    // Its declared object can receive values without a second provenance ID.
    if (this._options.reuseObjects === true && current
      && (source._type === undefined || CjsSchema.isInstanceOf(source._type, current)))
    {
      return CjsSchema.setValues(current, source, {
        ...this._options, useClassSetter: true, returnBoolean: true, importContext: this._anchors
      });
    }

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
    // An embedded slot retains its own identity. Declared reads do not support
    // alias-based copying into that storage, whether the alias is known or not.
    if (this._options.declarations === true && IsReference(source))
    {
      this._ThrowError(`Embedded member '${field.name}' does not support _ref aliases`);
    }

    if (!IsPlainObject(source))
    {
      if (typeof source !== "object" || Array.isArray(source) || ArrayBuffer.isView(source))
      {
        this._ThrowError(`${field.name} requires an object value for struct ${field.type.className ?? ""}`);
      }
      if (this._options.declarations === true)
      {
        const values = {};
        const metadata = BeObjectMetadata.GetMetadata(source);
        if (metadata) values[BLUE_OBJECT_METADATA_KEY] = { ...metadata };
        for (const declaration of getDictionaryDeclarations(source.constructor).fields)
        {
          if (!CjsSchema.isFieldExported(declaration)) continue;
          values[declaration.name] = readDictionaryValue(source, declaration);
        }
        source = values;
      }
      // Flat (refs: false): this export is read into the document being read,
      // whose anchor table its own _id/_ref numbering would collide with.
      else source = CjsSchema.getValues(source, {}, { refs: false });
    }
    if (typeof source._type === "string" && !CjsSchema.isInstanceOf(source._type, current))
    {
      this._ThrowError(`Expected type '${CjsSchema.getClassName(current.constructor)}' but got object of type '${source._type}'`);
    }

    // The embedded object reads through its own SetValues when it has one,
    // sharing this read's anchors.
    if (this._options.declarations !== true && typeof current.SetValues === "function")
    {
      const result = current.SetValues(source, { ...this._options, notify: this._options.notify !== false && this._DeclaredNotify(current) !== null, importContext: this._anchors });
      return result instanceof Set ? result.size > 0 : result === true;
    }

    const saved = this._currentSource;
    this._currentSource = source;
    try
    {
      if (this._options.declarations === true && source._id !== undefined && source._id !== null) this._anchors.register(source._id, current);
      const notify = this._DeclaredNotify(current);
      return this.ReadMembers(current, notify).size > 0;
    }
    finally { this._currentSource = saved; }
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
    if (this._options.declarations === true) return this._CreateObjectInternal(declared);
    const Declared = declared ? CjsSchema.GetConstructor(declared) : null;
    return this._CreateObjectInternal(Declared);
  }

  /**
   * A list member (`ReadList`, DictReader.cpp:427-475). A list of objects builds each item as
   * `ReadIRootClass` does; a list of values is read by value.
   *
   * Mapped IList destinations use their operations and observer. Ordinary JS
   * arrays on existing mapped IListNotify owners use live-edit unload/insert
   * callbacks after references and new dependencies are ready. Construction
   * retains raw population followed by Initialize. Null entries remain valid.
   *
   * @returns {boolean} Whether the list changed.
   */
  ReadList(instance, field)
  {
    const source = this._currentSource;
    const current = readDictionaryValue(instance, field);

    const patch = this._listPatches?.get(field.name);
    if (patch) return this._ReadListPatch(instance, field, current, patch);
    // Equality is a no-op check, not positional identity for changed items.
    // Changed nested lists still use their ordinary values replacement contract.
    if (this._options.reuseObjects === true && MatchesListValues(current, source)) return false;

    if (current && typeof current === "object" && mappedInterfaces(current.constructor).has(IList))
    {
      return this._ReadIList(current, field, source);
    }

    if (source === null || source === undefined)
    {
      const next = normalizeCarbonValue(source, field.type);
      const created = this._options.declarations === true ? this._created.has(instance) : this._anchors.isCreated(instance);
      const itemType = field.type.itemType;
      const itemClassName = typeof itemType === "string" || typeof itemType === "function" ? itemType : itemType?.className ?? null;
      const holdsObjects = (itemClassName && CjsSchema.GetConstructor(itemClassName))
        || (Array.isArray(current) && current.some(IsObjectItem));
      if (holdsObjects && Array.isArray(current) && !created && mappedInterfaces(instance.constructor).has(IListNotify))
      {
        this._ReadLiveList(instance, field, current, [], null, next);
        return current !== next;
      }
      writeDictionaryValue(instance, field, next);
      return current !== readDictionaryValue(instance, field);
    }
    if (!Array.isArray(source)) this._ThrowError("Expected a list");

    const itemType = field.type.itemType;
    const itemClassName = typeof itemType === "string" || typeof itemType === "function" ? itemType : itemType?.className ?? null;
    // A list typed by an interface nothing registers (`ITr2ValueBinding`) still
    // holds objects when its items say so: an alias, a `_type` bag, or a live
    // object, which the value path would clone into a plain one.
    const holdsObjects = (this._options.declarations === true && typeof itemClassName === "function")
      || (itemClassName && CjsSchema.GetConstructor(itemClassName)) || source.some(IsObjectItem)
      || (source.length === 0 && Array.isArray(current) && current.some(IsObjectItem));

    if (!holdsObjects)
    {
      const next = normalizeCarbonValue(omitRuntimeValues(source, field.type), field.type);
      writeDictionaryValue(instance, field, next);
      return !IRootReaderBase.areEquivalent(current, next);
    }

    const created = this._options.declarations === true ? this._created.has(instance) : this._anchors.isCreated(instance);
    if (Array.isArray(current) && !created && mappedInterfaces(instance.constructor).has(IListNotify))
    {
      return this._ReadLiveList(instance, field, current, source, itemClassName);
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

  /**
   * Editor extension: preflight all keys in explicitly selected root lists
   * before any writes or lifecycle work. The class supplies scope separately
   * from values. Missing keys and repeats are errors, never positional matches.
   * @param {object} instance Existing owner.
   * @param {object} source Desired values.
   * @returns {object} Only the selected root lists and root type/anchor.
   */
  _PrepareListPatches(instance, source)
  {
    const keys = this._options.listPatchKeys;
    if (!keys || this._options.declarations === true) throw new TypeError("This values operation has no list patch scope.");
    if (!IsPlainObject(source) || IsReference(source)) throw new TypeError("List patches require a values dictionary.");
    const selected = {};
    if (Object.hasOwn(source, "_type")) selected._type = source._type;
    if (Object.hasOwn(source, "_id")) selected._id = source._id;
    this._listPatches = new Map();
    for (const [name, key] of Object.entries(keys))
    {
      if (!Object.hasOwn(source, name)) continue;
      const field = this.FindEntry(name, instance.constructor);
      const current = field && readDictionaryValue(instance, field);
      const itemType = field?.type?.itemType;
      const itemClass = typeof itemType === "string" ? itemType : itemType?.className;
      const desired = source[name];
      if (!Array.isArray(current) || !Array.isArray(desired)) throw new TypeError(`Patch '${name}' requires arrays.`);
      const existing = new Map(), incoming = new Set();
      for (const item of current)
      {
        const id = BeObjectMetadata.Get(item, key);
        if (typeof id !== "string" || !id.length || existing.has(id)) throw new TypeError(`Patch '${name}' has a missing or ambiguous existing ${key}.`);
        if (!CjsSchema.isInstanceOf(itemClass, item)) throw new TypeError(`Patch '${name}' has an incompatible existing item.`);
        existing.set(id, item);
      }
      for (const item of desired)
      {
        if (!IsPlainObject(item) || IsReference(item)) throw new TypeError(`Patch '${name}' requires item values, not references.`);
        const id = BeObjectMetadata.Get(item, key);
        if (typeof id !== "string" || !id.length || incoming.has(id)) throw new TypeError(`Patch '${name}' has a missing or duplicated incoming ${key}.`);
        incoming.add(id);
        if (item._type !== undefined && (!CjsSchema.getClassNames(CjsSchema.GetConstructor(item._type)).includes(itemClass)
          || (existing.has(id) && !CjsSchema.isInstanceOf(item._type, existing.get(id)))))
        {
          throw new TypeError(`Patch '${name}' has an incompatible item type.`);
        }
      }
      this._listPatches.set(field.name, { existing, desired, key });
      selected[name] = desired;
    }
    return selected;
  }

  /**
   * Updates matches through the values service and appends additions through
   * the live list reader. Existing order and unmatched items stay intact;
   * a partial list never grants deletion or subtree replacement authority.
   * @param {object} instance List owner.
   * @param {object} field List declaration.
   * @param {Array} current Existing storage.
   * @param {object} patch Preflighted owner-local matching plan.
   * @returns {boolean} Whether object data changed.
   */
  _ReadListPatch(instance, field, current, patch)
  {
    let changed = false;
    const additions = [];
    for (const values of patch.desired)
    {
      const target = patch.existing.get(BeObjectMetadata.Get(values, patch.key));
      if (!target) { additions.push(values); continue; }
      if (CjsSchema.setValues(target, values, {
        ...this._options, lists: "replace", listPatchKeys: undefined,
        reuseObjects: true, useClassSetter: true, returnBoolean: true, importContext: this._anchors
      })) changed = true;
    }
    if (additions.length)
    {
      const staged = current.slice();
      for (const values of additions) staged.push(values);
      const itemType = field.type.itemType;
      const itemClassName = typeof itemType === "string" ? itemType : itemType?.className ?? null;
      const options = this._options;
      this._options = { ...options, lists: "replace", listPatchKeys: undefined, useClassSetter: true };
      try { this._ReadLiveList(instance, field, current, staged, itemClassName); }
      finally { this._options = options; }
      changed = true;
    }
    return changed;
  }

  /**
   * Values editing adaptation: stage an ordinary object list before notifying
   * its mapped owner. Native bulk loading mutes inserts and ends with
   * LOADFINISHED; existing owners need live INSERTED callbacks to restore links.
   * Callback failures propagate without promising rollback of domain effects.
   */
  _ReadLiveList(instance, field, list, source, itemClassName, replacement = list)
  {
    const previous = PENDING_LIST_READS.get(list);
    if (previous) previous.cancel();
    const staged = new Array(source.length);
    const parent = this._contextStack.pop() ?? field.name;
    try
    {
      for (let i = 0; i < source.length; i++)
      {
        this._contextStack.push(`${parent} [${i}]`);
        try { staged[i] = this._ReadListItem(source[i], itemClassName, staged, i); }
        finally { this._contextStack.pop(); }
      }
    }
    finally
    {
      this._contextStack.push(parent);
      this._currentSource = source;
    }
    let active = true;
    const edit = {
      cancel()
      {
        active = false;
        if (PENDING_LIST_READS.get(list) === edit) PENDING_LIST_READS.delete(list);
      },
      finish()
      {
        if (!active) return;
        try
        {
          if (replacement === list && list.length === staged.length && list.every((item, index) => item === staged[index])) return;
          if (list.length) instance.OnListModified(BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, list);
          if (!active) return;
          list.length = 0;
          for (const item of staged)
          {
            list.push(item);
            if (item != null) instance.OnListModified(BLUELISTEVENT.BELIST_INSERTED, list.length, 0, item, list);
            if (!active) return;
          }
          if (replacement !== list) writeDictionaryValue(instance, field, replacement);
        }
        finally { edit.cancel(); }
      }
    };
    PENDING_LIST_READS.set(list, edit);
    this._listEdits.push(edit);
    if (this._options.declarations !== true) this._anchors.deferListEdit(edit);
    return source.some(item => IsReference(item) && !this._anchors.byId.has(item._ref))
      || !IRootReaderBase.areEquivalent(list, staged);
  }

  /**
   * Populates an existing mapped IList (DictReader.cpp:427-475).
   * Remove precedes observer capture/muting; Append rejection is ignored; every
   * successful load, including an empty one, sends one LOADFINISHED.
   * Adapted: deferred references stage outside the typed list and append in
   * source order. Observer restoration in finally is JS operation cleanup for
   * this deferred path, not native exception parity or a rollback guarantee.
   * Deferred loads owned by this reader complete after anchor finalization;
   * externally owned contexts complete when this list's references settle.
   * A new population cancels the pending population of that exact destination,
   * including one started by another reader sharing an import context.
   * Failures at this reader's boundaries cancel its pending list writes. A
   * caller-owned importContext failure outside this reader is not observable;
   * its owner retains responsibility for abandoning that external operation.
   * @param {IList} list Existing configured destination.
   * @param {object} field Selected list declaration.
   * @param {*} source Incoming array.
   * @returns {boolean} Whether contents changed, conservatively true for deferred references.
   */
  _ReadIList(list, field, source)
  {
    if (!Array.isArray(source)) this._ThrowError("Expected a list");
    // Native dictionary input is separate from list storage; preserve that
    // separation when the JS caller supplies this very list as its values.
    const input = source === list ? Array.from(source) : source;
    const previous = PENDING_LIST_READS.get(list);
    if (previous) previous.cancel();
    const before = [];
    for (let i = 0; i < list.GetSize(); i++) before.push(list.GetAt(i));
    list.Remove(-1);
    const info = {};
    list.GetInfo(info);
    list.SetNotify(null);

    const itemType = field.type.itemType;
    const itemClassName = typeof itemType === "string" ? itemType : itemType?.className ?? null;
    const slots = new Array(input.length);
    const ready = new Array(input.length).fill(false);
    const pendingIds = new Set();
    let active = true, reading = true, cursor = 0;
    const cancel = () =>
    {
      active = false;
      this._pendingListReads.delete(pendingRead);
      if (PENDING_LIST_READS.get(list) === pendingRead) PENDING_LIST_READS.delete(list);
    };
    const flush = () =>
    {
      while (cursor < slots.length && ready[cursor])
      {
        const item = slots[cursor++];
        if (item) list.Append(item);
      }
    };
    const finish = () =>
    {
      if (!active || reading || cursor !== slots.length) return;
      cancel();
      if (info.notify) info.notify.OnListModified(BLUELISTEVENT.BELIST_LOADFINISHED, 0, 0, null, list);
    };
    const pendingRead = { cancel, finish };
    PENDING_LIST_READS.set(list, pendingRead);
    (this._pendingListReads ??= new Set()).add(pendingRead);
    const complete = () =>
    {
      if (!pendingIds.size || !this._ownsAnchors) finish();
    };

    const parent = this._contextStack.pop() ?? field.name;
    try
    {
      for (let i = 0; i < slots.length; i++)
      {
        this._contextStack.push(`${parent} [${i}]`);
        try
        {
          const item = input[i];
          if (IsReference(item) && this._anchors.byId.get(item._ref) === undefined)
          {
            pendingIds.add(item._ref);
            this._anchors.defer(item._ref, object =>
            {
              if (!active) return;
              // Called by reference finalization, never while merely registering
              // a forward id. Do not partly refill an unresolved deferred batch.
              for (const id of pendingIds)
              {
                if (this._anchors.byId.get(id) === undefined)
                {
                  cancel();
                  return;
                }
              }
              slots[i] = object;
              ready[i] = true;
              list.SetNotify(null);
              try
              {
                flush();
              }
              catch (error)
              {
                cancel();
                throw error;
              }
              finally
              {
                list.SetNotify(info.notify);
              }
              complete();
            });
          }
          else
          {
            if (item === null || typeof item !== "object" || Array.isArray(item) || ArrayBuffer.isView(item))
              this._ThrowError("Expected a dictionary or live object");
            slots[i] = this._ReadListItem(item, itemClassName, null, i);
            ready[i] = true;
          }
          flush();
        }
        finally
        {
          this._contextStack.pop();
        }
      }
    }
    catch (error)
    {
      cancel();
      throw error;
    }
    finally
    {
      reading = false;
      this._contextStack.push(parent);
      this._currentSource = source;
      list.SetNotify(info.notify);
    }
    complete();
    const after = [];
    for (let i = 0; i < list.GetSize(); i++) after.push(list.GetAt(i));
    return pendingIds.size > 0 || !IRootReaderBase.areEquivalent(before, after);
  }

  /**
   * Nested declared reference collections share this operation's factories and anchors.
   * @param {object} instance Destination object.
   * @param {object} field Selected collection declaration.
   * @returns {boolean|undefined} Changed result, or undefined for a value collection.
   */
  _ReadDeclaredCollection(instance, field)
  {
    const type = field.type;
    if (!this._HasDeclaredReferences(type)) return undefined;
    // Keep direct object lists on their established in-place ReadList path.
    if (["list", "array"].includes(type.kind) && !["list", "array", "map", "set"].includes(type.itemType?.kind)) return undefined;
    const source = this._currentSource;
    const current = readDictionaryValue(instance, field);
    if (source === null || source === undefined)
    {
      writeDictionaryValue(instance, field, normalizeCarbonValue(source, type));
      return current !== readDictionaryValue(instance, field);
    }
    const value = this._ReadDeclaredValue(source, type, value => writeDictionaryValue(instance, field, value), current);
    writeDictionaryValue(instance, field, value);
    return true;
  }

  /** Whether a declared collection ultimately contains registered/reference objects. */
  _HasDeclaredReferences(type)
  {
    if (["list", "array", "map", "set"].includes(type?.kind))
    {
      return this._HasDeclaredReferences(type.kind === "map" ? type.valueType : type.itemType);
    }
    return type?.kind === "rootRef" || typeof type === "function"
      || (typeof type === "string" && !!CjsSchema.GetConstructor(type));
  }

  /** Reads only supported declared collection shapes; opaque values keep existing coercion. */
  _ReadDeclaredValue(source, type, assign, current = null)
  {
    if (source === null || source === undefined) return source;
    const kind = type?.kind;
    if (kind === "map")
    {
      if (!(source instanceof Map) && !IsPlainObject(source)) this._ThrowError("Expected a map or dictionary");
      const result = new Map();
      const entries = source instanceof Map ? source.entries() : Object.entries(source);
      for (const [key, item] of entries)
      {
        result.set(key, this._ReadDeclaredValue(item, type.valueType, value => result.set(key, value)));
      }
      return result;
    }
    if (["list", "array", "set"].includes(kind))
    {
      if (!Array.isArray(source) && !(kind === "set" && source instanceof Set)) this._ThrowError("Expected a list or declared set");
      const values = Array.isArray(current) && current !== source ? current : [];
      const items = Array.isArray(source) ? source : Array.from(source);
      values.length = items.length;
      for (let index = 0; index < items.length; index++)
      {
        values[index] = this._ReadDeclaredValue(items[index], type.itemType, value => { values[index] = value; });
      }
      if (kind !== "set") return values;
      const result = new Set(values);
      this._afterReferences.push(() => { result.clear(); for (const item of values) result.add(item); });
      return result;
    }
    if (!this._HasDeclaredReferences(type)) return normalizeCarbonValue(source, type);
    if (IsReference(source))
    {
      if (this._anchors.byId.has(source._ref)) return this._anchors.byId.get(source._ref);
      this._anchors.defer(source._ref, assign);
      return null;
    }
    if (!IsPlainObject(source)) return source;
    const declared = typeof type === "function" || typeof type === "string" ? type : type.className;
    const saved = this._currentSource;
    try
    {
      this._currentSource = source;
      return this._CreateObjectInternal(declared);
    }
    finally { this._currentSource = saved; }
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

  /**
   * Custom JS completion: resolve deferred references before completing owned
   * list populations, and cancel pending list writes when finalization fails.
   */
  _Finish()
  {
    try
    {
      if (this._ownsAnchors)
      {
        this._anchors.finalize();
        if (this._pendingListReads)
        {
          for (const pending of this._pendingListReads) pending.finish();
        }
        if (this._options.declarations !== true) this._anchors.initializeCreated(this._options);
      }
      if (this._options.declarations === true)
      {
        for (const finish of this._afterReferences) finish();
        if (!this._doInitialize || this._options.initialize === false)
        {
          for (const edit of this._listEdits) edit.finish();
          return;
        }
        // Only selected stored edges and live properties actually populated by
        // this operation participate. Borrowed nodes may lead to new dependencies
        // but are never initialized. Cycles are once-only, not a readiness solver.
        const visited = new Set();
        const visit = instance =>
        {
          if (!instance || typeof instance !== "object" || visited.has(instance)) return;
          visited.add(instance);
          for (const field of getDictionaryDeclarations(instance.constructor).fields)
          {
            if (field.type?.runtimeOnly === true) continue;
            if (field.role === "property" && !this._WasRead(instance, field)) continue;
            // Values input accepts typed objects even in scalar-declared slots.
            // Actual stored values determine dependencies; primitive/buffer values
            // are cheap no-ops, without widening access to unrelated live getters.
            visitValue(readDictionaryValue(instance, field));
          }
          if (this._created.has(instance)) finalizeReaderObject(instance, { initialize: this._doInitialize && this._options.initialize !== false });
        };
        const containers = new Set();
        const visitValue = value =>
        {
          if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return;
          if (mappedInterfaces(value.constructor).has(IList))
          {
            if (containers.has(value)) return;
            containers.add(value);
            for (let i = 0; i < value.GetSize(); i++) visitValue(value.GetAt(i));
            return;
          }
          if (CjsSchema.getClassName(value.constructor)) { visit(value); return; }
          if (containers.has(value)) return;
          containers.add(value);
          if (value instanceof Map || value instanceof Set)
          {
            for (const item of value.values()) visitValue(item);
          }
          else
          {
            for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))
            {
              if (Object.hasOwn(descriptor, "value")) visitValue(descriptor.value);
            }
          }
        };
        for (const instance of this._created) visit(instance);
        for (const edit of this._listEdits) edit.finish();
      }
    }
    catch (error)
    {
      this._CancelPendingListReads();
      throw error;
    }
  }

  /** Cancels this reader's list loads and the shared context's staged live edits after failure. */
  _CancelPendingListReads()
  {
    this._anchors.cancelListEdits();
    for (const edit of this._listEdits) edit.cancel();
    if (!this._pendingListReads) return;
    for (const pending of this._pendingListReads) pending.cancel();
  }

  /** Starts an isolated declared operation; legacy shared contexts stay unchanged. */
  _BeginDeclaredOperation()
  {
    if (this._options.declarations !== true) return;
    if (this._created) throw new TypeError("A declared dictionary operation is already active.");
    this._anchors = CreateAnchorTable();
    this._ownsAnchors = true;
    this._created = new Set();
    this._readFields = new Map();
    this._afterReferences = [];
    this._currentSource = null;
    this._contextStack.length = 0;
  }

  /** Exact named registration wins, including aliases with their own factory. */
  _ResolveRegistration(typeName, Declared)
  {
    const requested = typeof typeName === "string" ? typeName : typeof Declared === "string" ? Declared
      : typeof Declared === "function" ? CjsSchema.getClassName(Declared) : null;
    const registration = getClassRegistration(requested);
    if (!registration) this._ThrowError(`Type '${requested ?? "<missing>"}' not found in the Blue class registry`);
    if (typeof typeName !== "string" && typeof Declared === "function" && registration.type !== Declared)
    {
      this._ThrowError(`Canonical registration '${requested}' does not identify the supplied constructor`);
    }
    return registration;
  }

  /** Native reader notification policy uses mapped interfaces, never method presence. */
  _DeclaredNotify(instance)
  {
    const names = new Set(Array.from(mappedInterfaces(instance.constructor), Interface => CjsSchema.getClassName(Interface)));
    return !names.has("IInitialize") && names.has("INotify") ? instance : null;
  }

  /** Schema cache revisions do not change the populated declaration's identity. */
  _WasRead(instance, field)
  {
    for (const read of this._readFields.get(instance) || [])
    {
      if (read.declaringClass === field.declaringClass && read.role === field.role
        && read.key === field.key && read.name === field.name && read.index === field.index) return true;
    }
    return false;
  }

  /** `CleanupAfterCreate` (:600-605). */
  _CleanupAfterCreate()
  {
    this._listEdits = [];
    this._contextStack.length = 0;
    this._currentSource = null;
    if (this._ownsAnchors) this._anchors = CreateAnchorTable();
    if (this._options.declarations === true)
    {
      this._anchors = null;
      this._created = null;
      this._readFields = null;
      this._afterReferences = null;
    }
  }

  /**
   * A dictionary carries no binary blocks (DictReader.cpp:718-721).
   *
   * @throws {IRootReaderException} Always.
   */
  ReadBinaryBlock(_instance, _propertyName)
  {
    this._ThrowError("DictReader does not support binary blocks");
  }

  /** `ThrowError` (:584-598): the message, prefixed with the member path. */
  _ThrowError(message)
  {
    const path = this._contextStack.map(entry => `\t${entry}\n`).join("");
    throw new IRootReaderException(`${path}${message}`);
  }
}


/**
 * Tracks allocations and references for one dictionary operation. Completion
 * belongs to the allocating factory; borrowed objects are never completed.
 * Forward references resolve before dependency-first, once-only completion.
 */
export function CreateAnchorTable()
{
  const byId = new Map();
  const pending = [];
  const created = new Map();
  const readProperties = new Map();
  const listEdits = [];
  const valuesCompletions = [];
  return {
    byId,
    isCreated(instance)
    {
      return created.has(instance);
    },
    deferListEdit(edit)
    {
      listEdits.push(edit);
    },
    hasListEdits()
    {
      return listEdits.length !== 0;
    },
    deferValuesCompletion(complete)
    {
      valuesCompletions.push(complete);
    },
    cancelListEdits()
    {
      for (const edit of listEdits) edit.cancel();
      listEdits.length = 0;
      valuesCompletions.length = 0;
    },
    registerCreated(instance, complete)
    {
      if (!created.has(instance)) created.set(instance, complete);
    },
    recordRead(instance, field)
    {
      if (field.role !== "property") return;
      let fields = readProperties.get(instance);
      if (!fields) readProperties.set(instance, fields = new Set());
      fields.add(field.name);
    },
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
        this.cancelListEdits();
        throw new IRootReaderException(`Unresolved _ref ids: ${Array.from(unresolved, id => JSON.stringify(id)).join(", ")}. Every { _ref } must match a { _id } in the same import operation.`);
      }
    },
    initializeCreated(options = {})
    {
      const visited = new Set();
      const containers = new Set();
      const visit = instance =>
      {
        if (visited.has(instance)) return;
        visited.add(instance);
        const fields = getDictionaryDeclarations(instance.constructor).fields;
        for (let index = fields.length - 1; index >= 0; index--)
        {
          const field = fields[index];
          if (field.type?.runtimeOnly === true) continue;
          if (field.role === "property" && !readProperties.get(instance)?.has(field.name)) continue;
          visitValue(readDictionaryValue(instance, field));
        }
        if (created.has(instance)) created.get(instance)(options);
      };
      const visitValue = value =>
      {
        if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return;
        if (mappedInterfaces(value.constructor).has(IList))
        {
          if (containers.has(value)) return;
          containers.add(value);
          for (let i = value.GetSize() - 1; i >= 0; i--) visitValue(value.GetAt(i));
          return;
        }
        if (CjsSchema.getClassName(value.constructor)) { visit(value); return; }
        if (containers.has(value)) return;
        containers.add(value);
        if (value instanceof Map || value instanceof Set)
        {
          for (const item of value.values()) visitValue(item);
        }
        else
        {
          const descriptors = Object.values(Object.getOwnPropertyDescriptors(value));
          for (let i = descriptors.length - 1; i >= 0; i--)
          {
            if (Object.hasOwn(descriptors[i], "value")) visitValue(descriptors[i].value);
          }
        }
      };
      try
      {
        const instances = Array.from(created.keys());
        for (let i = instances.length - 1; i >= 0; i--) visit(instances[i]);
        for (const edit of listEdits) edit.finish();
        for (const complete of valuesCompletions) complete();
      }
      finally
      {
        created.clear();
        readProperties.clear();
        this.cancelListEdits();
      }
    }
  };
}

/**
 * Read-only equality for a supplied nested list. Positions only prove the
 * whole list unchanged; they never identify changed objects. Anchors use the
 * normal reader path so equality cannot discard their topology operations.
 */
function MatchesListValues(current, source)
{
  return Array.isArray(current) && Array.isArray(source) && current.length === source.length
    && source.every((value, index) => MatchesObjectValues(current[index], value));
}

/** Compares declared incoming values without constructing or mutating live objects. */
function MatchesObjectValues(current, source)
{
  if (Object.is(current, source)) return true;
  if (Array.isArray(current) && Array.isArray(source)) return MatchesListValues(current, source);
  if (ArrayBuffer.isView(current) || ArrayBuffer.isView(source)) return IRootReaderBase.areEquivalent(current, source);
  if (!current || !IsPlainObject(source) || typeof current !== "object") return false;
  if (Object.hasOwn(source, "_id") || Object.hasOwn(source, "_ref")) return false;
  if (CjsSchema.getClassName(current.constructor))
  {
    if (source._type !== undefined && !CjsSchema.isInstanceOf(source._type, current)) return false;
    const declarations = getDictionaryDeclarations(current.constructor);
    for (const name of Object.keys(source))
    {
      if (name === "_type") continue;
      if (name === BLUE_OBJECT_METADATA_KEY)
      {
        if (!MatchesObjectValues(BeObjectMetadata.GetMetadata(current), source[name])) return false;
        continue;
      }
      const field = declarations.byName.get(name);
      if (!field) return false;
      if (!CjsSchema.isFieldWritable(field) || field.type?.runtimeOnly === true) continue;
      const value = readDictionaryValue(current, field);
      const kind = field.type?.kind;
      if (["rootRef", "root", "list", "array", "structList"].includes(kind))
      {
        if (!MatchesObjectValues(value, source[name])) return false;
      }
      else if (!MatchesObjectValues(value, normalizeCarbonValue(source[name], field.type))) return false;
    }
    return true;
  }
  if (!IsPlainObject(current)) return false;
  const keys = Object.keys(source);
  return keys.length === Object.keys(current).length
    && keys.every(key => Object.hasOwn(current, key) && MatchesObjectValues(current[key], source[key]));
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

/**
 * Whether a value is a plain dictionary: null-prototype, or with any realm's
 * `Object.prototype`. An editor window hands values to a runtime in another
 * realm (Graphene's renderer iframe), and its literals are still dictionaries.
 */
function IsPlainObject(value)
{
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) return true;
  // Another realm's Object.prototype is the root of its chain; a class
  // instance's prototype never is.
  return Object.getPrototypeOf(prototype) === null && Object.prototype.toString.call(value) === "[object Object]";
}

CjsSchema.blue.define(DictReader, { className: "DictReader" });
CjsSchema.decorateMethod(DictReader, "CreateObject", meta.adapted);
CjsSchema.decorateMethod(DictReader, "ReadInto", meta.ours);
CjsSchema.decorateMethod(DictReader, "ReadList", meta.adapted);
CjsSchema.decorateMethod(DictReader, "ReadStructureList", meta.adapted);
CjsSchema.decorateMethod(DictReader, "ReadIRootPtr", meta.adapted);
CjsSchema.decorateMethod(DictReader, "_PrepareListPatches", meta.ours);
CjsSchema.decorateMethod(DictReader, "_ReadListPatch", meta.ours);
CjsSchema.decorateMethod(DictReader, "_ReadIList", meta.adapted);
CjsSchema.decorateMethod(DictReader, "_Finish", meta.ours);
CjsSchema.decorateMethod(DictReader, "_CancelPendingListReads", meta.ours);
