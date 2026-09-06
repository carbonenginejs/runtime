// Source: trinity/trinityal/Tr2VertexDefinition.h:14-207 (the definition and its items)
//   trinity/trinityal/Tr2VertexDefinition.cpp:25-42 (item and definition equality)
//
// This class is the definition and NOTHING ELSE: items, the per-stream offset
// ledger, Add/Find/empty, and its own equality. The intern table lives on
// Tr2EffectStateManager (Carbon s_vertexLayoutMap) and the shader-input match
// lives in the vertex-layout AL (trinityal/vertexLayoutMatch.js) - both were
// parked under this class's name until 2026-09-06, before it had its real
// Carbon surface.
import { Tr2VertexUsageCode } from "./usageCode.js";


/**
 * One vertex element (Carbon Tr2VertexDefinition::Item, h:123-141).
 *
 * Carbon's usage and data type are bit-coded enums; the runtime's element
 * vocabulary is the string names throughout (payload readers, the quad
 * renderer, the AL's binding-plan matcher), so the item carries the names
 * and the byte arithmetic derives from them.
 */
export class Tr2VertexDefinitionItem
{
    usage = "POSITION";

    usageIndex = 0;

    type = "FLOAT32_1";

    offset = 0;

    stream = 0;

    instanceStepRate = 0;
}

const USAGE_NAMES = Object.keys(Tr2VertexUsageCode);

const DATA_TYPE_BASE_BYTES = {
    BYTE: 1, UBYTE: 1,
    SHORT: 2, USHORT: 2,
    INT32: 4, UINT32: 4,
    FLOAT16: 2, UFLOAT16: 2,
    FLOAT32: 4, UFLOAT32: 4
};

/** A mesh's vertex element list (Carbon trinityal/Tr2VertexDefinition.h). */
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
    item.usage = typeof usage === "number" ? USAGE_NAMES[usage] : String(usage);
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
   * Carbon Find (h:169-172): the first item with the usage, and optionally
   * the usage index; null when absent.
   */
  Find(usage, usageIndex = null)
  {
    const name = typeof usage === "number" ? USAGE_NAMES[usage] : String(usage);
    for (const item of this.items)
    {
      if (item.usage === name && (usageIndex === null || item.usageIndex === usageIndex))
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
