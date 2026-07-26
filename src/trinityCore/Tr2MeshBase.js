// Source: E:\carbonengine\trinity\trinity\Tr2MeshBase.h
// Source: E:\carbonengine\trinity\trinity\Tr2MeshBase.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2MeshBase_Blue.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { Tr2RenderBatch, TriRenderBatchAreaBlock, TriRenderBatchAreaBlocksWithSharedMaterial } from "./Tr2RenderBatch.js";


@type.define({ className: "Tr2MeshBase", family: "trinityCore" })
export class Tr2MeshBase extends CjsModel
{
  @io.persist
  @type.string
  name = "";

  @io.readwrite
  @type.boolean
  display = true;

  @io.rebuild("batches")
  @io.notify
  @io.persist
  @type.int32
  meshIndex = 0;

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  opaqueAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  decalAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  depthAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  transparentAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  additiveAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  pickableAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  mirrorAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  decalNormalAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  depthNormalAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  opaquePrepassAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  decalPrepassAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  geometryEraserAreas = [];

  @io.rebuild("batches")
  @io.persist
  @type.list("Tr2MeshArea")
  distortionAreas = [];

  // Carbon routes TRIBATCHTYPE_FLARE but does not expose this list to Blue.
  @io.rebuild("batches")
  flareAreas = [];

  @io.read
  @io.persist
  @type.float32
  maxVertexScale = 1;

  @io.read
  @io.persist
  @type.float32
  maxVertexDisplacement = 0;

  @io.read
  @io.persist
  @type.boolean
  rotatesVertices = false;

  @carbon.method
  @impl.implemented
  GetAreas(areaType)
  {
    if (!Number.isInteger(areaType)) return null;
    const property = Tr2MeshBase.#areaProperties[areaType];
    return property ? this[property] : null;
  }

  @carbon.method
  @impl.adapted
  AddArea(areaType, area)
  {
    const areas = this.GetAreas(areaType);
    if (!areas) return false;
    areas.push(area);
    return true;
  }

  @carbon.method
  @impl.implemented
  GetAllAreas()
  {
    return Tr2MeshBase.#areaProperties.flatMap(property => this[property]);
  }

