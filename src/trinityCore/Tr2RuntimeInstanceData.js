// Source: E:\carbonengine\trinity\trinity\Tr2RuntimeInstanceData.h
// Source: E:\carbonengine\trinity\trinity\Tr2RuntimeInstanceData.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2RuntimeInstanceData_Blue.cpp
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2ParticleElementDeclaration } from "../particle/Tr2ParticleElementDeclaration.js";


/**
 * Owns a CPU-side instance stream - a vertex element layout, the packed
 * per-instance rows and their bounding box - and can spawn the same rows into a
 * particle system on demand.
 */
@type.define({ className: "Tr2RuntimeInstanceData", family: "trinityCore" })
export class Tr2RuntimeInstanceData extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.objectRef("Tr2ParticleSystem")
  particleSystem = null;

  // DIVERGENCE (deliberate): Carbon only Blue-persists name/particleSystem and
  // exposes aabbMin/aabbMax as Be::READ; layout/rows/explicitBoundingBox are
  // private, fed at runtime via SetElementLayout/SetData/SetBoundingBox.
  // The JS port persists the whole quintet so instance data authored in JS can
  // round-trip without Carbon's Python/CMF side channels. Carbon-authored
  // .black files never populate these fields.
  @io.flag("cpuData")
  @io.rebuild("instanceBuffer")
  @io.notify
  @io.persist
  @type.array("unknown")
  layout = [];

  @io.flag("cpuData")
  @io.rebuild("instanceBuffer")
  @io.notify
  @io.persist
  @type.array("unknown")
  rows = [];

  @io.persist
  @type.boolean
  explicitBoundingBox = false;

  @io.read
  @type.uint32
  count = 0;

  @io.persist
  @type.vec3
  aabbMin = vec3.create();

  @io.persist
  @type.vec3
  aabbMax = vec3.create();

  #layout = Object.freeze([]);

  #data = null;

  #stride = 0;

  #dirty = false;

  #dataRevision = 0;

  /** True when rows or layout have changed since the last UpdateData. */
  get dirty()
  {
    return this.#dirty;
  }

  /**
   * Counter bumped by every UpdateData that publishes a dirty change; consumers
   * compare it to detect that the packed bytes were republished.
   */
  get dataRevision()
  {
    return this.#dataRevision;
  }

  /**
   * Repacks the CPU buffer from the persisted layout and rows, then publishes
   * it.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#rebuildCpuData();
    this.UpdateData();
    return true;
  }

  /**
   * Repacks the CPU buffer only when the cpuData flag was scheduled, i.e. layout
   * or rows actually changed.
   */
  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    if (this.__state.flags.delete("cpuData"))
    {
      this.#rebuildCpuData();
    }
    return true;
  }

  /**
   * Replaces the element layout and discards every existing row - a layout must
   * be set before any SetData.
   */
  @carbon.method
  @impl.adapted
  SetElementLayout(layout)
  {
    this.#setElementLayout(layout);
    this.DestroyData();
  }

  /**
   * Replaces all instance rows and repacks the byte buffer; throws when no
   * layout has been set.
   */
  @carbon.method
  @impl.adapted
  SetData(rows)
  {
    this.#setData(rows);
  }

  /**
   * A detached copy of one instance row, with its component arrays cloned so the
   * caller cannot alias stored data.
   */
  @carbon.method
  @impl.implemented
  GetItem(index)
  {
    this.#assertItemIndex(index);
    return this.rows[index].map(Tr2RuntimeInstanceData.#cloneValue);
  }

  /**
   * Validates one instance row against the layout, stores it and rewrites its
   * bytes in place, marking the data dirty.
   */
  @carbon.method
  @impl.adapted
  SetItem(index, row)
  {
    this.#assertItemIndex(index);
    const normalized = this.#normalizeRow(row, index);
    this.rows[index] = normalized;
    this.#writeRow(new DataView(this.#data), index, normalized);
    this.#dirty = true;
  }

  /** A detached copy of one element of one instance row. */
  @carbon.method
  @impl.implemented
  GetItemElement(index, elementIndex)
  {
    this.#assertItemIndex(index);
    this.#assertElementIndex(elementIndex);
    return Tr2RuntimeInstanceData.#cloneValue(this.rows[index][elementIndex]);
  }

  /**
   * Validates and stores a single element of one row, patching only that
   * element's bytes in the packed buffer.
   */
  @carbon.method
  @impl.adapted
  SetItemElement(index, elementIndex, value)
  {
    this.#assertItemIndex(index);
    this.#assertElementIndex(elementIndex);
    const normalized = Tr2RuntimeInstanceData.#normalizeElementValue(
      this.#layout[elementIndex],
      value,
      `Instance ${index} element ${elementIndex}`
    );
    this.rows[index][elementIndex] = normalized;
    this.#writeElement(new DataView(this.#data), index, elementIndex, normalized);
    this.#dirty = true;
  }

  /**
   * Publishes pending changes by clearing the dirty flag and bumping the data
   * revision; returns false when nothing was dirty.
   */
  @carbon.method
  @impl.adapted
  UpdateData()
  {
    if (!this.#dirty)
    {
      return false;
    }
    this.#dirty = false;
    this.#dataRevision++;
    return true;
  }

  /**
   * Recomputes the box from the first POSITION element with at least three
   * components; returns false without touching it when the box was set
   * explicitly, and zeroes the box when there is no such element or no
   * instances.
   */
  @carbon.method
  @impl.adapted
  UpdateBoundingBox()
  {
    if (this.explicitBoundingBox)
    {
      return false;
    }

    const positionIndex = this.#layout.findIndex(element =>
      element.usage === "POSITION" && element.usageIndex === 0 && element.componentCount >= 3
    );
    if (positionIndex === -1 || this.count === 0)
    {
      vec3.set(this.aabbMin, 0, 0, 0);
      vec3.set(this.aabbMax, 0, 0, 0);
      return false;
    }

    vec3.set(this.aabbMin, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    vec3.set(this.aabbMax, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    for (const row of this.rows)
    {
      const position = row[positionIndex];
      for (let axis = 0; axis < 3; axis++)
      {
        const component = Number(position[axis]) || 0;
        this.aabbMin[axis] = Math.min(this.aabbMin[axis], component);
        this.aabbMax[axis] = Math.max(this.aabbMax[axis], component);
      }
    }
    return true;
  }

  /**
   * Sets the box explicitly from either a { min, max } object or two vectors,
   * and latches explicitBoundingBox so UpdateBoundingBox stops recomputing it.
   */
  @carbon.method
  @impl.adapted
  SetBoundingBox(bounds, maxBounds)
  {
    const min = maxBounds === undefined ? bounds?.min ?? bounds?.minBounds : bounds;
    const max = maxBounds === undefined ? bounds?.max ?? bounds?.maxBounds : maxBounds;
    if (!min || !max)
    {
      throw new TypeError("Bounding box requires min and max vectors");
    }
    vec3.copy(this.aabbMin, min);
    vec3.copy(this.aabbMax, max);
    this.explicitBoundingBox = true;
  }

  /**
   * Reads the bounding box; the values are copied into the caller's vectors when both are supplied, otherwise a freshly cloned pair is returned.
   * @param {vec3} [minBounds] Caller-owned destination for the minimum.
   * @param {vec3} [maxBounds] Caller-owned destination for the maximum.
   * @returns {boolean|{min: vec3, max: vec3}} True when written into the out vectors, otherwise a new { min, max } pair.
   */
  @carbon.method
  @impl.implemented
  GetBoundingBox(minBounds, maxBounds)
  {
    if (minBounds && maxBounds)
    {
      vec3.copy(minBounds, this.aabbMin);
      vec3.copy(maxBounds, this.aabbMax);
      return true;
    }
    return {
      min: vec3.clone(this.aabbMin),
      max: vec3.clone(this.aabbMax)
    };
  }

  /**
   * The bounding box of the single CPU instance buffer; the buffer index is
   * ignored because only one stream exists.
   */
  @carbon.method
  @impl.implemented
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    return this.GetBoundingBox();
  }

  /** Number of packed instance rows. */
  @carbon.method
  @impl.implemented
  GetCount()
  {
    return this.count;
  }

  /** Byte size of one packed row, summed from the element layout. */
  @carbon.method
  @impl.implemented
  GetStride()
  {
    return this.#stride;
  }

  /**
   * The frozen normalized element descriptors, each carrying usage, type,
   * component count, byte size and byte offset.
   */
  @carbon.method
  @impl.implemented
  GetLayout()
  {
    return this.#layout;
  }

  /**
   * A copy of the packed instance bytes, or null when no rows are set; the
   * caller owns the returned array.
   */
  @carbon.method
  @impl.adapted
  GetData()
  {
    return this.#data ? new Uint8Array(this.#data) : null;
  }

  /**
   * Drops every row and the packed buffer while keeping the layout, and marks
   * the data dirty.
   */
  @carbon.method
  @impl.adapted
  DestroyData()
  {
    this.rows = [];
    this.#data = null;
    this.count = 0;
    this.#dirty = true;
  }

  /**
   * Replaces the target particle system with particles decoded from the CPU
   * instance rows.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Maps Carbon vertex semantics into the maintained CPU particle-system declaration without GPU buffers.")
  Spawn()
  {
    const particleSystem = this.particleSystem;
    if (!particleSystem?.isValid || !this.#layout.length || !this.#data)
    {
      return;
    }

    const declaration = particleSystem.GetElementDeclaration();
    if (!(declaration instanceof Map))
    {
      throw new TypeError("Tr2ParticleSystem.GetElementDeclaration must return the CPU declaration Map.");
    }

    const mappings = [];
    for (const element of declaration.values())
    {
      const usage = Tr2RuntimeInstanceData.#particleUsageToVertexUsage(element.elementType);
      const usageIndex = element.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
        ? element.usageIndex
        : 0;
      const layoutIndex = this.#layout.findIndex(item =>
        item.usage === usage && item.usageIndex === usageIndex
      );
      if (layoutIndex === -1)
      {
        return;
      }

      const layout = this.#layout[layoutIndex];
      if (layout.baseType !== "FLOAT32" || layout.componentCount < element.dimension)
      {
        return;
      }
      mappings.push({ element, layoutIndex });
    }

    particleSystem.ClearParticles();
    for (const row of this.rows)
    {
      const particleIndex = particleSystem.BeginSpawnParticle();
      if (particleIndex === null)
      {
        break;
      }
      for (const mapping of mappings)
      {
        particleSystem.SetParticleElement(
          particleIndex,
          mapping.element.key,
          row[mapping.layoutIndex]
        );
      }
      particleSystem.EndSpawnParticle();
    }
  }

  /**
   * Implements ITr2GenericEmitter. Does nothing as this emitter only emits
   * particles on demand (Spawn).
   */
  @carbon.method
  @impl.implemented
  Update(_arguments)
  {
  }

  /**
   * Implements ITr2GenericEmitter. Does nothing as this emitter only emits
   * particles on demand (Spawn); both Carbon overloads are deliberate no-ops.
   */
  @carbon.method
  @impl.implemented
  SpawnParticles(..._args)
  {
  }

  /**
   * Implements ITr2GenericEmitter. Nothing to prepare - this emitter never
   * spawns from the threaded particle update.
   */
  @carbon.method
  @impl.implemented
  SetThreadSafeFlag()
  {
  }

  /** Carbon's CMF writer requires the native resource-path and file encoder. */
  @carbon.method
  @impl.notImplemented
  SaveToCMF(...args)
  {
    throw new Error("Tr2RuntimeInstanceData.SaveToCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon's Granny writer requires the native Granny SDK and filesystem. */
  @carbon.method
  @impl.notImplemented
  SaveToGranny(...args)
  {
    throw new Error("Tr2RuntimeInstanceData.SaveToGranny is not implemented in CarbonEngineJS.");
  }

  /**
   * Builds Carbon's common current/previous-transform instance stream without
   * creating renderer or GPU resources.
   *
   * @param {Array<object|ArrayLike<number>>} instances
   * @returns {number} Maximum instance scale.
   */
  SetTransformInstances(instances)
  {
    if (!Array.isArray(instances))
    {
      throw new TypeError("Transform instances must be an array");
    }

    const rows = [];
    const min = vec3.fromValues(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const max = vec3.fromValues(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    let maxScale = 0;
    for (let index = 0; index < instances.length; index++)
    {
      const value = instances[index];
      const transform = Array.isArray(value) || ArrayBuffer.isView(value)
        ? value
        : value?.transform;
      const previousTransform = value?.previousTransform ?? transform;
      if (!transform || transform.length !== 16)
      {
        throw new TypeError(`Transform instance ${index} must contain 16 transform values`);
      }
      if (!previousTransform || previousTransform.length !== 16)
      {
        throw new TypeError(`Transform instance ${index} must contain 16 previous-transform values`);
      }

      const currentRows = Tr2RuntimeInstanceData.#packTransform(transform);
      const previousRows = Tr2RuntimeInstanceData.#packTransform(previousTransform);
      rows.push([
        ...currentRows,
        ...previousRows,
        Number(value?.boneIndex ?? 0) | 0
      ]);

      for (let axis = 0; axis < 3; axis++)
      {
        min[axis] = Math.min(min[axis], Number(transform[12 + axis]) || 0);
        max[axis] = Math.max(max[axis], Number(transform[12 + axis]) || 0);
      }
      for (const row of currentRows)
      {
        maxScale = Math.max(maxScale, Math.hypot(row[0], row[1], row[2]));
      }
    }

    this.SetElementLayout(Tr2RuntimeInstanceData.TransformLayout);
    this.SetData(rows);
    this.SetBoundingBox(
      instances.length ? min : Tr2RuntimeInstanceData.#zero,
      instances.length ? max : Tr2RuntimeInstanceData.#zero
    );
    this.UpdateData();
    return maxScale;
  }

  /**
   * Re-normalizes the persisted layout and repacks the persisted rows; throws
   * when rows exist but the layout is empty.
   */
  #rebuildCpuData()
  {
    const rows = this.rows;
    this.#setElementLayout(this.layout);
    if (!this.#layout.length)
    {
      if (rows.length)
      {
        throw new Error("SetElementLayout must be called before SetData");
      }
      this.rows = [];
      this.#data = null;
      this.count = 0;
      this.#dirty = true;
      return;
    }
    this.#setData(rows);
  }

  /**
   * Normalizes each element descriptor, assigns sequential byte offsets,
   * computes the row stride and republishes the persisted layout summary.
   */
  #setElementLayout(layout)
  {
    if (!Array.isArray(layout))
    {
      throw new TypeError("Element layout must be an array");
    }

    let offset = 0;
    const normalized = layout.map((value, index) =>
    {
      const descriptor = Tr2RuntimeInstanceData.#normalizeElement(value, index, offset);
      offset += descriptor.byteSize;
      return Object.freeze(descriptor);
    });

    this.layout = normalized.map(Tr2RuntimeInstanceData.#describeElement);
    this.#layout = Object.freeze(normalized);
    this.#stride = offset;
  }

  /**
   * Normalizes every row against the layout and packs them into one freshly
   * allocated little-endian buffer.
   */
  #setData(rows)
  {
    if (!this.#layout.length)
    {
      throw new Error("SetElementLayout must be called before SetData");
    }
    if (!Array.isArray(rows))
    {
      throw new TypeError("Instance data must be an array");
    }

    const normalizedRows = rows.map((row, index) => this.#normalizeRow(row, index));
    const data = normalizedRows.length ? new ArrayBuffer(this.#stride * normalizedRows.length) : null;
    const view = data ? new DataView(data) : null;
    for (let index = 0; index < normalizedRows.length; index++)
    {
      this.#writeRow(view, index, normalizedRows[index]);
    }

    this.rows = normalizedRows;
    this.#data = data;
    this.count = normalizedRows.length;
    this.#dirty = true;
  }

  /**
   * Coerces a row given either as an array or as a name-keyed object into layout
   * order and validates each element.
   */
  #normalizeRow(row, rowIndex)
  {
    const values = Array.isArray(row)
      ? row
      : this.#layout.map(element => row?.[element.name]);
    if (values.length !== this.#layout.length)
    {
      throw new TypeError(`Instance ${rowIndex} must contain ${this.#layout.length} elements`);
    }
    return values.map((value, elementIndex) => Tr2RuntimeInstanceData.#normalizeElementValue(
      this.#layout[elementIndex],
      value,
      `Instance ${rowIndex} element ${elementIndex}`
    ));
  }

  /** Writes every element of one normalized row into the packed buffer. */
  #writeRow(view, rowIndex, row)
  {
    for (let elementIndex = 0; elementIndex < this.#layout.length; elementIndex++)
    {
      this.#writeElement(view, rowIndex, elementIndex, row[elementIndex]);
    }
  }

  /**
   * Writes one element at its row and layout offset; a scalar supplied for a
   * four-component INT8/UINT8 element is written as a single packed 32-bit word
   * (the bone-index case).
   */
  #writeElement(view, rowIndex, elementIndex, value)
  {
    const element = this.#layout[elementIndex];
    const offset = rowIndex * this.#stride + element.offset;
    if (!Array.isArray(value))
    {
      if (element.componentCount === 4 && element.baseType === "INT8")
      {
        view.setInt32(offset, Number(value) | 0, true);
        return;
      }
      if (element.componentCount === 4 && element.baseType === "UINT8")
      {
        view.setUint32(offset, Number(value) >>> 0, true);
        return;
      }
    }

    const values = Array.isArray(value) ? value : [value];
    for (let index = 0; index < element.componentCount; index++)
    {
      Tr2RuntimeInstanceData.#writeComponent(
        view,
        offset + index * element.componentByteSize,
        element.baseType,
        values[index]
      );
    }
  }

  /**
   * Throws RangeError unless the index is an integer inside the current instance
   * count.
   */
  #assertItemIndex(index)
  {
    if (!Number.isInteger(index) || index < 0 || index >= this.count)
    {
      throw new RangeError("Instance index out of range");
    }
  }

  /** Throws RangeError unless the index is an integer inside the current layout. */
  #assertElementIndex(index)
  {
    if (!Number.isInteger(index) || index < 0 || index >= this.#layout.length)
    {
      throw new RangeError("Element index out of range");
    }
  }

  /**
   * Builds a full element descriptor at the given byte offset from either a {
   * usage, usageIndex, type, name } object or Carbon's legacy [particleUsage,
   * usageIndex, componentCount] triple.
   */
  static #normalizeElement(value, index, offset)
  {
    const legacy = Array.isArray(value);
    if (!legacy && (!value || typeof value !== "object"))
    {
      throw new TypeError(`Element ${index} must be a descriptor or legacy triple`);
    }

    const usageValue = legacy
      ? Tr2RuntimeInstanceData.#particleUsageToVertexUsage(value[0])
      : value.usage;
    const usage = Tr2RuntimeInstanceData.#normalizeUsage(usageValue);
    const usageIndex = Number(legacy ? value[1] : value.usageIndex ?? 0);
    if (!Number.isInteger(usageIndex) || usageIndex < 0 || usageIndex > 7)
    {
      throw new TypeError(`Element ${index} has invalid usageIndex`);
    }

    const type = legacy ? `FLOAT32_${Number(value[2])}` : value.type;
    const typeInfo = Tr2RuntimeInstanceData.#normalizeType(type);
    return {
      usage,
      usageCode: Tr2RuntimeInstanceData.UsageCode[usage],
      usageIndex,
      type: typeInfo.name,
      dataType: typeInfo.dataType,
      baseType: typeInfo.baseType,
      componentCount: typeInfo.componentCount,
      componentByteSize: typeInfo.componentByteSize,
      byteSize: typeInfo.componentCount * typeInfo.componentByteSize,
      offset,
      name: String(legacy ? `element${index}` : value.name ?? `element${index}`)
    };
  }

  /**
   * The frozen persistable summary of an element descriptor: usage, usage index,
   * type and name.
   */
  static #describeElement(value)
  {
    return Object.freeze({
      usage: value.usage,
      usageIndex: value.usageIndex,
      type: value.type,
      name: value.name
    });
  }

  /**
   * Transposes a column-major 4x4 into the three float4 rows the transform
   * instance stream stores.
   */
  static #packTransform(value)
  {
    return [
      [Number(value[0]), Number(value[4]), Number(value[8]), Number(value[12])],
      [Number(value[1]), Number(value[5]), Number(value[9]), Number(value[13])],
      [Number(value[2]), Number(value[6]), Number(value[10]), Number(value[14])]
    ];
  }

  /**
   * Maps a legacy particle element type index onto its vertex usage name; throws
   * for an out-of-range index.
   */
  static #particleUsageToVertexUsage(value)
  {
    const usages = ["TANGENT", "POSITION", "NORMAL", "BITANGENT", "TEXCOORD"];
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= usages.length)
    {
      throw new TypeError("Invalid legacy particle element usage");
    }
    return usages[index];
  }

  /**
   * Resolves a usage given as a name or as a UsageCode number to its canonical
   * name; throws when it matches neither.
   */
  static #normalizeUsage(value)
  {
    if (typeof value === "number")
    {
      const entry = Object.entries(Tr2RuntimeInstanceData.UsageCode).find(([, code]) => code === value);
      if (entry) return entry[0];
    }
    const usage = String(value ?? "").toUpperCase();
    if (Object.hasOwn(Tr2RuntimeInstanceData.UsageCode, usage))
    {
      return usage;
    }
    throw new TypeError(`Invalid vertex usage ${String(value)}`);
  }

  /**
   * Decodes a data type name or code into base type, component count and
   * component byte size by unpacking Carbon's type bit-field (low three bits the
   * type, bit 3 unsigned, bits 5-6 the component count minus one).
   */
  static #normalizeType(value)
  {
    let dataType;
    let name;
    if (typeof value === "number")
    {
      dataType = value;
      name = Object.entries(Tr2RuntimeInstanceData.DataType).find(([, code]) => code === dataType)?.[0];
    }
    else
    {
      name = String(value ?? "").toUpperCase();
      dataType = Tr2RuntimeInstanceData.DataType[name];
    }
    if (!name || dataType === undefined)
    {
      throw new TypeError(`Unsupported vertex data type ${String(value)}`);
    }

    const typeCode = dataType & 7;
    const componentCount = ((dataType & 96) >> 5) + 1;
    const unsigned = (dataType & 8) !== 0;
    const baseTypes = [unsigned ? "UINT8" : "INT8", unsigned ? "UINT16" : "INT16", unsigned ? "UINT32" : "INT32", "FLOAT16", "FLOAT32"];
    const componentSizes = [1, 2, 4, 2, 4];
    if (!baseTypes[typeCode])
    {
      throw new TypeError(`Unsupported vertex data type ${String(value)}`);
    }
    return {
      name,
      dataType,
      baseType: baseTypes[typeCode],
      componentCount,
      componentByteSize: componentSizes[typeCode]
    };
  }

  /**
   * Validates and coerces one element value against its descriptor; a bare
   * number is accepted for a single-component element and for a packed four-byte
   * integer element, anything else must supply exactly componentCount finite
   * numbers.
   */
  static #normalizeElementValue(element, value, label)
  {
    if (
      !Array.isArray(value) &&
      element.componentCount === 4 &&
      (element.baseType === "INT8" || element.baseType === "UINT8") &&
      Number.isFinite(Number(value))
    )
    {
      return Number(value) | 0;
    }

    if (element.componentCount === 1 && !Array.isArray(value))
    {
      if (!Number.isFinite(Number(value))) throw new TypeError(`${label} must be numeric`);
      return Number(value);
    }
    if (!Array.isArray(value) && !ArrayBuffer.isView(value))
    {
      throw new TypeError(`${label} must contain ${element.componentCount} components`);
    }
    if (value.length !== element.componentCount)
    {
      throw new TypeError(`${label} must contain ${element.componentCount} components`);
    }
    const result = Array.from(value, Number);
    if (result.some(component => !Number.isFinite(component)))
    {
      throw new TypeError(`${label} components must be numeric`);
    }
    return result;
  }

  /**
   * Writes one little-endian component of the given base type; FLOAT16 has no
   * packer and throws.
   */
  static #writeComponent(view, offset, baseType, value)
  {
    switch (baseType)
    {
      case "INT8": view.setInt8(offset, value); break;
      case "UINT8": view.setUint8(offset, value); break;
      case "INT16": view.setInt16(offset, value, true); break;
      case "UINT16": view.setUint16(offset, value, true); break;
      case "INT32": view.setInt32(offset, value, true); break;
      case "UINT32": view.setUint32(offset, value, true); break;
      case "FLOAT32": view.setFloat32(offset, value, true); break;
      default: throw new TypeError(`Packing ${baseType} is not supported`);
    }
  }

  /** Copies array-valued elements so returned rows never alias stored data. */
  static #cloneValue(value)
  {
    return Array.isArray(value) ? value.slice() : value;
  }

  static TransformLayout = Object.freeze([
    Object.freeze({ usage: "TEXCOORD", usageIndex: 0, type: "FLOAT32_4", name: "transform0" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 1, type: "FLOAT32_4", name: "transform1" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 2, type: "FLOAT32_4", name: "transform2" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 3, type: "FLOAT32_4", name: "lastTransform0" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 4, type: "FLOAT32_4", name: "lastTransform1" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 5, type: "FLOAT32_4", name: "lastTransform2" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 6, type: "BYTE_4", name: "boneIndex" })
  ]);

  static #zero = vec3.create();

  static UsageCode = Object.freeze({
    POSITION: 0,
    COLOR: 1,
    NORMAL: 2,
    TANGENT: 3,
    BITANGENT: 4,
    TEXCOORD: 5,
    BLENDINDICES: 6,
    BLENDWEIGHTS: 7
  });

  static DataType = Object.freeze({
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
    FLOAT32_1: 4,
    FLOAT32_2: 36,
    FLOAT32_3: 68,
    FLOAT32_4: 100
  });
}
