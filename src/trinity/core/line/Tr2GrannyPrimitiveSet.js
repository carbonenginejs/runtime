// Source: trinity/trinity/Tr2GrannyPrimitiveSet.h
// Source: trinity/trinity/Tr2GrannyPrimitiveSet.cpp
// Source: trinity/trinity/Tr2GrannyPrimitiveSet_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { meta } from "#schema";
import { blue, IInitialize, IsMatch, ResourceRequirement } from "#blue";
import { Tr2CpuUsage, Tr2GpuUsage, Topology } from "#consts/render-context";
import { decodeTangentFrame } from "#math/tangent";
import { Tr2PrimitiveSet } from "./Tr2PrimitiveSet.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { Tr2RenderBatch } from "../batch/TriRenderBatch/index.js";

/** Granny/CMF debug geometry rendered as colored triangle edges, solids, or picking triangles. */
@meta.define({ className: "Tr2GrannyPrimitiveSet", family: "trinityCore" })
@meta.blue.inherit(IInitialize)
export class Tr2GrannyPrimitiveSet extends Tr2PrimitiveSet
{
  /** Native resource path (Blue READWRITE | PERSIST | NOTIFY). */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  grannyResPath = "";

  /** Native solid-versus-wire draw switch. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  renderSolid = false;

  /** The GEOMETRY route supplies TriGeometryRes in JS, replacing the raw SDK handle. */
  @meta.blue.read
  @meta.type.objectRef("TriGeometryRes")
  grannyRes = null;

  _points = new Float32Array(0); // alloc: initially empty, owned variable-length geometry cache.
  _triangleIndices = new Uint32Array(0); // alloc: initially empty, owned variable-length geometry cache.
  _lineIndices = new Uint32Array(0); // alloc: initially empty, owned variable-length geometry cache.
  _primitiveCount = 0;
  _pickingPrimitiveCount = 0;
  _pickingIndexOffset = 0;
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;
  _vertexBuffer = new Tr2BufferAL();
  _triangleIndexBuffer = new Tr2BufferAL();
  _lineIndexBuffer = new Tr2BufferAL();
  _destroyed = false;
  _geometryCompleted = (_event, resource) => this.RebuildCachedData(resource);
  _geometryReleased = (_event, resource) => this.ReleaseCachedData(resource);

