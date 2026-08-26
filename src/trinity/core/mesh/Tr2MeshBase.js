// Source: trinity/trinity/Tr2MeshBase.h
// Source: trinity/trinity/Tr2MeshBase.cpp
// Source: trinity/trinity/Tr2MeshBase_Blue.cpp
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { carbon, impl, io, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderBatch, TriRenderBatchAreaBlock, TriRenderBatchAreaBlocksWithSharedMaterial } from "../batch/Tr2RenderBatch.js";
import { Tr2VertexDefinition } from "../vertex/Tr2VertexDefinition.js";


/**
 * Base mesh: owns one mesh-area list per batch type and turns the displayed
 * areas into GPU-free render batches and shadow area blocks.
 */
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

  // Carbon routes TRIBATCHTYPE_FLARE but does not expose this list to Blue, so
  // this list is typed without being read or persisted: the type declaration is
  // what makes its areas reachable to graph traversal, independent of io.
  @io.rebuild("batches")
  @type.list("Tr2MeshArea")
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

  /** Whether this mesh participates in rendering. */
  @carbon.method
  @impl.implemented
  GetDisplay()
  {
    return this.display;
  }

  /** Index of this mesh inside its geometry resource. */
  @carbon.method
  @impl.implemented
  GetMeshIndex()
  {
    return this.meshIndex;
  }

  /**
   * Returns the geometry bounds after applying Carbon's material-driven local
   * scale, displacement, and vertex-rotation expansion.
   */
  @carbon.method
  @impl.adapted
  GetBounds()
  {
    const geometry = this.GetGeometryResource();
    if (!geometry) return null;
    const source = geometry.GetBoundingBox(this.meshIndex);
    if (!source) return null;

    const min = vec3.clone(source.min ?? source.minBounds);
    const max = vec3.clone(source.max ?? source.maxBounds);
    const scale = this.maxVertexScale;

    for (let index = 0; index < 3; index++)
    {
      const scaledMin = min[index] * scale;
      const scaledMax = max[index] * scale;
      min[index] = Math.min(scaledMin, scaledMax) - this.maxVertexDisplacement;
      max[index] = Math.max(scaledMin, scaledMax) + this.maxVertexDisplacement;
    }

    if (this.rotatesVertices)
    {
      const radius = Math.hypot(
        Math.max(Math.abs(min[0]), Math.abs(max[0])),
        Math.max(Math.abs(min[1]), Math.abs(max[1])),
        Math.max(Math.abs(min[2]), Math.abs(max[2]))
      );
      vec3.set(min, -radius, -radius, -radius);
      vec3.set(max, radius, radius, radius);
    }

    return { min, max };
  }

  /** Writes the adjusted mesh bounds into caller-owned minimum and maximum vectors. */
  @carbon.method
  @impl.implemented
  GetBoundingBox(min, max)
  {
    const bounds = this.GetBounds();
    if (!bounds) return false;
    vec3.copy(min, bounds.min);
    vec3.copy(max, bounds.max);
    return true;
  }

  /**
   * The live area list for a TriBatchType, or null for a non-integer or unmapped
   * type.
   */
  @carbon.method
  @impl.implemented
  GetAreas(areaType)
  {
    if (!Number.isInteger(areaType)) return null;
    const property = Tr2MeshBase.#areaProperties[areaType];
    return property ? this[property] : null;
  }

  /**
   * Appends an area to the list for a batch type; returns false when that type
   * has no list.
   */
  @carbon.method
  @impl.adapted
  AddArea(areaType, area)
  {
    const areas = this.GetAreas(areaType);
    if (!areas) return false;
    areas.push(area);
    return true;
  }

  /**
   * Every area of every batch type, in batch-type order, as one newly allocated
   * array.
   */
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

  /**
   * Sets a shader option on every area effect that supports it; returns whether
   * at least one area was updated.
   */
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

  /**
   * The vertex-displacement bounds adjustment consumers apply to this mesh: max
   * local scale, max local displacement and whether the material rotates
   * vertices.
   */
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

  /**
   * Stores the bounds adjustment, coercing missing or non-numeric entries to
   * zero and false.
   */
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

  /** Empty at this level; Tr2Mesh overrides it with the real geometry path. */
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

  /**
   * Emits one batch per displayed area into the accumulator, where areas may be
   * a TriBatchType or an already-resolved area list, so a scene collector or a
   * transform can drive the mesh directly; returns whether any batch was
   * committed (a JS addition, Carbon returns void).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("GPU-free descriptor batches: geometry buffers and final draw args are resolved by the engine at dispatch")
  GetBatches(accumulator, areas, perObjectData, screenSize = Infinity, reverseWinding = false)
  {
    if (this.display === false) return false;

    const areaList = Array.isArray(areas) ? areas : this.GetAreas(areas);
    if (!areaList) return false;

    let committed = false;
    const geometry = this.GetGeometryResource?.() ?? null;

    // Carbon resolves the LOD once for the whole area list from the caller's
    // screen size (Tr2MeshBase.cpp:381) and passes it to every area. A resource
    // that cannot select a LOD yet yields null, and the batch then carries its
    // geometry-source descriptor with no draw arguments.
    const lod = geometry?.GetMeshLod?.(this.meshIndex, screenSize) ?? null;

    for (const area of areaList)
    {
      const batch = this.CreateGeometryBatch(geometry, area, perObjectData, reverseWinding, lod);
      if (batch) committed = accumulator.Commit(batch) || committed;
    }
    return committed;
  }

  // Builds a single GPU-free batch for one mesh area: the area's effect is the
  // material/shader key, and the geometry + area range are recorded as a source
  // descriptor for the engine to realize. Returns null for a hidden or
  // material-less area (Carbon returns an invalid batch in those cases).

  /**
   * Builds one GPU-free batch for a mesh area, using the area's effect as
   * material and shader key and recording geometry plus area range as a source
   * descriptor; returns null for a hidden or material-less area, where Carbon
   * returns an invalid batch.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("GPU-free: emits a geometry source descriptor instead of realized Tr2BufferAL allocations")
  CreateGeometryBatch(geometry, area, perObjectData, reverseWinding = false, lod = null)
  {
    if (!area || area.GetDisplay() === false) return null;

    const effect = area.GetMaterialInterface();
    if (!effect) return null;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    if (!batch.IsValid()) return null;

    // Carbon XORs the area's authored winding with the caller's request
    // (Tr2MeshBase.cpp:373); it is not a property of the area alone. The
    // EveSpaceObject2 path always passes false, but EveChildMesh and the
    // reflection reason pass a live value.
    const reversed = area.GetReversed() !== reverseWinding;

    batch.SetGeometrySource(geometry, this.meshIndex, area.GetIndex(), area.GetCount(), reversed);

    // Carbon binds lod->m_mesh->m_vertexDeclarationHandle onto the batch
    // (Tr2MeshBase.cpp:371). The handle is what binning and sorting compare, so
    // leaving it zero makes every mesh look like one declaration.
    const elements = geometry?.GetMeshVertexElements?.(this.meshIndex);

    if (elements?.length)
    {
      batch.SetVertexDeclaration(Tr2VertexDefinition.getHandle(elements));
    }

    // Carbon computes the draw arguments here, from the resolved LOD. Without a
    // LOD the batch still carries its descriptor and the arguments stay zero,
    // which is what every mesh batch did before this seam existed.
    const draw = Tr2RenderBatch.resolveDrawArguments(lod, area.GetIndex(), area.GetCount(), reversed);

    if (draw)
    {
      batch.SetDrawIndexedInstanced(
        draw.indexCountPerInstance,
        draw.instanceCount,
        draw.startIndexLocation,
        draw.baseVertexLocation,
        draw.startInstanceLocation);
    }

    batch.SetPerObjectData(perObjectData ?? null);
    batch.SetPickingData(this.meshIndex, area.GetIndex());
    return batch;
  }

  // Appends one (startIndex, count) block per area of the requested type.
  // Carbon deliberately skips non-shadow-casting OPAQUE areas here too (overlay
  // rendering over e.g. scaffolding build effects causes problems).

  /**
   * Appends one clamped (startIndex, count) block per area of the requested type
   * to the caller's collector, skipping non-shadow-casting OPAQUE areas as
   * Carbon does because overlay rendering over build effects misbehaves.
   */
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

  /**
   * Appends blocks grouped by shared area material for the shadow path, skipping
   * non-shadow-casting OPAQUE and DECAL areas, and faithfully reproduces
   * Carbon's asymmetry by not clamping negative index or count.
   */
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
