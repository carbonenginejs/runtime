import { getResourceExtension } from "#utils/path";
import { CjsMeshConstructor, MeshPrefix } from "./CjsMeshConstructor.js";
import { Tr2DeviceResource } from "../../core/device/Tr2DeviceResource.js";
import { blue as blueService } from "#blue/blue";
import { packVertexBuffer, packIndexBuffer } from "../../../resource/formats/cmf/core/pack.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Resources/TriGeometryRes.h
// Source: trinity/trinity/Resources/TriGeometryRes.cpp
// Source: trinity/trinity/Resources/TriGeometryRes_Blue.cpp
import { CjsSchema, type } from "#schema";
import { box3 } from "#math/box3";
import { triangleNormalTo } from "#math/mesh";
import { ray3 } from "#math/ray3";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { BlueAsyncRes, ICacheable, IBlueResource } from "#blue";
import { ITr2InstanceData } from "../../core/mesh/ITr2InstanceData/ITr2InstanceData.js";
import { TriStorageFlags } from "#consts/graphics";
import { Tr2RaycastGeometryRes } from "./Tr2RaycastGeometryRes.js";
import { CjsGr2Format } from "../../../resource/formats/gr2/index.js";
import { CjsCmfFormat } from "../../../resource/formats/cmf/index.js";
import { projectShared } from "../../../resource/formats/gr2/core/shared.js";
import { readGr2Raw } from "../../../resource/formats/gr2/core/reader.js";
import { TriGeometryResMeshData } from "./TriGeometryResMeshData.js";
import { TriGeometryResLodData } from "./TriGeometryResLodData.js";
import { TriGeometryResAreaData } from "./TriGeometryResAreaData.js";
import { TriGeometryResSkeletonData } from "./TriGeometryResSkeletonData.js";
import { TriGeometryResJointData } from "./TriGeometryResJointData.js";
import { TriJointBinding } from "./TriJointBinding.js";
import { BuildFromGrannyVertexDecl } from "../../core/vertex/vertexUsage.js";
import { Tr2VertexUsageCode } from "../../core/vertex/usageCode.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { ConvertDataToVector3, GetMeshVertexPosition, GetVertexPositionOffsetAndType, GrannyGetTotalTypeSize } from "../../utilities/GeometryUtils.js";
import * as CcpLog from "../../../global/logging/ccpLog.js";
import {
  assertResourcePayloadArray,
  assertResourcePayloadObject,
  resourceBoundaryError,
  resourcePayloadError
} from "../resourceBoundary.js";

/** WebGPU's `arrayStride` alignment, which WebGL2 also satisfies trivially. */
const STRIDE_ALIGNMENT = 4;


/**
 * Rounds a packed vertex buffer up to an aligned stride.
 *
 * A declaration's extent is a TIGHT max-offset sum with no rounding, so a decl
 * of three `UInt8Norm` components packs at stride 3 and no device will take it.
 * Element offsets are unchanged by the widening - only the gap after the last
 * component grows - so the declaration stays correct against the result.
 *
 * @param {{bytes: Uint8Array, stride: number, count: number}} packed
 * @returns {{bytes: Uint8Array, stride: number, count: number}} The input when already aligned.
 */
function AlignStride(packed)
{
  const remainder = packed.stride % STRIDE_ALIGNMENT;

  if (packed.stride > 0 && remainder === 0) return packed;

  const stride = packed.stride + (STRIDE_ALIGNMENT - remainder);
  const bytes = new Uint8Array(stride * packed.count);

  for (let i = 0; i < packed.count; i++)
  {
    bytes.set(packed.bytes.subarray(i * packed.stride, (i + 1) * packed.stride), i * stride);
  }

  return { bytes, stride, count: packed.count };
}


// Scratch edges for the picking cross product. Picking is synchronous and the
// result is consumed before the next hit, so one pair is enough.
//
// PLAIN arrays, not `vec3.create()`, because the destination is one: the hit
// record's `unnormalizedNormal` is `[ 0, 0, 0 ]`, so the products stay in double
// precision the whole way. Rounding the two edges to a math array's element type
// first perturbs the result on all but 2.5% of triangles, and by as much as 1.8%
// relatively where the cross product cancels - which is exactly the thin sliver
// a picking ray is most likely to graze.
const edgeAB = [ 0, 0, 0 ];
const edgeAC = [ 0, 0, 0 ];

/**
 * A payload bounds object as Carbon's `std::pair<Vector3, Vector3>`: a new `[min, max]` pair of
 * three-element arrays; zeros when there are no bounds.
 *
 * @param {{min: ArrayLike<number>, max: ArrayLike<number>}|null} bounds
 * @returns {Array<number[]>}
 */
function boundsPair(bounds)
{
  if (!bounds) return [ [ 0, 0, 0 ], [ 0, 0, 0 ] ];
  return [
    [ bounds.min[0], bounds.min[1], bounds.min[2] ],
    [ bounds.max[0], bounds.max[1], bounds.max[2] ]
  ];
}

/** The shared GR2 projection's channel names for Granny vertex members (formats/gr2/core/shared.js). */
const GRANNY_CHANNEL_NAMES = {
  Position: "position", BoneIndices: "blendIndice", Tangent: "tangent", Normal: "normal",
  TextureCoordinates0: "texcoord0", TextureCoordinates1: "texcoord1", Binormal: "binormal", BoneWeights: "blendWeight"
};

/** Bytes and float reader per Granny member type, dequantized as the shared GR2 projection does. */
const GRANNY_DEQUANTIZE = {
  10: [ 4, (view, offset) => view.getFloat32(offset, true) ],
  11: [ 1, (view, offset) => view.getInt8(offset) ],
  12: [ 1, (view, offset) => view.getUint8(offset) ],
  13: [ 1, (view, offset) => view.getInt8(offset) * Math.fround(1 / 127) ],
  14: [ 1, (view, offset) => view.getUint8(offset) * Math.fround(1 / 255) ],
  15: [ 2, (view, offset) => view.getInt16(offset, true) ],
  16: [ 2, (view, offset) => view.getUint16(offset, true) ],
  17: [ 2, (view, offset) => view.getInt16(offset, true) * Math.fround(1 / 32767) ],
  18: [ 2, (view, offset) => view.getUint16(offset, true) * Math.fround(1 / 65535) ],
  19: [ 4, (view, offset) => view.getInt32(offset, true) ],
  20: [ 4, (view, offset) => view.getUint32(offset, true) ],
  21: [ 2, (view, offset) => HalfToFloat(view.getUint16(offset, true)) ]
};

/**
 * IEEE half to float.
 *
 * @param {number} h Half bits.
 * @returns {number} The value.
 */
function HalfToFloat(h)
{
  const sign = h & 0x8000 ? -1 : 1, exponent = (h >> 10) & 0x1f, fraction = h & 0x3ff;
  if (exponent === 0) return sign * fraction * 2 ** -24;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * (1 + fraction / 1024) * 2 ** (exponent - 15);
}

/**
 * Resource record that owns geometry payload facts (meshes, optional
 * skeletons and animations) and LOD-force metadata. Device buffers and vertex
 * declarations are allocated through the abstraction layer.
 *
 * Geometry inspection composes the generic math supplied by the runtime global layer
 * with resource-specific payload traversal.
 */

export class TriGeometryRes extends BlueAsyncRes
{
  /**
   * Carbon: TriGeometryRes::CreateLodFromCMFMesh (trinity/trinity/Resources/TriGeometryRes.cpp:2019-2140).
   * Channels and index groups are taken from the LOD when it carries its own and
   * from the mesh otherwise, because a single-LOD payload keeps them only on the
   * mesh. The declaration is always the mesh's: a LOD varies which triangles it
   * draws, not what a vertex is.
   *
   * @cjs
   * @adapted our worker payload is deinterleaved; repack it and align the stride
   *   for WebGPU before the existing allocation path consumes it.
   *   Packs one LOD of a decoded mesh into interleaved vertex bytes and an index
   *   buffer.
   * @param {object} mesh Decoded mesh carrying `decl` and channels.
   * @param {number} [lodIndex] Which LOD to pack.
   * @returns {{decl: Array<object>, vertex: object, index: object|null}}
   * @throws {Error} When the mesh has no declaration to pack against.
   */
  static packLodGeometry(mesh, lodIndex = 0)
  {
    const decl = mesh?.decl ?? mesh?.vertexElements;

    if (!decl?.length)
    {
      throw new Error("Cannot pack geometry: the mesh carries no vertex declaration");
    }

    const lod = mesh?.lods?.[lodIndex] ?? null;
    const channels = lod?.vertex ?? mesh?.vertex ?? {};

    const vertex = AlignStride(packVertexBuffer(decl, channels));

    return { decl, vertex, index: TriGeometryRes.packLodIndices(mesh, lodIndex) };
  }

  /**
   * Pads a vertex buffer's stride to WebGPU's four-byte alignment (AlignStride).
   *
   * @cjs shared by the CMF and Granny allocation paths.
   * @param {{bytes: Uint8Array, stride: number, count: number}} packed Vertex bytes.
   * @returns {{bytes: Uint8Array, stride: number, count: number}} The input when already aligned.
   */
  static alignStride(packed)
  {
    return AlignStride(packed);
  }

  /**
   * Carbon: TriGeometryRes::CreateLodFromCMFMesh (trinity/trinity/Resources/TriGeometryRes.cpp:2055-2076).
   *
   * @cjs
   * @adapted our deinterleaved payload needs packing before native-style buffer allocation.
   *   Packs one LOD's index buffer alone, from the same LOD-then-mesh sources
   *   packLodGeometry uses; the wireframe edge build reads it without repacking
   *   the vertices.
   * @param {object} mesh Decoded mesh.
   * @param {number} [lodIndex] Which LOD to pack.
   * @returns {{bytes: Uint8Array, format: string, count: number}|null} Null when the LOD has no indices.
   */
  static packLodIndices(mesh, lodIndex = 0)
  {
    const lod = mesh?.lods?.[lodIndex] ?? null;
    const groups = lod?.indices ?? mesh?.indices ?? null;
    const indexBuffer = lod?.indexBuffer ?? (lod?.indices ? null : mesh?.indexBuffer) ?? null;
    const packedIndices = groups || indexBuffer ? packIndexBuffer(groups, indexBuffer) : null;

    return packedIndices && packedIndices.count > 0
      ? { bytes: packedIndices.bytes, format: packedIndices.stride === 4 ? "uint32" : "uint16", count: packedIndices.count }
      : null;
  }

  forceLod = false;
  forcedLodIndex = -1;
  name = "";

  _raycastGeometry = null;

  _raycastUsers = 0;

  _raycastPreparationFailed = false;

  /** m_useCMF - which reader loaded this resource; Carbon starts true (cpp:210). */
  _useCMF = true;

  /** m_pGrannyFile - the gr2 read ReadGrannyFile kept, or null. */
  _grannyFile = null;


  /**
   * m_memoryUse: what `GetMemoryUsage` reports. Each LOD adds its buffers when
   * its allocations are made (CreateLodAllocations).
   */
  _memoryUse = 0;


  /** m_meshes: the mesh records SetupMeshes builds, one per mesh (TriGeometryRes.h). */
  _meshes = [];

  /** m_skeletons: the skeleton records SetupSkeletons builds (TriGeometryRes.h). */
  _skeletons = [];

  /**
   * Carbon SetupMeshes, which overloads on `const cmf::Data&` (cpp:855) and
   * `granny_file_info*` (cpp:953). Routes CMF data to SetupMeshes__CmfData;
   * engine code calls the specific name.
   *
   * @adapted the Granny overload is not ported yet: a Granny file info throws.
   * @param {object} payload Decoded CMF data.
   * @returns {boolean} Whether the mesh records were installed.
   * @throws {Error} For a Granny file info.
   */
  SetupMeshes(payload)
  {
    if (payload?.grannyFileFormatRevision !== undefined)
    {
      throw new Error("TriGeometryRes.SetupMeshes: the granny_file_info overload (cpp:953) is not ported yet.");
    }
    return this.SetupMeshes__CmfData(payload);
  }

  /**
   * Carbon SetupMeshes( const cmf::Data& ) (TriGeometryRes.cpp:855-950): builds
   * one TriGeometryResMeshData per mesh, with its LODs and areas.
   *
   * @adapted the payload is also kept whole as `_cmfData` (Carbon's
   *   m_cmfContents), where readers of vertices and indices find them, as
   *   Carbon's CMF branches read m_cmfContents. The records follow the payload shapes the reader and the
   *   tests produce: a mesh with no `lods` is its own only LOD; an area takes its
   *   name, flags and bounds from the mesh area and its range from the LOD area,
   *   under either the CMF or the Carbon field name, and so does a LOD's
   *   screen size: the CMF `threshold` as Carbon reads it (cpp:905), or a
   *   payload's own `maxScreenSize`. Two fields keep our values rather than
   *   Carbon's: the sphere is the payload's (Carbon: from the bounds box,
   *   cpp:874-875), and the declaration handle and
   *   stride are set when a LOD is first allocated (Carbon: here, cpp:863-865,
   *   from the CMF stride; ours is packed and aligned then). The minimum model
   *   LOD (cpp:889) is not applied; TriDevice's is always 0 here.
   * @param {object} payload Decoded CMF data.
   * @returns {boolean} Whether the mesh records were installed.
   */
  SetupMeshes__CmfData(payload)
  {
    if (this._raycastUsers !== 0) throw new Error("TriGeometryRes data cannot change during an active raycast session.");
    assertResourcePayloadObject("TriGeometryRes", payload);
    assertResourcePayloadArray("TriGeometryRes", payload, "meshes");
    for (const field of [ "skeletons", "animations" ])
    {
      if (payload[field] !== undefined && !Array.isArray(payload[field]))
      {
        throw resourcePayloadError("TriGeometryRes", "Expected an array when provided.", field);
      }
    }
    this._OnShutdown();
    this._raycastGeometry = null;
    this._raycastPreparationFailed = false;

    this._cmfData = payload;
    this._meshes = payload.meshes.map(cmfMesh => TriGeometryRes._BuildMeshRecord(cmfMesh));
    return true;
  }

