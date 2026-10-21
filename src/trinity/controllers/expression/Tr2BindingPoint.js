// Source: trinity/trinity/Controllers/Tr2BindingPoint.h
// Source: trinity/trinity/Controllers/Tr2BindingPoint.cpp
import { blue as be, CjsBlueClasses, IList, INotify } from "#blue";
import { meta, CjsSchema, CARBON_TYPE, getCarbonTypeDefinition, normalizeCarbonTypeDescriptor, type, blue } from "#schema";
import { getDictionaryDeclarations, readDictionaryValue, writeDictionaryValue } from "../../../global/blue/dictionaryDeclarations.js";


/** Component offsets of a one-letter swizzle (cpp:411-431). */
const SWIZZLE_OFFSETS = { x: 0, r: 0, y: 1, g: 1, z: 2, b: 2, w: 3, a: 3 };

/** Scalar kinds Carbon admits as a destination: FLOAT, DOUBLE, BOOL (cpp:446-453). */
const SCALAR_KINDS = new Set([ CARBON_TYPE.FLOAT32, CARBON_TYPE.FLOAT64, CARBON_TYPE.BOOLEAN ]);

/** Kinds that hold an IROOT or IROOTPTR a path step may pass through (cpp:38-48). */
const OBJECT_KINDS = new Set([ CARBON_TYPE.ROOT, CARBON_TYPE.ROOT_REF, CARBON_TYPE.ARRAY, "list", CARBON_TYPE.MAP, CARBON_TYPE.STRUCT_LIST ]);

/** Kinds of a `name` member GetStringAttribute reads: Carbon's narrow strings (cpp:59-75). */
const STRING_KINDS = new Set([ CARBON_TYPE.STRING, CARBON_TYPE.PATH, CARBON_TYPE.EXPRESSION ]);


/**
 * Resolves an authored `path`/`attribute` pair against named root objects to
 * one float, double, bool or float-array member, optionally one component of
 * it, and writes or reads it. A plain native helper embedded in the value
 * actions; it has no Blue exposure of its own.
 */
@meta.carbon("Tr2BindingPoint")
export class Tr2BindingPoint
{
  // Every embedding owner exposes these READWRITE|PERSIST|NOTIFY
  // (Tr2ActionSetValue_Blue.cpp:18, Tr2ActionAnimateValue_Blue.cpp:19).

  /** m_path: a reference from one of the roots, or empty to use `object`. */
  @meta.notify
  @meta.readwrite
  @meta.persist
  @type.string
  path = "";

  /** m_object: the destination object when `path` is empty. */
  @meta.notify
  @meta.readwrite
  @meta.persist
  @type.rootRef("IRoot")
  object = null;

  /** m_attribute: the member name, optionally with a one-letter swizzle (`color.a`). */
  @meta.notify
  @meta.readwrite
  @meta.persist
  @type.string
  attribute = "";

  /** m_resolvedObject: the object `path` resolved to. */
  _resolvedObject = null;

  /** m_notifyPtr: the destination object as INotify, or null. */
  _notifyPtr = null;

  /** The destination object whose member `_entry` describes (m_destination's owner). */
  _destinationObject = null;

  /** m_entry: the destination member's schema declaration. */
  _entry = null;

  /** m_entryOffset: the component written, or -1 for every component. */
  _entryOffset = -1;

  /** m_arraySize: the component count of a float-array destination. */
  _arraySize = 0;

  /**
   * Carbon Link (cpp:281-293): unlink, then bind `object` when there is no
   * path, otherwise the object the path resolves to.
   *
   * @param {Array<[string, object]>} roots Named roots, as a controller's GetBindingPathRoots.
   */
  @blue.method
  @meta.implemented
  Link(roots)
  {
    this.Unlink();
    if (!this.path)
    {
      this.SetDestination(this.object, this.attribute);
    }
    else
    {
      this._resolvedObject = Tr2BindingPoint.ResolvePath(this.path, roots);
      this.SetDestination(this._resolvedObject, this.attribute);
    }
  }

  /** Carbon Unlink (cpp:295-303). */
  @blue.method
  @meta.implemented
  Unlink()
  {
    this._entry = null;
    this._destinationObject = null;
    this._resolvedObject = null;
    this._notifyPtr = null;
    this._entryOffset = -1;
    this._arraySize = 0;
  }

