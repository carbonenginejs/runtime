import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { Tr2RenderBatch, TriRenderBatchAreaBlock, TriRenderBatchAreaBlocksWithSharedMaterial } from '../batch/Tr2RenderBatch.js';
import { Tr2VertexDefinition } from '../vertex/Tr2VertexDefinition.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_display, _init_extra_display, _init_meshIndex, _init_extra_meshIndex, _init_opaqueAreas, _init_extra_opaqueAreas, _init_decalAreas, _init_extra_decalAreas, _init_depthAreas, _init_extra_depthAreas, _init_transparentAreas, _init_extra_transparentAreas, _init_additiveAreas, _init_extra_additiveAreas, _init_pickableAreas, _init_extra_pickableAreas, _init_mirrorAreas, _init_extra_mirrorAreas, _init_decalNormalAreas, _init_extra_decalNormalAreas, _init_depthNormalAreas, _init_extra_depthNormalAreas, _init_opaquePrepassAreas, _init_extra_opaquePrepassAreas, _init_decalPrepassAreas, _init_extra_decalPrepassAreas, _init_geometryEraserAreas, _init_extra_geometryEraserAreas, _init_distortionAreas, _init_extra_distortionAreas, _init_flareAreas, _init_extra_flareAreas, _init_maxVertexScale, _init_extra_maxVertexScale, _init_maxVertexDisplacement, _init_extra_maxVertexDisplacement, _init_rotatesVertices, _init_extra_rotatesVertices;

/**
 * Base mesh: owns one mesh-area list per batch type and turns the displayed
 * areas into GPU-free render batches and shadow area blocks.
 */