  /**
   * One mesh record from one CMF mesh: the loop body of Carbon SetupMeshes(
   * const cmf::Data& ) (TriGeometryRes.cpp:867-946).
   *
   * @cjs Split out of SetupMeshes__CmfData so the loop reads as Carbon's.
   * @param {object} cmfMesh Decoded CMF mesh.
   * @returns {TriGeometryResMeshData} The mesh record.
   */
  static _BuildMeshRecord(cmfMesh)
  {
    const mesh = new TriGeometryResMeshData();
    mesh.name = cmfMesh.name ?? "";
    // Unknown until the first allocation sets it (see the method's @adapted note).
    mesh.vertexDeclarationHandle = 0xFFFFFFFF;

    const bounds = TriGeometryRes.getBounds(cmfMesh);
    if (bounds)
    {
      vec3.copy(mesh.minBounds, bounds.min);
      vec3.copy(mesh.maxBounds, bounds.max);
    }
    const sphere = TriGeometryRes.getSphere(cmfMesh);
    if (sphere) vec4.copy(mesh.boundingSphere, sphere);

    mesh.jointBindings = (cmfMesh.boneBindings ?? []).map(joint =>
    {
      const binding = new TriJointBinding();
      binding.name = joint.name ?? "";
      const jointBounds = TriGeometryRes.getBounds(joint);
      if (jointBounds)
      {
        vec3.copy(binding.obbMin, jointBounds.min);
        vec3.copy(binding.obbMax, jointBounds.max);
      }
      return binding;
    });

    const targets = cmfMesh.morphTargets?.targets ?? [];
    const cmfLods = cmfMesh.lods?.length ? cmfMesh.lods : [ cmfMesh ];
    mesh.lods = [];
    for (let i = 0; i < cmfLods.length; i++)
    {
      const cmfLod = cmfLods[i];
      const lod = new TriGeometryResLodData();
      lod.mesh = mesh;
      lod.grannyMeshIndex = -1;
      lod.name = mesh.name;
      lod.maxScreenSize = cmfLod.threshold !== undefined ? Math.fround(cmfLod.threshold) : cmfLod.maxScreenSize ?? 0;
      lod.vertexCount = TriGeometryRes._GetLodVertexCount(cmfMesh, cmfLod);
      lod.primitiveCount = TriGeometryRes.getLodPrimitiveCount(cmfLod);
      lod.uvDensities = Array.from(cmfMesh.uvDensities ?? []);
      lod.areas = (cmfLod.areas ?? []).map((cmfLodArea, groupIndex) =>
      {
        const cmfMeshArea = cmfMesh.areas?.[groupIndex] ?? cmfLodArea;
        const area = new TriGeometryResAreaData();
        area.name = cmfMeshArea.name ?? "";
        area.firstIndex = TriGeometryRes.getAreaFirstIndex(cmfLodArea);
        area.primitiveCount = TriGeometryRes.getAreaPrimitiveCount(cmfLodArea);
        area.isSkinned = Boolean(cmfMeshArea.affectedByBones);
        area.isMorphed = Boolean(cmfMeshArea.affectedByMorphTargets);
        const areaBounds = TriGeometryRes.getBounds(cmfMeshArea);
        if (areaBounds)
        {
          vec3.copy(area.minBounds, areaBounds.min);
          vec3.copy(area.maxBounds, areaBounds.max);
        }
        return area;
      });
      // Carbon fills these while building the LOD's buffers (cpp:2110-2134 for CMF, :2260-2293 for Granny): the target
      // names less the exporter's "Shape" suffix, a cleared baked flag per target, and the deformation amount, the CMF
      // target's maxDisplacement (for Granny, the largest morph-to-base distance, which the gr2 conversion has
      // already reduced to the same maxDisplacement). They are filled here, at load, because the buffers are built at
      // the first draw and GetBounds reads the amounts before it.
      lod.morphTargetNames = targets.map(target => TriGeometryRes.stripShapeSuffix(target.name));
      lod.isBakedMorphTarget = targets.map(() => false);
      lod.morphTargetDeformationAmounts = targets.map(target => target.maxDisplacement);
      lod.originalLodIndex = i;
      mesh.lods.push(lod);
    }

    let lodMask = 0;
    for (const lod of mesh.lods) lodMask |= 1 << lod.originalLodIndex;
    mesh.lodMask = lodMask >>> 0;
    return mesh;
  }

  /**
   * A CMF LOD's vertex count: Carbon's `GetStreamElementCount( cmfLod.vb )`
   * (TriGeometryRes.cpp:907) where the payload keeps the buffer view, otherwise
   * the decoded position channel's count.
   *
   * @cjs our payload may hold decoded channels instead of a buffer view.
   * @param {object} cmfMesh Decoded CMF mesh.
   * @param {object} cmfLod Decoded LOD, or the mesh when it is its own LOD.
   * @returns {number} Vertex count; 0 when the payload holds no vertices.
   */
  static _GetLodVertexCount(cmfMesh, cmfLod)
  {
    if (cmfLod.vertexCount !== undefined) return cmfLod.vertexCount;
    if (cmfLod.vb?.stride > 0) return Math.floor(cmfLod.vb.size / cmfLod.vb.stride);
    if (cmfMesh.vertexCount !== undefined) return cmfMesh.vertexCount;
    return TriGeometryRes.getPositionCount(cmfLod.vertex?.position ?? cmfMesh.vertex?.position ?? null);
  }

  /**
   * Carbon SetupMeshes( granny_file_info* ) (TriGeometryRes.cpp:953-1184): one mesh record per main
   * mesh, each Granny LOD mesh folded into the mesh its MeshBoundsInfo names (`sourceMeshIndex`) at
   * its `maxScreenSize`, with the authored bounds and UV densities, area names from the material
   * bindings, and each mesh's LODs sorted from the largest screen size down.
   *
   * @adapted the file info is the GR2 reader's granny_file_info view (vertex arrays as their bytes and
   *   reflected type), and MeshBoundsInfo is read from the reflected ExtendedData by Carbon's member
   *   names rather than through GrannyConvertTree. The minimum model LOD (cpp:1153-1171) is not
   *   applied; TriDevice's is always 0 here.
   * @param {object} gi The granny_file_info.
   * @returns {boolean} False when a mesh has no primary vertex data or topology.
   */
  SetupMeshes__GrannyFileInfo(gi)
  {
    if (this._raycastUsers !== 0) throw new Error("TriGeometryRes data cannot change during an active raycast session.");
    this._OnShutdown();
    this._raycastGeometry = null;
    this._raycastPreparationFailed = false;

    const meshes = [];
    // Used by LOD meshes to find the model they belong to.
    const grannyMeshIndexToMeshMap = new Array(gi.Meshes.length).fill(null);

    for (let meshIndex = 0; meshIndex < gi.Meshes.length; ++meshIndex)
    {
      const grannyMesh = gi.Meshes[meshIndex];

      if (!grannyMesh || !grannyMesh.PrimaryVertexData || !grannyMesh.PrimaryTopology)
      {
        CcpLog.CCP_LOGWARN("Trying to load geometry with no primary vertex data and/or topology");
        return false;
      }

      const vertexDefinition = BuildFromGrannyVertexDecl(grannyMesh.PrimaryVertexData.Vertices.type);
      const vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle(vertexDefinition);
      const bytesPerVertex = vertexDefinition.nextOffset[0];

      // Look for mesh bounds info in the Granny file.
      const extended = grannyMesh.ExtendedData;
      const mbi = extended && extended.typeName === "MeshBoundsInfo" ? extended : null;

      // GrannyConvertTree zero-fills members an older MeshBoundsInfo lacks (cpp:986).
      const mbiMaxScreenSize = mbi?.maxScreenSize ?? 0;
      let mesh = null;
      let maxScreenSize = Infinity;
      const mainLod = !mbi || mbiMaxScreenSize <= 0;

      if (!mainLod)
      {
        // We are an LOD of an existing mesh. Add ourselves to it.
        mesh = grannyMeshIndexToMeshMap[mbi.sourceMeshIndex ?? 0];
        if (mesh.vertexDeclarationHandle !== vertexDeclarationHandle || mesh.bytesPerVertex !== bytesPerVertex) continue;
        maxScreenSize = mbiMaxScreenSize;
      }
      else
      {
        // We are the main LOD of a mesh, so we need to create a new mesh.
        mesh = new TriGeometryResMeshData();
        mesh.name = grannyMesh.Name ?? "";
        vec3.set(mesh.minBounds, Infinity, Infinity, Infinity);
        vec3.set(mesh.maxBounds, -Infinity, -Infinity, -Infinity);
        vec4.set(mesh.boundingSphere, 0, 0, 0, 0);
        mesh.vertexDeclarationHandle = vertexDeclarationHandle;
        mesh.bytesPerVertex = bytesPerVertex;
        mesh.jointBindings = (grannyMesh.BoneBindings ?? []).map(source =>
        {
          const binding = new TriJointBinding();
          binding.name = source.BoneName ?? "";
          vec3.copy(binding.obbMin, source.OBBMin);
          vec3.copy(binding.obbMax, source.OBBMax);
          return binding;
        });
        mesh.lods = [];
        meshes.push(mesh);
      }

      // A LOD mesh references the granny mesh index of its "parent" mesh.
      grannyMeshIndexToMeshMap[meshIndex] = mesh;

      const lod = new TriGeometryResLodData();
      lod.mesh = mesh;
      lod.grannyMeshIndex = meshIndex;
      lod.name = grannyMesh.Name ?? "";
      lod.maxScreenSize = maxScreenSize;
      lod.vertexCount = grannyMesh.PrimaryVertexData.Vertices.count;
      lod.primitiveCount = 0;
      this._SetupGrannyMorphTables(lod, grannyMesh);

      if (mbi)
      {
        // The UV densities, if available, are used for texture streaming.
        if (mbi.uvDensities?.length) lod.uvDensities = Array.from(mbi.uvDensities);
        if (mainLod && mbi.bounds) TriGeometryRes._BoundingBoxUpdate(mesh.minBounds, mesh.maxBounds, mbi.bounds.min, mbi.bounds.max);
      }

      const topology = grannyMesh.PrimaryTopology;
      lod.areas = topology.Groups.map((group, groupIndex) =>
      {
        const area = new TriGeometryResAreaData();
        const binding = grannyMesh.MaterialBindings?.[group.MaterialIndex];
        area.name = binding && binding.Material ? binding.Material.Name ?? "" : "";
        area.firstIndex = group.TriFirst * 3;
        area.primitiveCount = group.TriCount;
        lod.primitiveCount += area.primitiveCount;
        area.isSkinned = this.IsAreaSkinned(area, grannyMesh, gi, bytesPerVertex);
        area.isMorphed = this.IsAreaMorphed(area, grannyMesh, gi);
        // Carbon asserts the MeshBoundsInfo covers every area (cpp:1129); one that does not is read from the vertices.
        const areaInfo = mbi?.areaInfo?.[groupIndex];
        if (areaInfo)
        {
          vec3.copy(area.minBounds, areaInfo.bounds.min);
          vec3.copy(area.maxBounds, areaInfo.bounds.max);
        }
        else
        {
          this.DetermineAreaBoundsAndVertCount(area, grannyMesh, bytesPerVertex);
          // An area without vertices has an invalid box, so it is not included.
          if (mainLod && area.primitiveCount)
          {
            TriGeometryRes._BoundingBoxUpdate(mesh.minBounds, mesh.maxBounds, area.minBounds, area.maxBounds);
          }
        }
        return area;
      });

      mesh.lods.push(lod);
    }

    for (const mesh of meshes)
    {
      mesh.lods.sort((a, b) => b.maxScreenSize - a.maxScreenSize);
      let lodMask = 0;
      mesh.lods.forEach((lod, index) =>
      {
        lod.originalLodIndex = index;
        lodMask |= 1 << index;
      });
      mesh.lodMask = lodMask >>> 0;
    }

    this._cmfData = null;
    this._meshes = meshes;
    return true;
  }

