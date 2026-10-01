// Source: blue/src/IRootReader.h
// Source: blue/src/IRootReader.cpp
//
// The half of Blue's persistence every reader shares: given a member name and
// an instance, find the member and read one value into it by the member's
// type, then tell the instance, if the member is NOTIFY. DictReader supplies
// the value source; this decides what a value becomes.
//
// HOW A MEMBER IS READ, by schema kind, following HandleAttribute's table
// (IRootReader.cpp:40-64, 97-221):
//
// | kind | Carbon VarType | read |
// |---|---|---|
// | scalars, strings, enum, path, expression | LONG, FLOAT, CSTRING, ... | `ReadValue` |
// | vectors, matrices, color, typedArray | FLOATARRAY | into the existing buffer (`ReadFloatArray`), a new one only when the member has none of that shape |
// | struct | IROOT (embedded) | `ReadIRoot` into the EXISTING object |
// | model, objectRef | IROOTPTR | `ReadIRootClass`: an anchor's object, or a new one |
// | list, array | IROOT BlueList | `ReadList` |
// | map, set, rawStruct | IROOT BlueDict / BlueStructureList | by value |
//
// WHICH MEMBERS A KEY MAY NAME. Carbon's base finds PERSIST members only, and
// an unknown name throws `InvalidAttributeException` (:99-106). Ours finds any
// selected dictionary declaration, and skips one that is read-only: our `GetValues`
// exports every field, read-only ones included, so a round trip must read
// back what it wrote (operator ruling 2026-09-27; see the research page
// `blue-values-engine.md`). Selection is owner-first, stored-before-live within
// an owner, with no flag merging or filter fallback. Selected aliases name it too.
import { CjsSchema, impl } from "#schema";
import { coerceCarbonMathInto, coerceCarbonTypedArrayInto, normalizeCarbonValue } from "../schema/types/index.js";
import { IRootReaderException } from "./IRootReaderException.js";
import { InvalidAttributeException } from "./InvalidAttributeException.js";
import { getDictionaryDeclarations, readDictionaryValue, writeDictionaryValue } from "./dictionaryDeclarations.js";

/** Kinds read as an object reference (IROOTPTR). */
const OBJECT_KINDS = new Set([ "model", "objectRef" ]);

/** Kinds holding several values, where a `_type` bag is an item rather than the member. */
const CONTAINER_KINDS = new Set([ "list", "array", "map", "set" ]);

/** Kinds read as a list of objects or values (BlueList). */
const LIST_KINDS = new Set([ "list", "array" ]);

/**
 * `IRootReaderBase` - reads one member of an instance by the member's type.
 * Subclasses provide the value source (`ReadValue`, `ReadList`, `ReadIRoot`,
 * `ReadIRootClass`).
 */
export class IRootReaderBase
{
  /**
   * Reads one member (IRootReader.cpp:97-160): finds it, reads the current
   * source value into it by its kind, and then calls `notify.OnModified` with
   * the member's name when the member is NOTIFY - one member per call, as
   * INotify.h specifies.
   *
   * Adapted: returns whether the member's value changed, which `SetValues`
   * reports and Carbon does not compute.
   *
   * @param {string} attributeName The key.
   * @param {object} instance The object being read into.
   * @param {object|null} notify The INotify to tell, or null.
   * @returns {boolean} Whether the member changed; false for a skipped read-only one.
   */
  HandleAttribute(attributeName, instance, notify)
  {
    const field = this.FindEntry(attributeName, instance.constructor);
    if (!field)
    {
      throw new InvalidAttributeException(`Invalid attribute: ${attributeName} on ${CjsSchema.getClassName(instance.constructor)}`);
    }
    if (!CjsSchema.isFieldWritable(field)) return false;

    let changed;
    try
    {
      changed = this._ReadMember(instance, field);
    }
    catch (error)
    {
      if (CjsSchema.isInstanceOf("IRootReaderException", error)) throw new IRootReaderException(`${attributeName}: ${error.message}`);
      throw error;
    }

    if (notify && field.edit?.notify) notify.OnModified(field.name);
    return changed;
  }

