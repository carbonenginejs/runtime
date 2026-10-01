// Source: blue/src/IRootWriter.h
// Source: blue/src/IRootWriter.cpp
//
// The half of Blue's persistence every writer shares: walk an object's members
// and hand each value to the writer's primitives by the member's type. A
// writer subclass decides what a value becomes on the way out (`DictWriter`
// builds a values bag).
//
// WHICH MEMBERS ARE WRITTEN. Carbon writes PERSIST members through
// `BlueMemberIterator` and, with `m_skipDefaults` (on by default), leaves out
// any member equal to a freshly constructed instance's (IRootWriter.cpp:25-37).
// Ours writes every declared field, or the persisted ones when
// `options.persistOnly` asks, and never skips defaults: consumers read the
// full shape (operator ruling 2026-09-27; research page `blue-values-engine.md`).
import { CjsSchema, impl } from "#schema";
import { omitRuntimeValues } from "../schema/CjsSchema.js";
import { exportCarbonValue } from "../schema/types/index.js";
import { getDictionaryDeclarations, readDictionaryValue } from "./dictionaryDeclarations.js";

/** Kinds written as an object that may be shared (IROOTPTR). */
const OBJECT_KINDS = new Set([ "model", "objectRef" ]);

/** Kinds written as a list (BlueList). */
const LIST_KINDS = new Set([ "list", "array" ]);


/**
 * `IRootWriter` - writes an object's members through a writer's primitives.
 */
export class IRootWriter
{
  /** m_skipDefaults: off; see the head comment. */
  _skipDefaults = false;

  /**
   * Writes each member of an object (`WriteMembers`, IRootWriter.cpp:9-157).
   *
   * @param {object} instance The object.
   * @param {object} options `persistOnly`, and what the writer reads.
   */
  WriteMembers(instance, options)
  {
    for (const field of getDictionaryDeclarations(instance.constructor).fields)
    {
      if (!CjsSchema.isFieldExported(field, options)) continue;

      const kind = field.type?.kind;
      const value = readDictionaryValue(instance, field);
      this.WriteMemberName(field.name);

      // An object is written as one - and so can be aliased - whatever the
      // member declares: our interchange lets any member hold one.
      if (OBJECT_KINDS.has(kind) || kind === "struct" || IsObject(value))
      {
        this.WriteIRoot(value, DeclaredClassName(field.type));
      }
      else if (Array.isArray(value) && (LIST_KINDS.has(kind) || value.some(IsObject)))
      {
        this.WriteList(value, DeclaredClassName(field.type), field.type?.itemType);
      }
      else
      {
        this.WriteNestedValue(value, field.type);
      }
    }
  }

  /**
   * Writes a list (`WriteList`, IRootWriter.cpp:173-183): objects through
   * `WriteIRoot`, which may alias them, and values as values.
   *
   * @param {Array} list The list.
   * @param {string|null} declaredClassName The list's declared item class.
   * @param {*} [itemType] Complete declared type for plain list items.
   */
  WriteList(list, declaredClassName, itemType = declaredClassName)
  {
    this.WriteVectorBegin(list.length);
    for (const item of list)
    {
      if (IsObject(item)) this.WriteIRoot(item, declaredClassName);
      else this.WriteNestedValue(item, itemType);
    }
    this.WriteVectorEnd(list.length);
  }