  /**
   * Carbon Tr2MeshBase::UseWithScreenSize (Tr2MeshBase.cpp:589-610): reports the
   * on-screen size this mesh is being drawn at to every area material, so the
   * texture streamer can request a matching mip level. The LOD the size resolves
   * to supplies the uv densities the material needs to turn a pixel size into a
   * texture resolution.
   *
   * Callers pass a screen size already scaled by the LOD factor
   * (EveSpaceObject2, EveTransform, EveChildMesh, BehaviorGroup).
   */
  @carbon.method
  @impl.implemented
  UseWithScreenSize(screenSize, worldRadius)
  {
    const geometry = this.GetGeometryResource?.() ?? null;
    if (!geometry) return false;

    const lod = geometry.GetMeshLod?.(this.meshIndex, screenSize) ?? null;
    if (!lod) return false;

    // Carbon reads m_uvDensities off the resolved LOD; a resource that exposes
    // none yields an empty list, which the material treats as "no LOD data" and
    // requests the full resolution.
    const uvDensities = lod.uvDensities ?? lod.m_uvDensities ?? [];
    let reported = false;

    for (const area of this.GetAllAreas())
    {
      const material = area?.GetMaterialInterface?.();
      if (!material?.UsedWithScreenSize) continue;

      material.UsedWithScreenSize(screenSize, worldRadius, uvDensities);
      reported = true;
    }

    return reported;
  }

  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    let updated = false;
    for (const area of this.GetAllAreas())
    {
      if (!area?.effect?.SetOption) continue;
      area.effect.SetOption(name, value);
      updated = true;
    }
    return updated;
  }

  @carbon.method
  @impl.adapted
  GetMaterialBoundsAdjustment()
  {
    return {
      maxLocalScale: this.maxVertexScale,
      maxLocalDisplacement: this.maxVertexDisplacement,
      rotatesVertices: this.rotatesVertices
    };
  }

  @carbon.method
  @impl.adapted
  SetMaterialBoundsAdjustment(value)
  {
    const source = value || {};
    this.maxVertexScale = Number(source.maxLocalScale) || 0;
    this.maxVertexDisplacement = Number(source.maxLocalDisplacement) || 0;
    this.rotatesVertices = !!source.rotatesVertices;
    return true;
  }

  @carbon.method
  @impl.adapted
  GetGeometryResPath()
  {
    return "";
  }

  // Emits one batch per displayed area into the accumulator. `areas` may be a
  // TriBatchType (resolved via GetAreas) or an already-resolved area list, so the
  // scene collector can drive a mesh directly and a transform can pass a
  // pre-fetched vector (Carbon Tr2Transform::GetBatches passes GetAreas(type)).
  // Returns whether any batch was committed (JS addition; Carbon returns void).
  @carbon.method
  @impl.adapted
  @impl.reason("GPU-free descriptor batches: geometry buffers and final draw args are resolved by the engine at dispatch")
  GetBatches(accumulator, areas, perObjectData, _reason)
  {
    if (this.display === false) return false;

    const areaList = Array.isArray(areas) ? areas : this.GetAreas(areas);
    if (!areaList) return false;

    let committed = false;
    const geometry = this.GetGeometryResource?.() ?? null;
    for (const area of areaList)
    {
      const batch = this.CreateGeometryBatch(geometry, area, perObjectData);
      if (batch) committed = accumulator.Commit(batch) || committed;
    }
    return committed;
  }

  // Builds a single GPU-free batch for one mesh area: the area's effect is the
  // material/shader key, and the geometry + area range are recorded as a source
  // descriptor for the engine to realize. Returns null for a hidden or
  // material-less area (Carbon returns an invalid batch in those cases).
  @carbon.method
  @impl.adapted
  @impl.reason("GPU-free: emits a geometry source descriptor instead of realized Tr2BufferAL allocations")
  CreateGeometryBatch(geometry, area, perObjectData)
  {
    if (!area || area.GetDisplay() === false) return null;

    const effect = area.GetMaterialInterface();
    if (!effect) return null;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    if (!batch.IsValid()) return null;

    batch.SetGeometrySource(geometry, this.meshIndex, area.GetIndex(), area.GetCount(), area.GetReversed());
    batch.SetPerObjectData(perObjectData ?? null);
    batch.SetPickingData(this.meshIndex, area.GetIndex());
    return batch;
  }

  // Appends one (startIndex, count) block per area of the requested type.
  // Carbon deliberately skips non-shadow-casting OPAQUE areas here too (overlay
  // rendering over e.g. scaffolding build effects causes problems).
  @carbon.method
  @impl.implemented
  CollectAreaBlocks(collector, areaType)
  {
    const areas = this.GetAreas(areaType);
    if (!areas) return collector;

    for (const area of areas)
    {
      if (areaType === TriBatchType.TRIBATCHTYPE_OPAQUE && !area.IsCastingShadows()) continue;
      collector.push(new TriRenderBatchAreaBlock(
        Math.max(0, area.GetIndex()), Math.max(0, area.GetCount())));
    }
    return collector;
  }

  // Appends blocks grouped by shared area material (the shadow path). Skips
  // non-shadow-casting OPAQUE and DECAL areas. Faithfully does NOT clamp
  // negative index/count (Carbon asymmetry with CollectAreaBlocks).
  @carbon.method
  @impl.adapted
  @impl.reason("Material grouping uses reference identity in place of Carbon's effect hash values.")
  CollectAreaBlocksWithSharedMaterials(collectors, areaType)
  {
    const areas = this.GetAreas(areaType);
    if (!areas) return collectors;

    for (const area of areas)
    {
      if (areaType === TriBatchType.TRIBATCHTYPE_OPAQUE && !area.IsCastingShadows()) continue;
      if (areaType === TriBatchType.TRIBATCHTYPE_DECAL && !area.IsCastingShadows()) continue;

      const material = area.GetMaterialInterface();
      let entry = collectors.find(candidate => candidate.shaderMaterial === material);
      if (!entry)
      {
        entry = new TriRenderBatchAreaBlocksWithSharedMaterial();
        entry.shaderMaterial = material;
        collectors.push(entry);
      }
      entry.areaBlockVector.push(new TriRenderBatchAreaBlock(area.GetIndex(), area.GetCount()));
    }
    return collectors;
  }

  static #areaProperties = Object.freeze([
    "opaqueAreas",
    "decalAreas",
    "transparentAreas",
    "depthAreas",
    "additiveAreas",
    "pickableAreas",
    "mirrorAreas",
    "decalNormalAreas",
    "depthNormalAreas",
    "opaquePrepassAreas",
    "decalPrepassAreas",
    "geometryEraserAreas",
    "flareAreas",
    "distortionAreas"
  ]);
}