let _Tr2MeshBase;
new class extends _identity {
  static [class Tr2MeshBase extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_display, _init_extra_display, _init_meshIndex, _init_extra_meshIndex, _init_opaqueAreas, _init_extra_opaqueAreas, _init_decalAreas, _init_extra_decalAreas, _init_depthAreas, _init_extra_depthAreas, _init_transparentAreas, _init_extra_transparentAreas, _init_additiveAreas, _init_extra_additiveAreas, _init_pickableAreas, _init_extra_pickableAreas, _init_mirrorAreas, _init_extra_mirrorAreas, _init_decalNormalAreas, _init_extra_decalNormalAreas, _init_depthNormalAreas, _init_extra_depthNormalAreas, _init_opaquePrepassAreas, _init_extra_opaquePrepassAreas, _init_decalPrepassAreas, _init_extra_decalPrepassAreas, _init_geometryEraserAreas, _init_extra_geometryEraserAreas, _init_distortionAreas, _init_extra_distortionAreas, _init_flareAreas, _init_extra_flareAreas, _init_maxVertexScale, _init_extra_maxVertexScale, _init_maxVertexDisplacement, _init_extra_maxVertexDisplacement, _init_rotatesVertices, _init_extra_rotatesVertices, _initProto],
        c: [_Tr2MeshBase, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2MeshBase",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.readwrite, type, type.boolean], 16, "display"], [[void 0, io.rebuild("batches"), io, io.notify, io, io.persist, type, type.int32], 16, "meshIndex"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "opaqueAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "decalAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "depthAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "transparentAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "additiveAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "pickableAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "mirrorAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "decalNormalAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "depthNormalAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "opaquePrepassAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "decalPrepassAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "geometryEraserAreas"], [[void 0, io.rebuild("batches"), io, io.persist, void 0, type.list("Tr2MeshArea")], 16, "distortionAreas"], [[io.rebuild("batches"), type.list("Tr2MeshArea")], 0, "flareAreas"], [[io, io.read, io, io.persist, type, type.float32], 16, "maxVertexScale"], [[io, io.read, io, io.persist, type, type.float32], 16, "maxVertexDisplacement"], [[io, io.read, io, io.persist, type, type.boolean], 16, "rotatesVertices"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDisplay"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMeshIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAreas"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAllAreas"], [[carbon, carbon.method, impl, impl.implemented], 18, "UseWithScreenSize"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMaterialBoundsAdjustment"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMaterialBoundsAdjustment"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetGeometryResPath"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU-free descriptor batches: geometry buffers and final draw args are resolved by the engine at dispatch")], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("GPU-free: emits a geometry source descriptor instead of realized Tr2BufferAL allocations")], 18, "CreateGeometryBatch"], [[carbon, carbon.method, impl, impl.implemented], 18, "CollectAreaBlocks"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Material grouping uses reference identity in place of Carbon's effect hash values.")], 18, "CollectAreaBlocksWithSharedMaterials"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_rotatesVertices(this);
    }
    name = (_initProto(this), _init_name(this, ""));
    display = (_init_extra_name(this), _init_display(this, true));
    meshIndex = (_init_extra_display(this), _init_meshIndex(this, 0));
    opaqueAreas = (_init_extra_meshIndex(this), _init_opaqueAreas(this, []));
    decalAreas = (_init_extra_opaqueAreas(this), _init_decalAreas(this, []));
    depthAreas = (_init_extra_decalAreas(this), _init_depthAreas(this, []));
    transparentAreas = (_init_extra_depthAreas(this), _init_transparentAreas(this, []));
    additiveAreas = (_init_extra_transparentAreas(this), _init_additiveAreas(this, []));
    pickableAreas = (_init_extra_additiveAreas(this), _init_pickableAreas(this, []));
    mirrorAreas = (_init_extra_pickableAreas(this), _init_mirrorAreas(this, []));
    decalNormalAreas = (_init_extra_mirrorAreas(this), _init_decalNormalAreas(this, []));
    depthNormalAreas = (_init_extra_decalNormalAreas(this), _init_depthNormalAreas(this, []));
    opaquePrepassAreas = (_init_extra_depthNormalAreas(this), _init_opaquePrepassAreas(this, []));
    decalPrepassAreas = (_init_extra_opaquePrepassAreas(this), _init_decalPrepassAreas(this, []));
    geometryEraserAreas = (_init_extra_decalPrepassAreas(this), _init_geometryEraserAreas(this, []));
    distortionAreas = (_init_extra_geometryEraserAreas(this), _init_distortionAreas(this, []));

    // Carbon routes TRIBATCHTYPE_FLARE but does not expose this list to Blue, so
    // this list is typed without being read or persisted: the type declaration is
    // what makes its areas reachable to graph traversal, independent of io.
    flareAreas = (_init_extra_distortionAreas(this), _init_flareAreas(this, []));
    maxVertexScale = (_init_extra_flareAreas(this), _init_maxVertexScale(this, 1));
    maxVertexDisplacement = (_init_extra_maxVertexScale(this), _init_maxVertexDisplacement(this, 0));
    rotatesVertices = (_init_extra_maxVertexDisplacement(this), _init_rotatesVertices(this, false));

    /** Whether this mesh participates in rendering. */
    GetDisplay() {
      return this.display;
    }

    /** Index of this mesh inside its geometry resource. */
    GetMeshIndex() {
      return this.meshIndex;
    }

    /**
     * The live area list for a TriBatchType, or null for a non-integer or unmapped
     * type.
     */
    GetAreas(areaType) {
      if (!Number.isInteger(areaType)) return null;
      const property = _Tr2MeshBase.#areaProperties[areaType];
      return property ? this[property] : null;
    }

    /**
     * Appends an area to the list for a batch type; returns false when that type
     * has no list.
     */
    AddArea(areaType, area) {
      const areas = this.GetAreas(areaType);
      if (!areas) return false;
      areas.push(area);
      return true;
    }

    /**
     * Every area of every batch type, in batch-type order, as one newly allocated
     * array.
     */
    GetAllAreas() {
      return _Tr2MeshBase.#areaProperties.flatMap(property => this[property]);
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
    UseWithScreenSize(screenSize, worldRadius) {
      const geometry = this.GetGeometryResource?.() ?? null;
      if (!geometry) return false;
      const lod = geometry.GetMeshLod?.(this.meshIndex, screenSize) ?? null;
      if (!lod) return false;

      // Carbon reads m_uvDensities off the resolved LOD; a resource that exposes
      // none yields an empty list, which the material treats as "no LOD data" and
      // requests the full resolution.
      const uvDensities = lod.uvDensities ?? lod.m_uvDensities ?? [];
      let reported = false;
      for (const area of this.GetAllAreas()) {
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
    SetShaderOption(name, value) {
      let updated = false;
      for (const area of this.GetAllAreas()) {
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
    GetMaterialBoundsAdjustment() {
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
    SetMaterialBoundsAdjustment(value) {
      const source = value || {};
      this.maxVertexScale = Number(source.maxLocalScale) || 0;
      this.maxVertexDisplacement = Number(source.maxLocalDisplacement) || 0;
      this.rotatesVertices = !!source.rotatesVertices;
      return true;
    }

    /** Empty at this level; Tr2Mesh overrides it with the real geometry path. */
    GetGeometryResPath() {
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
    GetBatches(accumulator, areas, perObjectData, screenSize = Infinity, reverseWinding = false) {
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
      for (const area of areaList) {
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
    CreateGeometryBatch(geometry, area, perObjectData, reverseWinding = false, lod = null) {
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
      if (elements?.length) {
        batch.SetVertexDeclaration(Tr2VertexDefinition.getHandle(elements));
      }

      // Carbon computes the draw arguments here, from the resolved LOD. Without a
      // LOD the batch still carries its descriptor and the arguments stay zero,
      // which is what every mesh batch did before this seam existed.
      const draw = Tr2RenderBatch.resolveDrawArguments(lod, area.GetIndex(), area.GetCount(), reversed);
      if (draw) {
        batch.SetDrawIndexedInstanced(draw.indexCountPerInstance, draw.instanceCount, draw.startIndexLocation, draw.baseVertexLocation, draw.startInstanceLocation);
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
    CollectAreaBlocks(collector, areaType) {
      const areas = this.GetAreas(areaType);
      if (!areas) return collector;
      for (const area of areas) {
        if (areaType === TriBatchType.TRIBATCHTYPE_OPAQUE && !area.IsCastingShadows()) continue;
        collector.push(new TriRenderBatchAreaBlock(Math.max(0, area.GetIndex()), Math.max(0, area.GetCount())));
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
    CollectAreaBlocksWithSharedMaterials(collectors, areaType) {
      const areas = this.GetAreas(areaType);
      if (!areas) return collectors;
      for (const area of areas) {
        if (areaType === TriBatchType.TRIBATCHTYPE_OPAQUE && !area.IsCastingShadows()) continue;
        if (areaType === TriBatchType.TRIBATCHTYPE_DECAL && !area.IsCastingShadows()) continue;
        const material = area.GetMaterialInterface();
        let entry = collectors.find(candidate => candidate.shaderMaterial === material);
        if (!entry) {
          entry = new TriRenderBatchAreaBlocksWithSharedMaterial();
          entry.shaderMaterial = material;
          collectors.push(entry);
        }
        entry.areaBlockVector.push(new TriRenderBatchAreaBlock(area.GetIndex(), area.GetCount()));
      }
      return collectors;
    }
  }];
  #areaProperties = Object.freeze(["opaqueAreas", "decalAreas", "transparentAreas", "depthAreas", "additiveAreas", "pickableAreas", "mirrorAreas", "decalNormalAreas", "depthNormalAreas", "opaquePrepassAreas", "decalPrepassAreas", "geometryEraserAreas", "flareAreas", "distortionAreas"]);
  constructor() {
    super(_Tr2MeshBase), _initClass();
  }
}();

export { _Tr2MeshBase as Tr2MeshBase };
//# sourceMappingURL=Tr2MeshBase.js.map
