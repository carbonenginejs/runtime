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
import { exportCarbonValue } from "../schema/types/index.js";

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
    for (const field of CjsSchema.getSchema(instance.constructor).fields)
    {
      if (!CjsSchema.isFieldExported(field, options)) continue;

      const kind = field.type?.kind;
      const value = instance[field.name];
      this.WriteMemberName(field.name);

      // An object is written as one - and so can be aliased - whatever the
      // member declares: our interchange lets any member hold one.
      if (OBJECT_KINDS.has(kind) || kind === "struct" || IsObject(value))
      {
        this.WriteIRoot(value, DeclaredClassName(field.type));
      }
      else if ((LIST_KINDS.has(kind) || value?.some?.(IsObject)) && Array.isArray(value))
      {
        this.WriteList(value, DeclaredClassName(field.type));
      }
      else
      {
        this.WriteValue(exportCarbonValue(value));
      }
    }
  }

  /**
   * Writes a list (`WriteList`, IRootWriter.cpp:173-183): objects through
   * `WriteIRoot`, which may alias them, and values as values.
   *
   * @param {Array} list The list.
   * @param {string|null} declaredClassName The list's declared item class.
   */
  WriteList(list, declaredClassName)
  {
    this.WriteVectorBegin(list.length);
    for (const item of list)
    {
      if (IsObject(item)) this.WriteIRoot(item, declaredClassName);
      else this.WriteValue(exportCarbonValue(item));
    }
    this.WriteVectorEnd(list.length);
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
function IsObject(value)
{
  return value !== null && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value)
    && CjsSchema.getClassName(value.constructor) !== null;
}

CjsSchema.define(IRootWriter, { className: "IRootWriter", carbon: "IRootWriter" });
CjsSchema.decorateMethod(IRootWriter, "WriteMembers", impl.adapted);
CjsSchema.decorateMethod(IRootWriter, "WriteValue", impl.adapted);
