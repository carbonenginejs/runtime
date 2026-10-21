import { CjsSchema, type, blue, meta } from "#schema";
// Source: trinity/trinityal/Tr2VertexDefinition.h:14-207 (the definition and its items)
//   trinity/trinityal/Tr2VertexDefinition.cpp:25-42 (item and definition equality)
//
// This class is the definition and NOTHING ELSE: items, the per-stream offset
// ledger, Add/Find/empty, and its own equality. The intern table lives on
// Tr2EffectStateManager (Carbon s_vertexLayoutMap) and the shader-input match
// lives in the vertex-layout AL (trinityal/vertexLayoutMatch.js) - both were
// parked under this class's name until 2026-09-06, before it had its real
// Carbon surface.
import { Tr2VertexDefinitionItem } from "./Tr2VertexDefinitionItem.js";
import { Tr2VertexUsageCode } from "../usageCode.js";


/** A mesh's vertex element list (Carbon trinityal/Tr2VertexDefinition.h). */
// Carbon's Add and Find take a UsageCode; the name form ("POSITION") is
// accepted and resolved to that code, so every item holds the number Carbon
// stores and a shader input's numeric usage matches it directly.
const usageCodeOf = usage => typeof usage === "number" ? usage : Tr2VertexUsageCode[usage];

const DATA_TYPE_BASE_BYTES = {
    BYTE: 1, UBYTE: 1,
    SHORT: 2, USHORT: 2,
    INT32: 4, UINT32: 4,
    FLOAT16: 2, UFLOAT16: 2,
    FLOAT32: 4, UFLOAT32: 4
};


/** Describes a mesh's vertex elements and per-stream offsets. */
export class Tr2VertexDefinition
{
  /** Carbon m_items. */
  items = [];

  /** Carbon m_nextOffset[OFFSET_COUNT] (h:153-159): per-stream offset ledger. */
  nextOffset = [ 0, 0, 0, 0 ];

  /** Carbon empty() (h:145-148). */
  empty()
  {
    return this.items.length === 0;
  }

  /**
   * Carbon Add (h:174-181): append an item at the stream's current offset
   * and advance the ledger by the type's byte size. `stepRate` is "almost
   * always a bool that indicates if the added item is coming from instanced
   * data" - Carbon's own words.
   *
   * @param {string} type Data type name, e.g. "FLOAT32_3", "UBYTE_4_NORM".
   * @param {string|number} usage Usage name or Tr2VertexUsageCode ordinal.
   * @param {number} [usageIndex]
   * @param {number} [stream]
   * @param {number} [stepRate]
   * @returns {Tr2VertexDefinitionItem} The item just added.
   */
  Add(type, usage, usageIndex = 0, stream = 0, stepRate = 0)
  {
    const item = new Tr2VertexDefinitionItem();
    item.usage = usageCodeOf(usage);
    item.usageIndex = usageIndex;
    item.type = String(type);
    item.offset = this.nextOffset[stream] ?? 0;
    item.stream = stream;
    item.instanceStepRate = stepRate;
    this.nextOffset[stream] = item.offset + Tr2VertexDefinition.getDataTypeSizeInBytes(item.type);
    this.items.push(item);
    return item;
  }

  /**
   * Carbon Find( usage ) (h:171): the first item with the usage; null when absent.
   */
  Find(usage)
  {
    const code = usageCodeOf(usage);
    for (const item of this.items)
    {
      if (item.usage === code)
      {
        return item;
      }
    }
    return null;
  }

  /**
   * Carbon Find( usage, usageIndex ) (h:174), split from Find by its extra
   * parameter: the first item with the usage and
   * usage index; null when absent.
   */
  Find__UsageIndex(usage, usageIndex)
  {
    const code = usageCodeOf(usage);
    for (const item of this.items)
    {
      if (item.usage === code && item.usageIndex === usageIndex)
      {
        return item;
      }
    }
    return null;
  }

  /** Carbon GetDataTypeSizeInMembers (h:183-186), from the type NAME. */
  static getDataTypeSizeInMembers(type)
  {
    const match = /_([1-4])(?:_NORM)?$/.exec(String(type));
    return match ? Number(match[1]) : 0;
  }

  /** Carbon GetDataTypeSizeInBytes (h:188-205), from the type NAME. */
  static getDataTypeSizeInBytes(type)
  {
    const base = DATA_TYPE_BASE_BYTES[String(type).split("_")[0]];
    return base ? base * Tr2VertexDefinition.getDataTypeSizeInMembers(type) : 0;
  }

  // Carbon Tr2VertexDefinition::UsageCode (Tr2VertexDefinition.h:17-30). Note
  // BLENDINDICES=6 before BLENDWEIGHTS=7; ccpwgl's GLES-v8 lineage has them
  // transposed and translates at its reader boundary.

  /** Carbon's vertex-usage vocabulary, in its declared order. */
  static UsageCode = Tr2VertexUsageCode;

