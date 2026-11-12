// Source: trinity/trinity/Tr2RuntimeInstanceData.h
// Source: trinity/trinity/Tr2RuntimeInstanceData.cpp
// Source: trinity/trinity/Tr2RuntimeInstanceData_Blue.cpp
import { exposure as be } from "#be";
import { ICopierCustomAssignment } from "#blue";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { SharedGeometryBuffer } from "./TriGeometryResAllocations.js";
import { ReadValues } from "../../../blue/values.js";
import { vec3 } from "#math/vec3";
import { meta, type } from "#schema";
import { Tr2ParticleElementDeclaration } from "../../particle/element/Tr2ParticleElementDeclaration.js";
import { Tr2VertexUsageCode } from "../vertex/usageCode.js";
import { ITr2InstanceDataInstanceData, ITr2InstanceData } from "./ITr2InstanceData/index.js";
import { ITr2GpuBuffer } from "../ITr2GpuBuffer.js";
import { Tr2DeviceResource } from "../device/Tr2DeviceResource.js";
import { Tr2DeviceResourceState } from "../device/deviceResourceState.js";
import { ITr2GenericEmitter } from "../../particle/ITr2GenericEmitter/ITr2GenericEmitter.js";


/**
 * Owns a CPU instance stream and its shared AL allocation - a layout, packed
 * per-instance rows and their bounding box - and can spawn the same rows into a
 * particle system on demand.
 */
@be.define("Tr2RuntimeInstanceData")
@be.inherit(ITr2InstanceData, ITr2GpuBuffer, ICopierCustomAssignment, Tr2DeviceResource)
@be.mapInterface(ITr2InstanceData)
@be.mapInterface(ITr2GenericEmitter)
@be.mapInterface(ITr2GpuBuffer)
@be.mapInterface(ICopierCustomAssignment)
export class Tr2RuntimeInstanceData
{
  /**
   * Builds instance data from a values bag, which may carry `layout` and `rows`: SOF emits both
   * in its documents, and Carbon's files carry neither.
   *
   * @cjs SOF's values output has no Carbon counterpart; Carbon's SOF calls SetLayout (EveSOF.cpp:2336).
   */
  static from(values = {}, options = {})
  {
    const instance = new Tr2RuntimeInstanceData();
    const { layout, rows, ...members } = values;
    const complete = () =>
    {
      if (options.initialize !== false) instance.Initialize();
    };
    // A parent reader completes this custom format with the shared graph.
    if (options.importContext) options.importContext.registerCreated(instance, complete);
    ReadValues(instance, members, { ...options, notify: false });
    instance.SetOwnValues({ layout, rows });
    if (!options.importContext) complete();
    return instance;
  }

  /** @cjs This class holds values that are not members (GetOwnValues). */
  static ownValues = true;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2ParticleSystem")
  particleSystem = null;

  /**
   * @adapted Carbon declares m_explicitBoundingBox (trinity/trinity/Tr2RuntimeInstanceData.h:109) but does not expose it; exposed here for the values interface.
   */
  @meta.mapAttribute(meta.PERSIST)
  @type.boolean
  explicitBoundingBox = false;

  /** Carbon: MAP_PROPERTY_READONLY (trinity/trinity/Tr2RuntimeInstanceData_Blue.cpp:419); getter GetCount only reads m_count. */
  @be.mapPropertyReadOnly__Field()
  @type.uint32
  count = 0;

  /**
   * Minimum corner of the instance-data bounding box.
   * Carbon aabbMin (Tr2RuntimeInstanceData_Blue.cpp:517).
   *
   * @adapted Persisted by the JavaScript values format; Carbon exposes this field read-only.
   * @type {vec3}
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.vec3
  aabbMin = vec3.create();

  /**
   * Maximum corner of the instance-data bounding box.
   * Carbon aabbMax (Tr2RuntimeInstanceData_Blue.cpp:519).
   *
   * @adapted Persisted by the JavaScript values format; Carbon exposes this field read-only.
   * @type {vec3}
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.vec3
  aabbMax = vec3.create();

  /** m_layout (Tr2RuntimeInstanceData.h:99). */
  _layout = new Tr2VertexDefinition();