  /**
   * A Granny LOD's morph tables, which Carbon fills while building its buffers (CreateLodFromGrannyMesh,
   * TriGeometryRes.cpp:2260-2293): each target's ScalarName less the exporter's "Shape" suffix, a
   * cleared baked flag, and CalculateMorphDeformationAmount (cpp:2008-2023), the largest distance a
   * target moves a vertex, each read through its own declaration.
   *
   * @adapted filled at load, as the CMF branch's are, because GetBounds reads the amounts before the
   *   buffers exist (they are built at the first draw).
   * @param {TriGeometryResLodData} lod LOD record, updated.
   * @param {object} grannyMesh Granny mesh.
   */
  _SetupGrannyMorphTables(lod, grannyMesh)
  {
    const targets = grannyMesh.MorphTargets ?? [];
    lod.morphTargetNames = targets.map(target => TriGeometryRes.stripShapeSuffix(target.ScalarName ?? ""));
    lod.isBakedMorphTarget = targets.map(() => false);
    if (!targets.length)
    {
      lod.morphTargetDeformationAmounts = [];
      return;
    }
    const baseData = TriGeometryRes._InitMorphToBaseData(BuildFromGrannyVertexDecl(grannyMesh.PrimaryVertexData.Vertices.type));
    const base = grannyMesh.PrimaryVertexData.Vertices;
    const baseView = new DataView(base.bytes.buffer, base.bytes.byteOffset, base.bytes.byteLength);
    const vertex = [ 0, 0, 0 ], morphVertex = [ 0, 0, 0 ];
    lod.morphTargetDeformationAmounts = targets.map(target =>
    {
      const morphData = TriGeometryRes._InitMorphToBaseData(BuildFromGrannyVertexDecl(target.VertexData.Vertices.type));
      const morph = target.VertexData.Vertices;
      const morphView = new DataView(morph.bytes.buffer, morph.bytes.byteOffset, morph.bytes.byteLength);
      let maxAmount = 0;
      for (let index = 0; index < base.count; index++)
      {
        ConvertDataToVector3(baseData.declType, baseView, baseData.positionByteOffset + index * baseData.bytesPerVertex, vertex);
        ConvertDataToVector3(morphData.declType, morphView, morphData.positionByteOffset + index * morphData.bytesPerVertex, morphVertex);
        let x = morphVertex[0], y = morphVertex[1], z = morphVertex[2];
        if (!target.DataIsDeltas)
        {
          x -= vertex[0];
          y -= vertex[1];
          z -= vertex[2];
        }
        maxAmount = Math.max(maxAmount, x * x + y * y + z * z);
      }
      return Math.fround(Math.sqrt(maxAmount));
    });
  }

  /**
   * Carbon BoundingBoxUpdate with a box: grows min/max to include another box.
   *
   * @cjs Carbon's math helper, kept beside its callers.
   * @param {vec3} min Box minimum, updated.
   * @param {vec3} max Box maximum, updated.
   * @param {ArrayLike<number>} otherMin Other minimum.
   * @param {ArrayLike<number>} otherMax Other maximum.
   */
  static _BoundingBoxUpdate(min, max, otherMin, otherMax)
  {
    for (let axis = 0; axis < 3; axis++)
    {
      if (otherMin[axis] < min[axis]) min[axis] = otherMin[axis];
      if (otherMax[axis] > max[axis]) max[axis] = otherMax[axis];
    }
  }

  /**
   * A Granny mesh's index array as Carbon reads it: Indices16 as unsigned 16-bit when present,
   * otherwise the 32-bit Indices.
   *
   * @cjs the reader reflects Indices16 as Int16 members; Carbon reads the storage as granny_uint16.
   * @param {object} grannyMesh Granny mesh.
   * @returns {Uint16Array|Int32Array} The index array.
   */
  static grannyIndices(grannyMesh)
  {
    const { Indices16, Indices } = grannyMesh.PrimaryTopology;
    if (Indices16 && Indices16.length) return new Uint16Array(Indices16.buffer, Indices16.byteOffset, Indices16.length);
    return Indices;
  }

  /**
   * Carbon GetVertexComponentOffset (TriGeometryRes.cpp:377-400): the byte offset of a named member
   * in a Granny mesh's vertex, or -1.
   *
   * @implemented
   * @param {object} grannyMesh Granny mesh.
   * @param {string} componentName Granny member name.
   * @returns {number} Offset, or -1.
   */
  GetVertexComponentOffset(grannyMesh, componentName)
  {
    let offset = 0;
    for (const member of grannyMesh.PrimaryVertexData.Vertices.type)
    {
      if (member.name === componentName) return offset;
      offset += GrannyGetTotalTypeSize(member);
    }
    return -1;
  }

  /**
   * Carbon DetermineAreaBoundsAndVertCount (TriGeometryRes.cpp:676-713): an area's box from the
   * positions its triangles reference.
   *
   * @implemented
   * @param {TriGeometryResAreaData} area Area, updated.
   * @param {object} grannyMesh Granny mesh.
   * @param {number} bytesPerVertex Vertex stride.
   */
  DetermineAreaBoundsAndVertCount(area, grannyMesh, bytesPerVertex)
  {
    const { positionOffset, positionType } = GetVertexPositionOffsetAndType(grannyMesh);
    vec3.set(area.minBounds, Infinity, Infinity, Infinity);
    vec3.set(area.maxBounds, -Infinity, -Infinity, -Infinity);
    const indices = TriGeometryRes.grannyIndices(grannyMesh);
    const position = [ 0, 0, 0 ];
    for (let vIx = 0; vIx < area.primitiveCount * 3; ++vIx)
    {
      GetMeshVertexPosition(grannyMesh, indices[vIx + area.firstIndex], position, bytesPerVertex, positionOffset, positionType);
      TriGeometryRes._BoundingBoxUpdate(area.minBounds, area.maxBounds, position, position);
    }
  }

  /**
   * Carbon IsAreaSkinned (TriGeometryRes.cpp:716-798): whether any vertex of the area is bound to a
   * bone other than the root of the first model whose skeleton has more than one bone.
   *
   * @implemented
   * @param {TriGeometryResAreaData} area Area.
   * @param {object} grannyMesh Granny mesh.
   * @param {object} gi The granny_file_info.
   * @param {number} bytesPerVertex Vertex stride.
   * @returns {boolean} Whether the area is skinned.
   */
  IsAreaSkinned(area, grannyMesh, gi, bytesPerVertex)
  {
    const boneIndexOffset = this.GetVertexComponentOffset(grannyMesh, "BoneIndices");
    // If there are no bone indices, we are done.
    if (boneIndexOffset === -1) return false;

    let rootBone = null;
    for (const model of gi.Models ?? [])
    {
      if (model.Skeleton && model.Skeleton.Bones.length > 1 && model.MeshBindings.length > 0)
      {
        rootBone = model.Skeleton.Bones[0].Name;
        break;
      }
    }
    const rootBoneIndex = rootBone === null ? -1
      : (grannyMesh.BoneBindings ?? []).findIndex(binding => binding.BoneName && binding.BoneName === rootBone);
    if (rootBoneIndex < 0) return true;

    const bytes = grannyMesh.PrimaryVertexData.Vertices.bytes;
    const indices = TriGeometryRes.grannyIndices(grannyMesh);
    for (let vIx = 0; vIx < area.primitiveCount * 3; ++vIx)
    {
      const base = indices[vIx + area.firstIndex] * bytesPerVertex + boneIndexOffset;
      for (let bone = 0; bone < 4; bone++)
      {
        // Found it attached to a bone, so return early.
        if (bytes[base + bone] !== rootBoneIndex) return true;
      }
    }
    // No vertex has a valid bone index.
    return false;
  }

  /**
   * Carbon IsAreaMorphed (TriGeometryRes.cpp:800-852): whether any morph target moves a vertex of
   * the area by more than sqrt(0.001).
   *
   * Carbon reads the delta flag from the first morph target for every target
   * (`myMesh->MorphTargets->DataIsDeltas`, cpp:823); so does this (quirk).
   *
   * @implemented
   * @param {TriGeometryResAreaData} area Area.
   * @param {object} myMesh Granny mesh.
   * @param {object} _gi The granny_file_info (unused, as in Carbon).
   * @returns {boolean} Whether the area is morphed.
   */
  IsAreaMorphed(area, myMesh, _gi)
  {
    const targets = myMesh.MorphTargets ?? [];
    if (targets.length === 0) return false;

    const EPSILON = Math.fround(0.001);
    const baseData = TriGeometryRes._InitMorphToBaseData(BuildFromGrannyVertexDecl(myMesh.PrimaryVertexData.Vertices.type));
    const morphData = TriGeometryRes._InitMorphToBaseData(BuildFromGrannyVertexDecl(targets[0].VertexData.Vertices.type));
    const dataIsDeltas = Boolean(targets[0].DataIsDeltas);
    const base = myMesh.PrimaryVertexData.Vertices.bytes;
    const baseView = new DataView(base.buffer, base.byteOffset, base.byteLength);
    const indices = TriGeometryRes.grannyIndices(myMesh);
    const vertex = [ 0, 0, 0 ], morphVertex = [ 0, 0, 0 ];
    for (const target of targets)
    {
      const morph = target.VertexData.Vertices.bytes;
      const morphView = new DataView(morph.buffer, morph.byteOffset, morph.byteLength);
      for (let vIx = 0; vIx < area.primitiveCount * 3; ++vIx)
      {
        const index = indices[vIx + area.firstIndex];
        ConvertDataToVector3(baseData.declType, baseView, baseData.positionByteOffset + index * baseData.bytesPerVertex, vertex);
        ConvertDataToVector3(morphData.declType, morphView, morphData.positionByteOffset + index * morphData.bytesPerVertex, morphVertex);
        let x = morphVertex[0], y = morphVertex[1], z = morphVertex[2];
        if (!dataIsDeltas)
        {
          x -= vertex[0];
          y -= vertex[1];
          z -= vertex[2];
        }
        if (x * x + y * y + z * z > EPSILON) return true;
      }
    }
    return false;
  }

  /**
   * Carbon InitMorphToBaseData (TriGeometryRes.cpp:146-155): a definition's stride and its POSITION 0
   * item's offset and type.
   *
   * @cjs Carbon's file-local helper, kept on its caller.
   * @param {Tr2VertexDefinition} decl Vertex definition.
   * @returns {{bytesPerVertex: number, positionByteOffset: number, declType: string}} The data.
   */
  static _InitMorphToBaseData(decl)
  {
    const position = decl.items.find(item => item.usage === Tr2VertexUsageCode.POSITION && item.usageIndex === 0);
    return { bytesPerVertex: decl.nextOffset[0], positionByteOffset: position ? position.offset : 0,
      declType: position ? position.type : "DT_UNKNOWN_TYPE" };
  }

  /**
   * Carbon SetupSkeletons( granny_file_info* ) (TriGeometryRes.cpp:1212-1241): one skeleton record
   * per Granny skeleton, a joint per bone with its parent index and inverse world transform.
   *
   * @implemented
   * @param {object} gi The granny_file_info.
   */
  SetupSkeletons__GrannyFileInfo(gi)
  {
    this._skeletons = (gi.Skeletons ?? []).map(skel =>
    {
      const record = new TriGeometryResSkeletonData();
      record.name = skel.Name ?? "";
      record.joints = skel.Bones.map(bone =>
      {
        const joint = new TriGeometryResJointData();
        joint.name = bone.Name ?? "";
        joint.parentJoint = bone.ParentIndex >>> 0;
        // Granny's InverseWorld4x4, reflected in the file as InverseWorldTransform.
        mat4.copy(joint.inverseWorldTransform, bone.InverseWorldTransform);
        return joint;
      });
      return record;
    });
  }

  /**
   * Explicitly release the LOD allocations owned by Carbon's resource destructor.
   *
   * @adapted explicit JS teardown replaces native destruction; the existing
   *   MotherLode switches keep CPU data and opaque adapter cleanup independent.
   * @param {object} [options={}] Existing MotherLode cleanup policy.
   * @param {boolean} [options.releasePayload=true] Release owned family data.
   * @param {boolean} [options.destroyAdapters=true] Destroy opaque device adapter slots.
   * @returns {void}
   */
  _OnShutdown(options = {})
  {
    if (options.destroyAdapters !== false) this.DestroyAdapterResources();
    if (options.releasePayload === false) return;
    this.DestroyRayCaster();
    for (const mesh of this._meshes)
    {
      for (const lod of mesh.lods)
      {
        // wireframeIndexAllocation: the lazy edge list wireframe draws build
        // (TriGeometryResAllocations.CreateLodWireframeIndices).
        for (const field of [ "vertexAllocation", "indexAllocation", "reversedIndexAllocation", "wireframeIndexAllocation" ])
        {
          const allocation = lod[field];
          if (allocation?._parent) allocation._parent.Free(allocation);
          lod[field] = null;
        }
        lod.allocationsValid = false;
        lod.reversedIndicesValid = false;
      }
    }
    this._ForgetGrannyFile();
    this._memoryUse = 0;
    this._cmfData = null;
    this._meshes = [];
    this._skeletons = [];
  }

  /**
   * Carbon `IsMemoryUsageKnown` (TriGeometryRes.cpp:1835-1838): known once loaded.
   *
   * @implemented
   * @returns {boolean}
   */
  IsMemoryUsageKnown()
  {
    return !this.IsLoading();
  }

