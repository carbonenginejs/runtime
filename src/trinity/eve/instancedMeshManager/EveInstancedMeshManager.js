// Source: trinity/trinity/Eve/EveInstancedMeshManager.h
// Source: trinity/trinity/Eve/EveInstancedMeshManager.cpp
//
// The whole manager is ported: registration (handles), CollectMeshes, the
// instance-buffer ring and the draw side - culling, binning, LOD selection,
// instance upload and the batch, shadow and picking gathers (h:97-102,
// 271-282; cpp:509-1000).
//
// Picking is current Carbon's readback framework: GetPickingBatches and
// _GetPickingBatches (h:100, 279; cpp:727-736, 762+). Current Carbon declares
// GetPickedObject (h:101) without a body, so it is not ported.
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { TriGeometryRes } from "#resource/geometry";
import { EveComponentType } from "../EntityComponents.js";
import { Tr2GpuStructuredBuffer } from "../../core/device/Tr2GpuStructuredBuffer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { CjsPerObjectLayouts } from "../../core/rawData/CjsPerObjectLayouts.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/Tr2RenderBatch.js";
import { CreateLodAllocations } from "../../core/mesh/TriGeometryResAllocations.js";
import { Float4x3 } from "../../utilities/Float4x3.js";
import { TriVariableContentType, TriFrustumTestResult, Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { EveChildInstancedMeshInstance } from "../child/EveChildInstancedMeshes/EveChildInstancedMeshInstance.js";
import { EveInstancedMeshManagerInstanceFlags } from "./EveInstancedMeshManagerInstanceFlags.js";
import { EveInstancedMeshManagerDynamicPerInstanceData } from "./EveInstancedMeshManagerDynamicPerInstanceData.js";
import { EveInstancedMeshManagerDataHandle } from "./EveInstancedMeshManagerDataHandle.js";
import { EveInstancedMeshManagerStaticPerInstanceBufferElement } from "./EveInstancedMeshManagerStaticPerInstanceBufferElement.js";
import { EveInstancedMeshManagerDynamicPerInstanceBufferElement } from "./EveInstancedMeshManagerDynamicPerInstanceBufferElement.js";
import { EveInstancedMeshManagerMeshKey } from "./EveInstancedMeshManagerMeshKey.js";
import { EveInstancedMeshManagerMeshGroup } from "./EveInstancedMeshManagerMeshGroup.js";
import { EveInstancedMeshManagerInstanceBuffer } from "./EveInstancedMeshManagerInstanceBuffer.js";
import { EveInstancedMeshManagerMeshData } from "./EveInstancedMeshManagerMeshData.js";
import { EveInstancedMeshManagerKeyHasher } from "./EveInstancedMeshManagerKeyHasher.js";
import { EveInstancedMeshManagerSphereGroup } from "./EveInstancedMeshManagerSphereGroup.js";
import { EveInstancedMeshManagerPickingPerObjectData } from "./EveInstancedMeshManagerPickingPerObjectData.js";


/** SLOTS_PER_LOD (cpp:43): each LOD bins plain and mirrored instances separately. */
const SLOTS_PER_LOD = 2;

const CENTER_SCRATCH = vec3.create();

const DIAGONAL_SCRATCH = vec3.create();

/** sizeof( EveSpacePerObjectData ) in bytes, read once from the per-object layout catalogue. */
let s_perObjectDataSize = 0;

/**
 * The byte size of one EveSpacePerObjectData, the structured buffer's stride.
 *
 * Carbon's `sizeof( EveSpacePerObjectData )` (cpp:95, 102-103) is a
 * compile-time constant; ours is the catalogued layout's stride, in floats,
 * times four. It is read on first use because the catalogue registers its
 * layouts at module load.
 * @returns {number}
 */
function SizeofEveSpacePerObjectData()
{
  if (s_perObjectDataSize === 0)
  {
    s_perObjectDataSize = CjsPerObjectLayouts.ToRawLayout("EveSpacePerObjectData").stride * 4;
  }
  return s_perObjectDataSize;
}

/**
 * Carbon `m_meshInstances[key]` (cpp:261, 325): the key's MeshData, inserted
 * default-constructed when the key is new. Entries are Carbon's map
 * value_type, `[key, meshData]`.
 * @param {Map<string, Array>} meshInstances The manager's map.
 * @param {EveInstancedMeshManagerMeshKey} key The key.
 * @returns {EveInstancedMeshManagerMeshData}
 */
function FindOrInsert(meshInstances, key)
{
  const hash = EveInstancedMeshManagerKeyHasher.hash(key);
  let entry = meshInstances.get(hash);
  if (entry === undefined)
  {
    entry = [ key, new EveInstancedMeshManagerMeshData() ];
    meshInstances.set(hash, entry);
  }
  return entry[1];
}

/**
 * The LOD records of a decoded mesh. Carbon's mesh data always holds a
 * `m_lods` vector; our CPU geometry payload may flatten a single-LOD mesh,
 * which is then its own only LOD - the rule TriGeometryRes applies in
 * GetLodIndexForScreenSize and GetMeshLod__LodIndex.
 * @param {object} meshData A decoded mesh record.
 * @returns {Array<object>}
 */
function MeshLods(meshData)
{
  return meshData.lods?.length ? meshData.lods : [ meshData ];
}

/** SCREEN_SIZE_THRESHOLD (cpp:20): an instance smaller than this many pixels is not drawn. */
const SCREEN_SIZE_THRESHOLD = 5.0;

/** SHADOW_SIZE_THRESHOLD (cpp:21): an instance smaller than this in the shadow map casts no shadow. */
const SHADOW_SIZE_THRESHOLD = 5.0;

/** Carbon's `Vector4( sphere.center, sphere.radius )` (cpp:619, 631, 633), the packed sphere the shadow frustum reads. */
const PACKED_SPHERE_SCRATCH = vec4.create();

/** Packs one static instance's mat4 into Carbon's Float4x3 (UploadLodData). */
const FLOAT4X3_SCRATCH = new Float4x3();

/**
 * Carbon's file-local FindBatchAccumulator (cpp:30-41): the accumulator
 * paired with a batch type, or null when the caller asked for none.
 * @param {Array<[number, object]>} batches Carbon's initializer_list / vector of `pair<TriBatchType, ITriRenderBatchAccumulator&>`, as `[batchType, accumulator]` pairs.
 * @param {number} batchType A TriBatchType value.
 * @returns {object|null} The ITriRenderBatchAccumulator.
 */
function FindBatchAccumulator(batches, batchType)
{
  for (const pair of batches)
  {
    if (pair[0] === batchType)
    {
      return pair[1];
    }
  }
  return null;
}

/**
 * Carbon's file-local LodSlot (cpp:45-48): the lodIndices slot of a LOD,
 * plain instances first and mirrored instances second.
 * @param {number} lod
 * @param {boolean} mirrored
 * @returns {number}
 */
function LodSlot(lod, mirrored)
{
  return lod * SLOTS_PER_LOD + (mirrored ? 1 : 0);
}

/**
 * Carbon's file-local GetLodSlotDraw (cpp:58-67): the draw of one LOD slot of
 * a mesh area run, as Carbon's file-local LodSlotDraw struct (cpp:50-56) -
 * `lodData`, `primCount`, `indexRange` and `valid`, with Carbon's defaults.
 * `indexRange` is Carbon's TriGeometryAreaIndexRange (TriGeometryRes.h:226-231):
 * the index allocation to bind, the first index, and whether the range exists.
 * The struct is a plain record here because it never leaves this file. The slot's LOD is `slot / SLOTS_PER_LOD`; an odd slot holds
 * mirrored instances, whose winding flips against the area's own.
 *
 * Adapted:
 * - The LOD's allocations are realized here through CreateLodAllocations, as
 *   Tr2InstancedMesh and EveTurretSet do. Carbon realizes them when the
 *   resource loads, but our resource layer cannot reach the AL. A LOD that
 *   cannot be realized gives an invalid draw.
 * - GetPrimitiveCount is TriGeometryRes.getPrimitiveCount. GetAreaIndexRange
 *   (TriGeometryRes.cpp:202-219) is read through Tr2RenderBatch.resolveDrawArguments,
 *   the one place our port keeps that arithmetic; `indices` is the allocation
 *   Carbon's range points at, the reversed one for a reversed draw.
 * - A LOD index past the mesh's LODs gives an invalid draw where Carbon would
 *   dereference null. It cannot happen from the manager, whose slots come
 *   from the mesh's LOD count.
 * @param {TriGeometryRes} geometry
 * @param {number} meshIndex
 * @param {number} areaIndex
 * @param {number} areaCount
 * @param {boolean} areaReversed
 * @param {number} slot A lodIndices slot.
 * @param {Tr2RenderContext} renderContext The context CreateLodAllocations allocates through.
 * @returns {{lodData: object|null, primCount: number, indexRange: {indices: object|null, startIndex: number, valid: boolean}, valid: boolean}}
 */
function GetLodSlotDraw(geometry, meshIndex, areaIndex, areaCount, areaReversed, slot, renderContext)
{
  const draw = { lodData: null, primCount: 0, indexRange: { indices: null, startIndex: 0, valid: false }, valid: false };
  draw.lodData = geometry.GetMeshLod__LodIndex(meshIndex, Math.trunc(slot / SLOTS_PER_LOD));
  if (!draw.lodData || !CreateLodAllocations(geometry, meshIndex, draw.lodData, renderContext))
  {
    return draw;
  }

  draw.primCount = TriGeometryRes.getPrimitiveCount(draw.lodData, areaIndex, areaCount);
  const reversed = areaReversed !== ((slot % SLOTS_PER_LOD) !== 0);
  const resolved = Tr2RenderBatch.resolveDrawArguments(draw.lodData, areaIndex, areaCount, reversed);
  if (resolved !== null)
  {
    draw.indexRange.indices = reversed ? draw.lodData.reversedIndexAllocation : draw.lodData.indexAllocation;
    draw.indexRange.startIndex = resolved.startIndexLocation;
    draw.indexRange.valid = true;
  }
  draw.valid = draw.primCount !== 0 && draw.indexRange.valid;
  return draw;
}


/**
 * Carbon EveInstancedMeshManager (EveInstancedMeshManager.h:10-293): the
 * scene-owned collector of instanced meshes. Providers - components
 * registered as "InstancedMeshProvider" - register three kinds of data with
 * it and keep the handles it returns: per-object data (one shader record per
 * provider, uploaded each frame into one structured buffer), bounding-sphere
 * groups (an enclosing sphere, flags and per-instance cull spheres), and mesh
 * groups (one mesh area, its material and the provider's instance array).
 * Mesh groups that share a MeshKey share one MeshData, so their instances
 * draw together.
 *
 * Handles: Carbon fills a caller-owned `DataHandle&` out-parameter; here the
 * Add* methods return the handle (agent rule 11: an output pointer becomes
 * the return value) and the provider stores it. Removal is swap-with-back
 * in every container, so the handle of the element moved into the freed slot
 * is patched, and so is every mesh group that referenced the moved slot.
 */
@blue.define("EveInstancedMeshManager")
export class EveInstancedMeshManager
{

  /** Carbon EveInstancedMeshManager::InstanceFlags (h:13-26). */
  static InstanceFlags = EveInstancedMeshManagerInstanceFlags;

  /** Carbon EveInstancedMeshManager::DynamicPerInstanceData (h:28-36). */
  static DynamicPerInstanceData = EveInstancedMeshManagerDynamicPerInstanceData;

  /**
   * Carbon EveInstancedMeshManager::StaticPerInstanceData (h:38-45). Its
   * port is EveChildInstancedMeshInstance, the record EveChildInstancedMeshes
   * persists per instance.
   */
  static StaticPerInstanceData = EveChildInstancedMeshInstance;

  /** Carbon EveInstancedMeshManager::DataHandle<T> (h:46-91). */
  static DataHandle = EveInstancedMeshManagerDataHandle;

  /** Carbon `using PerObjectDataHandle = DataHandle<struct PerObjectDataTag>` (h:93). */
  static PerObjectDataHandle = EveInstancedMeshManagerDataHandle;

  /** Carbon `using BoundingSphereHandle = DataHandle<struct BoundingSphereTag>` (h:94). */
  static BoundingSphereHandle = EveInstancedMeshManagerDataHandle;

  /** Carbon `using MeshGroupHandle = DataHandle<struct MeshGroupTag>` (h:95). */
  static MeshGroupHandle = EveInstancedMeshManagerDataHandle;

  /** Carbon EveInstancedMeshManager::StaticPerInstanceBufferElement (private, h:150-156). */
  static StaticPerInstanceBufferElement = EveInstancedMeshManagerStaticPerInstanceBufferElement;

  /** Carbon EveInstancedMeshManager::DynamicPerInstanceBufferElement (private, h:158-165). */
  static DynamicPerInstanceBufferElement = EveInstancedMeshManagerDynamicPerInstanceBufferElement;

  /** Carbon EveInstancedMeshManager::MeshKey (private, h:167-189). */
  static MeshKey = EveInstancedMeshManagerMeshKey;

  /** Carbon EveInstancedMeshManager::MeshGroup (private, h:191-204). */
  static MeshGroup = EveInstancedMeshManagerMeshGroup;

  /** Carbon EveInstancedMeshManager::InstanceBuffer (private, h:206-235). */
  static InstanceBuffer = EveInstancedMeshManagerInstanceBuffer;

  /** Carbon EveInstancedMeshManager::MeshData (private, h:237-249). */
  static MeshData = EveInstancedMeshManagerMeshData;

  /** Carbon EveInstancedMeshManager::KeyHasher (private, h:251-258). */
  static KeyHasher = EveInstancedMeshManagerKeyHasher;

  /** Carbon EveInstancedMeshManager::SphereGroup (private, h:260-269). */
  static SphereGroup = EveInstancedMeshManagerSphereGroup;

  /**
   * m_meshInstances (std::unordered_map<MeshKey, MeshData, KeyHasher>, h:285).
   * A Map from KeyHasher.hash(key) to Carbon's value_type `[key, meshData]`;
   * see EveInstancedMeshManagerKeyHasher for why the key is a string.
   */
  @type.unknown
  _meshInstances = new Map();

  /**
   * m_perObjectData (std::vector<std::pair<const EveSpacePerObjectData*,
   * PerObjectDataHandle*>>, h:286): each entry `[data, handle]`, `data` the
   * provider's EveSpacePerObjectData RawData record, read in place.
   */
  @type.unknown
  _perObjectData = [];

  /** m_sphereGroups (std::vector<SphereGroup>, h:287). */
  @type.list("EveInstancedMeshManagerSphereGroup")
  _sphereGroups = [];

  /** m_perObjectDataBuffer (Tr2GpuStructuredBufferPtr, h:288): created on the first frame with per-object data. */
  @type.rootRef("Tr2GpuStructuredBuffer")
  _perObjectDataBuffer = null;

  /** m_staticInstanceBuffer (InstanceBuffer, h:289), embedded by value. */
  @type.rawStruct("EveInstancedMeshManagerInstanceBuffer")
  _staticInstanceBuffer = new EveInstancedMeshManagerInstanceBuffer();

  /** m_dynamicInstanceBuffer (InstanceBuffer, h:290), embedded by value. */
  @type.rawStruct("EveInstancedMeshManagerInstanceBuffer")
  _dynamicInstanceBuffer = new EveInstancedMeshManagerInstanceBuffer();

  /** m_instanceCount (size_t, h:292): instances across every mesh group. */
  @type.uint64
  _instanceCount = 0;

  /**
   * Carbon CollectMeshes (cpp:71-121): frees the instance-buffer regions of
   * frames the device has finished, asks every "InstancedMeshProvider" to
   * register what it has not yet registered, uploads every registered
   * per-object record into the structured buffer (growing it to at least
   * twice its size when it is too small), and publishes the buffer as the
   * global "InstancedPerObjectBuffer".
   *
   * Adapted:
   * - The registry takes the component name, as EveComponentRegistry's
   *   ProcessComponents does, because JavaScript has no template
   *   specialization to resolve it from IEveInstanceMeshProvider.
   * - `Tr2GpuStructuredBuffer.Create` takes the render context as an added
   *   argument (its own JSDoc gives the reason).
   * - The upload is guarded: Carbon's GetGpuBuffer returns a value member
   *   that always exists, ours returns null until a create succeeds, and a
   *   failed map hands back no bytes. Carbon would write through a null
   *   pointer in either case; this port skips the copy.
   * - Each record's bytes are copied with one Float32Array view over the
   *   mapping where Carbon memcpys `sizeof( EveSpacePerObjectData )` per
   *   record; the bytes are identical.
   * - The CCP_STATS counters (cpp:107, 112-115, 119-120) have no JavaScript
   *   counterpart and are omitted.
   * @param {EveComponentRegistry} registry The scene's component registry.
   */
  @blue.method
  @meta.adapted
  CollectMeshes(registry)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    const renderedFrame = renderContext.GetRenderedFrameNumber();
    this._staticInstanceBuffer.TrimRegions(renderedFrame);
    this._dynamicInstanceBuffer.TrimRegions(renderedFrame);

    registry.ProcessComponents(EveComponentType.InstancedMeshProvider, meshes =>
    {
      meshes.AddMeshesToManager(this);
    });

    if (this._perObjectData.length !== 0)
    {
      if (!this._perObjectDataBuffer)
      {
        this._perObjectDataBuffer = new Tr2GpuStructuredBuffer();
      }
      const stride = SizeofEveSpacePerObjectData();
      const count = this._perObjectData.length >>> 0;
      if (this._perObjectDataBuffer.GetCount() < count)
      {
        const newCount = Math.max(count, (this._perObjectDataBuffer.GetCount() * 2) >>> 0);
        this._perObjectDataBuffer.Create(newCount, stride, Tr2GpuStructuredBuffer.CreationFlag.CPU_WRITABLE, renderContext);
      }

      const gpuBuffer = this._perObjectDataBuffer.GetGpuBuffer(0);
      const mapped = gpuBuffer === null ? null : gpuBuffer.MapForWriting(renderContext).data;
      if (mapped !== null)
      {
        const floats = new Float32Array(mapped.buffer, mapped.byteOffset, mapped.byteLength >>> 2); // alloc: one view over this frame's mapping.
        const floatsPerRecord = stride >>> 2;
        let mappedData = 0;
        for (const pod of this._perObjectData)
        {
          floats.set(pod[0].GetData(), mappedData);
          mappedData += floatsPerRecord;
        }
        gpuBuffer.UnmapForWriting(renderContext);
      }
    }

    Tr2VariableStore.globalStore().RegisterVariableInternal("InstancedPerObjectBuffer", TriVariableContentType.TRIVARIABLE_GPUBUFFER, this._perObjectDataBuffer);
  }

  /**
   * Carbon AddPerObjectData (cpp:123-133): appends the provider's per-object
   * record and points the handle at its slot.
   *
   * Adapted: Carbon fills the caller's handle, asserting and guarding that it
   * is empty; the handle here is created by the call and returned (rule 11),
   * so it is always empty and the guard always passes.
   * @param {RawData} data The provider's EveSpacePerObjectData record, read in place each frame.
   * @returns {EveInstancedMeshManagerDataHandle} The PerObjectDataHandle.
   */
  @blue.method
  @meta.adapted
  AddPerObjectData(data)
  {
    const handle = new EveInstancedMeshManagerDataHandle();

    const offset = this._perObjectData.length >>> 0;
    this._perObjectData.push([ data, handle ]);
    handle.index = offset;
    handle.owner = this;

    return handle;
  }

  /**
   * Carbon RemovePerObjectData (cpp:135-158): swaps the last record into the
   * removed slot - first re-pointing every mesh group that used the last
   * slot - patches the moved record's handle, and invalidates the handle.
   *
   * Carbon quirks, reproduced: unlike the other two removals there is no
   * assert or validity guard, so the handle must be valid; and only `index`
   * is reset - `owner` keeps pointing at this manager.
   * @param {EveInstancedMeshManagerDataHandle} handle A valid PerObjectDataHandle.
   */
  @blue.method
  @meta.implemented
  RemovePerObjectData(handle)
  {
    const oldPerObjectDataIndex = this._perObjectData[this._perObjectData.length - 1][1].index;
    const newPerObjectDataIndex = handle.index;
    if (oldPerObjectDataIndex !== newPerObjectDataIndex)
    {
      for (const [ , mesh ] of this._meshInstances.values())
      {
        for (const group of mesh.meshGroups)
        {
          if (group.perObjectDataIndex === oldPerObjectDataIndex)
          {
            group.perObjectDataIndex = newPerObjectDataIndex;
          }
        }
      }
    }

    const back = this._perObjectData.length - 1;
    const moved = this._perObjectData[back];
    this._perObjectData[back] = this._perObjectData[handle.index];
    this._perObjectData[handle.index] = moved;
    this._perObjectData[handle.index][1].index = handle.index;
    this._perObjectData.pop();

    handle.index = EveInstancedMeshManagerDataHandle.invalidIndex;
  }

  /**
   * Carbon AddBoundingSphereGroup (cpp:169-184): appends a sphere group,
   * copying the enclosing sphere and flags and keeping the provider's
   * per-instance sphere array, with one zeroed screen size per sphere.
   *
   * Adapted: the handle is created and returned rather than filled (rule 11),
   * so Carbon's empty-handle assert and guard always pass.
   * @param {{center: vec3, radius: number}} bounds The group's enclosing sphere, copied.
   * @param {EveInstancedMeshManagerInstanceFlags} flags The group's flags, copied.
   * @param {Array<{center: vec3, radius: number}>} boundingSpheres The provider's per-instance spheres, read in place.
   * @param {number} count The number of spheres.
   * @returns {EveInstancedMeshManagerDataHandle} The BoundingSphereHandle.
   */
  @blue.method
  @meta.adapted
  AddBoundingSphereGroup(bounds, flags, boundingSpheres, count)
  {
    const handle = new EveInstancedMeshManagerDataHandle();

    const group = new EveInstancedMeshManagerSphereGroup();
    this._sphereGroups.push(group);
    vec3.copy(group.bounds.center, bounds.center);
    group.bounds.radius = bounds.radius;
    group.flags.flags = flags.flags;
    group.count = count >>> 0;
    group.boundingSpheres = boundingSpheres;
    group.handle = handle;
    group.screenSizes = new Float32Array(count); // alloc: Carbon's screenSizes.resize( count, 0.0f ).
    handle.owner = this;
    handle.index = (this._sphereGroups.length - 1) >>> 0;

    return handle;
  }

  /**
   * Carbon RemoveBoundingSphereGroup (cpp:186-213): swaps the last sphere
   * group into the removed slot - first re-pointing every mesh group that
   * used the last slot - patches the moved group's handle, and empties the
   * handle (index and owner). Nothing happens for an empty handle.
   * @param {EveInstancedMeshManagerDataHandle} handle The BoundingSphereHandle.
   */
  @blue.method
  @meta.implemented
  RemoveBoundingSphereGroup(handle)
  {
    if (handle.IsValid())
    {
      const oldSphereGroupIndex = this._sphereGroups[this._sphereGroups.length - 1].handle.index;
      const newSphereGroupIndex = handle.index;
      if (oldSphereGroupIndex !== newSphereGroupIndex)
      {
        for (const [ , mesh ] of this._meshInstances.values())
        {
          for (const group of mesh.meshGroups)
          {
            if (group.sphereGroupIndex === oldSphereGroupIndex)
            {
              group.sphereGroupIndex = newSphereGroupIndex;
            }
          }
        }
      }

      const back = this._sphereGroups.length - 1;
      const moved = this._sphereGroups[back];
      this._sphereGroups[back] = this._sphereGroups[handle.index];
      this._sphereGroups[handle.index] = moved;
      this._sphereGroups[handle.index].handle.index = handle.index;
      this._sphereGroups.pop();
      handle.index = EveInstancedMeshManagerDataHandle.invalidIndex;
      handle.owner = null;
    }
  }

  /**
   * Carbon SetSphereGroupBounds (cpp:215-220): copies a new enclosing sphere
   * and flags into the handle's sphere group.
   * @param {EveInstancedMeshManagerDataHandle} handle A valid BoundingSphereHandle.
   * @param {{center: vec3, radius: number}} bounds The group's enclosing sphere, copied.
   * @param {EveInstancedMeshManagerInstanceFlags} flags The group's flags, copied.
   */
  @blue.method
  @meta.implemented
  SetSphereGroupBounds(handle, bounds, flags)
  {
    const group = this._sphereGroups[handle.index];
    vec3.copy(group.bounds.center, bounds.center);
    group.bounds.radius = bounds.radius;
    group.flags.flags = flags.flags;
  }

  /**
   * Carbon's bare AddMeshGroup (h:113-145). Its two overloads differ in the
   * C++ type of the instance array - `DynamicPerInstanceData*` against
   * `StaticPerInstanceData*` - and the static one inserts `areaReversed`
   * after `areaCount`. The array's element type, which is what tells them
   * apart, is invisible to JavaScript, so this name throws rather than
   * guessing from how many arguments a caller passed.
   * @throws {TypeError} Always.
   */
  @blue.method
  @meta.notSupported
  AddMeshGroup()
  {
    throw new TypeError("EveInstancedMeshManager.AddMeshGroup cannot tell its overloads apart in JavaScript; call AddMeshGroup__DynamicPerInstanceData or AddMeshGroup__StaticPerInstanceData.");
  }

  /**
   * Carbon's dynamic AddMeshGroup (h:113-128, cpp:231-293): registers a
   * provider's dynamic instance array under its MeshKey - never
   * winding-reversed, and flagged dynamic so its instances use the dynamic
   * buffer layout. The first registration of a key fills the MeshData's
   * bounding radius and per-LOD screen-size thresholds from the geometry.
   *
   * Adapted: the handle is created and returned (rule 11); Carbon's three
   * debug asserts (empty handle, valid per-object and sphere handles) are not
   * ported. The mesh's LOD list follows our geometry payload's flattening
   * (MeshLods). The picking owner is the JavaScript object itself, Carbon's
   * IRoot.
   * @param {TriGeometryRes} geometry
   * @param {number} combinedVertexDeclaration
   * @param {number} batchType A TriBatchType value.
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @param {number} areaCount
   * @param {Tr2Effect} material
   * @param {number} materialHash
   * @param {EveInstancedMeshManagerDataHandle} perObjectDataHandle A valid PerObjectDataHandle.
   * @param {EveInstancedMeshManagerDataHandle} sphereHandle A valid BoundingSphereHandle.
   * @param {Array<EveInstancedMeshManagerDynamicPerInstanceData>} perInstanceData The provider's instances, read in place.
   * @param {number} count
   * @param {object} pickingOwner
   * @param {number} pickingOwnerIndex
   * @returns {EveInstancedMeshManagerDataHandle} The MeshGroupHandle.
   */
  @blue.method
  @meta.adapted
  AddMeshGroup__DynamicPerInstanceData(geometry, combinedVertexDeclaration, batchType, meshIndex, areaIndex, areaCount, material, materialHash, perObjectDataHandle, sphereHandle, perInstanceData, count, pickingOwner, pickingOwnerIndex)
  {
    const handle = new EveInstancedMeshManagerDataHandle();

    const key = new EveInstancedMeshManagerMeshKey();
    key.geometry = geometry;
    key.materialHash = materialHash;
    key.combinedVertexDeclaration = combinedVertexDeclaration >>> 0;
    key.batchType = batchType;
    key.meshIndex = meshIndex >>> 0;
    key.areaIndex = areaIndex >>> 0;
    key.areaCount = areaCount >>> 0;
    key.areaReversed = false;
    key.isDynamic = true;
    const instances = FindOrInsert(this._meshInstances, key);
    instances.material = material;
    if (instances.radius === 0)
    {
      const meshData = geometry.GetMeshData(meshIndex);
      const center = vec3.scale(CENTER_SCRATCH, vec3.add(CENTER_SCRATCH, meshData.minBounds, meshData.maxBounds), 0.5);
      const radius = vec3.length(vec3.subtract(DIAGONAL_SCRATCH, meshData.maxBounds, meshData.minBounds)) * 0.5;
      instances.radius = radius + vec3.length(center);
    }
    if (instances.lodIndices.length === 0)
    {
      const lods = MeshLods(geometry.GetMeshData(meshIndex));
      const lodCount = lods.length;
      for (let slot = 0; slot < SLOTS_PER_LOD * lodCount; ++slot)
      {
        instances.lodIndices.push([]);
      }
      instances.screenSizeThresholds = new Float32Array(lodCount); // alloc: Carbon's screenSizeThresholds.resize( lodCount ).
      for (let lod = 0; lod < lodCount; ++lod)
      {
        instances.screenSizeThresholds[lod] = lods[lod].maxScreenSize ?? 0;
      }
    }

    const meshGroup = new EveInstancedMeshManagerMeshGroup();
    instances.meshGroups.push(meshGroup);
    meshGroup.perObjectDataIndex = perObjectDataHandle.index;
    meshGroup.sphereGroupIndex = sphereHandle.index;
    meshGroup.dynamicInstances = perInstanceData;
    meshGroup.count = count >>> 0;
    meshGroup.handle = handle;
    meshGroup.owner = pickingOwner;
    meshGroup.ownerIndex = pickingOwnerIndex >>> 0;
    handle.owner = this;
    handle.index = (instances.meshGroups.length - 1) >>> 0;

    this._instanceCount += count;

    return handle;
  }

  /**
   * Carbon's static AddMeshGroup (h:129-145, cpp:295-357): registers a
   * provider's static instance array under its MeshKey, `areaReversed`
   * included. The first registration of a key fills the MeshData's bounding
   * radius and per-LOD screen-size thresholds from the geometry.
   *
   * Adapted: as AddMeshGroup__DynamicPerInstanceData.
   * @param {TriGeometryRes} geometry
   * @param {number} combinedVertexDeclaration
   * @param {number} batchType A TriBatchType value.
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @param {number} areaCount
   * @param {boolean} areaReversed Whether the area's winding is reversed.
   * @param {Tr2Effect} material
   * @param {number} materialHash
   * @param {EveInstancedMeshManagerDataHandle} perObjectDataHandle A valid PerObjectDataHandle.
   * @param {EveInstancedMeshManagerDataHandle} sphereHandle A valid BoundingSphereHandle.
   * @param {Array<EveChildInstancedMeshInstance>} perInstanceData The provider's instances, read in place.
   * @param {number} count
   * @param {object} pickingOwner
   * @param {number} pickingOwnerIndex
   * @returns {EveInstancedMeshManagerDataHandle} The MeshGroupHandle.
   */
  @blue.method
  @meta.adapted
  AddMeshGroup__StaticPerInstanceData(geometry, combinedVertexDeclaration, batchType, meshIndex, areaIndex, areaCount, areaReversed, material, materialHash, perObjectDataHandle, sphereHandle, perInstanceData, count, pickingOwner, pickingOwnerIndex)
  {
    const handle = new EveInstancedMeshManagerDataHandle();

    const key = new EveInstancedMeshManagerMeshKey();
    key.geometry = geometry;
    key.materialHash = materialHash;
    key.combinedVertexDeclaration = combinedVertexDeclaration >>> 0;
    key.batchType = batchType;
    key.meshIndex = meshIndex >>> 0;
    key.areaIndex = areaIndex >>> 0;
    key.areaCount = areaCount >>> 0;
    key.areaReversed = areaReversed;
    const instances = FindOrInsert(this._meshInstances, key);
    instances.material = material;
    if (instances.radius === 0)
    {
      const meshData = geometry.GetMeshData(meshIndex);
      const center = vec3.scale(CENTER_SCRATCH, vec3.add(CENTER_SCRATCH, meshData.minBounds, meshData.maxBounds), 0.5);
      const radius = vec3.length(vec3.subtract(DIAGONAL_SCRATCH, meshData.maxBounds, meshData.minBounds)) * 0.5;
      instances.radius = radius + vec3.length(center);
    }
    if (instances.lodIndices.length === 0)
    {
      const lods = MeshLods(geometry.GetMeshData(meshIndex));
      const lodCount = lods.length;
      for (let slot = 0; slot < SLOTS_PER_LOD * lodCount; ++slot)
      {
        instances.lodIndices.push([]);
      }
      instances.screenSizeThresholds = new Float32Array(lodCount); // alloc: Carbon's screenSizeThresholds.resize( lodCount ).
      for (let lod = 0; lod < lodCount; ++lod)
      {
        instances.screenSizeThresholds[lod] = lods[lod].maxScreenSize ?? 0;
      }
    }

    const meshGroup = new EveInstancedMeshManagerMeshGroup();
    instances.meshGroups.push(meshGroup);
    meshGroup.perObjectDataIndex = perObjectDataHandle.index;
    meshGroup.sphereGroupIndex = sphereHandle.index;
    meshGroup.staticInstances = perInstanceData;
    meshGroup.count = count >>> 0;
    meshGroup.handle = handle;
    meshGroup.owner = pickingOwner;
    meshGroup.ownerIndex = pickingOwnerIndex >>> 0;
    handle.owner = this;
    handle.index = (instances.meshGroups.length - 1) >>> 0;

    this._instanceCount += count;

    return handle;
  }

  /**
   * Carbon RemoveMeshGroup (cpp:359-383): finds the MeshData whose group at
   * the handle's index is this handle's, swaps its last group into the slot,
   * patches the moved group's handle, erases the MeshData once it has no
   * groups, and invalidates the handle. Nothing happens for an empty handle.
   *
   * Carbon quirk, reproduced: only `index` is reset; `owner` keeps pointing
   * at this manager.
   * @param {EveInstancedMeshManagerDataHandle} handle The MeshGroupHandle.
   */
  @blue.method
  @meta.implemented
  RemoveMeshGroup(handle)
  {
    if (handle.IsValid())
    {
      for (const [ hash, entry ] of this._meshInstances)
      {
        const mesh = entry[1];
        if (mesh.meshGroups.length > handle.index && mesh.meshGroups[handle.index].handle === handle)
        {
          this._instanceCount -= mesh.meshGroups[handle.index].count;

          const back = mesh.meshGroups.length - 1;
          const moved = mesh.meshGroups[back];
          mesh.meshGroups[back] = mesh.meshGroups[handle.index];
          mesh.meshGroups[handle.index] = moved;
          mesh.meshGroups[handle.index].handle.index = handle.index;
          mesh.meshGroups.pop();

          if (mesh.meshGroups.length === 0)
          {
            this._meshInstances.delete(hash);
          }
          break;
        }
      }
      handle.index = EveInstancedMeshManagerDataHandle.invalidIndex;
    }
  }

  /**
   * Carbon AllocateInstanceData (private, cpp:966-973): a span of the dynamic
   * or static instance buffer for `count` instance records.
   * @param {number} count Instance records.
   * @param {boolean} isDynamic Which buffer and element layout.
   * @returns {EveInstancedMeshManagerInstanceBufferAllocation}
   */
  @blue.method
  @meta.implemented
  _AllocateInstanceData(count, isDynamic)
  {
    if (isDynamic)
    {
      return this._dynamicInstanceBuffer.Allocate(count * EveInstancedMeshManagerDynamicPerInstanceBufferElement.byteSize);
    }
    return this._staticInstanceBuffer.Allocate(count * EveInstancedMeshManagerStaticPerInstanceBufferElement.byteSize);
  }

  /**
   * Carbon's public GetBatches (h:98, cpp:694-708): culls every sphere group
   * whose flags match the requested batch types against the camera frustum -
   * requiring RENDER_IN_REFLECTION too when `reason` is a reflection - then
   * bins, uploads and commits the visible instances into the paired
   * accumulators.
   * @param {TriFrustum} cameraFrustum The view frustum (Carbon's header names it frustum).
   * @param {number} invLodFactor The update context's inverse LOD factor.
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches `[batchType, accumulator]` pairs, Carbon's initializer_list.
   * @param {number} [reason] A Tr2RenderReason value; Carbon's default is TR2RENDERREASON_NORMAL.
   * @returns {number} The number of batches committed.
   */
  @blue.method
  @meta.implemented
  GetBatches(cameraFrustum, invLodFactor, batches, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    const filter = new EveInstancedMeshManagerInstanceFlags();
    for (const pair of batches)
    {
      filter.AddBatchType(pair[0]);
    }
    if (reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION)
    {
      filter.SetRenderInReflections(true);
    }
    this._PerformFrustumCulling(cameraFrustum, invLodFactor, filter);

    return this._GetBatches(batches);
  }

  /**
   * Carbon GetShadowBatches (h:99, cpp:710-725): as GetBatches, but only
   * shadow-casting groups pass the filter, and culling and sizing are done
   * against the shadow frustum.
   * @param {TriFrustum} cameraFrustum The camera frustum (Carbon's header names it frustum).
   * @param {IEveShadowFrustum} shadowFrustum The shadow pass's cull view.
   * @param {number} invLodFactor
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches `[batchType, accumulator]` pairs.
   * @param {number} [reason] A Tr2RenderReason value; Carbon's default is TR2RENDERREASON_NORMAL.
   * @returns {number} The number of batches committed.
   */
  @blue.method
  @meta.implemented
  GetShadowBatches(cameraFrustum, shadowFrustum, invLodFactor, batches, reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    const filter = new EveInstancedMeshManagerInstanceFlags();
    for (const pair of batches)
    {
      filter.AddBatchType(pair[0]);
    }
    if (reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION)
    {
      filter.SetRenderInReflections(true);
    }
    filter.SetCastsShadow(true);
    this._PerformFrustumCulling__ShadowFrustum(cameraFrustum, shadowFrustum, invLodFactor, filter);

    return this._GetBatches(batches);
  }

  /**
   * Carbon's public GetPickingBatches (h:100, cpp:727-737): culls against the
   * one-pixel picking frustum, sized by the view frustum, and commits one
   * picking batch per visible LOD slot of every mesh group.
   * @param {EvePendingPickingReadback} readback The pointer-framework request.
   * @param {TriFrustum} viewFrustum
   * @param {TriFrustum} pickingFrustum
   * @param {number} invLodFactor
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches `[batchType, accumulator]` pairs, Carbon's vector.
   */
  @blue.method
  @meta.implemented
  GetPickingBatches(readback, viewFrustum, pickingFrustum, invLodFactor, batches)
  {
    const filter = new EveInstancedMeshManagerInstanceFlags();
    for (const pair of batches)
    {
      filter.AddBatchType(pair[0]);
    }
    this._PerformFrustumCulling__PickingFrustum(viewFrustum, pickingFrustum, invLodFactor, filter);

    this._GetPickingBatches(readback, batches);
  }

  /**
   * Carbon ReportUsedScreenSizes (h:102, cpp:988-1000): tells each drawn
   * mesh's material the largest screen size it was drawn at this pass, so its
   * textures can stream the mips that size needs.
   *
   * Adapted: Carbon reads `m_uvDensities` off LOD 0; a decoded LOD without
   * densities passes an empty list, as Tr2MeshBase does, which the material
   * reads as "no LOD data".
   */
  @blue.method
  @meta.adapted
  ReportUsedScreenSizes()
  {
    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      if (meshInfo.maxScreenSize > 0)
      {
        const meshData = mesh.geometry.GetMeshLod__LodIndex(mesh.meshIndex, 0);
        if (meshData)
        {
          meshInfo.material.UsedWithScreenSize(meshInfo.maxScreenSize, meshInfo.radius, meshData.uvDensities ?? []);
        }
      }
    }
  }

  /**
   * Carbon's camera PerformFrustumCulling (private, h:271, cpp:509-552): for
   * every sphere group matching the filter, classifies its bounds against the
   * camera frustum and writes each instance sphere's estimated pixel size
   * times the LOD factor - zero for a sphere outside the frustum when the
   * group straddles it. A group failing the filter is marked Outside.
   *
   * Carbon's other two overloads take a second frustum, so they are the
   * named variants and this one keeps the bare name. Tr2ParallelDo runs the
   * groups in parallel; here they run in order.
   * @param {TriFrustum} cameraFrustum
   * @param {number} invLodFactor
   * @param {EveInstancedMeshManagerInstanceFlags} filter
   */
  @blue.method
  @meta.implemented
  _PerformFrustumCulling(cameraFrustum, invLodFactor, filter)
  {
    for (const group of this._sphereGroups)
    {
      if (group.flags.MatchesFilter(filter))
      {
        const res = cameraFrustum.SphereTest(group.bounds);
        switch (res)
        {
          case TriFrustumTestResult.Outside:
            break;
          case TriFrustumTestResult.Inside:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              const size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
              group.screenSizes[i] = size;
            }
            break;
          default:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              let size = 0;
              if (cameraFrustum.IsSphereVisible__CenterRadius(sphere.center, sphere.radius))
              {
                size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
              }
              group.screenSizes[i] = size;
            }
            break;
        }
        group.lastTestResult = res;
      }
      else
      {
        group.lastTestResult = TriFrustumTestResult.Outside;
      }
    }
  }

  /**
   * Carbon's picking PerformFrustumCulling (private, h:273, cpp:554-597): as
   * the camera overload, but the visibility tests use the picking frustum
   * while the pixel sizes still come from the camera frustum.
   * @param {TriFrustum} cameraFrustum
   * @param {TriFrustum} pickingFrustum
   * @param {number} invLodFactor
   * @param {EveInstancedMeshManagerInstanceFlags} filter
   */
  @blue.method
  @meta.implemented
  _PerformFrustumCulling__PickingFrustum(cameraFrustum, pickingFrustum, invLodFactor, filter)
  {
    for (const group of this._sphereGroups)
    {
      if (group.flags.MatchesFilter(filter))
      {
        const res = pickingFrustum.SphereTest(group.bounds);
        switch (res)
        {
          case TriFrustumTestResult.Outside:
            break;
          case TriFrustumTestResult.Inside:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              const size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
              group.screenSizes[i] = size;
            }
            break;
          default:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              let size = 0;
              if (pickingFrustum.IsSphereVisible__CenterRadius(sphere.center, sphere.radius))
              {
                size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
              }
              group.screenSizes[i] = size;
            }
            break;
        }
        group.lastTestResult = res;
      }
      else
      {
        group.lastTestResult = TriFrustumTestResult.Outside;
      }
    }
  }

  /**
   * Carbon's shadow PerformFrustumCulling (private, h:272, cpp:599-649): the
   * group is classified by the shadow frustum, and an instance gets a camera
   * pixel size only when it is at least SHADOW_SIZE_THRESHOLD in the shadow
   * map (and, for a straddling group, visible to the shadow frustum).
   * tbb::parallel_for_each runs serially here.
   * @param {TriFrustum} cameraFrustum
   * @param {IEveShadowFrustum} shadowFrustum
   * @param {number} invLodFactor
   * @param {EveInstancedMeshManagerInstanceFlags} filter
   */
  @blue.method
  @meta.implemented
  _PerformFrustumCulling__ShadowFrustum(cameraFrustum, shadowFrustum, invLodFactor, filter)
  {
    const packed = PACKED_SPHERE_SCRATCH;
    for (const group of this._sphereGroups)
    {
      if (group.flags.MatchesFilter(filter))
      {
        const res = shadowFrustum.SphereTest(cameraFrustum, group.bounds);
        switch (res)
        {
          case TriFrustumTestResult.Outside:
            break;
          case TriFrustumTestResult.Inside:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              let size = 0;
              vec4.set(packed, sphere.center[0], sphere.center[1], sphere.center[2], sphere.radius);
              if (shadowFrustum.GetSizeInShadow(packed) >= SHADOW_SIZE_THRESHOLD)
              {
                size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
              }
              group.screenSizes[i] = size;
            }
            break;
          default:
            for (let i = 0; i < group.screenSizes.length; ++i)
            {
              const sphere = group.boundingSpheres[i];
              let size = 0;
              vec4.set(packed, sphere.center[0], sphere.center[1], sphere.center[2], sphere.radius);
              if (shadowFrustum.IsVisible(cameraFrustum, packed))
              {
                if (shadowFrustum.GetSizeInShadow(packed) >= SHADOW_SIZE_THRESHOLD)
                {
                  size = cameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * invLodFactor;
                }
              }
              group.screenSizes[i] = size;
            }
            break;
        }
        group.lastTestResult = res;
      }
      else
      {
        group.lastTestResult = TriFrustumTestResult.Outside;
      }
    }
  }

  /**
   * Carbon's three private BinVisibleInstances overloads (h:274-276) differ in
   * parameter type and count; JavaScript cannot tell them apart, so this
   * name throws and the manager calls the named variants.
   * @throws {TypeError} Always.
   */
  @blue.method
  @meta.notSupported
  _BinVisibleInstances()
  {
    throw new TypeError("EveInstancedMeshManager._BinVisibleInstances cannot tell its overloads apart in JavaScript; call _BinVisibleInstances__Batches, _BinVisibleInstances__MeshInfo or _BinVisibleInstances__Group.");
  }

  /**
   * Carbon's mesh BinVisibleInstances (private, h:274, cpp:651-668): clears
   * the mesh's LOD slots and bins every group's visible instances into them.
   *
   * Adapted: `std::pair<uint32_t, float>` is a `[count, maxScreenSize]` array.
   * @param {EveInstancedMeshManagerMeshKey} mesh
   * @param {EveInstancedMeshManagerMeshData} meshInfo
   * @returns {[number, number]} The binned instance count and the largest screen size seen.
   */
  @blue.method
  @meta.adapted
  _BinVisibleInstances__MeshInfo(mesh, meshInfo)
  {
    for (const lodIndices of meshInfo.lodIndices)
    {
      lodIndices.length = 0;
    }

    let totalCount = 0;
    let maxScreenSize = 0;

    for (const group of meshInfo.meshGroups)
    {
      const [ groupCount, groupMaxSize ] = this._BinVisibleInstances__Group(mesh, meshInfo, group);
      totalCount += groupCount;
      maxScreenSize = Math.max(maxScreenSize, groupMaxSize);
    }
    return [ totalCount, maxScreenSize ];
  }

  /**
   * Carbon's group BinVisibleInstances (private, h:275, cpp:670-692): unless
   * the group's sphere group was culled, appends each instance larger than
   * SCREEN_SIZE_THRESHOLD to the slot of its LOD and mirroring, as
   * `[instance, perObjectDataIndex]`.
   *
   * Adapted: the pair is an array, and the instance is the record itself
   * where Carbon stores its address.
   * @param {EveInstancedMeshManagerMeshKey} mesh
   * @param {EveInstancedMeshManagerMeshData} meshInfo
   * @param {EveInstancedMeshManagerMeshGroup} group
   * @returns {[number, number]} The binned instance count and the largest screen size seen.
   */
  @blue.method
  @meta.adapted
  _BinVisibleInstances__Group(mesh, meshInfo, group)
  {
    let totalCount = 0;
    let maxScreenSize = 0;

    const sphereGroup = this._sphereGroups[group.sphereGroupIndex];
    if (sphereGroup.lastTestResult !== TriFrustumTestResult.Outside)
    {
      const instances = mesh.isDynamic ? group.dynamicInstances : group.staticInstances;
      for (let i = 0; i < group.count; ++i)
      {
        const instance = instances[i];
        const screenSize = sphereGroup.screenSizes[instance.sphereIndex];
        maxScreenSize = Math.max(maxScreenSize, screenSize);
        if (screenSize > SCREEN_SIZE_THRESHOLD)
        {
          meshInfo.lodIndices[LodSlot(EveInstancedMeshManager._GetMeshLod(meshInfo, screenSize), instance.mirrored)].push([ instance, group.perObjectDataIndex ]);
          ++totalCount;
        }
      }
    }
    return [ totalCount, maxScreenSize ];
  }

  /**
   * Carbon's batches BinVisibleInstances (private, h:276, cpp:739-759): bins
   * every mesh whose batch type was asked for and records its visible count
   * and largest screen size; any other mesh's visible count is zeroed.
   * tbb::parallel_for_each runs serially here.
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches
   */
  @blue.method
  @meta.implemented
  _BinVisibleInstances__Batches(batches)
  {
    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      if (!FindBatchAccumulator(batches, mesh.batchType))
      {
        meshInfo.totalVisibleInstances = 0;
        continue;
      }

      const [ instanceCount, maxScreenSize ] = this._BinVisibleInstances__MeshInfo(mesh, meshInfo);
      meshInfo.maxScreenSize = maxScreenSize;
      meshInfo.totalVisibleInstances = instanceCount;
    }
  }

  /**
   * Carbon's private GetBatches (h:278, cpp:839-925): bins the culled
   * instances, gives each mesh with visible instances one instance-buffer
   * span, uploads every LOD slot's instances into it in slot order, then
   * commits one instanced draw per non-empty slot: the LOD's geometry as
   * stream 0 and the span as stream 1, with no per-object data (the shader
   * reads its object through the instance's perObjectDataIndex). A slot
   * whose draw is invalid still advances the instance offset.
   *
   * Adapted: the CCP_STATS counters (cpp:920-921) are omitted, as in
   * CollectMeshes; LOD allocations are realized on use (GetLodSlotDraw).
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches
   * @returns {number} The number of batches committed.
   */
  @blue.method
  @meta.adapted
  _GetBatches(batches)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    this._BinVisibleInstances__Batches(batches);

    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      if (meshInfo.totalVisibleInstances !== 0)
      {
        meshInfo.currentAllocation = this._AllocateInstanceData(meshInfo.totalVisibleInstances, mesh.isDynamic);
      }
    }

    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      if (meshInfo.totalVisibleInstances === 0)
      {
        continue;
      }

      for (let lod = 0; lod < meshInfo.lodIndices.length; ++lod)
      {
        if (meshInfo.lodIndices[lod].length !== 0)
        {
          this._UploadLodData(mesh, meshInfo, lod, meshInfo.currentAllocation);
        }
      }
    }

    let totalBatches = 0;
    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      const accumulator = FindBatchAccumulator(batches, mesh.batchType);
      if (!accumulator)
      {
        continue;
      }
      if (meshInfo.totalVisibleInstances === 0)
      {
        continue;
      }

      const allocation = meshInfo.currentAllocation;
      const stride = mesh.isDynamic ? EveInstancedMeshManagerDynamicPerInstanceBufferElement.byteSize : EveInstancedMeshManagerStaticPerInstanceBufferElement.byteSize;
      let instanceOffset = Math.trunc(allocation.offset / stride);

      for (let lod = 0; lod < meshInfo.lodIndices.length; ++lod)
      {
        if (meshInfo.lodIndices[lod].length === 0)
        {
          continue;
        }
        const lodInstanceCount = meshInfo.lodIndices[lod].length;

        const draw = GetLodSlotDraw(mesh.geometry, mesh.meshIndex, mesh.areaIndex, mesh.areaCount, mesh.areaReversed, lod, renderContext);
        if (!draw.valid)
        {
          instanceOffset += lodInstanceCount;
          continue;
        }

        const batch = new Tr2RenderBatch();
        batch.SetMaterial(meshInfo.material);
        batch.SetGeometry__Allocation(mesh.combinedVertexDeclaration, draw.lodData.vertexAllocation, draw.indexRange.indices);
        batch.SetStreamSource(1, allocation.buffer, stride);
        batch.SetDrawIndexedInstanced(
          draw.primCount * 3,
          lodInstanceCount,
          draw.indexRange.startIndex,
          Tr2RenderBatch.startIndexOf(draw.lodData.vertexAllocation),
          instanceOffset);

        accumulator.Commit(batch);
        instanceOffset += lodInstanceCount;

        ++totalBatches;
      }
    }
    this._staticInstanceBuffer.DoneCopying();
    this._dynamicInstanceBuffer.DoneCopying();
    return totalBatches;
  }

  /**
   * Carbon's private GetPickingBatches (h:279, cpp:762-837): bins each group
   * of a requested batch type on its own and commits one picking batch per
   * non-empty LOD slot, each with its own instance-buffer span and a
   * PickingPerObjectData carrying the group owner's picking word.
   *
   * Adapted: Carbon writes the owner's root-object address as the picking
   * pointer and appends the owner to `readback.m_blueObjects`. JavaScript
   * objects have no address, so the request's RetainObject does both,
   * returning its one-based retained index and sequence - as the scene's own
   * pointer picking does. The owner is the provider itself, which is its own
   * root object here.
   * @param {EvePendingPickingReadback} readback
   * @param {Array<[number, ITriRenderBatchAccumulator]>} batches
   */
  @blue.method
  @meta.adapted
  _GetPickingBatches(readback, batches)
  {
    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    for (const [ mesh, meshInfo ] of this._meshInstances.values())
    {
      const accumulator = FindBatchAccumulator(batches, mesh.batchType);
      if (!accumulator)
      {
        continue;
      }
      for (const group of meshInfo.meshGroups)
      {
        for (const lodIndices of meshInfo.lodIndices)
        {
          lodIndices.length = 0;
        }

        this._BinVisibleInstances__Group(mesh, meshInfo, group);

        if (!meshInfo.lodIndices.some(lodIndices => lodIndices.length !== 0))
        {
          continue;
        }

        for (let lod = 0; lod < meshInfo.lodIndices.length; ++lod)
        {
          if (meshInfo.lodIndices[lod].length === 0)
          {
            continue;
          }
          const allocation = this._AllocateInstanceData(meshInfo.lodIndices[lod].length, mesh.isDynamic);
          this._UploadLodData(mesh, meshInfo, lod, allocation);

          const draw = GetLodSlotDraw(mesh.geometry, mesh.meshIndex, mesh.areaIndex, mesh.areaCount, mesh.areaReversed, lod, renderContext);
          if (!draw.valid)
          {
            continue;
          }
          const stride = mesh.isDynamic ? EveInstancedMeshManagerDynamicPerInstanceBufferElement.byteSize : EveInstancedMeshManagerStaticPerInstanceBufferElement.byteSize;

          const batch = new Tr2RenderBatch();
          batch.SetMaterial(meshInfo.material);
          batch.SetGeometry__Allocation(mesh.combinedVertexDeclaration, draw.lodData.vertexAllocation, draw.indexRange.indices);
          batch.SetStreamSource(1, allocation.buffer, stride);
          batch.SetDrawIndexedInstanced(
            draw.primCount * 3,
            meshInfo.lodIndices[lod].length,
            draw.indexRange.startIndex,
            Tr2RenderBatch.startIndexOf(draw.lodData.vertexAllocation),
            Math.trunc(allocation.offset / stride));

          const perObjectData = accumulator.Allocate(EveInstancedMeshManagerPickingPerObjectData);
          perObjectData.SetPickingPointer(readback.RetainObject(group.owner));
          batch.SetPerObjectData(perObjectData);

          accumulator.Commit(batch);
        }
      }
    }
    this._staticInstanceBuffer.DoneCopying();
    this._dynamicInstanceBuffer.DoneCopying();
  }

  /**
   * Carbon UploadLodData (private, h:281, cpp:927-964): writes one LOD slot's
   * instances into the allocation as buffer elements - packed world
   * transform(s), per-object data index and picking indices - advancing the
   * allocation's data past them.
   *
   * Adapted:
   * - The elements are written through a DataView, little-endian like the
   *   GPU, where Carbon writes C++ structs in place; the byte layout is
   *   EveInstancedMeshManager{Static,Dynamic}PerInstanceBufferElement's.
   * - The static instance record (EveChildInstancedMeshInstance) holds its
   *   transform as a mat4, so it is packed with Float4x3.fromMat4 here; Carbon
   *   packs it once in EveChildInstancedMeshes::AddMesh (cpp:560). The bytes
   *   are those of Float4x3( Matrix ) (MatrixUtils.cpp:6-20).
   * - The data pointer advances once per call, by subarray, rather than per
   *   element; a mapping that failed (`data` null) writes nothing where
   *   Carbon would write through null.
   * @param {EveInstancedMeshManagerMeshKey} mesh
   * @param {EveInstancedMeshManagerMeshData} meshInfo
   * @param {number} lod A lodIndices slot.
   * @param {EveInstancedMeshManagerInstanceBufferAllocation} allocation Advanced in place.
   */
  @blue.method
  @meta.adapted
  _UploadLodData(mesh, meshInfo, lod, allocation)
  {
    if (allocation.data === null)
    {
      return;
    }
    const data = allocation.data;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength); // alloc: one view per slot upload.
    let at = 0;

    if (mesh.isDynamic)
    {
      for (const [ instanceData, perObjectDataIndex ] of meshInfo.lodIndices[lod])
      {
        for (let i = 0; i < 12; ++i)
        {
          view.setFloat32(at + i * 4, instanceData.worldTransform[i], true);
          view.setFloat32(at + 48 + i * 4, instanceData.prevWorldTransform[i], true);
        }

        view.setUint32(at + 96, perObjectDataIndex, true);

        view.setUint32(at + 100, instanceData.pickingMeshIndex, true);
        view.setUint32(at + 104, instanceData.pickingInstanceIndex, true);

        at += EveInstancedMeshManagerDynamicPerInstanceBufferElement.byteSize;
      }
    }
    else
    {
      for (const [ instanceData, perObjectDataIndex ] of meshInfo.lodIndices[lod])
      {
        const worldTransform = FLOAT4X3_SCRATCH.SetFromMat4(instanceData.transform).elements;
        for (let i = 0; i < 12; ++i)
        {
          view.setFloat32(at + i * 4, worldTransform[i], true);
        }

        view.setUint32(at + 48, perObjectDataIndex, true);

        view.setUint32(at + 52, instanceData.pickingMeshIndex, true);
        view.setUint32(at + 56, instanceData.pickingInstanceIndex, true);

        at += EveInstancedMeshManagerStaticPerInstanceBufferElement.byteSize;
      }
    }

    allocation.data = data.subarray(at); // alloc: view standing in for allocation.data += written.
  }

  /**
   * Carbon GetMeshLod (private static, h:280, cpp:975-986): the first LOD
   * whose next LOD's threshold the screen size exceeds, else the last LOD.
   *
   * Carbon quirk, reproduced: a mesh with no thresholds returns
   * `lodCount - 1`, which wraps to 0xFFFFFFFF in Carbon's uint32_t; it is
   * returned as that value. The manager never has such a mesh, because
   * every registered mesh has at least one LOD.
   * @param {EveInstancedMeshManagerMeshData} meshInfo
   * @param {number} screenSize
   * @returns {number} The LOD index.
   */
  @blue.method
  @meta.implemented
  static _GetMeshLod(meshInfo, screenSize)
  {
    const lodCount = meshInfo.screenSizeThresholds.length;
    for (let lod = 0; lod + 1 < lodCount; ++lod)
    {
      if (screenSize > meshInfo.screenSizeThresholds[lod + 1])
      {
        return lod;
      }
    }
    return (lodCount - 1) >>> 0;
  }

}