  /** @cjs The normalized element descriptors behind m_layout, which rows are read and packed against. */
  _elements = Object.freeze([]);

  /** @cjs The CPU rows, one array of element values per instance, that m_data is packed from. */
  _rows = [];

  _data = null;

  /** A view over `#data`, made once per packed buffer, for in-place writes. */
  _view = null;

  /** True while the layout is `TransformLayout`, set by SetTransformInstances; any other layout clears it. */
  _transformLayout = false;

  _bytes = null;

  _stride = 0;

  _dirty = false;

  _dataRevision = 0;

  _instanceData = new ITr2InstanceDataInstanceData();

  _allocation = null;

  _vertexDeclaration = Tr2EffectStateManager.Unknown;

  /**
   * Explicit final-owner teardown replaces Carbon's resource destructor.
   *
   * Carbon: Tr2RuntimeInstanceData destructor (trinity/trinity/Tr2RuntimeInstanceData.cpp:189-191; Tr2RuntimeInstanceData.h:101 (allocation value member)).
   * @adapted Retains existing JS teardown; the graph dispatches each base hook.
   * @returns {void}
   */
  OnDestruct()
  {
    this.ReleaseResources();
  }

  /**
   * Releases the borrowed allocator range and declaration; CPU rows survive.
   *
   * @adapted
   */
  ReleaseResources()
  {
    this._freeAllocation();
    this._vertexDeclaration = Tr2EffectStateManager.Unknown;
  }