  /**
   * Reads the current source value into one member by the member's kind; the
   * property handler table (IRootReader.cpp:40-64).
   *
   * @returns {boolean} Whether the member changed.
   */
  _ReadMember(instance, field)
  {
    const kind = field.type?.kind;
    const current = readDictionaryValue(instance, field);

    // An alias names an object whatever the member's declared kind, and a bag
    // naming its class builds one in any single-valued member: our interchange
    // lets any member hold an object (`{ _ref }`, `_type`).
    // A live object of a registered class is assigned as a reference in any
    // member but a struct, which copies (values transport ruling 3).
    if (OBJECT_KINDS.has(kind) || this.IsReferenceSource() || (!CONTAINER_KINDS.has(kind) && this.IsTypedSource())
      || (kind !== "struct" && this.IsObjectSource()))
    {
      return this.ReadIRootPtr(instance, field);
    }
    if (kind === "struct")
    {
      return this.HandlePropertyIRoot(instance, field);
    }
    if (LIST_KINDS.has(kind))
    {
      return this.ReadList(instance, field);
    }

    const source = this.ReadValue();

    // Objects nested inside a value (a raw struct's records): resolved in
    // place and assigned as read, since normalizing would copy the records a
    // pending `{ _ref }` still has to fill.
    if (this.HasNestedObjects(source))
    {
      writeDictionaryValue(instance, field, this.ReadNestedObjects(source));
      return true;
    }

    // FLOATARRAY: into the existing buffer, so anything holding it keeps
    // seeing live values.
    const inPlace = coerceCarbonMathInto(current, source, field.type) ?? coerceCarbonTypedArrayInto(current, source, field.type);
    if (inPlace !== null) return inPlace;

    const next = normalizeCarbonValue(source, field.type);
    writeDictionaryValue(instance, field, next);
    return !IRootReaderBase.areEquivalent(current, next);
  }

  /**
   * An embedded object member (`HandlePropertyIRoot`, IRootReader.cpp:195-221):
   * read into the member's existing object. Adapted: a struct member that holds
   * nothing yet is given a new object of its declared class, since a JavaScript
   * member is not storage the object already owns.
   *
   * @returns {boolean} Whether the member changed.
   */
  HandlePropertyIRoot(instance, field)
  {
    const current = readDictionaryValue(instance, field);
    if (current && typeof current === "object")
    {
      return this.ReadIRoot(current, field);
    }

    const created = this.ReadIRootClass(field);
    writeDictionaryValue(instance, field, created);
    return created !== current;
  }

  /**
   * Finds an exposed dictionary declaration or its selected alias. Adapted:
   * dictionaryDeclarations owns the JS values-view precedence; native
   * DictReader::FindEntry instead selects by persistence/write eligibility.
   *
   * @param {string} name The key.
   * @param {Function} Constructor The instance's class.
   * @returns {object|null} The field record.
   */
  FindEntry(name, Constructor)
  {
    const declarations = getDictionaryDeclarations(Constructor);
    return declarations.byName.get(name) ?? declarations.aliases.get(name) ?? null;
  }

  /** Whether the current source is a live object of a registered class; a subclass provides it. */
  IsObjectSource()
  {
    return false;
  }

  /** Whether the current source is a bag naming its class (`_type`); a subclass provides it. */
  IsTypedSource()
  {
    return false;
  }

  /** Whether the current source is an alias (`{ _ref }`); a subclass provides it. */
  IsReferenceSource()
  {
    return false;
  }

  /** Reads the current source value (`ReadValue`); a subclass provides it. */
  ReadValue()
  {
    throw new Error("IRootReaderBase.ReadValue is provided by a reader.");
  }

  /** Whether a value holds objects below its top level; a subclass that reads them says so. */
  HasNestedObjects(_value)
  {
    return false;
  }

  /** Reads a value whose records hold objects; a subclass provides it. */
  ReadNestedObjects(_value)
  {
    throw new Error("IRootReaderBase.ReadNestedObjects is provided by a reader.");
  }

  /** Reads an object pointer member (`HandlePropertyIRootPtr`); a subclass provides it. */
  ReadIRootPtr(_instance, _field)
  {
    throw new Error("IRootReaderBase.ReadIRootPtr is provided by a reader.");
  }

  /** Reads into an existing object (`ReadIRoot`); a subclass provides it. */
  ReadIRoot(_instance, _field)
  {
    throw new Error("IRootReaderBase.ReadIRoot is provided by a reader.");
  }

  /** Reads a new object (`ReadIRootClass`); a subclass provides it. */
  ReadIRootClass(_field)
  {
    throw new Error("IRootReaderBase.ReadIRootClass is provided by a reader.");
  }

  /** Reads a list member (`ReadList`); a subclass provides it. */
  ReadList(_instance, _field)
  {
    throw new Error("IRootReaderBase.ReadList is provided by a reader.");
  }

  /** Selected declarations by alias, refreshed with the schema revision. */
  static aliasesOf(Constructor)
  {
    return getDictionaryDeclarations(Constructor).aliases;
  }

  /** Whether a member's old and new values are the same, element by element for arrays. */
  static areEquivalent(a, b)
  {
    if (Object.is(a, b)) return true;

    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b))
    {
      if (a.constructor !== b.constructor || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
      return true;
    }

    if (Array.isArray(a) && Array.isArray(b))
    {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!IRootReaderBase.areEquivalent(a[i], b[i])) return false;
      return true;
    }

    return false;
  }
}

CjsSchema.define(IRootReaderBase, { className: "IRootReaderBase", carbon: "IRootReaderBase" });
CjsSchema.decorateMethod(IRootReaderBase, "HandleAttribute", impl.adapted);
CjsSchema.decorateMethod(IRootReaderBase, "HandlePropertyIRoot", impl.adapted);
CjsSchema.decorateMethod(IRootReaderBase, "FindEntry", impl.adapted);
