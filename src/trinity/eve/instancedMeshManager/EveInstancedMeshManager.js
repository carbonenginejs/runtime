// Source: trinity/trinity/Eve/EveInstancedMeshManager.h
// Source: trinity/trinity/Eve/EveInstancedMeshManager.cpp
//
// Stage 1 of the port: the records, the provider registration (handles), the
// CPU half of CollectMeshes and the instance-buffer ring. The draw side -
// GetBatches, GetShadowBatches, GetPickingBatches, GetPickedObject,
// PerformFrustumCulling, BinVisibleInstances, UploadLodData, GetMeshLod and
// ReportUsedScreenSizes (h:98-102, 271-281; cpp:509-1000) - is not ported
// yet, and the scene does not call it.
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { EveComponentType } from "../EntityComponents.js";
import { Tr2GpuStructuredBuffer } from "../../core/device/Tr2GpuStructuredBuffer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2VariableStore } from "../../core/variable/Tr2VariableStore.js";
import { CjsPerObjectLayouts } from "../../core/rawData/CjsPerObjectLayouts.js";
import { TriVariableContentType } from "../../generated/trinityCore/enums.js";
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

  /** Carbon StaticPerInstanceBufferElement (private, h:150-156). */
  static _StaticPerInstanceBufferElement = EveInstancedMeshManagerStaticPerInstanceBufferElement;

  /** Carbon DynamicPerInstanceBufferElement (private, h:158-165). */
  static _DynamicPerInstanceBufferElement = EveInstancedMeshManagerDynamicPerInstanceBufferElement;

  /** Carbon MeshKey (private, h:167-189). */
  static _MeshKey = EveInstancedMeshManagerMeshKey;

  /** Carbon MeshGroup (private, h:191-204). */
  static _MeshGroup = EveInstancedMeshManagerMeshGroup;

  /** Carbon InstanceBuffer (private, h:206-235). */
  static _InstanceBuffer = EveInstancedMeshManagerInstanceBuffer;

  /** Carbon MeshData (private, h:237-249). */
  static _MeshData = EveInstancedMeshManagerMeshData;

  /** Carbon KeyHasher (private, h:251-258). */
  static _KeyHasher = EveInstancedMeshManagerKeyHasher;

  /** Carbon SphereGroup (private, h:260-269). */
  static _SphereGroup = EveInstancedMeshManagerSphereGroup;

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
   * or static instance buffer for `count` instance records. Its callers are
   * stage 2's.
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

}