  /**
   * Allocates the native shared stream and interns its layout (cpp:210-231).
   *
   * Nothing prepares this during a build, as in Carbon (constructor, cpp:16-23): the stream holds
   * the data set afterwards, so UpdateData prepares it when the stream is not valid
   * (cpp:445-457).
   *
   * @adapted
   */
  _OnPrepareResources()
  {
    if (this._data && this._stride && this.count && (!this._allocation || !this._allocation.IsValid()))
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      this._allocation = SharedGeometryBuffer(context).Allocate(
        this._stride, this.count, this._bytes, context
      );
      if (!this._allocation) return false;
    }
    if (this._vertexDeclaration === Tr2EffectStateManager.Unknown && !this._layout.empty())
    {
      this._vertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(this._layout);
    }
    return true;
  }

  /** Frees only this provider's range, leaving sibling allocations alive. */
  _freeAllocation()
  {
    if (this._allocation && this._allocation.IsValid()) this._allocation._parent.Free(this._allocation);
    this._allocation = null;
  }

  /** True when rows or layout have changed since the last UpdateData. */
  get dirty()
  {
    return this._dirty;
  }

  /**
   * Counter bumped by every UpdateData that publishes a dirty change; consumers
   * compare it to detect that the packed bytes were republished.
   */
  get dataRevision()
  {
    return this._dataRevision;
  }

  /**
   * Publishes rows set while building.
   *
   * @cjs Carbon has no Initialize. A prepared provider
   *   publishes through UpdateData; one not yet prepared only marks the rows
   *   published, because nothing prepares during a build and the first use
   *   (IsGood) allocates the shared range from these same repacked bytes, so a
   *   hydrated provider that is never drawn holds no device range (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 2).
   */
  Initialize()
  {
    if (this._state === Tr2DeviceResourceState.PREPARED) this.UpdateData();
    else if (this._dirty)
    {
      this._dirty = false;
      this._dataRevision++;
    }
    return true;
  }

  /**
   * Carbon SetLayout (Tr2RuntimeInstanceData.cpp:359-376): drops the data and its
   * range, then takes the stride from the layout's items.
   *
   * @adapted The element descriptors are JS state; SetElementLayout supplies them.
   * @param {Tr2VertexDefinition} layout The new layout.
   */
  SetLayout(layout)
  {
    this.DestroyData();
    this.ReleaseResources();
    this._stride = 0;
    this._elements = Object.freeze([]);

    for (const item of layout.items)
    {
      if (item.stream !== 0) throw new TypeError("Tr2RuntimeInstanceData: vertex layout needs to reference stream 0 only");
      this._stride = Math.max(this._stride, item.offset + Tr2VertexDefinition.getDataTypeSizeInBytes(item.type));
    }

    this._layout = layout;
    this._vertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(layout);
  }

  /**
   * Carbon GetLayout (Tr2RuntimeInstanceData.cpp:384-387).
   *
   * @implemented
   * @returns {Tr2VertexDefinition} The current layout.
   */
  GetLayout()
  {
    return this._layout;
  }

  /**
   * The layout and rows as plain values, which a graph holds in place of members.
   *
   * @cjs Carbon keeps both private and never copies them. JS has callers that copy SOF-built
   *   instance data, and SOF's documents carry them.
   * @returns {{layout?: object[], rows?: Array}} Plain values; none while no layout is set.
   */
  GetOwnValues()
  {
    if (this._elements.length === 0) return {};

    return {
      layout: this._elements.map(Tr2RuntimeInstanceData._describeElement),
      rows: this._rows.map(row => row.map(Tr2RuntimeInstanceData._cloneValue))
    };
  }

  /**
   * Takes a layout and rows from plain values. A missing one leaves its state alone.
   *
   * @cjs See GetOwnValues.
   * @param {{layout?: object[], rows?: Array}} values Plain values.
   * @returns {void}
   */
  SetOwnValues({ layout, rows })
  {
    if (layout !== undefined) this.SetElementLayout(layout);
    if (rows !== undefined && (rows.length || this._rows.length)) this._setData(rows);
  }

  /**
   * Whether plain values describe the layout and rows held now.
   *
   * @cjs See GetOwnValues.
   * @param {{layout?: object[], rows?: Array}} values Plain values.
   * @returns {boolean} True when nothing would change.
   */
  IsOwnValues({ layout, rows })
  {
    const { layout: ownLayout = [], rows: ownRows = [] } = this.GetOwnValues();

    return (layout === undefined || JSON.stringify(layout) === JSON.stringify(ownLayout))
      && (rows === undefined || JSON.stringify(rows) === JSON.stringify(ownRows));
  }

  /**
   * Copies the layout and rows, which are not members.
   *
   * @cjs See GetOwnValues. Carbon's class has no AssignTo.
   * @param {Tr2RuntimeInstanceData} other The destination.
   * @returns {boolean} True.
   */
  AssignTo(other)
  {
    other.SetOwnValues(this.GetOwnValues());
    return true;
  }

  /**
   * The rows, as held. Callers do not change them.
   *
   * @cjs
   * @returns {Array} One array of element values per instance.
   */
  GetRows()
  {
    return this._rows;
  }

  /**
   * The frozen normalized element descriptors, each carrying usage, type, component count, byte
   * size and byte offset.
   *
   * @cjs
   * @returns {object[]} The descriptors.
   */
  GetElementLayout()
  {
    return this._elements;
  }

  /**
   * Replaces the element layout and discards every existing row - a layout must
   * be set before any SetData.
   *
   * @adapted
   */
  @be.mapMethod()
  @meta.invalidates("#dirty")
  SetElementLayout(layout)
  {
    this._setElementLayout(layout);
    this.DestroyData();
  }

  /**
   * Replaces all instance rows and repacks the byte buffer; throws when no
   * layout has been set.
   *
   * @adapted
   */
  @be.mapMethod()
  @meta.invalidates("#dirty")
  SetData(rows)
  {
    this._setData(rows);
  }

  /**
   * A detached copy of one instance row, with its component arrays cloned so the
   * caller cannot alias stored data.
   *
   * @implemented
   */
  @be.mapMethod()
  GetItem(index)
  {
    this._assertItemIndex(index);
    return this._rows[index].map(Tr2RuntimeInstanceData._cloneValue);
  }

  /**
   * Validates one instance row against the layout, stores it and rewrites its
   * bytes in place, marking the data dirty.
   *
   * @adapted
   */
  @be.mapMethod()
  @meta.invalidates("#dirty")
  SetItem(index, row)
  {
    this._assertItemIndex(index);
    const normalized = this._normalizeRow(row, index);
    this._rows[index] = normalized;
    this._writeRow(new DataView(this._data), index, normalized);
    this._dirty = true;
  }

  /**
   * A detached copy of one element of one instance row.
   *
   * @implemented
   */
  @be.mapMethod()
  GetItemElement(index, elementIndex)
  {
    this._assertItemIndex(index);
    this._assertElementIndex(elementIndex);
    return Tr2RuntimeInstanceData._cloneValue(this._rows[index][elementIndex]);
  }

  /**
   * Validates and stores a single element of one row, patching only that
   * element's bytes in the packed buffer.
   *
   * @adapted
   */
  @be.mapMethod()
  @meta.invalidates("#dirty")
  SetItemElement(index, elementIndex, value)
  {
    this._assertItemIndex(index);
    this._assertElementIndex(elementIndex);
    const normalized = Tr2RuntimeInstanceData._normalizeElementValue(
      this._elements[elementIndex],
      value,
      `Instance ${index} element ${elementIndex}`
    );
    this._rows[index][elementIndex] = normalized;
    this._writeElement(new DataView(this._data), index, elementIndex, normalized);
    this._dirty = true;
  }

  /**
   * Publishes pending bytes to the shared AL allocation (cpp:442-458).
   * The JS dirty/revision counters also track publication before device setup.
   *
   * Prepares now when the stream is not valid, as Carbon does (cpp:454-457),
   * rather than on first use: the caller publishes rows so that the instanced
   * mesh draws them, and preparing is what allocates the shared range and
   * uploads the packed bytes into it. IsGood then lists and stamps the provider as in
   * use, since published rows are about to be drawn; one published and never
   * drawn is still released by the sweep, and its CPU rows survive for the next
   * prepare (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 2).
   *
   * @adapted
   */
  @be.mapMethodAndWrap()
  UpdateData()
  {
    if (!this._dirty)
    {
      return false;
    }
    if (this._data)
    {
      if (this._allocation && this._allocation.IsValid())
      {
        const context = Tr2RenderContext_GetMainThreadRenderContext();
        if (Failed(this._allocation.Update(this._bytes, context))) return false;
      }
      else if (!this.PrepareResources()) return false;
      this.IsGood();
    }
    this._dirty = false;
    this._dataRevision++;
    return true;
  }

  /**
   * Recomputes the box from the first POSITION element with at least three
   * components; returns false without touching it when the box was set
   * explicitly, and zeroes the box when there is no such element or no
   * instances.
   *
   * @adapted
   */
  @be.mapMethodAndWrap()
  UpdateBoundingBox()
  {
    if (this.explicitBoundingBox)
    {
      return false;
    }

    const positionIndex = this._elements.findIndex(element =>
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
    for (const row of this._rows)
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
   *
   * @adapted
   */
  @be.mapMethodAndWrap()
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
   *
   * @implemented
   * @param {vec3} [minBounds] Caller-owned destination for the minimum.
   * @param {vec3} [maxBounds] Caller-owned destination for the maximum.
   * @returns {boolean|{min: vec3, max: vec3}} True when written into the out vectors, otherwise a new { min, max } pair.
   */
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
   *
   * @implemented
   */
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    return this.GetBoundingBox();
  }

  /**
   * Number of packed instance rows.
   *
   * @implemented
   */
  GetCount()
  {
    return this.count;
  }

  /**
   * Byte size of one packed row, summed from the element layout.
   *
   * @implemented
   */
  GetStride()
  {
    return this._stride;
  }

  /**
   * A copy of the packed instance bytes, or null when no rows are set; the
   * caller owns the returned array.
   *
   * @adapted
   */
  GetData()
  {
    return this._data ? new Uint8Array(this._data) : null;
  }

  /**
   * Both a declaration and a valid allocation are required (cpp:239-242).
   *
   * @implemented
   */
  IsInstanceDataReady()
  {
    return this._vertexDeclaration !== Tr2EffectStateManager.Unknown &&
      this._allocation !== null && this._allocation.IsValid();
  }

  /**
   * Borrowed AL buffer and physical row slice (cpp:244-250).
   *
   * @implemented
   */
  GetInstanceData(_bufferIndex = 0, _screenSize = 0)
  {
    this._instanceData.buffer = this._allocation ? this._allocation.GetBuffer() : null;
    this._instanceData.offset = this._allocation ? this._allocation.GetOffset() : 0;
    this._instanceData.stride = this._stride;
    this._instanceData.count = this.count;
    return this._instanceData;
  }

  /**
   * The registered instance-stream declaration handle (cpp:260-263).
   *
   * @implemented
   */
  GetInstanceBufferVertexDeclaration(_bufferIndex = 0)
  {
    return this._vertexDeclaration;
  }

  /**
   * Borrowed instance AL buffer (cpp:278-281).
   *
   * @implemented
   */
  GetGpuBuffer(_bufferIndex = 0)
  {
    return this._allocation ? this._allocation.GetBuffer() : null;
  }

  /**
   * Drops every row and the packed buffer while keeping the layout, and marks
   * the data dirty.
   *
   * @adapted
   */
  @meta.invalidates("#dirty")
  DestroyData()
  {
    this._freeAllocation();
    this._rows = [];
    this._data = null;
    this._bytes = null;
    this.count = 0;
    this._dirty = true;
  }

  /**
   * Replaces the target particle system with particles decoded from the CPU
   * instance rows.
   *
   * @adapted Maps Carbon vertex semantics into the maintained CPU particle-system
   *   declaration without GPU buffers.
   */
  @be.mapMethodAndWrap()
  Spawn()
  {
    const particleSystem = this.particleSystem;
    if (!particleSystem?.isValid || !this._elements.length || !this._data)
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
      const usage = Tr2RuntimeInstanceData._particleUsageToVertexUsage(element.elementType);
      const usageIndex = element.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
        ? element.usageIndex
        : 0;
      const layoutIndex = this._elements.findIndex(item =>
        item.usage === usage && item.usageIndex === usageIndex
      );
      if (layoutIndex === -1)
      {
        return;
      }

      const layout = this._elements[layoutIndex];
      if (layout.baseType !== "FLOAT32" || layout.componentCount < element.dimension)
      {
        return;
      }
      mappings.push({ element, layoutIndex });
    }

    particleSystem.ClearParticles();
    for (const row of this._rows)
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
   *
   * @implemented
   */
  Update(_arguments)
  {
  }

  /**
   * Implements ITr2GenericEmitter. Does nothing as this emitter only emits
   * particles on demand (Spawn); both Carbon overloads are deliberate no-ops.
   *
   * @implemented
   */
  SpawnParticles(_arguments, _position = null, _velocity = null, _rateModifier = 1)
  {
  }

  /**
   * Carbon's start/end SpawnParticles overload; also a deliberate no-op.
   *
   * @implemented
   */
  SpawnParticles__StartEnd(_arguments, _positionStart, _positionEnd, _velocityStart, _velocityEnd, _deltaTime)
  {
  }

  /**
   * Implements ITr2GenericEmitter. Nothing to prepare - this emitter never
   * spawns from the threaded particle update.
   *
   * @implemented
   */
  SetThreadSafeFlag()
  {
  }

  /**
   * Carbon's CMF writer requires the native resource-path and file encoder.
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SaveToCMF(...args)
  {
    throw new Error("Tr2RuntimeInstanceData.SaveToCMF is not implemented in CarbonEngineJS.");
  }

  /**
   * Carbon's Granny writer requires the native Granny SDK and filesystem.
   *
   * @notImplemented
   */
  @be.mapMethodAndWrap()
  SaveToGranny(...args)
  {
    throw new Error("Tr2RuntimeInstanceData.SaveToGranny is not implemented in CarbonEngineJS.");
  }

  /**
   * Builds and publishes Carbon's common current/previous-transform instance stream.
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

    // Carbon sets the layout once (ConfigureInstanceData, EveChildInstanceMeshRenderer.cpp:334-352)
    // and each update copies into the same stream (GetData + memcpy + UpdateData, :354-380). With the
    // layout and count unchanged, write in place; only a new count repacks.
    if (this._transformLayout && this._view && instances.length && this.count === instances.length)
    {
      return this._updateTransformInstances(instances);
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

      const currentRows = Tr2RuntimeInstanceData._packTransform(transform);
      const previousRows = Tr2RuntimeInstanceData._packTransform(previousTransform);
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
    this._transformLayout = true;
    this.SetData(rows);
    this.SetBoundingBox(
      instances.length ? min : Tr2RuntimeInstanceData._zero,
      instances.length ? max : Tr2RuntimeInstanceData._zero
    );
    this.UpdateData();
    return maxScale;
  }

  /**
   * Normalizes each element descriptor, assigns sequential byte offsets and sets
   * the Tr2VertexDefinition they describe, which is Carbon's PySetElementLayout
   * (Tr2RuntimeInstanceData_Blue.cpp:11-75).
   */
  _setElementLayout(layout)
  {
    if (!Array.isArray(layout))
    {
      throw new TypeError("Element layout must be an array");
    }

    let offset = 0;
    const normalized = layout.map((value, index) =>
    {
      const descriptor = Tr2RuntimeInstanceData._normalizeElement(value, index, offset);
      offset += descriptor.byteSize;
      return descriptor;
    });

    const definition = new Tr2VertexDefinition();
    definition.Add__Items(normalized.map(element => ({ type: element.type, usage: element.usageCode, usageIndex: element.usageIndex })));

    this.SetLayout(definition);
    this._elements = normalized;
    this._stride = offset;
    this._transformLayout = false;
  }

  /**
   * SetTransformInstances for an unchanged layout and count: rewrites the
   * existing rows and packed bytes in place and updates the live allocation,
   * allocating nothing. Validation and results match the repacking path.
   *
   * @param {Array<object|ArrayLike<number>>} instances As SetTransformInstances.
   * @returns {number} Maximum instance scale.
   */
  _updateTransformInstances(instances)
  {
    const min = Tr2RuntimeInstanceData._scratchMin, max = Tr2RuntimeInstanceData._scratchMax;
    min[0] = min[1] = min[2] = Number.POSITIVE_INFINITY;
    max[0] = max[1] = max[2] = Number.NEGATIVE_INFINITY;
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

      const row = this._rows[index];
      Tr2RuntimeInstanceData._packTransformInto(transform, row, 0, index);
      Tr2RuntimeInstanceData._packTransformInto(previousTransform, row, 3, index);
      row[6] = Number(value?.boneIndex ?? 0) | 0;
      this._writeRow(this._view, index, row);

      for (let axis = 0; axis < 3; axis++)
      {
        const component = Number(transform[12 + axis]) || 0;
        if (component < min[axis]) min[axis] = component;
        if (component > max[axis]) max[axis] = component;
      }
      for (let axis = 0; axis < 3; axis++)
      {
        const packed = row[axis];
        maxScale = Math.max(maxScale, Math.hypot(packed[0], packed[1], packed[2]));
      }
    }

    this.SetBoundingBox(min, max);
    this._dirty = true;
    this.UpdateData();
    return maxScale;
  }

  /**
   * Normalizes every row against the layout and packs them into one freshly
   * allocated little-endian buffer.
   */
  _setData(rows)
  {
    if (!this._elements.length)
    {
      throw new Error("SetElementLayout must be called before SetData");
    }
    if (!Array.isArray(rows))
    {
      throw new TypeError("Instance data must be an array");
    }

    const normalizedRows = rows.map((row, index) => this._normalizeRow(row, index));
    const data = normalizedRows.length ? new ArrayBuffer(this._stride * normalizedRows.length) : null;
    const view = data ? new DataView(data) : null;
    for (let index = 0; index < normalizedRows.length; index++)
    {
      this._writeRow(view, index, normalizedRows[index]);
    }

    if (this.count !== normalizedRows.length) this._freeAllocation();
    this._rows = normalizedRows;
    this._data = data;
    this._view = data ? view : null;
    this._bytes = data ? new Uint8Array(data) : null; // alloc: one byte view per repacked instance stream
    this.count = normalizedRows.length;
    this._dirty = true;
  }

  /**
   * Coerces a row given either as an array or as a name-keyed object into layout
   * order and validates each element.
   */
  _normalizeRow(row, rowIndex)
  {
    const values = Array.isArray(row)
      ? row
      : this._elements.map(element => row?.[element.name]);
    if (values.length !== this._elements.length)
    {
      throw new TypeError(`Instance ${rowIndex} must contain ${this._elements.length} elements`);
    }
    return values.map((value, elementIndex) => Tr2RuntimeInstanceData._normalizeElementValue(
      this._elements[elementIndex],
      value,
      `Instance ${rowIndex} element ${elementIndex}`
    ));
  }

  /** Writes every element of one normalized row into the packed buffer. */
  _writeRow(view, rowIndex, row)
  {
    for (let elementIndex = 0; elementIndex < this._elements.length; elementIndex++)
    {
      this._writeElement(view, rowIndex, elementIndex, row[elementIndex]);
    }
  }

  /**
   * Writes one element at its row and layout offset; a scalar supplied for a
   * four-component INT8/UINT8 element is written as a single packed 32-bit word
   * (the bone-index case).
   */
  _writeElement(view, rowIndex, elementIndex, value)
  {
    const element = this._elements[elementIndex];
    const offset = rowIndex * this._stride + element.offset;
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
      Tr2RuntimeInstanceData._writeComponent(
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
  _assertItemIndex(index)
  {
    if (!Number.isInteger(index) || index < 0 || index >= this.count)
    {
      throw new RangeError("Instance index out of range");
    }
  }

  /** Throws RangeError unless the index is an integer inside the current layout. */
  _assertElementIndex(index)
  {
    if (!Number.isInteger(index) || index < 0 || index >= this._elements.length)
    {
      throw new RangeError("Element index out of range");
    }
  }

  /**
   * Builds a full element descriptor at the given byte offset from either a {
   * usage, usageIndex, type, name } object or Carbon's legacy [particleUsage,
   * usageIndex, componentCount] triple.
   */
  static _normalizeElement(value, index, offset)
  {
    const legacy = Array.isArray(value);
    if (!legacy && (!value || typeof value !== "object"))
    {
      throw new TypeError(`Element ${index} must be a descriptor or legacy triple`);
    }

    const usageValue = legacy
      ? Tr2RuntimeInstanceData._particleUsageToVertexUsage(value[0])
      : value.usage;
    const usage = Tr2RuntimeInstanceData._normalizeUsage(usageValue);
    const usageIndex = Number(legacy ? value[1] : value.usageIndex ?? 0);
    if (!Number.isInteger(usageIndex) || usageIndex < 0 || usageIndex > 15)
    {
      throw new TypeError(`Element ${index} has invalid usageIndex`);
    }

    const type = legacy ? `FLOAT32_${Number(value[2])}` : value.type;
    const typeInfo = Tr2RuntimeInstanceData._normalizeType(type);
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
   * The plain summary of an element descriptor: usage, usage index,
   * type and name.
   */
  static _describeElement(value)
  {
    return {
      usage: value.usage,
      usageIndex: value.usageIndex,
      type: value.type,
      name: value.name
    };
  }

  /**
   * As _packTransform, into a row's existing float4 arrays from `first`, with
   * the repacking path's finiteness check.
   */
  static _packTransformInto(value, row, first, index)
  {
    for (let axis = 0; axis < 3; axis++)
    {
      const target = row[first + axis];
      for (let column = 0; column < 4; column++)
      {
        const component = Number(value[column * 4 + axis]);
        if (!Number.isFinite(component))
        {
          throw new TypeError(`Instance ${index} element ${first + axis} components must be numeric`);
        }
        target[column] = component;
      }
    }
  }

  /**
   * Transposes a column-major 4x4 into the three float4 rows the transform
   * instance stream stores.
   */
  static _packTransform(value)
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
  static _particleUsageToVertexUsage(value)
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
  static _normalizeUsage(value)
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
  static _normalizeType(value)
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
  static _normalizeElementValue(element, value, label)
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
  static _writeComponent(view, offset, baseType, value)
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
  static _cloneValue(value)
  {
    return Array.isArray(value) ? value.slice() : value;
  }

  /**
   * Provider-local TEXCOORD0..6. Tr2InstancedMesh adds the native semantic
   * offset of eight when merging stream 1, producing shader TEXCOORD8..14.
   */
  static TransformLayout = Object.freeze([
    Object.freeze({ usage: "TEXCOORD", usageIndex: 0, type: "FLOAT32_4", name: "transform0" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 1, type: "FLOAT32_4", name: "transform1" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 2, type: "FLOAT32_4", name: "transform2" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 3, type: "FLOAT32_4", name: "lastTransform0" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 4, type: "FLOAT32_4", name: "lastTransform1" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 5, type: "FLOAT32_4", name: "lastTransform2" }),
    Object.freeze({ usage: "TEXCOORD", usageIndex: 6, type: "BYTE_4", name: "boneIndex" })
  ]);

  static _zero = vec3.create();

  /** Scratch bounds for the in-place transform update; copied out by SetBoundingBox. */
  static _scratchMin = vec3.create();
  static _scratchMax = vec3.create();

  static UsageCode = Tr2VertexUsageCode;

  /**
   * The Tr2VertexDefinition::DataType members runtime instance data accepts,
   * with Carbon's values taken from their owner, `Tr2VertexDefinition.DataType`
   * (Tr2VertexDefinition.h:31-120), so the numbering has one home. A subset,
   * not an alias: `#normalizeType` reverse-looks-up a code, and the full map
   * has the DT_ bit members that share those codes (DT_INT8 and BYTE_1 are
   * both 0).
   */
  static DataType = Object.freeze(Object.fromEntries([
    "BYTE_1", "BYTE_2", "BYTE_3", "BYTE_4",
    "UBYTE_1", "UBYTE_2", "UBYTE_3", "UBYTE_4",
    "SHORT_1", "SHORT_2", "SHORT_3", "SHORT_4",
    "USHORT_1", "USHORT_2", "USHORT_3", "USHORT_4",
    "INT32_1", "INT32_2", "INT32_3", "INT32_4",
    "UINT32_1", "UINT32_2", "UINT32_3", "UINT32_4",
    "FLOAT32_1", "FLOAT32_2", "FLOAT32_3", "FLOAT32_4"
  ].map(name => [ name, Tr2VertexDefinition.DataType[name] ])));
}
