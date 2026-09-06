// Source: trinity/trinityal/Tr2VertexDefinition.h:14-207 (the definition and its items)
//   trinity/trinityal/Tr2VertexDefinition.cpp:25-33 (item equality)
//   trinity/trinity/Shader/Tr2EffectStateManager.cpp:863-923 (interning by handle)
//   trinity/trinityal/dx11/Tr2VertexLayoutALDx11.cpp:144-226 (the shader-input match)
//
// ONE MATCHER, CONSUMED BY EVERY BACKEND. Carbon and ccpwgl arrived at this
// algorithm independently - Carbon walks a vertex shader's declared pipeline
// inputs and looks each one up in the mesh's element list, ccpwgl merge-joins
// two sorted element lists - which is good evidence it is the right one. Both
// match on SEMANTIC AND INDEX ONLY: neither compares data type, format, offset
// or stream. A float3 POSITION0 in the mesh satisfies a float4 POSITION0 in the
// shader, and the hardware converts.
//
// The plan this produces is renderer-neutral, because the two references
// legitimately differ on what to do with a shader input the mesh cannot supply:
//
//   - Carbon's DX11 path FABRICATES an element so CreateInputLayout still
//     succeeds - format derived from the shader's declared scalar type, offset
//     zero, and a hardcoded input slot.
//   - ccpwgl DISABLES the attribute array and sets a constant zero vec4.
//
// Both are "supply nothing for this input"; only the mechanism differs. So the
// plan reports the input as unmatched and carries the fallback type the engine
// needs, and each engine applies its own mechanism. Deciding here would bake a
// backend assumption into graph state.
//
// The handle is an INDEX into a process-wide intern table, which is Carbon's
// design (Tr2EffectStateManager holds s_vertexLayoutMap as a file-scope static
// and never frees it). Whether ours should be per-library instead is an open
// question in docs/engine-backends-plan.md; it is a static here because a
// handle must outlive any one library for batch sort keys to stay comparable.
import { Tr2VertexUsageCode } from "./usageCode.js";


/** The interned declarations, index-addressed: the index IS the handle. */
const interned = [];

// Carbon interns once at asset load and stores the handle on the mesh, so its
// linear scan never runs per draw. This runtime has no load hook, so the handle
// is memoised against the element list a payload already owns - same cost
// profile, no payload mutation, and it lapses with the payload.
const handles = new WeakMap();


/**
 * One vertex element (Carbon Tr2VertexDefinition::Item, h:123-141).
 *
 * Carbon's usage and data type are bit-coded enums; the runtime's element
 * vocabulary is the string names throughout (payload readers, the quad
 * renderer, the binding-plan matcher below), so the item carries the names
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

/** A mesh's vertex element list, and the matching of it to a shader's inputs. */
export class Tr2VertexDefinition
{
  // ---------------------------------------------------------------------
  // The AUTHORING half - the actual Tr2VertexDefinition (trinityal/
  // Tr2VertexDefinition.h): m_items, the per-stream m_nextOffset ledger,
  // Add with automatic offsets, Find, empty. This is what a hand-built
  // instance layout is (Carbon builds every one of them through Add -
  // EveSpriteSet.cpp:18-33, EveTacticalOverlay.cpp:31-66); a literal
  // element table is not a Carbon shape.
  // ---------------------------------------------------------------------

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
    this.nextOffset[stream] = item.offset + Tr2VertexDefinition.dataTypeSizeInBytes(item.type);
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
  static dataTypeSizeInMembers(type)
  {
    const match = /_([1-4])(?:_NORM)?$/.exec(String(type));
    return match ? Number(match[1]) : 0;
  }

  /** Carbon GetDataTypeSizeInBytes (h:188-205), from the type NAME. */
  static dataTypeSizeInBytes(type)
  {
    const base = DATA_TYPE_BASE_BYTES[String(type).split("_")[0]];
    return base ? base * Tr2VertexDefinition.dataTypeSizeInMembers(type) : 0;
  }

  // Carbon Tr2VertexDefinition::UsageCode (Tr2VertexDefinition.h:17-30). Note
  // BLENDINDICES=6 before BLENDWEIGHTS=7; ccpwgl's GLES-v8 lineage has them
  // transposed and translates at its reader boundary.

  /** Carbon's vertex-usage vocabulary, in its declared order. */
  static UsageCode = Tr2VertexUsageCode;

  // Carbon compares ALL SIX item fields for equality (Tr2VertexDefinition.cpp:25-33)
  // because two meshes sharing semantics but differing in offset or stream need
  // different input layouts. This is the INTERN key, and it is deliberately
  // stricter than the match key below.