  /**
   * Carbon `GetMemoryUsage` (TriGeometryRes.cpp:1840-1843): `m_memoryUse`.
   *
   * @adapted Carbon builds every LOD's buffers while preparing; they are built
   *   here when a LOD is first drawn, so the figure counts the LODs drawn so far.
   * @returns {number} Bytes.
   */
  GetMemoryUsage()
  {
    return this._memoryUse;
  }

  /**
   * Carbon ReadGrannyFile (TriGeometryRes.cpp:1264-1299): keeps the granny file info and sets up the
   * meshes and skeletons from it (SetupMeshes__GrannyFileInfo, SetupSkeletons__GrannyFileInfo).
   *
   * @adapted the file info is the GR2 reader's (`{ grannyFileInfo, version }`, the geometry route's
   *   read); bytes are read into it here. A shared GR2 projection, which TriGrannyRes hands over, is
   *   still projected to CMF data, because TriGrannyRes keeps no file info.
   * @param {object|ArrayBufferView} bytes The file info read, a shared projection, or the file's bytes.
   * @returns {boolean} Whether meshes and skeletons were installed.
   */
  ReadGrannyFile(bytes)
  {
    if (bytes?.grannyFileInfo)
    {
      const gi = bytes.grannyFileInfo;
      if (!this.SetupMeshes__GrannyFileInfo(gi)) return false;
      this.SetupSkeletons__GrannyFileInfo(gi);
      this._useCMF = false;
      this._grannyFile = gi;
      this._grannyVersion = bytes.version;
      return true;
    }
    // Bytes are read as the granny file info, as the geometry route reads them.
    if (bytes?.grannyFileFormatRevision === undefined)
    {
      const raw = readGr2Raw(bytes, { rawArrays: true });
      return this.ReadGrannyFile({ grannyFileInfo: raw.fileInfo, version: raw.version });
    }
    // A shared projection handed in (TriGrannyRes, which reads the gr2raw route as shared data) is
    // still projected to CMF; TriGrannyRes does not keep the file info. The installed data is CMF,
    // so the geometry reads as CMF: the device path and readers take the CMF branch. The
    // projection is kept as the granny file for the animation sampler (GetGrannyInfo).
    const granny = bytes;
    const data = CjsCmfFormat.loadShared(granny);
    if (!this.SetupMeshes__CmfData(data)) return false;
    this.SetupSkeletons__CmfData(data);
    this._useCMF = true;
    this._grannyFile = granny;
    // A shared projection read is already the shape GetGrannySharedInfo answers.
    this._grannySharedInfo = granny;
    return true;
  }

  /**
   * Carbon ReadCMFFile (TriGeometryRes.cpp:1224-1242), using the JS CMF reader.
   *
   * @adapted
   * @param {object|ArrayBufferView} bytes Decoded CMF data or its bytes.
   * @returns {boolean} Whether meshes and skeletons were installed.
   */
  ReadCMFFile(bytes)
  {
    const data = bytes?.meshes ? bytes : CjsCmfFormat.read(bytes);
    if (!this.SetupMeshes__CmfData(data)) return false;
    this.SetupSkeletons__CmfData(data);
    this._useCMF = true;
    return true;
  }

  /**
   * The granny file this resource was read from, or null for a CMF source.
   *
   * @adapted Carbon `GetGrannyInfo` (cpp:242-252) answers the file info of m_pGrannyFile;
   *   here that is the gr2 reader's output, kept whole.
   * @returns {object|null} The gr2 read.
   */
  GetGrannyInfo()
  {
    return this._grannyFile;
  }

  /**
   * The shared GR2 projection of the granny file's animations, models and skeletons, with the
   * meshes' bone bindings and none of their vertex data; built once per file.
   *
   * @cjs our animation sampler and the turret's dynamic bounds read the shared projection's
   *   shape, not granny_file_info; Carbon reads the file info itself. Vertex data is left out, since
   *   no such reader needs it and the file keeps it as bytes.
   * @returns {object|null} The projection, or null without a granny file.
   */
  GetGrannySharedInfo()
  {
    if (!this._grannyFile) return null;
    if (this._grannySharedInfo) return this._grannySharedInfo;
    const fi = this._grannyFile;
    const stripped = new Map((fi.Meshes ?? []).map(mesh =>
      [ mesh, mesh && { ...mesh, PrimaryVertexData: null, PrimaryTopology: null, MorphTargets: [] } ]));
    const view = {
      ...fi,
      Meshes: (fi.Meshes ?? []).map(mesh => stripped.get(mesh)),
      Models: (fi.Models ?? []).map(model => model && {
        ...model,
        MeshBindings: (model.MeshBindings ?? []).map(binding => ({ ...binding, Mesh: stripped.get(binding.Mesh) ?? binding.Mesh }))
      })
    };
    this._grannySharedInfo = projectShared(view, this._grannyVersion);
    return this._grannySharedInfo;
  }

  /**
   * One LOD's vertex positions as a flat xyz list, from whichever reader ran: the Granny mesh's
   * vertex bytes (read through GetMeshVertexPosition) or the CMF source's position channel.
   *
   * @cjs the CPU readers of positions (bounds, spheres, decal selection, ray queries) read
   *   Carbon's data through this rather than one shape each.
   * @param {number} meshIndex Mesh index.
   * @param {TriGeometryResLodData} lod LOD record of that mesh.
   * @returns {ArrayLike<number>|null} Positions, or null when the data is not resident.
   */
  GetLodPositions(meshIndex, lod)
  {
    if (this._useCMF)
    {
      const cmfLod = this.GetCMFLod(meshIndex, lod);
      return cmfLod?.vertex?.position ?? this._cmfData?.meshes?.[meshIndex]?.vertex?.position ?? null;
    }
    const grannyMesh = this._grannyFile?.Meshes?.[lod.grannyMeshIndex];
    if (!grannyMesh) return null;
    let positions = this._grannyPositions.get(grannyMesh);
    if (!positions)
    {
      const { positionOffset, positionType } = GetVertexPositionOffsetAndType(grannyMesh);
      const vertices = grannyMesh.PrimaryVertexData.Vertices;
      positions = new Float32Array(vertices.count * 3); // alloc: cached per granny mesh for the file's life
      const point = [ 0, 0, 0 ];
      for (let index = 0; index < vertices.count; index++)
      {
        GetMeshVertexPosition(grannyMesh, index, point, vertices.stride, positionOffset, positionType);
        positions[index * 3] = point[0];
        positions[index * 3 + 1] = point[1];
        positions[index * 3 + 2] = point[2];
      }
      this._grannyPositions.set(grannyMesh, positions);
    }
    return positions;
  }

  /**
   * One LOD's triangle indices, from whichever reader ran.
   *
   * @cjs as GetLodPositions.
   * @param {number} meshIndex Mesh index.
   * @param {TriGeometryResLodData} lod LOD record of that mesh.
   * @returns {ArrayLike<number>|null} Indices, or null when the data is not resident.
   */
  GetLodIndices(meshIndex, lod)
  {
    if (this._useCMF)
    {
      const cmfMesh = this._cmfData?.meshes?.[meshIndex];
      const packed = cmfMesh ? TriGeometryRes.packLodIndices(cmfMesh, cmfMesh.lods?.length ? lod.originalLodIndex : 0) : null;
      return packed ? new (packed.format === "uint32" ? Uint32Array : Uint16Array)(packed.bytes.buffer, packed.bytes.byteOffset, packed.count) : null;
    }
    const grannyMesh = this._grannyFile?.Meshes?.[lod.grannyMeshIndex];
    return grannyMesh ? TriGeometryRes.grannyIndices(grannyMesh) : null;
  }

  /**
   * One mesh as decoded vertex channels and per-area triangle lists, the shape our own CPU readers
   * take (the Incarna emulator, Graphene's character tools): the CMF mesh itself, or for a Granny
   * mesh its first LOD's vertex members decoded as the shared GR2 projection names and dequantizes
   * them (position, normal, tangent, binormal, texcoord0/1, blendIndice, blendWeight), with one
   * index group per area of the record's first LOD.
   *
   * @cjs Carbon's readers take the vertex bytes; these readers of ours take channels.
   * @param {number} meshIndex Mesh index.
   * @returns {{vertex: Object<string, Float32Array>, indices: Array<{faces: ArrayLike<number>}>}|null} The mesh, or null.
   */
  GetDecodedMesh(meshIndex)
  {
    if (this._useCMF) return this._cmfData?.meshes?.[meshIndex] ?? null;
    const mesh = this._meshes[meshIndex];
    const grannyMesh = mesh ? this._grannyFile?.Meshes?.[mesh.lods[0].grannyMeshIndex] : null;
    if (!grannyMesh) return null;
    let decoded = this._grannyDecoded.get(grannyMesh);
    if (decoded) return decoded;
    const vertices = grannyMesh.PrimaryVertexData.Vertices;
    const view = new DataView(vertices.bytes.buffer, vertices.bytes.byteOffset, vertices.bytes.byteLength);
    const vertex = {};
    let memberOffset = 0;
    for (const member of vertices.type)
    {
      const channelName = GRANNY_CHANNEL_NAMES[member.name];
      const reader = GRANNY_DEQUANTIZE[member.type];
      const width = Math.max(1, member.arrayWidth);
      if (channelName && reader)
      {
        const channel = new Float32Array(vertices.count * width); // alloc: cached per granny mesh for the file's life
        for (let index = 0; index < vertices.count; index++)
          for (let component = 0; component < width; component++)
            channel[index * width + component] = reader[1](view, index * vertices.stride + memberOffset + component * reader[0]);
        vertex[channelName] = channel;
      }
      memberOffset += GrannyGetTotalTypeSize(member);
    }
    const all = TriGeometryRes.grannyIndices(grannyMesh);
    decoded = {
      vertex,
      indices: mesh.lods[0].areas.map(area => ({ faces: all.subarray(area.firstIndex, area.firstIndex + area.primitiveCount * 3) }))
    };
    this._grannyDecoded.set(grannyMesh, decoded);
    return decoded;
  }

  /** Decoded meshes per granny mesh, for GetDecodedMesh. */
  _grannyDecoded = new WeakMap();

  /** Decoded positions per granny mesh, for GetLodPositions. */
  _grannyPositions = new WeakMap();

  /** The shared projection GetGrannySharedInfo built, or null. */
  _grannySharedInfo = null;

  /** The granny file's version, which the shared projection records. */
  _grannyVersion = 0;

  /**
   * Drops the kept granny file; the resource reads as CMF again, Carbon's default.
   *
   * @cjs
   * @implemented
   */
  _ForgetGrannyFile()
  {
    this._useCMF = true;
    this._grannyFile = null;
    this._grannySharedInfo = null;

  }

  /**
   * Get mesh count from the CPU geometry payload.
   *
   * @adapted
   * @returns {number}
   */
  GetMeshCount()
  {
    return this._meshes.length;
  }

  /**
   * Get animation count from the CPU geometry payload.
   *
   * @adapted
   * @returns {number}
   */
  GetAnimationCount()
  {
    return this._cmfData?.animations?.length || 0;
  }

  /**
   * Get skeleton count from the CPU geometry payload.
   *
   * @adapted
   * @returns {number}
   */
  GetSkeletonCount()
  {
    return this._skeletons.length;
  }

  /**
   * Get one resource-owned skeleton from the CPU geometry payload.
   *
   * @adapted
   * @param {number} skeletonIndex
   * @returns {*}
   */
  GetSkeletonData(skeletonIndex = 0)
  {
    const index = Number(skeletonIndex);

    if (!Number.isInteger(index) || index < 0)
    {
      return null;
    }

    return this._skeletons[index] ?? null;
  }

  /**
   * Get mesh area count from a CPU geometry payload mesh.
   *
   * @adapted
   * @param {number} meshIndex
   * @returns {number}
   */
  GetMeshAreaCount(meshIndex = 0)
  {
    const mesh = this._meshes[meshIndex];
    return mesh ? mesh.lods[0]?.areas.length ?? 0 : 0;
  }

  /**
   * Carbon GetMeshData (TriGeometryRes.cpp:300-308): the mesh record, or null
   * when the index is absent.
   *
   * @implemented
   * @param {number} meshIndex Mesh index.
   * @returns {TriGeometryResMeshData|null} Mesh record, or null when absent.
   */
  GetMeshData(meshIndex = 0)
  {
    return this._meshes[meshIndex] ?? null;
  }

  /**
   * The CMF source of one LOD record: the decoded LOD it was built from, or
   * the mesh itself when the mesh was its own LOD. Carbon reads the same
   * through `cmfContents.GetData()->meshes[i].lods[lod->m_originalLodIndex]`
   * (TriGeometryRes.cpp:2326).
   *
   * @cjs our payload may flatten a single-LOD mesh.
   * @param {number} meshIndex Mesh index.
   * @param {TriGeometryResLodData} lod LOD record of that mesh.
   * @returns {object|null} The decoded CMF LOD, or null without CMF data.
   */
  GetCMFLod(meshIndex, lod)
  {
    const cmfMesh = this._cmfData?.meshes?.[meshIndex];
    if (!cmfMesh) return null;
    return cmfMesh.lods?.length ? cmfMesh.lods[lod.originalLodIndex] ?? null : cmfMesh;
  }