  /**
   * Carbon Tr2VertexDefinition::DataType (Tr2VertexDefinition.h:31-120), every
   * member with Carbon's value: the base type in the low three bits, the
   * unsigned and normalized bits, and the component count minus one at
   * DT_SIZE_OFFSET.
   *
   * Items here carry the member NAME (`item.type = "UINT32_1"`), which is what
   * both backends' vertex-format tables read; this map is the numbering for
   * code that holds Carbon's integer, as Tr2RuntimeInstanceData's does.
   */
  static DataType = Object.freeze({
    DT_INT8: 0,
    DT_INT16: 1,
    DT_INT32: 2,
    DT_FLOAT16: 3,
    DT_FLOAT32: 4,

    DT_TYPE_MASK: 7,

    DT_UNSIGNED_BIT: 1 << 3,
    DT_NORMALIZED_BIT: 1 << 4,

    DT_SIZE_OFFSET: 5,
    DT_SIZE_MASK: 3 << 5,
    DT_SIZE_1: 0 << 5,
    DT_SIZE_2: 1 << 5,
    DT_SIZE_3: 2 << 5,
    DT_SIZE_4: 3 << 5,

    BYTE_1: 0,
    BYTE_2: 32,
    BYTE_3: 64,
    BYTE_4: 96,

    UBYTE_1: 8,
    UBYTE_2: 40,
    UBYTE_3: 72,
    UBYTE_4: 104,

    SHORT_1: 1,
    SHORT_2: 33,
    SHORT_3: 65,
    SHORT_4: 97,

    USHORT_1: 9,
    USHORT_2: 41,
    USHORT_3: 73,
    USHORT_4: 105,

    INT32_1: 2,
    INT32_2: 34,
    INT32_3: 66,
    INT32_4: 98,

    UINT32_1: 10,
    UINT32_2: 42,
    UINT32_3: 74,
    UINT32_4: 106,

    FLOAT16_1: 3,
    FLOAT16_2: 35,
    FLOAT16_3: 67,
    FLOAT16_4: 99,

    UFLOAT16_1: 11,
    UFLOAT16_2: 43,
    UFLOAT16_3: 75,
    UFLOAT16_4: 107,

    FLOAT32_1: 4,
    FLOAT32_2: 36,
    FLOAT32_3: 68,
    FLOAT32_4: 100,

    UFLOAT32_1: 12,
    UFLOAT32_2: 44,
    UFLOAT32_3: 76,
    UFLOAT32_4: 108,

    BYTE_1_NORM: 16,
    BYTE_2_NORM: 48,
    BYTE_3_NORM: 80,
    BYTE_4_NORM: 112,

    UBYTE_1_NORM: 24,
    UBYTE_2_NORM: 56,
    UBYTE_3_NORM: 88,
    UBYTE_4_NORM: 120,

    SHORT_1_NORM: 17,
    SHORT_2_NORM: 49,
    SHORT_3_NORM: 81,
    SHORT_4_NORM: 113,

    USHORT_1_NORM: 25,
    USHORT_2_NORM: 57,
    USHORT_3_NORM: 89,
    USHORT_4_NORM: 121,

    DT_UNKNOWN_TYPE: 0xFFFFFFFF
  });

  /** Carbon's nested Item class (h:123-141), reachable as Carbon spells it:
   *  Tr2VertexDefinition::Item. JS cannot nest the declaration, so the class
   *  is declared at module scope and aliased here. */
  static Item = Tr2VertexDefinitionItem;

  // Carbon's definition equality is the definition's OWN operator==
  // (Tr2VertexDefinition.cpp:35-42): all four ledger slots AND every item,
  // item equality being all six fields (cpp:25-33). Two meshes sharing
  // semantics but differing in offset or stream need different input layouts,
  // so this is deliberately stricter than the AL's shader-input match, which
  // compares usage and usageIndex only.

  /**
   * Whether two definitions are the same declaration, field for field.
   *
   * Accepts a Tr2VertexDefinition or a plain element array on either side;
   * the ledger participates only when both sides carry one, because a plain
   * payload element list has no ledger to compare (Carbon always has both,
   * so comparing what exists is the faithful subset).
   */
  static isSameDefinition(firstDefinition, secondDefinition)
  {
    const first = firstDefinition?.items ?? firstDefinition;
    const second = secondDefinition?.items ?? secondDefinition;
    if (first === second && firstDefinition === secondDefinition) return true;
    if (!first || !second || first.length !== second.length) return false;

    const firstLedger = firstDefinition?.nextOffset;
    const secondLedger = secondDefinition?.nextOffset;
    if (firstLedger && secondLedger)
    {
      for (let stream = 0; stream < 4; stream++)
      {
        if (firstLedger[stream] !== secondLedger[stream]) return false;
      }
    }

    for (let index = 0; index < first.length; index++)
    {
      const a = first[index];
      const b = second[index];

      if (a.usage !== b.usage
        || a.usageIndex !== b.usageIndex
        || a.type !== b.type
        || a.offset !== b.offset
        || (a.stream ?? 0) !== (b.stream ?? 0)
        || (a.instanceStepRate ?? 0) !== (b.instanceStepRate ?? 0))
      {
        return false;
      }
    }

    return true;
  }
}

CjsSchema.decorateField(Tr2VertexDefinition, "items", type.array(Tr2VertexDefinitionItem));
CjsSchema.decorateField(Tr2VertexDefinition, "nextOffset", type.array("uint32"));
CjsSchema.decorateMethod(Tr2VertexDefinition, "empty", blue.method);
CjsSchema.decorateMethod(Tr2VertexDefinition, "Add", blue.method);
CjsSchema.decorateMethod(Tr2VertexDefinition, "Find", blue.method);
CjsSchema.decorateMethod(Tr2VertexDefinition, "Find__UsageIndex", blue.method, meta.renamed("Find"));
CjsSchema.decorateMethod(Tr2VertexDefinition, "getDataTypeSizeInMembers", blue.method, meta.renamed("GetDataTypeSizeInMembers"));
CjsSchema.decorateMethod(Tr2VertexDefinition, "getDataTypeSizeInBytes", blue.method, meta.renamed("GetDataTypeSizeInBytes"));
CjsSchema.decorateMethod(Tr2VertexDefinition, "isSameDefinition", blue.method, meta.renamed("operator=="));
CjsSchema.meta.carbon("Tr2VertexDefinition")(Tr2VertexDefinition);