  /** Registers native device-resource lifetime (cpp:12-22). */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
  }

  /** Acquires the authored resource after reader population (cpp:38-44). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.SetGrannyResource();
    this.PrepareResources();
    return true;
  }

  /** Resource replacement precedes the base's color notification (cpp:174-182). */
  @meta.blue.method
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "grannyResPath")) this.SetGrannyResource();
    return super.OnModified(names);
  }

  /**
   * Uses the existing typed geometry route and persistent resource events in
   * place of Blue notify targets (cpp:214-237). A pending nonempty replacement
   * retains the old primitive buffers until it succeeds, as native does.
   */
  @meta.blue.method
  @meta.adapted
  SetGrannyResource()
  {
    this.#DetachResource();
    this.grannyRes = null;
    if (this._destroyed) return;
    if (!this.grannyResPath)
    {
      this.ReleaseCachedData(null);
      return;
    }
    const resource = blue.resMan.GetResource(this.grannyResPath, { requirement: ResourceRequirement.GEOMETRY });
    this.grannyRes = resource;
    if (!resource) return;
    resource.OnEvent("completed", this._geometryCompleted, this);
    resource.OnEvent("purged", this._geometryReleased, this);
    resource.OnEvent("unloaded", this._geometryReleased, this);
    if (resource.HasCompleted()) this.RebuildCachedData(resource);
  }

  /** Remove only this owner's subscriptions; shared resource ownership stays with the manager. */
  #DetachResource()
  {
    if (!this.grannyRes) return;
    this.grannyRes.OffEvent("completed", this._geometryCompleted, this);
    this.grannyRes.OffEvent("purged", this._geometryReleased, this);
    this.grannyRes.OffEvent("unloaded", this._geometryReleased, this);
  }

  /** Releases only the current resource's derived data (cpp:185-191). */
  @meta.blue.method
  @meta.implemented
  ReleaseCachedData(resource)
  {
    if (resource === this.grannyRes) this.CleanUp();
  }

  /** Rebuilds only a successfully prepared current resource (cpp:194-202). */
  @meta.blue.method
  @meta.implemented
  RebuildCachedData(resource)
  {
    if (this._destroyed || resource !== this.grannyRes || !resource || !resource.IsGood()) return;
    this.CleanUp();
    this.CreatePrimitive();
    this.PrepareResources();
  }

  /** Clears cached geometry and GPU storage, retaining the native last bound (cpp:205-212). */
  @meta.blue.method
  @meta.adapted
  CleanUp()
  {
    this._points = new Float32Array(0); // alloc: discard the prior retained vertex payload.
    this._triangleIndices = new Uint32Array(0); // alloc: discard cached indices.
    this._lineIndices = new Uint32Array(0); // alloc: discard cached indices.
    this._primitiveCount = this._pickingPrimitiveCount = this._pickingIndexOffset = 0;
    this.ReleaseResources();
  }

  /** Keeps source-format provenance despite the common decoded payload shape (cpp:240-253). */
  @meta.blue.method
  @meta.implemented
  CreatePrimitive()
  {
    if (!this.grannyRes) return;
    if (this.grannyRes.IsUsingCMF()) this.CreatePrimitiveFromCMF();
    else this.CreatePrimitiveFromGranny();
  }

  /** Decoded CPU channels replace native CMF streams; exact picking name is preserved. */
  @meta.blue.method
  @meta.adapted
  CreatePrimitiveFromCMF()
  {
    this.#CreateDecodedPrimitive(false);
  }

  /**
   * Decoded CPU channels replace the Granny SDK; native picking-prefix matching
   * is preserved. The shared projection retains the complete topology stream,
   * including triangles outside material groups, as the native SDK does.
   */
  @meta.blue.method
  @meta.adapted
  CreatePrimitiveFromGranny()
  {
    this.#CreateDecodedPrimitive(true);
  }

  /** Packs the common TriangleVertex layout after moving the dedicated picking mesh last. */
  #CreateDecodedPrimitive(granny)
  {
    if (!this.grannyRes) return;
    const meshes = [], resource = this.grannyRes;
    let picking = null, vertexCount = 0, indexCount = 0;
    for (let index = 0; index < resource.GetMeshCount(); index++)
    {
      const mesh = resource.GetMeshData(index), lod = resource.GetMeshLodByIndex(index, 0);
      if (!lod || !lod.vertex?.position) throw new Error(`Tr2GrannyPrimitiveSet: mesh ${index} has no LOD-zero position stream`);
      const count = lod.vb?.stride ? lod.vb.size / lod.vb.stride : lod.vertexCount ?? mesh.vertexCount ?? lod.vertex.position.length / 3;
      const faces = ReadIndices(resource.GetPayload(), mesh, lod);
      const entry = { mesh, lod, count, faces };
      const name = mesh.name ?? "";
      if (granny ? name.startsWith("picking") : name === "picking") picking = entry;
      else { meshes.push(entry); indexCount += faces.length; }
    }
    this._pickingIndexOffset = picking ? indexCount : 0;
    this._pickingPrimitiveCount = picking ? picking.faces.length / 3 : 0;
    if (picking) { meshes.push(picking); indexCount += picking.faces.length; }
    for (const entry of meshes) vertexCount += entry.count;
    this._points = new Float32Array(vertexCount * 10); // alloc: retained 40-byte TriangleVertex records.
    this._triangleIndices = new Uint32Array(indexCount); // alloc: retained native uint32 triangles.
    this._lineIndices = new Uint32Array(indexCount * 2); // alloc: retained edge indices.
    this._primitiveCount = indexCount / 3;
    let vertexOffset = 0, indexOffset = 0, lineOffset = 0;
    for (const { lod, count, faces } of meshes)
    {
      if (count === 0) continue;
      const vertex = lod.vertex, width = vertex.position.length / count;
      if (!Number.isInteger(count) || ![3, 4].includes(width)) throw new Error("Tr2GrannyPrimitiveSet: invalid position stream width");
      for (let index = 0; index < count; index++)
      {
        const target = (vertexOffset + index) * 10;
        for (let axis = 0; axis < 3; axis++) this._points[target + axis] = vertex.position[index * width + axis];
        ReadNormal(this._points, target + 3, vertex, index, count, granny);
        this._points.set(this.color, target + 6);
      }
      for (let index = 0; index < faces.length; index++) this._triangleIndices[indexOffset++] = faces[index] + vertexOffset;
      for (let index = 0; index < faces.length; index += 3)
      {
        const a = faces[index] + vertexOffset, b = faces[index + 1] + vertexOffset, c = faces[index + 2] + vertexOffset;
        this._lineIndices.set([a, b, b, c, c, a], lineOffset);
        lineOffset += 6;
      }
      vertexOffset += count;
    }
  }

  /** Updates cached vertex colors, without reassigning the authored color field (cpp:519-526). */
  @meta.blue.method
  @meta.implemented
  SetCurrentColor(color)
  {
    for (let offset = 6; offset < this._points.length; offset += 10) this._points.set(color, offset);
    this.PrepareResources();
  }

  /** Inherited native device-resource creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Explicit destruction replaces native empty-handle assignment (cpp:47-53). */
  @meta.blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
    this._vertexBuffer.Destroy();
    this._triangleIndexBuffer.Destroy();
    this._lineIndexBuffer.Destroy();
  }

  /** Creates and uploads native buffers through existing AL descriptions (cpp:54-133). */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    const declaration = Tr2GrannyPrimitiveSet.#declaration;
    if (declaration.empty())
    {
      declaration.Add("FLOAT32_3", "POSITION");
      declaration.Add("FLOAT32_3", "NORMAL");
      declaration.Add("FLOAT32_4", "TEXCOORD");
    }
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(declaration);
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (this._points.length)
    {
      if (!this._vertexBuffer.IsValid() && Failed(this._vertexBuffer.Create(Tr2BufferDescriptionAL.FromStride(
        40, this._points.length / 10, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN), null, context))) return false;
      const mapped = this._vertexBuffer.MapForWriting(context);
      if (Failed(mapped.result)) return false;
      mapped.data.set(new Uint8Array(this._points.buffer)); // alloc: byte view of the retained vertex payload for the AL copy.
      // Carbon math/src/Vector3.cpp: mean center, then maximum point distance.
      const bound = this.boundingSphere, count = this._points.length / 10;
      bound.fill(0);
      for (let offset = 0; offset < this._points.length; offset += 10)
        for (let axis = 0; axis < 3; axis++) bound[axis] += this._points[offset + axis];
      for (let axis = 0; axis < 3; axis++) bound[axis] /= count;
      for (let offset = 0; offset < this._points.length; offset += 10)
        bound[3] = Math.max(bound[3], Math.hypot(this._points[offset] - bound[0], this._points[offset + 1] - bound[1], this._points[offset + 2] - bound[2]));
      this._vertexBuffer.UnmapForWriting(context);
    }
    for (const [buffer, data] of [[this._triangleIndexBuffer, this._triangleIndices], [this._lineIndexBuffer, this._lineIndices]])
    {
      if (data.length && Failed(buffer.Create(Tr2BufferDescriptionAL.FromStride(4, data.length,
        Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.NONE), new Uint8Array(data.buffer), context))) return false; // alloc: byte view for the AL upload.
    }
    return true;
  }

  /**
   * Emits native ordinary or dedicated picking ranges (cpp:135-171).
   * JS manager renewal before the storage guard replaces the native retained
   * handle lifetime and allows an automatically purged resource to reload.
   */
  @meta.blue.method
  @meta.adapted
  GetBatchesImpl(accumulator, perObjectData, effect, reason)
  {
    if (this.grannyRes) this.grannyRes.KeepAlive();
    if (!this._vertexBuffer.IsValid() || this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    const picking = reason === Tr2PrimitiveSet.GetBatchesReason.Picking;
    const solid = this.renderSolid || picking, batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetGeometry(this._vertexDeclHandle, this._vertexBuffer, 40, solid ? this._triangleIndexBuffer : this._lineIndexBuffer, 4);
    if (!solid) batch.SetTopology(Topology.TOP_LINES);
    const dedicated = picking && this._pickingPrimitiveCount > 0;
    batch.SetDrawIndexedInstanced(dedicated ? this._pickingPrimitiveCount * 3 :
      (this._primitiveCount - this._pickingPrimitiveCount) * (solid ? 3 : 6), 1, dedicated ? this._pickingIndexOffset : 0, 0, 0);
    accumulator.Commit(batch);
  }

  /** Native development resource description, returned instead of an output string. */
  @meta.blue.method
  @meta.adapted
  GetDescription()
  {
    return "<Tr2GrannyPrimitiveSet>";
  }

  /** Explicit owner teardown replaces the C++ destructor and notify-target lifetime. */
  @meta.ours
  Destroy()
  {
    this._destroyed = true;
    this.#DetachResource();
    this.grannyRes = null;
    this.CleanUp();
    TriDevice.UnregisterResource(this);
  }

  static #declaration = new Tr2VertexDefinition();
}