  /**
   * Returns the decoded CMF-shaped payload used by Carbon mesh consumers.
   *
   * @adapted
   */
  GetCMFData()
  {
    return this._cmfData;
  }

  /**
   * Whether this resource was read from a CMF file.
   *
   * Carbon `IsUsingCMF` (cpp:2959-2966) answers m_useCMF, which the reader
   * sets - by file type, not by payload shape. Every payload here is CMF-shaped,
   * a granny one included, so the shape cannot answer it.
   *
   * @adapted
   * @returns {boolean} True unless ReadGrannyFile loaded it.
   */
  IsUsingCMF()
  {
    return this._useCMF;
  }

  // Carbon TriGeometryRes.cpp:294-319. Walks LODs from the LOWEST quality up
  // and takes the first whose authored maxScreenSize still covers the requested
  // size; a request larger than the best LOD falls back to LOD 0, which Carbon
  // comments explicitly. forceLod pins the index instead, clamped to the last
  // LOD.

  /**
   * The LOD index this mesh should be drawn at for a screen size, or -1 when the
   * mesh does not exist.
   *
   * @adapted
   * @param {number} meshIndex
   * @param {number} screenSize
   * @returns {number}
   */
  GetLodIndexForScreenSize(meshIndex = 0, screenSize = Infinity)
  {
    const mesh = this._meshes[meshIndex];

    if (!mesh) return -1;

    const lods = mesh.lods;
    const lastLod = lods.length - 1;

    if (this.forceLod && this.forcedLodIndex >= 0)
    {
      return Math.min(this.forcedLodIndex, lastLod);
    }

    for (let index = lastLod; index >= 0; index--)
    {
      const maxScreenSize = lods[index].maxScreenSize;
      if (maxScreenSize >= screenSize) return index;
    }

    return 0;
  }

  // Carbon TriGeometryRes.cpp:268-279. Carbon overloads this on float
  // screenSize versus int lodIndex; JavaScript cannot, so the index form is
  // GetMeshLod__LodIndex. Carbon indexes m_lods with the result unguarded, so a
  // mesh with an EMPTY lod list reads out of bounds there; this port returns
  // null (a known Carbon defect).

  /**
   * The LOD data this mesh should be drawn at for a screen size, or null when
   * the mesh has no LODs.
   *
   * @adapted
   * @param {number} meshIndex
   * @param {number} screenSize
   * @returns {object|null}
   */
  GetMeshLod__ScreenSize(meshIndex, screenSize)
  {
    return this.GetMeshLod__LodIndex(meshIndex, this.GetLodIndexForScreenSize(meshIndex, screenSize));
  }

  /**
   * The LOD data at an explicit index, or null when the mesh or index does not
   * exist (Carbon TriGeometryRes.cpp:281-292).
   *
   * @adapted
   * @param {number} meshIndex
   * @param {number} lodIndex
   * @returns {object|null}
   */
  GetMeshLod__LodIndex(meshIndex, lodIndex)
  {
    const mesh = this._meshes[meshIndex];

    if (!mesh || lodIndex < 0) return null;

    return lodIndex < mesh.lods.length ? mesh.lods[lodIndex] : null;
  }

  /**
   * Get mesh name from a CPU geometry payload.
   *
   * @adapted
   * @param {number} meshIndex
   * @returns {string}
   */
  GetMeshName(meshIndex = 0)
  {
    return this._meshes[meshIndex]?.name ?? "";
  }

  /**
   * Get mesh area name from a CPU geometry payload.
   *
   * @adapted
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @returns {string}
   */
  GetMeshAreaName(meshIndex = 0, areaIndex = 0)
  {
    return this._meshes[meshIndex]?.lods[0]?.areas[areaIndex]?.name ?? "";
  }

  /**
   * The bounding box of one area of one mesh, for script.
   *
   * Carbon: TriGeometryRes::GetAreaBoundingBoxFromScript (trinity/trinity/Resources/TriGeometryRes.cpp:2875-2894;
   * TriGeometryRes.h:293). Exposed as "GetAreaBoundingBox"
   * (TriGeometryRes_Blue.cpp:83-88, MAP_METHOD_AND_WRAP).
   *
   * @adapted Carbon fills `bounds` (a `std::pair<Vector3, Vector3>`) and returns a
   *   `Be::Result`; the pair is the return value and a failed result is thrown
   *   as an `Error` with Carbon's message. Area `areaIx` of the first LOD is read
   *   from the payload (cpp:2884). A payload area that holds no bounds yields
   *   zeros, as an unfilled `Vector3` member does.
   * @param {number} meshIx Mesh index.
   * @param {number} areaIx Area index.
   * @returns {Array<number[]>} `[min, max]`, each a three-element array.
   * @throws {Error} "Mesh index out of range, or invalid mesh" or "Area index out of range".
   */
  GetAreaBoundingBoxFromScript(meshIx, areaIx)
  {
    const mesh = this.GetMeshData(meshIx);
    if (!mesh) throw new Error("Mesh index out of range, or invalid mesh");

    const areas = mesh.lods[0]?.areas ?? [];
    if (areaIx < 0 || areaIx >= areas.length) throw new Error("Area index out of range");

    return boundsPair({ min: areas[areaIx].minBounds, max: areas[areaIx].maxBounds });
  }

  /**
   * The bounding box of one mesh, for script.
   *
   * Carbon: TriGeometryRes::GetBoundingBoxFromScript (trinity/trinity/Resources/TriGeometryRes.cpp:416-431;
   * TriGeometryRes.h:326). Exposed as "GetBoundingBox"
   * (TriGeometryRes_Blue.cpp:90-94, MAP_METHOD_AND_WRAP).
   *
   * @adapted the `std::pair<Vector3, Vector3>` out parameter is the return
   *   value and a failed `Be::Result` is thrown as an `Error` with Carbon's
   *   message.
   * @param {number} meshIx Mesh index.
   * @returns {Array<number[]>} `[min, max]`, each a three-element array.
   * @throws {Error} "Mesh index out of bounds" or "Invalid mesh".
   */
  GetBoundingBoxFromScript(meshIx)
  {
    if (!(meshIx < this._meshes.length)) throw new Error("Mesh index out of bounds");

    const mesh = this._meshes[meshIx];
    if (!mesh) throw new Error("Invalid mesh");

    return boundsPair({ min: mesh.minBounds, max: mesh.maxBounds });
  }

  /**
   * The bounding sphere of one mesh, for script.
   *
   * Carbon: TriGeometryRes::GetBoundingSphereFromScript (trinity/trinity/Resources/TriGeometryRes.cpp:2896-2910;
   * TriGeometryRes.h:329). Exposed as "GetBoundingSphere"
   * (TriGeometryRes_Blue.cpp:95-99, MAP_METHOD_AND_WRAP).
   *
   * @adapted the `std::pair<Vector3, float>` out parameter is the return value
   *   and a failed `Be::Result` is thrown as an `Error` with Carbon's message.
   * @param {number} meshIx Mesh index.
   * @returns {Array} `[center, radius]`: a three-element array and a number.
   * @throws {Error} "Mesh index out of range" or "Invalid mesh".
   */
  GetBoundingSphereFromScript(meshIx)
  {
    if (!(meshIx < this._meshes.length)) throw new Error("Mesh index out of range");

    const mesh = this._meshes[meshIx];
    if (!mesh) throw new Error("Invalid mesh");

    const sphere = mesh.boundingSphere;
    return [ [ sphere[0], sphere[1], sphere[2] ], sphere[3] ];
  }

  /**
   * Carbon GetAreaBoundingBox (TriGeometryRes.cpp:433-456): the bounds of one
   * area of the mesh's first LOD.
   *
   * @adapted without out vectors the bounds are returned (null when absent);
   *   with them, they are filled and the result is whether the area exists.
   * @param {number} meshIndex
   * @param {number} areaIndex
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
   */
  GetAreaBoundingBox(meshIndex = 0, areaIndex = 0, outMin = null, outMax = null)
  {
    const area = this._meshes[meshIndex]?.lods[0]?.areas[areaIndex];
    const bounds = area ? { min: area.minBounds, max: area.maxBounds } : null;
    return TriGeometryRes.copyBounds(bounds, outMin, outMax);
  }

  /**
   * Carbon GetBoundingBox (TriGeometryRes.cpp:402-414): the mesh record's box.
   *
   * @adapted without out vectors the bounds are returned (null when the mesh is
   *   absent); with them, they are filled and the result is whether it exists.
   * @param {number} meshIndex
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
   */
  GetBoundingBox(meshIndex = 0, outMin = null, outMax = null)
  {
    const mesh = this._meshes[meshIndex];
    const bounds = mesh ? { min: mesh.minBounds, max: mesh.maxBounds } : null;
    return TriGeometryRes.copyBounds(bounds, outMin, outMax);
  }

  /**
   * Carbon GetBoundingSphere (TriGeometryRes.cpp:458-469): the mesh record's
   * sphere, zero for a granny mesh until RecalculateBoundingSphere (cpp:1039).
   *
   * @adapted without an out vector the sphere is returned (null when the mesh is
   *   absent); with one, it is filled and the result is whether the mesh exists.
   * @param {number} meshIndex
   * @param {ArrayLike<number>|null} out
   * @returns {*|boolean}
   */
  GetBoundingSphere(meshIndex = 0, out = null)
  {
    const sphere = this._meshes[meshIndex]?.boundingSphere ?? null;
    if (!out) return sphere;
    if (!sphere) return false;
    vec4.copy(out, sphere);
    return true;
  }

  /**
   * Calculate a transformed bounding box from canonical CPU vertex data.
   *
   * Carbon stores the same matrix bytes as gl-matrix; transforming one point
   * therefore uses the ordinary column-vector index layout.
   *
   * @adapted
   * @param {number} meshIndex
   * @param {ArrayLike<number>} transform
   * @returns {{min: number[], max: number[]}|null}
   */
  CalculateBoundingBoxFromTransform(meshIndex = 0, transform = null)
  {
    if (!transform || transform.length < 16)
    {
      throw new TypeError("TriGeometryRes transform must contain 16 matrix elements.");
    }
    const mesh = this.GetDecodedMesh(meshIndex);
    if (!mesh) return null;
    const positions = TriGeometryRes.getMeshPositions(mesh);
    const sourceBounds = TriGeometryRes.getBounds(this._useCMF ? mesh : null);
    if (!positions && !sourceBounds) return null;

    const
      bounds = box3.alloc(),
      point = vec3.alloc();
    try
    {
      if (!TriGeometryRes.setBoundsFromPositions(bounds, positions, point))
      {
        if (!sourceBounds) return null;
        box3.fromBounds(bounds, sourceBounds.min, sourceBounds.max);
      }
      box3.transformMat4(bounds, bounds, transform);
      return {
        min: [ bounds[0], bounds[1], bounds[2] ],
        max: [ bounds[3], bounds[4], bounds[5] ]
      };
    }
    finally
    {
      vec3.unalloc(point);
      box3.unalloc(bounds);
    }
  }

  /**
   * Carbon RecalculateBoundingSphere (TriGeometryRes.cpp:1347-1426): each mesh
   * record's sphere from its vertex positions.
   *
   * @adapted the positions are read from the CMF source, falling back to its
   *   bounds box when it holds none.
   * @returns {boolean} Whether any sphere was set.
   */
  RecalculateBoundingSphere()
  {
    let updated = false;
    const
      sphere = sph3.alloc(),
      point = vec3.alloc();
    try
    {
      const cmfMeshes = this._cmfData?.meshes ?? [];
      for (let meshIndex = 0; meshIndex < this._meshes.length; meshIndex++)
      {
        const mesh = this._meshes[meshIndex];
        if (this._useCMF)
        {
          const cmfMesh = cmfMeshes[meshIndex];
          if (!cmfMesh || !TriGeometryRes.calculateMeshSphere(sphere, cmfMesh, point)) continue;
        }
        // Carbon reads the first LOD's positions (cpp:1363-1384); a Granny LOD's are its file bytes.
        else if (!TriGeometryRes.setSphereFromPositions(sphere, this.GetLodPositions(meshIndex, mesh.lods[0]), point)) continue;
        vec4.copy(mesh.boundingSphere, sphere);
        updated = true;
      }
      return updated;
    }
    finally
    {
      vec3.unalloc(point);
      sph3.unalloc(sphere);
    }
  }

  /**
   * Reloads a released geometry handle through its existing manager hook.
   * Carbon clears geometry caches and delegates to BlueAsyncRes::Reload
   * (TriGeometryRes.cpp:1855-1863). JS release already clears those caches;
   * the base owns bounded same-handle recovery from PURGED/FAILED. A prepared
   * handle is not force-refetched here; an explicit native Reload refills the same handle.
   *
   * @adapted
   * @param {object} [options={}] Resource activity options.
   * @returns {boolean} Whether recovery started.
   */
  Reload(options = {})
  {
    return super.Reload(options);
  }