  /**
   * Writes a value. A plain record or array holding objects below its top
   * level (a raw struct's records, `Tr2EffectPassParameters.stageInput`) is
   * walked, so each object is written as one and may be aliased; anything
   * else is exported as a value. Carbon's typed members cannot nest objects in
   * a value; ours can.
   *
   * @param {*} value The value.
   * @param {*} [type] Declared type for filtering plain nested resource fields.
   */
  WriteNestedValue(value, type = null)
  {
    value = omitRuntimeValues(value, type);
    if (value instanceof Map)
    {
      this.WriteRecordBegin();
      for (const [key, item] of value)
      {
        this.WriteMemberName(String(key));
        if (IsObject(item)) this.WriteIRoot(item, DeclaredClassName(type?.valueType));
        else this.WriteNestedValue(item, type?.valueType);
      }
      this.WriteRecordEnd();
      return;
    }
    if (value instanceof Set)
    {
      this.WriteList(Array.from(value), DeclaredClassName(type?.itemType), type?.itemType);
      return;
    }
    if (!HasNestedObject(value))
    {
      this.WriteValue(exportCarbonValue(value));
      return;
    }
    if (Array.isArray(value))
    {
      this.WriteVectorBegin(value.length);
      for (const item of value)
      {
        if (IsObject(item)) this.WriteIRoot(item, null);
        else this.WriteNestedValue(item);
      }
      this.WriteVectorEnd(value.length);
      return;
    }
    this.WriteRecordBegin();
    for (const key of Object.keys(value))
    {
      // As exportCarbonValue: underscored keys are private state.
      if (key.startsWith("_")) continue;
      this.WriteMemberName(key);
      const item = value[key];
      if (IsObject(item)) this.WriteIRoot(item, null);
      else this.WriteNestedValue(item);
    }
    this.WriteRecordEnd();
  }

  /** Begins a plain record inside a value; a writer provides it. */
  WriteRecordBegin()
  {
    throw new Error("IRootWriter.WriteRecordBegin is provided by a writer.");
  }

  /** Ends the plain record being written; a writer provides it. */
  WriteRecordEnd()
  {
    throw new Error("IRootWriter.WriteRecordEnd is provided by a writer.");
  }

  /** Writes the next member's name; a writer provides it. */
  WriteMemberName(_name)
  {
    throw new Error("IRootWriter.WriteMemberName is provided by a writer.");
  }

  /**
   * Writes one value. Adapted: Carbon has a primitive per C++ type
   * (`WriteInt32`, `WriteFloat`, `WriteChar`...); a JavaScript value carries its
   * own type, so one primitive takes them all.
   */
  WriteValue(_value)
  {
    throw new Error("IRootWriter.WriteValue is provided by a writer.");
  }

  /** Writes an object, or an alias to one already written; a writer provides it. */
  WriteIRoot(_instance, _declaredClassName)
  {
    throw new Error("IRootWriter.WriteIRoot is provided by a writer.");
  }

  /** Begins a list; a writer provides it. */
  WriteVectorBegin(_size)
  {
    throw new Error("IRootWriter.WriteVectorBegin is provided by a writer.");
  }

  /** Ends a list; a writer provides it. */
  WriteVectorEnd(_size)
  {
    throw new Error("IRootWriter.WriteVectorEnd is provided by a writer.");
  }
}


/** The class a field declares for the objects it holds, or null. */
export function DeclaredClassName(fieldType)
{
  if (!fieldType) return null;
  if (typeof fieldType === "string") return fieldType;
  if (LIST_KINDS.has(fieldType.kind))
  {
    const item = fieldType.itemType ?? null;
    return typeof item === "string" ? item : item?.className ?? null;
  }
  return fieldType.className ?? null;
}

/** Whether a list item is an object rather than a value. */
/** Whether a plain record or array holds an object at any depth. */
function HasNestedObject(value)
{
  if (value instanceof Map || value instanceof Set) return Array.from(value.values()).some(item => IsObject(item) || HasNestedObject(item));
  if (Array.isArray(value)) return value.some(item => IsObject(item) || HasNestedObject(item));
  if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key in value)
  {
    const item = value[key];
    if (item && typeof item === "object" && (IsObject(item) || HasNestedObject(item))) return true;
  }
  return false;
}

function IsObject(value)
{
  return value !== null && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value)
    && CjsSchema.getClassName(value.constructor) !== null;
}

CjsSchema.define(IRootWriter, { className: "IRootWriter", carbon: "IRootWriter" });
CjsSchema.decorateMethod(IRootWriter, "WriteMembers", impl.adapted);
CjsSchema.decorateMethod(IRootWriter, "WriteValue", impl.adapted);