/**
 * Binary CMF retains its full index stream independently of area ranges.
 * Granny projections retain the full typed stream with material ranges as
 * views. Legacy group-only payloads retain their concatenated fallback.
 */
function ReadIndices(payload, _mesh, lod)
{
  if (lod.indexBuffer)
  {
    if (lod.indexBuffer.length % 3) throw new Error("Tr2GrannyPrimitiveSet: incomplete triangle index stream");
    return lod.indexBuffer;
  }
  const indices = [];
  const view = lod.ib, bytes = payload.buffers?.[view?.index]?.data;
  if (bytes && view.size)
  {
    if (view.stride !== 2 && view.stride !== 4) throw new Error("Tr2GrannyPrimitiveSet: unsupported index stride");
    const data = new DataView(bytes.buffer, bytes.byteOffset + view.offset, view.size);
    for (let offset = 0; offset < view.size; offset += view.stride)
      indices.push(view.stride === 2 ? data.getUint16(offset, true) : data.getUint32(offset, true));
  }
  else for (const group of lod.indices) for (const index of group.faces) indices.push(index);
  if (indices.length % 3) throw new Error("Tr2GrannyPrimitiveSet: incomplete triangle index stream");
  return indices;
}

/** Native CMF packed-tangent precedence (TriGrannyRes.cpp:25-105); Granny reads its normal channel. */
function ReadNormal(out, offset, vertex, index, count, granny)
{
  const packed = !granny && vertex.packedTangent;
  const legacy = !granny && vertex.packedTangentLegacy;
  if (packed)
  {
    // mesh/src/cmf/tangents.cpp:328-387. Preserve the authored fourth component.
    const base = index * 4, x = packed[base], y = packed[base + 1], z = packed[base + 2], sign = packed[base + 3];
    const w = Math.sqrt(Math.min(1, Math.max(0, 1 - x * x - y * y - z * z)));
    out[offset] = (2 * x * z + 2 * y * w) * sign;
    out[offset + 1] = (2 * y * z - 2 * x * w) * sign;
    out[offset + 2] = (1 - 2 * x * x - 2 * y * y) * sign;
  }
  else if (legacy)
  {
    const base = index * 4;
    out.set(decodeTangentFrame([legacy[base], legacy[base + 1], legacy[base + 2], legacy[base + 3]]).N, offset);
  }
  else if (vertex.normal)
  {
    const width = vertex.normal.length / count;
    for (let axis = 0; axis < 3; axis++) out[offset + axis] = vertex.normal[index * width + axis];
  }
}

meta.blue.interfaceTable({ interfaces: [Tr2GrannyPrimitiveSet, IInitialize], chainTo: Tr2PrimitiveSet })(Tr2GrannyPrimitiveSet, { kind: "class" });