  /**
   * Carbon IsValid (cpp:305-308).
   *
   * @returns {boolean} Whether a destination is bound.
   */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this._entry !== null && this.GetBoundObject() !== null;
  }

  /**
   * Carbon SetValue (cpp:310-360): write the float into the destination - all
   * components of a float array, or the swizzled one - then tell the object
   * through OnModified when it is an INotify.
   *
   * Adapted: OnModified receives the member's exposed name; Carbon passes the
   * member's storage address, which INotify implementations match by member.
   *
   * @param {number} value The value; stored as a C++ float first.
   */
  @blue.method
  @meta.adapted
  SetValue(value)
  {
    if (!this.IsValid()) return;
    const float = Math.fround(Number(value));
    const kind = Tr2BindingPoint._Kind(this._entry);
    if (kind === CARBON_TYPE.BOOLEAN)
    {
      writeDictionaryValue(this._destinationObject, this._entry, float !== 0);
    }
    else if (SCALAR_KINDS.has(kind))
    {
      writeDictionaryValue(this._destinationObject, this._entry, float);
    }
    else
    {
      const components = readDictionaryValue(this._destinationObject, this._entry);
      if (this._entryOffset === -1)
      {
        for (let i = 0; i < this._arraySize; i++) components[i] = float;
      }
      else
      {
        components[this._entryOffset] = float;
      }
    }
    if (this._notifyPtr) this._notifyPtr.OnModified(this._entry.name);
  }

  /**
   * Carbon GetValue (cpp:362-389).
   *
   * Adapted: returns the value, or null where Carbon returns false.
   *
   * @returns {number|null} The destination value as a float.
   */
  @blue.method
  @meta.adapted
  GetValue()
  {
    if (!this.IsValid()) return null;
    const kind = Tr2BindingPoint._Kind(this._entry);
    const value = readDictionaryValue(this._destinationObject, this._entry);
    if (kind === CARBON_TYPE.BOOLEAN) return value ? 1 : 0;
    if (SCALAR_KINDS.has(kind)) return Math.fround(value);
    return Math.fround(value[Math.max(this._entryOffset, 0)]);
  }

  /**
   * Carbon GetBoundObject (cpp:481-488).
   *
   * @returns {object|null} The resolved object, else the authored one.
   */
  @blue.method
  @meta.implemented
  GetBoundObject()
  {
    return this._resolvedObject ?? this.object;
  }

  /**
   * Carbon SetDestination (cpp:391-479): split an optional one-letter swizzle,
   * find the stored member, admit only FLOAT, DOUBLE, BOOL and float arrays
   * (a swizzle only on an array, inside its size), and take the object as
   * INotify through Blue's silent cast.
   *
   * @param {object|null} object The destination object.
   * @param {string} attribute Member name with an optional `.x` swizzle.
   * @returns {boolean} Whether a destination was bound.
   */
  @blue.method
  @meta.implemented
  SetDestination(object, attribute)
  {
    this._entry = null;
    this._destinationObject = null;
    this._entryOffset = -1;
    this._notifyPtr = null;
    this._arraySize = 0;

    let name = attribute;
    let entryOffset = -1;
    const dot = attribute.indexOf(".");
    if (dot !== -1)
    {
      name = attribute.slice(0, dot);
      const swizzle = attribute.slice(dot + 1);
      if (swizzle.length !== 1 || !Object.hasOwn(SWIZZLE_OFFSETS, swizzle)) return false;
      entryOffset = SWIZZLE_OFFSETS[swizzle];
    }

    const entry = Tr2BindingPoint._FindEntry(object, name);
    if (!entry) return false;
    const kind = Tr2BindingPoint._Kind(entry);
    let arraySize = 0;
    if (SCALAR_KINDS.has(kind))
    {
      if (entryOffset !== -1) return false;
    }
    else
    {
      // FLOATARRAY; Carbon's DOUBLEARRAY has no member kind here yet.
      arraySize = getCarbonTypeDefinition(kind)?.length ?? 0;
      if (!arraySize || entryOffset >= arraySize) return false;
    }

    this._entry = entry;
    this._destinationObject = object;
    this._entryOffset = entryOffset;
    this._arraySize = arraySize;
    this._notifyPtr = be.classes.QueryThisInterface(object, INotify, object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT);
    return true;
  }

  /**
   * Carbon ResolveReference (cpp:213-267), exposed as ResolveObjectPath
   * (cpp:491-506): a root name, then any run of `.member`, `[index]` and
   * `["name"]` steps. A failed step resolves to null.
   *
   * @param {string} path The reference.
   * @param {Array<[string, object]>} roots Named roots.
   * @returns {object|null} The object the path names.
   */
  @meta.implemented
  static ResolvePath(path, roots)
  {
    if (!path) return null;
    const rootEnd = Tr2BindingPoint._MatchRoot(path, 0);
    if (rootEnd === 0) return null;
    const rootName = path.slice(0, rootEnd);
    const found = roots.find(([ name ]) => name === rootName);
    if (!found) return null;
    let object = found[1];

    let start = rootEnd;
    while (start < path.length)
    {
      let end = Tr2BindingPoint._MatchProperty(path, start);
      if (end !== start)
      {
        object = Tr2BindingPoint._GetIRootAttribute(object, path.slice(start + 1, end));
        start = end;
        continue;
      }
      end = Tr2BindingPoint._MatchNumericIndex(path, start);
      if (end !== start)
      {
        // std::atoi: an optional sign then digits; "[]" and "[-]" read as 0.
        const index = Number.parseInt(path.slice(start + 1, end - 1), 10) || 0;
        object = Tr2BindingPoint._GetListElementAt(object, index);
        start = end;
        continue;
      }
      end = Tr2BindingPoint._MatchNameIndex(path, start);
      if (end !== start)
      {
        object = Tr2BindingPoint._GetListElementNamed(object, path.slice(start + 2, end - 2));
        start = end;
        continue;
      }
      return null;
    }
    return object ?? null;
  }

  /**
   * Carbon FindEntry (cpp:9-29): the stored member of that name; live
   * properties are skipped.
   *
   * Adapted: the schema's members follow our class inheritance, where
   * Carbon walks the exposure chain.
   */
  static _FindEntry(object, name)
  {
    if (!object || typeof object !== "object" || !CjsSchema.getClassName(object.constructor)) return null;
    const entry = getDictionaryDeclarations(object.constructor).byName.get(name);
    return entry && entry.role === "member" ? entry : null;
  }

  /** The member's normalized type kind. */
  static _Kind(entry)
  {
    return normalizeCarbonTypeDescriptor(entry.type ?? { kind: CARBON_TYPE.UNKNOWN }).kind;
  }

  /** Carbon GetIRootAttribute (cpp:31-50): an IROOT or IROOTPTR member's object. */
  static _GetIRootAttribute(object, name)
  {
    const entry = Tr2BindingPoint._FindEntry(object, name);
    if (!entry || !OBJECT_KINDS.has(Tr2BindingPoint._Kind(entry))) return null;
    return readDictionaryValue(object, entry) ?? null;
  }

  /** Carbon GetStringAttribute (cpp:52-76). */
  static _GetStringAttribute(object, name)
  {
    const entry = Tr2BindingPoint._FindEntry(object, name);
    if (!entry || !STRING_KINDS.has(Tr2BindingPoint._Kind(entry))) return null;
    return readDictionaryValue(object, entry);
  }

  /**
   * The object as a list, by Blue's silent IList cast (cpp:80, :96).
   *
   * Adapted: a plain array counts as a list until every Carbon BlueList
   * member is a BlueList.
   */
  static _AsList(object)
  {
    if (Array.isArray(object)) return object;
    if (!object || typeof object !== "object") return null;
    return be.classes.QueryThisInterface(object, IList, object.constructor, CjsBlueClasses.BLUEQIOPT.BEQI_SILENT);
  }

  /** Carbon GetListElement by index (cpp:78-92); negative counts from the end. */
  static _GetListElementAt(object, index)
  {
    const list = Tr2BindingPoint._AsList(object);
    if (!list) return null;
    const size = list.length;
    if (index < 0) index += size;
    return index >= 0 && index < size ? list[index] ?? null : null;
  }

  /** Carbon GetListElement by name (cpp:94-110): the first element whose `name` matches. */
  static _GetListElementNamed(object, name)
  {
    const list = Tr2BindingPoint._AsList(object);
    if (!list) return null;
    for (const element of list)
    {
      if (Tr2BindingPoint._GetStringAttribute(element, "name") === name) return element;
    }
    return null;
  }

  /** Carbon MatchRoot (cpp:122-137): a letter or `_`, then letters, digits or `_`. */
  static _MatchRoot(path, index)
  {
    if (!/[A-Za-z_]/.test(path[index] ?? "")) return index;
    index++;
    while (/[A-Za-z0-9_]/.test(path[index] ?? "")) index++;
    return index;
  }

  /** Carbon MatchProperty (cpp:139-147): `.` then a root-shaped name. */
  static _MatchProperty(path, index)
  {
    if (path[index] !== ".") return index;
    return Tr2BindingPoint._MatchRoot(path, index + 1);
  }

  /** Carbon MatchNumericIndex (cpp:149-177): `[`, an optional `-`, digits, `]`. */
  static _MatchNumericIndex(path, start)
  {
    if (path[start] !== "[") return start;
    let index = start + 1;
    if (path[index] === "-") index++;
    while (/[0-9]/.test(path[index] ?? "")) index++;
    return path[index] === "]" ? index + 1 : start;
  }

  /** Carbon MatchNameIndex (cpp:179-211): `["`, any text without `"`, `"]`. */
  static _MatchNameIndex(path, start)
  {
    if (path[start] !== "[" || path[start + 1] !== "\"") return start;
    const close = path.indexOf("\"", start + 2);
    if (close === -1) return start;
    return path[close + 1] === "]" ? close + 2 : start;
  }
}