  // ---------------------------------------------------------------------
  // The MATCHER half. NAMING DEBT, recorded 2026-09-06: everything below is
  // Carbon-cited behaviour that belongs to OTHER owners - the intern table
  // is Tr2EffectStateManager's (s_vertexLayoutMap), the element match and
  // binding plan are the vertex-layout AL's (Tr2VertexLayoutALDx11). It was
  // parked under this class's name before the class had its real surface.
  // Relocation is pending; every static below accepts either a plain
  // element array or a Tr2VertexDefinition instance.
  // ---------------------------------------------------------------------

  /** Whether two element lists are the same declaration, field for field. */
  static isSameDefinition(firstDefinition, secondDefinition)
  {
    const first = firstDefinition?.items ?? firstDefinition;
    const second = secondDefinition?.items ?? secondDefinition;
    if (first === second) return true;
    if (!first || !second || first.length !== second.length) return false;

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

  // Carbon Tr2EffectStateManager::GetVertexDeclarationHandle (cpp:863-877):
  // linear-scan the intern table for an equal definition, return its index, or
  // append and return the new index. Carbon scans under a mutex at its scale;
  // single-threaded JS needs no lock, and the scan is amortised because a
  // declaration is interned once per distinct mesh layout, not per draw.

  /**
   * The stable handle for an element list, interning it on first sight. The
   * handle is what a batch carries and what binning and sorting compare.
   */
  static getHandle(elements)
  {
    const items = elements?.items ?? elements ?? [];
    const memoised = handles.get(items);

    if (memoised !== undefined) return memoised;

    let handle = interned.findIndex(candidate => Tr2VertexDefinition.isSameDefinition(candidate, items));

    if (handle < 0)
    {
      handle = interned.push(items) - 1;
    }

    if (typeof items === "object") handles.set(items, handle);

    return handle;
  }

  /**
   * The element list a handle was interned from, or null for an unknown handle
   * (Carbon GetVertexDeclarationElements, Tr2EffectStateManager.cpp:912-923).
   */
  static getElements(handle)
  {
    return interned[handle] ?? null;
  }

  // Carbon FindInputElement (Tr2VertexLayoutALDx11.cpp:144-155):
  //   element.usageIndex == input.SemanticIndex
  //   && semanticNames[element.usage] == input.SemanticName
  // Nothing else participates. ccpwgl's CompareDeclarationElements and FindUsage
  // compare the same two fields and no others.

  /** The mesh element serving a shader input, or null when the mesh has none. */
  static findElement(elementsOrDefinition, input)
  {
    const elements = elementsOrDefinition?.items ?? elementsOrDefinition;
    if (!elements) return null;

    for (const element of elements)
    {
      if (element.usageIndex === input.usageIndex && element.usage === input.usage) return element;
    }

    return null;
  }

  // The resolved plan. Keyed on (declaration handle, shader input signature),
  // which is precisely Carbon's DX11 cache key: an ID3D11InputLayout per
  // (declaration, vertex-shader pipeline-input hash) pair, created lazily and
  // reused across every draw of that pair (Tr2VertexLayoutALDx11.cpp:157-226).
  // a WebGL engine caches the same plan as a VAO.

  /**
   * Resolves a mesh's element list against a vertex shader's declared pipeline
   * inputs, returning one entry per SHADER INPUT in the shader's own order -
   * the shader's inputs are the requirement, and a mesh element no shader reads
   * is simply absent from the plan.
   *
   * Each entry carries the input, the mesh element serving it or null, and the
   * fallback scalar type an engine substitutes when there is none.
   */
  static resolveBindingPlan(elements, pipelineInputs)
  {
    const inputs = pipelineInputs ?? [];
    const entries = [];
    let unmatched = 0;

    for (const input of inputs)
    {
      const element = Tr2VertexDefinition.findElement(elements, input);

      if (!element) unmatched++;

      entries.push({
        usage: input.usage,
        usageIndex: input.usageIndex,
        registerIndex: input.registerIndex,
        element,
        // Carbon picks the fabricated element's format from the input's own
        // declared scalar type (Tr2VertexLayoutALDx11.cpp:179-195).
        fallbackType: element ? null : (input.type ?? Tr2VertexDefinition.FallbackType)
      });
    }

    return { entries, unmatched, complete: unmatched === 0 };
  }

  /** The scalar type an unmatched input falls back to when it declares none. */
  static FallbackType = "FLOAT";
}