  /**
   * The near intersection of a ray with the geometry, for script.
   *
   * Carbon: TriGeometryRes::GetIntersectionPointNormalBoneFromScript (trinity/trinity/Resources/TriGeometryRes.cpp:1511-1517;
   * TriGeometryRes.h:319). Exposed as "GetIntersectionPointNormalBone"
   * (TriGeometryRes_Blue.cpp:133-138, MAP_METHOD_AND_WRAP).
   *
   * @adapted Carbon returns the nested pair `(hit, (boneIndex, (position,
   *   normal)))` built from `GetIntersectionPoints`; this returns the same facts
   *   as one object, the shape the CPU intersection already produces (`hit`,
   *   `boneIndex`, `position`, `normal`, with `point`, `unnormalizedNormal`,
   *   `distance`, `meshIndex` and `areaIndex` beside them). It intersects the
   *   resident CPU meshes directly, which is Carbon's legacy fallback
   *   (cpp:1635-1638), not the BVH of a prepared ray caster, and throws when no
   *   CPU geometry is resident.
   * @param {ArrayLike<number>} position Ray origin.
   * @param {ArrayLike<number>} direction Ray direction.
   * @returns {object} The hit; `hit` is false with a zero position and normal and bone -1 on a miss.
   */
  GetIntersectionPointNormalBoneFromScript(position, direction)
  {
    return TriGeometryRes.intersectGeometry(
      this.RequireIntersectionMeshes(),
      position,
      direction,
      -1
    );
  }

  /**
   * The near intersection of a ray with one area of the geometry, for script.
   *
   * Carbon: TriGeometryRes::GetAreaIntersectionPointNormalBoneFromScript (trinity/trinity/Resources/TriGeometryRes.cpp:1519-1537;
   * TriGeometryRes.h:320). Exposed as "GetAreaIntersectionPointNormalBone"
   * (TriGeometryRes_Blue.cpp:140-146, MAP_METHOD_AND_WRAP).
   *
   * Adapted as `GetIntersectionPointNormalBoneFromScript` is: one object for
   * Carbon's nested pair, a failed `Be::Result` thrown. -1 is every area,
   * Carbon's "legacy behavior" value (cpp:1523); Carbon's cast of the signed
   * index to unsigned (cpp:1527-1529) is not needed, since -1 stays -1.
   *
   * @adapted
   * @param {ArrayLike<number>} position Ray origin.
   * @param {ArrayLike<number>} direction Ray direction.
   * @param {number} areaIndex The mesh area index; -1 for all areas.
   * @returns {object} See `GetIntersectionPointNormalBoneFromScript`.
   * @throws {RangeError} "Invalid area index" below -1 (JS also refuses a non-integer).
   */
  GetAreaIntersectionPointNormalBoneFromScript(position, direction, areaIndex)
  {
    if (!Number.isInteger(areaIndex) || areaIndex < -1)
    {
      throw new RangeError("Invalid area index");
    }
    return TriGeometryRes.intersectGeometry(
      this.RequireIntersectionMeshes(),
      position,
      direction,
      areaIndex
    );
  }

  /**
   * Opens one borrowed CPU-raycast session over the resident geometry.
   *
   * @adapted
   */
  PrepareRayCaster()
  {
    this._raycastUsers++;
    if (this._raycastGeometry || this._raycastPreparationFailed) return;

    try
    {
      this.RequireIntersectionMeshes();
      this._raycastGeometry = new Tr2RaycastGeometryRes().SetSource(this);
    }
    catch (_error)
    {
      this._raycastPreparationFailed = true;
    }
  }

  /**
   * Closes exactly one raycast session and drops the derived acceleration resource at zero.
   *
   * @adapted
   */
  ResetRayCaster()
  {
    if (this._raycastUsers === 0)
    {
      throw new Error("TriGeometryRes.ResetRayCaster called without a matching PrepareRayCaster.");
    }
    this._raycastUsers--;
    if (this._raycastUsers === 0)
    {
      this._raycastGeometry = null;
      this._raycastPreparationFailed = false;
    }
  }

  /**
   * Reports whether the reference-counted CPU raycast resource is ready.
   *
   * @adapted
   */
  IsRayCasterReady()
  {
    return this._raycastGeometry !== null;
  }

  /**
   * Reports whether the current raycast preparation session failed.
   *
   * @adapted
   */
  HasRayCasterPreparationFailed()
  {
    // cpp:1597-1603. A release destroys the derived geometry without touching
    // the session count, so an open session with nothing under it IS the
    // failure - Carbon's own comment there reads "ReleaseResources destroyed
    // our bvh :(".
    if (this._raycastUsers > 0 && !this._raycastGeometry) return true;
    return this._raycastPreparationFailed;
  }

  /**
   * Drop the derived raycast geometry, whether or not sessions are open.
   *
   * cpp:1560-1567. Carbon ignores the session count here; an open session
   * discovers the loss through HasRayCasterPreparationFailed.
   *
   * @adapted
   * @returns {TriGeometryRes} This resource.
   */
  DestroyRayCaster()
  {
    this._raycastGeometry = null;
    this._raycastPreparationFailed = false;
    return this;
  }

  /**
   * Carbon ReleaseResources (TriGeometryRes.cpp:496-509). Explicit JS teardown
   * replaces the mesh allocation destructors; device release is not cache purge.
   *
   * @adapted
   * @param {number} [storage] Native storage mask.
   * @returns {TriGeometryRes} This resource.
   */
  ReleaseResources(storage = TriStorageFlags.TRISTORAGE_ALL)
  {
    if (!(storage & TriStorageFlags.TRISTORAGE_MANAGEDMEMORY)) return this;
    this.CancelPendingLoad();
    this._isGood = this._isPrepared = false;
    this._NotifyReleaseCachedData();
    this._OnShutdown();
    return this;
  }

  /**
   * Public Carbon query; requires a matching active raycast session.
   *
   * @adapted
   */
  GetIntersectionPoints(position, direction, result, areaIndex = -1, rayLength = Infinity)
  {
    if (!this._raycastGeometry)
    {
      throw new Error("TriGeometryRes.GetIntersectionPoints requires a prepared raycast session.");
    }
    return this._raycastGeometry.GetIntersectionPoints(
      position, direction, result, areaIndex, rayLength);
  }

  /** Internal implementation borrowed by Tr2RaycastGeometryRes. */
  _IntersectRaycastGeometry(position, direction, result, areaIndex, rayLength)
  {
    const hit = TriGeometryRes.intersectGeometry(
      this.RequireIntersectionMeshes(), position, direction, areaIndex);
    if (!hit.hit) return false;

    const dx = hit.point[0] - position[0];
    const dy = hit.point[1] - position[1];
    const dz = hit.point[2] - position[2];
    const denominator = direction[0] * direction[0] +
      direction[1] * direction[1] + direction[2] * direction[2];
    const distance = denominator
      ? (dx * direction[0] + dy * direction[1] + dz * direction[2]) / denominator
      : Infinity;
    if (distance < 0 || distance > rayLength) return false;

    result.distance = distance;
    result.position = result.position ?? result.point ?? vec3.create();
    result.point = result.point ?? result.position;
    result.normal = result.normal ?? vec3.create();
    result.unnormalizedNormal = result.unnormalizedNormal ?? vec3.create();
    vec3.copy(result.position, hit.point);
    vec3.copy(result.point, hit.point);
    vec3.copy(result.normal, hit.normal);
    vec3.copy(result.unnormalizedNormal, hit.unnormalizedNormal);
    result.meshIndex = hit.meshIndex;
    result.areaIndex = hit.areaIndex;
    result.boneIndex = hit.boneIndex;
    return true;
  }

  /**
   * The CPU triangle data an intersection query needs, or a loud failure.
   *
   * A ray query used to read `GetPayload()?.meshes`, and `intersectGeometry`
   * loops over `meshes?.length || 0`. So an absent payload produced a clean
   * MISS: `hit: false`, no error, indistinguishable from the ray genuinely
   * passing the object by. Picking would appear to work and simply stop
   * hitting things, and the symptom reads as a maths bug rather than a
   * residency one.
   *
   * Carbon never has to answer this, because it holds the loaded file for the
   * resource's lifetime and its CPU data is always resident. Ours is
   * releasable, so the unavailable case is real and must be named.
   *
   * Throwing is the interim answer, not the final one: once accuracy tiers
   * exist a query degrades to bounds or sphere and reports which produced it.
   * What it must never do again is report absence as a miss.
   *
   * @cjs
   * @implemented
   * @returns {Array<*>} Canonical CPU meshes.
   * @throws {Error} When the CPU geometry is not resident.
   */
  RequireIntersectionMeshes()
  {
    // A Granny file's meshes are read through GetDecodedMesh, which carries the same positions and groups.
    const meshes = this._useCMF ? this._cmfData?.meshes
      : this._grannyFile ? this._meshes.map((_mesh, meshIndex) => this.GetDecodedMesh(meshIndex)) : null;
    if (!Array.isArray(meshes))
    {
      throw new Error(
        "TriGeometryRes cannot answer an intersection query: CPU geometry is "
        + "not resident. The payload was never loaded or has been released. "
        + "Reload through BlueResMan before querying."
      );
    }
    return meshes;
  }

  /**
   * Carbon GetMeshVertexElements (TriGeometryRes.cpp:2939-2966): a mesh's vertex elements. For a
   * Granny mesh, the items of the declaration SetupMeshes interned (m_vertexDeclarationHandle).
   *
   * @adapted a CMF mesh answers its CMF declaration (usage names), which the callers translate
   *   with CarbonVertexElements; Carbon reads both from the interned declaration and answers
   *   (usage, index) pairs. An absent mesh answers an empty list rather than an error.
   * @param {number} meshIndex
   * @returns {Array<*>}
   */
  GetMeshVertexElements(meshIndex = 0)
  {
    if (!this._useCMF)
    {
      const mesh = this._meshes[meshIndex];
      const definition = mesh ? Tr2EffectStateManager.getVertexDeclarationElements(mesh.vertexDeclarationHandle) : null;
      return definition ? definition.items ?? definition : [];
    }
    // The CMF reader emits the element list as `decl`, matching the CMF struct
    // field; this accessor read only `vertexElements`, which no reader in this
    // package populates, so it returned an empty list for every real decoded
    // payload. Both names are accepted because the name is the producer's.
    const mesh = this._cmfData?.meshes?.[meshIndex];

    return mesh?.decl || mesh?.vertexElements || [];
  }

  /**
   * Returns IsGood, as Carbon's ITr2InstanceData readiness does (cpp:2769-2772).
   *
   * @implemented
   */
  IsInstanceDataReady()
  {
    return this.IsGood();
  }

  /**
   * Returns the selected LOD's vertex allocation as an instance stream (cpp:2774-2788).
   *
   * @adapted a plain record avoids a resource-to-Trinity import. Null is the
   *   uninitialized AL buffer; before lazy preparation the stream is empty.
   * @param {number} bufferIndex Mesh index.
   * @param {number} screenSize Projected size for LOD selection.
   * @returns {object} Buffer, byte offset, byte stride and vertex count.
   */
  GetInstanceData(bufferIndex = 0, screenSize = Infinity)
  {
    const mesh = this.GetMeshData(bufferIndex);
    const lod = mesh ? this.GetMeshLod__ScreenSize(bufferIndex, screenSize) : null;
    const allocation = lod?.vertexAllocation;
    if (!allocation) return { buffer: null, offset: 0, stride: 0, count: 0 };
    return { buffer: allocation.GetBuffer(), offset: allocation.GetOffset(),
      stride: mesh.bytesPerVertex, count: lod.vertexCount };
  }

  /**
   * Returns the prepared mesh declaration or Carbon's ~0u sentinel (cpp:2799-2806).
   *
   * @adapted the Trinity allocation helper installs the handle on first use;
   *   the resource layer cannot import Tr2EffectStateManager to name the sentinel.
   * @param {number} bufferIndex Mesh index.
   * @returns {number} Vertex declaration handle.
   */
  GetInstanceBufferVertexDeclaration(bufferIndex = 0)
  {
    return this.GetMeshData(bufferIndex)?.vertexDeclarationHandle ?? 0xFFFFFFFF;
  }

  /**
   * Returns mesh-local bounds or Carbon's empty box (cpp:2808-2817).
   *
   * @adapted decoded bounds become the existing JS min/max pair; an absent
   *   mesh never borrows the whole resource's bounds.
   * @param {number} bufferIndex Mesh index.
   * @returns {object} Detached min/max vectors.
   */
  GetInstanceBufferBoundingBox(bufferIndex = 0)
  {
    const source = TriGeometryRes.getBounds(this.GetMeshData(bufferIndex));
    if (source) return { min: vec3.clone(source.min), max: vec3.clone(source.max) }; // alloc: native value-returned bounds belong to the caller.
    const bounds = { min: vec3.create(), max: vec3.create() }; // alloc: returned empty bounds belong to the caller.
    box3.bounds.empty(bounds.min, bounds.max);
    return bounds;
  }

  /**
   * Saving belongs to the selected geometry format writer and destination.
   *
   * @notSupported
   * @throws {Error}
   */
  SaveMesh()
  {
    throw resourceBoundaryError(
      "TriGeometryRes",
      "SaveMesh",
      "Use a geometry format writer with the resource payload and a caller-owned destination."
    );
  }


