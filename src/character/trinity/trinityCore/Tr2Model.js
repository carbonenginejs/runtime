// Source: trinity/trinity/Tr2Model.h
// Source: trinity/trinity/Tr2Model.cpp
// Source: trinity/trinity/Tr2Model_Blue.cpp
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { CreateLodAllocations } from "../../../trinity/core/mesh/TriGeometryResAllocations.js";

/** Named character model record grouping its Trinity mesh objects. */
@meta.define({ className: "Tr2Model", family: "trinityCore" })
export class Tr2Model
{

  /** m_meshes (PTr2MeshVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Mesh")
  meshes = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Scratch is used only inside this model, never across another model call. */
  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create() };

  /** Returns the authored mesh count. */
  @meta.blue.method
  @meta.implemented
  GetNumOfMeshes()
  {
    return this.meshes.length;
  }

  /** Returns the mesh at the requested index. */
  @meta.blue.method
  @meta.implemented
  GetMesh(index)
  {
    return this.meshes[index];
  }

  /** Returns the live mesh collection. */
  @meta.blue.method
  @meta.implemented
  GetMeshes()
  {
    return this.meshes;
  }

  /** Appends a mesh to the authored collection. */
  @meta.blue.method
  @meta.implemented
  AddMesh(mesh)
  {
    this.meshes.push(mesh);
  }

  /** Includes hidden meshes, matching Carbon's area-list test. */
  @meta.blue.method
  @meta.implemented
  HasTransparency()
  {
    return this.meshes.some(mesh => mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length !== 0);
  }

  /** Reports pending preparation in any mesh. */
  @meta.blue.method
  @meta.implemented
  IsLoading()
  {
    return this.meshes.some(mesh => mesh.IsLoading());
  }

  /** Copies aggregate bounds only when every mesh has finished and has bounds. */
  @meta.blue.method
  @meta.implemented
  GetBoundingBox(min, max)
  {
    if (this.IsLoading() || !this.meshes.length) return false;
    const { vec3_0, vec3_1 } = Tr2Model.scratch;
    vec3.set(vec3_0, Infinity, Infinity, Infinity);
    vec3.set(vec3_1, -Infinity, -Infinity, -Infinity);
    for (const mesh of this.meshes)
    {
      const bounds = mesh.GetBounds();
      if (!bounds) return false;
      vec3.min(vec3_0, vec3_0, bounds.min);
      vec3.max(vec3_1, vec3_1, bounds.max);
    }
    vec3.copy(min, vec3_0);
    vec3.copy(max, vec3_1);
    return true;
  }

  /**
   * Returns bounds of any available meshes, unlike the all-ready resource API.
   * Adapted: the Blue pair becomes an array of vectors, and the native error
   * result becomes an exception when no mesh supplies bounds.
   */
  @meta.blue.method
  @meta.adapted
  GetBoundingBoxInLocalSpace()
  {
    const min = vec3.fromValues(Infinity, Infinity, Infinity); // alloc: returned bound pair
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity); // alloc: returned bound pair
    let found = false;
    for (const mesh of this.meshes)
    {
      const bounds = mesh.GetBounds();
      if (!bounds) continue;
      found = true;
      vec3.min(min, min, bounds.min);
      vec3.max(max, max, bounds.max);
    }
    if (!found) throw new Error("No meshes, or meshes aren't loaded yet.");
    return [min, max];
  }

  /**
   * Submits authored order except transparent meshes, sorted farthest first.
   * Adapted: view state lives on the installed Trinity context; JS batches own
   * their references so Carbon's accumulator matrix allocation is unnecessary.
   */
  @meta.blue.method
  @meta.adapted
  GetBatches(batches, batchType, matrix, data)
  {
    if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      const viewPosition = Tr2RenderContext_GetMainThreadRenderContext().GetViewPosition();
      const { vec3_2 } = Tr2Model.scratch;
      const sorted = [];
      for (const mesh of this.meshes)
      {
        if (!mesh.GetDisplay()) continue;
        const bounds = mesh.GetBounds();
        if (bounds)
        {
          vec3.add(vec3_2, bounds.min, bounds.max);
          vec3.scale(vec3_2, vec3_2, 0.5);
        }
        else
        {
          // Carbon's uninitialized AABB has opposing FLT_MAX extrema: center 0.
          vec3.set(vec3_2, 0, 0, 0);
        }
        // Carbon TransformCoord(center, matrix) has the same single-matrix layout.
        vec3.transformMat4(vec3_2, vec3_2, matrix);
        sorted.push({ mesh, distance: vec3.squaredDistance(vec3_2, viewPosition) });
      }
      sorted.sort((a, b) => b.distance - a.distance);
      for (const item of sorted) this.GetBatchesFromMesh(item.mesh, batchType, batches, matrix, data);
    }
    else
    {
      for (const mesh of this.meshes) this.GetBatchesFromMesh(mesh, batchType, batches, matrix, data);
    }
  }

  /**
   * Uses Carbon's integer-zero LOD overload and shared mesh batch construction.
   * Adapted: AL allocations are lazy in JavaScript, so the shared geometry owner
   * realizes the selected LOD here before applying the native allocation gate.
   */
  @meta.blue.method
  @meta.adapted
  GetBatchesFromMesh(mesh, batchType, batches, matrix, data)
  {
    if (!mesh.GetDisplay()) return;
    const areas = mesh.GetAreas(batchType);
    if (!areas) return;
    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    // Native literal 0 selects the int lodIndex overload, not float screenSize.
    const lod = geometry.GetMeshLodByIndex(mesh.GetMeshIndex(), 0);
    if (!lod || !CreateLodAllocations(geometry, mesh.GetMeshIndex(), lod, Tr2RenderContext_GetMainThreadRenderContext())) return;
    for (const area of areas)
    {
      if (!area.GetDisplay() || !area.GetMaterialInterface()) continue;
      const batch = mesh.CreateGeometryBatch(geometry, area, data, false, lod);
      if (batch) batches.Commit(batch);
    }
  }

}

meta.blue.interfaceTable({ interfaces: [Tr2Model], chainTo: null })(Tr2Model, { kind: "class" });