  // Carbon TriGeometryRes.cpp:158-178, declared beside the class
  // (TriGeometryRes.h:202) because it reads LOD data rather than resource
  // state - which is why it is static here. It returns a PLAIN SUM and does not
  // multiply by three: the *3 belongs to the caller, so triangles-only is a
  // property of the mesh draw path rather than of the geometry layer.

  /**
   * The summed primitive count over `count` areas of a LOD starting at `index`,
   * with the run clamped to the area list as Carbon clamps it; zero when the
   * index is out of range, which callers treat as "emit no draw".
   *
   * @param {object|null} lod
   * @param {number} index
   * @param {number} count
   * @returns {number}
   */
  static getPrimitiveCount(lod, index, count)
  {
    const areas = lod?.areas ?? null;
    const areaCount = areas?.length ?? 0;

    if (!areaCount || index >= areaCount) return 0;

    const run = index + count > areaCount ? areaCount - index : count;

    let primitiveCount = 0;

    for (let offset = 0; offset < run; offset++)
    {
      primitiveCount += TriGeometryRes.getAreaPrimitiveCount(areas[index + offset]);
    }

    return primitiveCount;
  }

  // A CMF LOD AREA IS NOT A CARBON AREA, AND THE DIFFERENCE IS A FACTOR OF THREE.
  //
  // Carbon converts at the read boundary (TriGeometryRes.cpp:905-906):
  //
  //     area.m_firstIndex     = cmfLodMeshArea.firstElement * 3;
  //     area.m_primitiveCount = cmfLodMeshArea.elementCount;
  //
  // `firstElement` counts TRIANGLES and `m_firstIndex` counts INDICES, so the
  // start converts and the count does not. Reading `firstElement` as an index
  // would draw the right number of triangles from a third of the way into the
  // area - plausible geometry, wrong geometry, and no error anywhere.
  //
  // Both names are accepted for the same reason `decl`/`vertexElements` are
  // accepted above: the name is the producer's. A payload built by a reader
  // that already speaks Carbon's vocabulary is passed through unconverted.

  /**
   * One area's primitive count, under whichever name the producer used.
   *
   * @param {object|null} area
   * @returns {number} Triangle count; zero when the area is absent or unnamed.
   */
  static getAreaPrimitiveCount(area)
  {
    return area?.primitiveCount ?? area?.elementCount ?? 0;
  }

  /**
   * One area's first INDEX, converting a CMF first-triangle when that is what
   * the producer wrote.
   *
   * @param {object|null} area
   * @returns {number} Index offset into the LOD's index buffer.
   */
  static getAreaFirstIndex(area)
  {
    if (area?.firstIndex !== undefined) return area.firstIndex;
    if (area?.firstElement !== undefined) return area.firstElement * 3;

    return 0;
  }

  /**
   * A LOD's total primitive count.
   *
   * Carbon takes this from the index stream rather than from the areas
   * (`GetStreamElementCount( cmfLod.ib ) / 3`, TriGeometryRes.cpp:890), because
   * an area list need not cover every triangle. Falling back to the area sum
   * keeps a payload that carries areas but no index-stream extent usable, and
   * only the reversed draw path reads this at all.
   *
   * @param {object|null} lod
   * @returns {number}
   */
  static getLodPrimitiveCount(lod)
  {
    if (lod?.primitiveCount !== undefined) return lod.primitiveCount;

    const stride = lod?.ib?.stride ?? 0;
    const size = lod?.ib?.size ?? 0;

    if (stride > 0 && size > 0) return Math.floor(size / stride / 3);

    return TriGeometryRes.getPrimitiveCount(lod, 0, lod?.areas?.length ?? 0);
  }

  /**
   * Gets the canonical area list from a mesh or its first LOD.
   *
   * @param {object|null} mesh
   * @returns {Array<*>|null}
  */
  static getMeshAreas(mesh)
  {
    return mesh?.areas || mesh?.lods?.[0]?.areas || null;
  }

  /**
   * A morph target's name less the exporter's "Shape" suffix, as Carbon stores it (TriGeometryRes.cpp:2113-2120 and
   * 2268-2275): only a name longer than the suffix loses it.
   * @param {string} name
   * @returns {string}
   */
  static stripShapeSuffix(name)
  {
    return name.length > 5 && name.endsWith("Shape") ? name.slice(0, -5) : name;
  }

  /**
   * Gets canonical bounds from a geometry payload object.
   *
   * @param {object|null} value
   * @returns {{min: ArrayLike<number>, max: ArrayLike<number>}|null}
  */
  static getBounds(value)
  {
    if (!value || typeof value !== "object") return null;
    if (value.bounds?.min && value.bounds?.max) return value.bounds;
    if (value.minBounds && value.maxBounds)
    {
      return { min: value.minBounds, max: value.maxBounds };
    }
    return null;
  }

  /**
   * Gets the canonical bounding sphere from a geometry payload object.
   *
   * @param {object|null} value
   * @returns {ArrayLike<number>|null}
  */
  static getSphere(value)
  {
    if (!value || typeof value !== "object") return null;
    return value.sphere || value.boundingSphere || null;
  }

  /**
   * Copies bounds into caller-owned outputs, or returns the source object.
   *
   * @param {{min: ArrayLike<number>, max: ArrayLike<number>}|null} bounds
   * @param {ArrayLike<number>|null} outMin
   * @param {ArrayLike<number>|null} outMax
   * @returns {*|boolean}
  */
  static copyBounds(bounds, outMin, outMax)
  {
    if (!outMin && !outMax) return bounds;
    if (!bounds || !outMin || !outMax) return false;
    vec3.copy(outMin, bounds.min);
    vec3.copy(outMax, bounds.max);
    return true;
  }

  /**
   * Gets canonical positions from a mesh or its first LOD.
   *
   * @param {object|null} mesh
   * @returns {ArrayLike<number>|Array<ArrayLike<number>>|null}
  */
  static getMeshPositions(mesh)
  {
    return mesh?.vertex?.position
      || mesh?.positions
      || mesh?.lods?.[0]?.vertex?.position
      || mesh?.lods?.[0]?.positions
      || null;
  }

  /**
   * Gets the number of vertices represented by flat or nested positions.
   *
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @returns {number}
  */
  static getPositionCount(positions)
  {
    if (!positions) return 0;
    return typeof positions[0] === "number"
      ? Math.floor(positions.length / 3)
      : positions.length;
  }

  /**
   * Calculates bounds from canonical positions using caller-owned scratch.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static setBoundsFromPositions(out, positions, point)
  {
    const count = this.getPositionCount(positions);
    let found = false;
    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      if (!found)
      {
        out[0] = out[3] = point[0];
        out[1] = out[4] = point[1];
        out[2] = out[5] = point[2];
        found = true;
        continue;
      }
      out[0] = Math.min(out[0], point[0]);
      out[1] = Math.min(out[1], point[1]);
      out[2] = Math.min(out[2], point[2]);
      out[3] = Math.max(out[3], point[0]);
      out[4] = Math.max(out[4], point[1]);
      out[5] = Math.max(out[5], point[2]);
    }
    return found;
  }

  /**
   * Calculates a bounding sphere from positions using caller-owned scratch.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>|null} positions
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static setSphereFromPositions(out, positions, point)
  {
    const count = this.getPositionCount(positions);
    let
      found = false,
      minX = Infinity,
      minY = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      minZ = Math.min(minZ, point[2]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
      maxZ = Math.max(maxZ, point[2]);
      found = true;
    }
    if (!found) return false;

    out[0] = (minX + maxX) * 0.5;
    out[1] = (minY + maxY) * 0.5;
    out[2] = (minZ + maxZ) * 0.5;
    let maxSquaredRadius = 0;
    for (let index = 0; index < count; index++)
    {
      if (!this.copyPosition(point, positions, index)) continue;
      const
        x = out[0] - point[0],
        y = out[1] - point[1],
        z = out[2] - point[2];
      maxSquaredRadius = Math.max(maxSquaredRadius, x * x + y * y + z * z);
    }
    out[3] = Math.sqrt(maxSquaredRadius);
    return true;
  }

  /**
   * Calculates a mesh sphere from positions or existing bounds.
   *
   * @param {ArrayLike<number>} out
   * @param {object} mesh
   * @param {ArrayLike<number>} point
   * @returns {boolean}
  */
  static calculateMeshSphere(out, mesh, point)
  {
    if (this.setSphereFromPositions(out, this.getMeshPositions(mesh), point)) return true;
    const bounds = this.getBounds(mesh);
    if (!bounds) return false;
    sph3.fromBounds(out, bounds.min, bounds.max);
    return true;
  }

  /**
   * Stores a calculated sphere in the mesh's canonical sphere fields.
   *
   * @param {object} mesh
   * @param {ArrayLike<number>} sphere
   * @returns {void}
  */
  static setMeshSphere(mesh, sphere)
  {
    if (mesh.sphere && typeof mesh.sphere.set === "function") mesh.sphere.set(sphere);
    else mesh.sphere = [ ...sphere ];
    if (mesh.boundingSphere && typeof mesh.boundingSphere.set === "function")
    {
      mesh.boundingSphere.set(sphere);
    }
    else if ("boundingSphere" in mesh)
    {
      mesh.boundingSphere = [ ...sphere ];
    }
  }

  /**
   * Intersects a ray with canonical CPU geometry.
   *
   * @param {Array<object>|null} meshes
   * @param {ArrayLike<number>} position
   * @param {ArrayLike<number>} direction
   * @param {number} areaIndex
   * @returns {object}
  */
  static intersectGeometry(meshes, position, direction, areaIndex)
  {
    this.validateRayVector(position, "position");
    this.validateRayVector(direction, "direction");
    const
      ray = ray3.from(ray3.alloc(), position, direction),
      point = vec3.alloc(),
      vertexA = vec3.alloc(),
      vertexB = vec3.alloc(),
      vertexC = vec3.alloc(),
      normal = vec3.alloc();
    let nearest = null;
    try
    {
      for (let meshIndex = 0; meshIndex < (meshes?.length || 0); meshIndex++)
      {
        const mesh = meshes[meshIndex];
        const positions = this.getMeshPositions(mesh);
        if (!positions) continue;
        const groups = mesh?.indices || mesh?.lods?.[0]?.indices || null;
        if (ArrayBuffer.isView(groups)
          || (Array.isArray(groups) && typeof groups[0] === "number"))
        {
          if (areaIndex !== -1 && areaIndex !== 0) continue;
          nearest = this.intersectFaces(
            nearest,
            groups,
            0,
            mesh,
            meshIndex,
            positions,
            position,
            ray,
            point,
            vertexA,
            vertexB,
            vertexC,
            normal
          );
          continue;
        }
        if (Array.isArray(groups))
        {
          for (let groupIndex = 0; groupIndex < groups.length; groupIndex++)
          {
            if (areaIndex !== -1 && areaIndex !== groupIndex) continue;
            const faces = groups[groupIndex]?.faces || groups[groupIndex]?.indices || [];
            nearest = this.intersectFaces(
              nearest,
              faces,
              groupIndex,
              mesh,
              meshIndex,
              positions,
              position,
              ray,
              point,
              vertexA,
              vertexB,
              vertexC,
              normal
            );
          }
          continue;
        }
        if (areaIndex === -1 || areaIndex === 0)
        {
          nearest = this.intersectFaces(
            nearest,
            null,
            0,
            mesh,
            meshIndex,
            positions,
            position,
            ray,
            point,
            vertexA,
            vertexB,
            vertexC,
            normal
          );
        }
      }
      if (nearest) return nearest;
      const hitPosition = [ 0, 0, 0 ];
      return {
        hit: false,
        boneIndex: -1,
        position: hitPosition,
        point: hitPosition,
        normal: [ 0, 0, 0 ],
        unnormalizedNormal: [ 0, 0, 0 ],
        distance: Infinity,
        meshIndex: -1,
        areaIndex
      };
    }
    finally
    {
      vec3.unalloc(normal);
      vec3.unalloc(vertexC);
      vec3.unalloc(vertexB);
      vec3.unalloc(vertexA);
      vec3.unalloc(point);
      ray3.unalloc(ray);
    }
  }

  /**
   * Validates a caller-provided ray vector.
   *
   * @param {ArrayLike<number>} value
   * @param {string} name
   * @returns {void}
  */
  static validateRayVector(value, name)
  {
    if (!value
      || value.length < 3
      || !Number.isFinite(value[0])
      || !Number.isFinite(value[1])
      || !Number.isFinite(value[2]))
    {
      throw new TypeError(`TriGeometryRes ray ${name} must contain three finite numbers.`);
    }
  }

  /**
   * Intersects a ray with one flat face list.
   *
   * @param {object|null} nearest
   * @param {ArrayLike<number>|null} faces
   * @param {number} areaIndex
   * @param {object} mesh
   * @param {number} meshIndex
   * @param {ArrayLike<number>|Array<ArrayLike<number>>} positions
   * @param {ArrayLike<number>} rayOrigin
   * @param {ArrayLike<number>} ray
   * @param {ArrayLike<number>} point
   * @param {ArrayLike<number>} vertexA
   * @param {ArrayLike<number>} vertexB
   * @param {ArrayLike<number>} vertexC
   * @param {ArrayLike<number>} normal
   * @returns {object|null}
  */
  static intersectFaces(
    nearest,
    faces,
    areaIndex,
    mesh,
    meshIndex,
    positions,
    rayOrigin,
    ray,
    point,
    vertexA,
    vertexB,
    vertexC,
    normal
  )
  {
    const count = faces?.length ?? this.getPositionCount(positions);
    for (let index = 0; index + 2 < count; index += 3)
    {
      const
        vertexIndexA = faces ? faces[index] : index,
        vertexIndexB = faces ? faces[index + 1] : index + 1,
        vertexIndexC = faces ? faces[index + 2] : index + 2;
      if (!this.copyPosition(vertexA, positions, vertexIndexA)
        || !this.copyPosition(vertexB, positions, vertexIndexB)
        || !this.copyPosition(vertexC, positions, vertexIndexC)
        || !ray3.getIntersectVertices(
          point,
          ray,
          vertexA,
          vertexB,
          vertexC,
          false
        ))
      {
        continue;
      }
      const distance = vec3.distance(rayOrigin, point);
      if (nearest && nearest.distance <= distance) continue;
      if (!nearest)
      {
        const hitPosition = [ 0, 0, 0 ];
        nearest = {
          hit: true,
          boneIndex: -1,
          position: hitPosition,
          point: hitPosition,
          normal: [ 0, 0, 0 ],
          unnormalizedNormal: [ 0, 0, 0 ],
          distance,
          meshIndex,
          areaIndex
        };
      }
      nearest.boneIndex = this.getMeshBoneIndex(mesh, vertexIndexA);
      vec3.copy(nearest.position, point);
      // (B - A) x (C - A). This was written out in full one line above a
      // `triangleNormalTo` call that computes the NORMALISED version of the same
      // vector, so the winding convention lived in two places at once.
      vec3.subtract(edgeAB, vertexB, vertexA);
      vec3.subtract(edgeAC, vertexC, vertexA);
      vec3.cross(nearest.unnormalizedNormal, edgeAB, edgeAC);
      triangleNormalTo(normal, vertexA, vertexB, vertexC);
      vec3.copy(nearest.normal, normal);
      nearest.distance = distance;
      nearest.meshIndex = meshIndex;
      nearest.areaIndex = areaIndex;
    }
    return nearest;
  }

  /**
   * Copies one flat or nested position into caller-owned output.
   *
   * @param {ArrayLike<number>} out
   * @param {ArrayLike<number>|Array<ArrayLike<number>>} positions
   * @param {number} index
   * @returns {boolean}
  */
  static copyPosition(out, positions, index)
  {
    if (!Number.isInteger(index) || index < 0) return false;
    if (typeof positions[0] === "number")
    {
      const offset = index * 3;
      if (offset + 2 >= positions.length) return false;
      out[0] = positions[offset];
      out[1] = positions[offset + 1];
      out[2] = positions[offset + 2];
      return true;
    }
    const point = positions[index];
    if (!point || point.length < 3) return false;
    out[0] = point[0];
    out[1] = point[1];
    out[2] = point[2];
    return true;
  }

  /**
   * Gets the first blend index for a mesh vertex.
   *
   * @param {object} mesh
   * @param {number} vertexIndex
   * @returns {number}
  */
  static getMeshBoneIndex(mesh, vertexIndex)
  {
    const indices = mesh?.vertex?.blendIndices || mesh?.blendIndices;
    if (!indices) return -1;
    if (typeof indices[0] === "number")
    {
      return Number(indices[vertexIndex * 4] ?? indices[vertexIndex] ?? -1);
    }
    return Number(indices[vertexIndex]?.[0] ?? -1);
  }


  /** Retained CMF projection; family data is never stored on resMan. */
  _cmfData = null;

  /**
   * Carbon SetupSkeletons, which overloads on `const cmf::Data&` (cpp:1187) and
   * `granny_file_info*` (cpp:1212). Routes CMF data to
   * SetupSkeletons__CmfData; engine code calls the specific name.
   *
   * @adapted the Granny overload is not ported yet: a Granny file info throws.
   * @param {object} data Decoded CMF data.
   * @throws {Error} For a Granny file info.
   */
  SetupSkeletons(data)
  {
    if (data?.grannyFileFormatRevision !== undefined)
    {
      throw new Error("TriGeometryRes.SetupSkeletons: the granny_file_info overload (cpp:1212) is not ported yet.");
    }
    this.SetupSkeletons__CmfData(data);
  }

  /**
   * Carbon SetupSkeletons( const cmf::Data& ) (TriGeometryRes.cpp:1187-1209):
   * one TriGeometryResSkeletonData per skeleton, a joint per bone with its
   * parent index and inverse bind transform.
   *
   * @adapted the decoded skeletons are also kept on `_cmfData`, which consumers
   *   still read until they move onto the records. A skeleton without
   *   `invBindTransforms` keeps identity joints.
   * @param {object} data Decoded CMF data.
   */
  SetupSkeletons__CmfData(data)
  {
    const skeletons = data.skeletons || [];
    if (this._cmfData) this._cmfData.skeletons = skeletons;
    this._skeletons = skeletons.map(skel =>
    {
      const record = new TriGeometryResSkeletonData();
      record.name = skel.name ?? "";
      record.joints = (skel.bones ?? []).map((bone, jointIx) =>
      {
        const joint = new TriGeometryResJointData();
        joint.name = typeof bone === "string" ? bone : bone?.name ?? "";
        joint.parentJoint = (skel.parents?.[jointIx] ?? 0xffffffff) >>> 0;
        const inverse = skel.invBindTransforms?.[jointIx];
        if (inverse) mat4.copy(joint.inverseWorldTransform, inverse);
        return joint;
      });
      return record;
    });
  }

  /**
   * Decode the native file, or the existing dynamic single-mesh projection.
   *
   * @adapted
   */
  async _DoLoad()
  {
    let data;
    if (this.GetPath().startsWith(MeshPrefix))
    {
      const request = CjsMeshConstructor.parseQuery(this.GetPath().slice(MeshPrefix.length));
      if (!request) return BlueAsyncRes.LoadingResult.LR_FAILED;
      const bytes = this._dataStream.data;
      if (request.path.toLowerCase().endsWith(".cmf"))
        data = CjsCmfFormat.read(bytes, { meshIndex: request.meshIndex });
      else
      {
        const resMan = blueService.resMan;
        const attempt = resMan._GetResourceLoad(this);
        const format = resMan.GetFormat(getResourceExtension(request.path));
        const options = resMan._GetResourceRequest(this);
        const shared = await resMan.ReadFormatOnce(this, format, bytes, {
          ...options, formatOptions: { ...options.formatOptions, meshIndex: request.meshIndex }
        });
        resMan._AssertResourceLoad(this, attempt);
        data = shared.grannyFileInfo ? shared : CjsCmfFormat.loadShared(shared);
      }
    }
    else
    {
      const resMan = blueService.resMan;
      const attempt = resMan._GetResourceLoad(this);
      const descriptor = blueService.resMan.GetResourceFormat(this);
      data = await resMan.ReadFormatOnce(this, descriptor, this._dataStream.data,
        resMan._GetResourceRequest(this));
      resMan._AssertResourceLoad(this, attempt);
    }
    const loaded = data?.grannyFileInfo || data?.grannyFileFormatRevision !== undefined
      ? this.ReadGrannyFile(data) : this.ReadCMFFile(data);
    return loaded ? BlueAsyncRes.LoadingResult.LR_SUCCESS : BlueAsyncRes.LoadingResult.LR_FAILED;
  }

  /**
   * Carbon DoPrepare (TriGeometryRes.cpp:607-673): ready once either reader has set up the meshes.
   *
   * @adapted each LOD's buffers are made at its first draw (CreateLodAllocations), not here; and
   *   the granny file is kept rather than freed when it has no animations or bone bindings
   *   (cpp:650-668), since CPU readers (bounds, picking, decals) read it.
   */
  _DoPrepare()
  {
    return this._cmfData !== null || this._grannyFile !== null;
  }

  /**
   * Carbon PrepareFromGrannyRes (TriGeometryRes.cpp:1301-1344). JS baking mutates
   * projected channels, so clone them before installing independently owned meshes.
   *
   * @adapted Carbon takes m_useCMF from its TriGrannyRes and sets up from whichever data
   *   that holds. Ours holds the shared GR2 projection, which is always converted to CMF
   *   data here, so the geometry reads as CMF: its device path, blendshape bake and readers
   *   take the CMF branch (with `false`, the Granny branch found no granny file info and
   *   every draw and the archetype-morph allocation failed).
   * @param {TriGrannyRes} resource Source Granny resource.
   */
  PrepareFromGrannyRes(resource)
  {
    const source = resource.GetGrannyFile();
    if (!source) return;
    const data = structuredClone(CjsCmfFormat.loadShared(source));
    this.SetupMeshes__CmfData(data);
    this.SetupSkeletons__CmfData(data);
    this._useCMF = true;
    this._isPrepared = this._isGood = true;
  }

  /** Opaque browser device allocations, supplied by Tr2DeviceResource. */
  __adapterResources = null;

  /**
   * The existing dynamic mesh path reads its named source, preserving native attempt cancellation.
   *
   * @adapted
   */
  async _DoOpenStream()
  {
    if (!this.GetPath().startsWith(MeshPrefix))
    {
      blueService.resMan.GetResourceFormat(this);
      return super._DoOpenStream();
    }
    const request = CjsMeshConstructor.parseQuery(this.GetPath().slice(MeshPrefix.length));
    if (!request)
    {
      const error = new Error("Invalid dynamic mesh path: " + this.GetPath());
      error.code = "CJS_GEOMETRY_DYNAMIC_PATH_INVALID";
      throw error;
    }
    const attempt = blueService.resMan._GetResourceLoad(this);
    const data = await blueService.resMan.ReadResource(request.path);
    blueService.resMan._AssertResourceLoad(this, attempt);
    this._dataStream = { form: "bytes", data };
    return true;
  }
}

// Declared as data rather than with decorators, so the resource tree loads from
// source without a transform. Field order is key order, and GetValues() exports
// in that order.

CjsSchema.decorateField(TriGeometryRes, "forceLod", type.boolean, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriGeometryRes, "forcedLodIndex", type.int32, be.mapAttribute(be.READWRITE));
CjsSchema.decorateField(TriGeometryRes, "name", type.string, be.mapAttribute(be.READWRITE));
CjsSchema.decorateMethod(TriGeometryRes, "GetMeshCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "GetMeshAreaCount", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "GetMeshName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "GetMeshAreaName", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "GetAreaBoundingBoxFromScript", be.mapMethodAndWrap("GetAreaBoundingBox"));
CjsSchema.decorateMethod(TriGeometryRes, "GetBoundingBoxFromScript", be.mapMethodAndWrap("GetBoundingBox"));
CjsSchema.decorateMethod(TriGeometryRes, "GetBoundingSphereFromScript", be.mapMethodAndWrap("GetBoundingSphere"));
CjsSchema.decorateMethod(TriGeometryRes, "CalculateBoundingBoxFromTransform", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "RecalculateBoundingSphere", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "Reload", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "GetIntersectionPointNormalBoneFromScript", be.mapMethodAndWrap("GetIntersectionPointNormalBone"));
CjsSchema.decorateMethod(TriGeometryRes, "GetAreaIntersectionPointNormalBoneFromScript", be.mapMethodAndWrap("GetAreaIntersectionPointNormalBone"));
CjsSchema.decorateMethod(TriGeometryRes, "PrepareRayCaster", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "ResetRayCaster", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "IsRayCasterReady", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "HasRayCasterPreparationFailed", be.mapMethodAndWrap());
CjsSchema.exposure.mapICacheableMethods()(TriGeometryRes);
CjsSchema.decorateMethod(TriGeometryRes, "GetMeshVertexElements", be.mapMethodAndWrap());
CjsSchema.decorateMethod(TriGeometryRes, "SaveMesh", be.mapMethodAndWrap());
be.define("TriGeometryRes")(TriGeometryRes);
// Carbon: BLUE_CLASS( TriGeometryRes ) : BlueAsyncRes, ICacheable, Tr2DeviceResource, ITr2InstanceData
// (TriGeometryRes.h:261-265); MAP_INTERFACE rows from TriGeometryRes_Blue.cpp:40-43.
be.inherit(ICacheable, ITr2InstanceData)(TriGeometryRes, { kind: "class" });
CjsSchema.exposure.mapInterface(IBlueResource)(TriGeometryRes);
CjsSchema.exposure.mapInterface(ICacheable)(TriGeometryRes);
CjsSchema.exposure.mapInterface(ITr2InstanceData)(TriGeometryRes);
// Carbon: TriGeometryRes::ExposeToBlue (trinity/trinity/Resources/TriGeometryRes_Blue.cpp:175).
CjsSchema.blue.chainTo(BlueAsyncRes)(TriGeometryRes);








be.inherit(Tr2DeviceResource)(TriGeometryRes, { kind: "class" });



