// Incarna: reconstructed from Black records; no Carbon donor. See ../README.md.
import { exposure as be } from "#be";
import { IInitialize } from "#blue";
import { IRoot } from "#blueexposure/IRoot";
import { CjsSchema, meta, type } from "#schema";
import { ITr2BoundingBox } from "#interfaces/ITr2BoundingBox";
import { TriBatchType } from "#consts/graphics";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";
import { Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { CreateLodAllocations } from "../../../trinity/core/mesh/TriGeometryResAllocations.js";
import { Tr2PerObjectDataStandard } from "../../../trinity/core/rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { ITr2Interior } from "../../trinity/interior/ITr2Interior.js";
import { ITr2InteriorDynamic } from "../../trinity/interior/ITr2InteriorDynamic.js";
import { Tr2ShaderMaterial } from "../shader/Tr2ShaderMaterial.js";

/**
 * One fixed piece of an Incarna interior, such as a section of a captain's
 * quarters walkway.
 *
 * Carbon names the class only in a comment
 * (`trinity/trinity/Interior/Tr2InteriorPlaceable.h:39`), and no header
 * declares it. The three members, and their order, are those of build
 * 1142708's Black records: every
 * `res:/graphics/interior/<race>/modular_<kit>/<piece>.black` and
 * `res:/graphics/interior/charactercreation/raceselection/exports/wodinteriorstatic1.black`
 * writes `name`, `detailMeshes`, then `geometryResPath`. The exposure flags and
 * the mapped interfaces are guessed: the records show only that the members
 * persist, and the interfaces are the ones Tr2InteriorScene needs. `transform`
 * is ours.
 *
 * The behaviour is ours, modelled on Tr2InteriorPlaceable, the interior object
 * current Carbon still has. Each method's JSDoc says where it differs.
 *
 * Modelled on: Tr2InteriorPlaceable (trinity/trinity/Interior/Tr2InteriorPlaceable.cpp:64-650)
 *
 * @adapted
 */
@meta.define("Tr2InteriorStatic")
@meta.inherit(IInitialize, ITr2Renderable, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox)
@be.mapInterface(IInitialize)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(ITr2Interior)
@be.mapInterface(ITr2InteriorDynamic)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(ITr2BoundingBox)
export class Tr2InteriorStatic extends IRoot
{

  /** The piece's name, such as "Walkway_04_Cal". Flags guessed. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /**
   * The piece's meshes; every record read holds one. Flags guessed, as Carbon
   * maps its own object lists (`trinity/trinity/Tr2MeshBase_Blue.cpp:15-27`).
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.list("Tr2Mesh")
  detailMeshes = [];

  /**
   * A geometry path, the same as the mesh's own in every record read. Stored
   * only: the mesh loads its geometry. Flags guessed.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.path
  geometryResPath = "";

  /**
   * Ours: where the piece sits in the scene. The records carry no placement,
   * since the room layout that placed statics is not in the client's files,
   * and Tr2InteriorScene needs one to cull the piece and fill its per-object
   * data. Not persisted.
   */
  @type.mat4
  transform = mat4.create();

  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), vec3_3: vec3.create() };

  /**
   * Puts in each mesh area the Tr2Effect its Tr2ShaderMaterial becomes, and
   * drops the material (operator, 2026-10-25), so the meshes draw as current
   * Carbon's do: their areas hold Tr2Effects (`trinity/trinity/Tr2MeshArea.h:77`).
   * Every area list is visited through `GetAreas`.
   *
   * @adapted Tr2InteriorPlaceable's Initialize loads its placeable resource
   *   (cpp:276-280); a static holds its meshes, so it converts their materials
   *   instead.
   * @returns {boolean} true.
   */
  Initialize()
  {
    for (const mesh of this.detailMeshes)
    {
      for (let areaType = 0; areaType < TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES; areaType++)
      {
        for (const area of mesh.GetAreas(areaType) ?? [])
        {
          const material = CjsSchema.cast(area.effect, Tr2ShaderMaterial);
          if (material) area.SetMaterial(material.CreateEffect());
        }
      }
    }
    return true;
  }

  /**
   * Writes the union of the meshes' bounds, in the piece's own space.
   *
   * @adapted Tr2InteriorPlaceable asks its WodPlaceableRes (cpp:80-95); a
   *   static owns its meshes, so it asks them. False until every mesh has bounds.
   * @param {vec3} min Receives the minimum corner.
   * @param {vec3} max Receives the maximum corner.
   * @returns {boolean} Whether the bounds are known.
   */
  GetLocalBoundingBox(min, max)
  {
    if (!this.detailMeshes.length) return false;

    const { vec3_0, vec3_1 } = Tr2InteriorStatic.scratch;
    vec3.set(min, Infinity, Infinity, Infinity);
    vec3.set(max, -Infinity, -Infinity, -Infinity);
    for (const mesh of this.detailMeshes)
    {
      if (!mesh.GetBoundingBox(vec3_0, vec3_1)) return false;
      vec3.min(min, min, vec3_0);
      vec3.max(max, max, vec3_1);
    }
    return true;
  }

  /**
   * Writes the world bounds: the local box's eight corners through `transform`.
   * Tr2InteriorPlaceable does the same (cpp:125-136).
   *
   * @implemented
   * @param {vec3} min Receives the minimum corner.
   * @param {vec3} max Receives the maximum corner.
   * @returns {boolean} Whether the bounds are known.
   */
  GetWorldBoundingBox(min, max)
  {
    if (!this.GetLocalBoundingBox(min, max)) return false;

    const { vec3_2 } = Tr2InteriorStatic.scratch;
    const minX = min[0], minY = min[1], minZ = min[2];
    const maxX = max[0], maxY = max[1], maxZ = max[2];
    for (let i = 0; i < 8; i++)
    {
      vec3.set(vec3_2, i & 1 ? maxX : minX, i & 2 ? maxY : minY, i & 4 ? maxZ : minZ);
      vec3.transformMat4(vec3_2, vec3_2, this.transform);
      if (i === 0)
      {
        vec3.copy(min, vec3_2);
        vec3.copy(max, vec3_2);
      }
      else
      {
        vec3.min(min, min, vec3_2);
        vec3.max(max, max, vec3_2);
      }
    }
    return true;
  }

  /**
   * Whether every mesh has bounds. Tr2InteriorPlaceable asks whether its
   * resource is ready (cpp:138-141).
   *
   * @implemented
   * @returns {boolean} Whether a bounds query can be answered.
   */
  IsBoundingBoxReady()
  {
    const { vec3_0, vec3_1 } = Tr2InteriorStatic.scratch;
    return this.GetLocalBoundingBox(vec3_0, vec3_1);
  }

  /**
   * Tests the world box against the frustum and writes `transform`, as
   * Tr2InteriorPlaceable does (cpp:625-634).
   *
   * @implemented
   * @param {object} frustum The TriFrustum to test against.
   * @param {mat4} objectToWorld Receives the piece's transform.
   * @returns {boolean} Whether the piece is visible.
   */
  IsInFrustum(frustum, objectToWorld)
  {
    const { vec3_0, vec3_1 } = Tr2InteriorStatic.scratch;
    if (!this.GetWorldBoundingBox(vec3_0, vec3_1)) return false;

    mat4.copy(objectToWorld, this.transform);
    return frustum.IsBoxVisible__BoundsMinMax(vec3_0, vec3_1);
  }

  /**
   * Reports whether the bounds are ready, which is what the scene waits on.
   *
   * @adapted Tr2InteriorPlaceable also rebuilds the volume it uses to find its
   *   cells (cpp:64-74); Incarna's cells are not ported, so there is nothing to
   *   rebuild.
   * @param {object|null} _apexScene The physics scene; unused.
   * @returns {boolean} Whether the piece is ready to draw.
   */
  AddToScene(_apexScene)
  {
    return this.IsBoundingBoxReady();
  }

  /**
   * Nothing to release, as for Tr2InteriorPlaceable (cpp:76-78).
   *
   * @implemented
   */
  RemoveFromScene()
  {
  }

  /**
   * No physics, as for Tr2InteriorPlaceable (cpp:143-145).
   *
   * @implemented
   */
  PrePhysicsUpdate(_time)
  {
  }

  /**
   * Nothing to update. Tr2InteriorPlaceable updates its resource's curve sets
   * here (cpp:147-158); a static has none.
   *
   * @implemented
   */
  PostPhysicsUpdate(_time, _apexScene)
  {
  }

  /**
   * No levels of detail, as for Tr2InteriorPlaceable (cpp:231-234).
   *
   * @implemented
   */
  SetLOD(_frustum)
  {
  }

  /**
   * Whether any mesh has transparent areas.
   *
   * @implemented
   * @returns {boolean} Whether a transparent pass has work.
   */
  HasTransparentBatches()
  {
    return this.detailMeshes.some(mesh => mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length > 0);
  }

  /**
   * Not implemented: Tr2InteriorPlaceable returns its camera distance
   * (cpp:378-381), and nothing on the interior path asks a static for it yet.
   *
   * @notImplemented
   * @returns {number} Never returns.
   */
  GetSortValue()
  {
    throw new Error("Tr2InteriorStatic.GetSortValue is not implemented.");
  }

  /**
   * Per-object data with no lights.
   *
   * @adapted Tr2InteriorPlaceable passes its own light set (cpp:383-386); a
   *   static has none. The scene path uses the per-instance form below.
   * @param {object} accumulator The batch accumulator that leases the data.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  GetPerObjectData(accumulator)
  {
    return this._GetPerObjectDataWithLightSet(accumulator, null, this.transform);
  }

  /**
   * Per-object data lit by the scene's light set, as Tr2InteriorPlaceable
   * (cpp:527-536).
   *
   * @implemented
   * @param {object} accumulator The batch accumulator that leases the data.
   * @param {object|null} lightSet The Tr2InteriorLightSet lighting the piece.
   * @param {mat4} objectToWorldMatrix The piece's transform.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  GetPerObjectDataWithPerInstanceLighting(accumulator, lightSet, objectToWorldMatrix)
  {
    return this._GetPerObjectDataWithLightSet(accumulator, lightSet, objectToWorldMatrix);
  }

  /**
   * Leases standard per-object data: the transposed world matrix and the
   * interior lights, both buffers zeroed first, as Tr2InteriorPlaceable
   * (cpp:551-585).
   *
   * @implemented
   * @param {object} accumulator The batch accumulator that leases the data.
   * @param {object|null} lightSet The lights, or null for none.
   * @param {mat4} objectToWorldMatrix The piece's transform.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  _GetPerObjectDataWithLightSet(accumulator, lightSet, objectToWorldMatrix)
  {
    const data = Tr2PerObjectDataStandard.alloc(accumulator, "Tr2PerObjectVSData", "Tr2InteriorPerObjectPSData");
    data.vs.GetData().fill(0);
    data.ps.GetData().fill(0);

    data.vs.SetAndTranspose("WorldMat", objectToWorldMatrix);
    if (lightSet) lightSet.PopulateLightData(data.ps);
    return data;
  }

  /**
   * Commits one batch per displayed area of the requested type, as
   * Tr2InteriorPlaceable (cpp:291-376).
   *
   * Adapted for Incarna content in two places. An opaque request also draws
   * the meshes' `opaquePrepassAreas`: Incarna's interior drew those in its
   * light pre-pass, current Carbon draws them only for picking
   * (`trinity/trinity/ITr2PickableScene.cpp:242`), and the walkway kits hold
   * their opaque geometry nowhere else (operator, 2026-10-25). A transparent
   * area's depth uses its mesh's bounds, because Tr2Mesh.GetAreaBounds, which
   * Carbon uses, is not ported.
   *
   * @adapted
   * @param {object} batches The batch accumulator.
   * @param {number} batchType A TriBatchType.
   * @param {object} perObjectData This piece's per-object data.
   * @param {number} [_reason] The render reason; unused, as in Carbon.
   * @returns {void}
   */
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    const areaTypes = batchType === TriBatchType.TRIBATCHTYPE_OPAQUE
      ? [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_OPAQUE_PREPASS ]
      : [ batchType ];

    for (const mesh of this.detailMeshes)
    {
      if (!mesh.GetDisplay()) continue;

      const geometry = mesh.GetGeometryResource();
      if (!geometry || !geometry.EnsureGood()) continue;
      const meshIndex = mesh.GetMeshIndex();
      if (meshIndex < 0 || meshIndex >= geometry.GetMeshCount()) continue;
      const lod = geometry.GetMeshLod__LodIndex(meshIndex, 0);
      if (!lod || !CreateLodAllocations(geometry, meshIndex, lod, Tr2RenderContext_GetMainThreadRenderContext())) continue;

      const depth = batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT ? this._TransparentDepth(mesh) : 0;
      for (const areaType of areaTypes)
      {
        for (const area of mesh.GetAreas(areaType))
        {
          if (!area.GetDisplay() || !area.GetMaterialInterface()) continue;

          const batch = mesh.CreateGeometryBatch(geometry, area, perObjectData, false, lod);
          if (!batch) continue;
          batch.depth = depth;
          batches.Commit(batch);
        }
      }
    }
  }

  /**
   * The sort depth for a mesh's transparent areas: the distance from the
   * camera to the mesh's centre over the frustum radius, as
   * Tr2InteriorPlaceable computes it (cpp:342-358), without its depth offset.
   *
   * @adapted the mesh's centre stands in for the area's, which needs
   *   Tr2Mesh.GetAreaBounds.
   * @param {object} mesh The Tr2Mesh whose areas are being drawn.
   * @returns {number} The unsigned depth key.
   */
  _TransparentDepth(mesh)
  {
    const { vec3_0, vec3_1, vec3_3 } = Tr2InteriorStatic.scratch;
    if (!mesh.GetBoundingBox(vec3_0, vec3_1)) return 0;

    vec3.add(vec3_3, vec3_0, vec3_1);
    vec3.scale(vec3_3, vec3_3, 0.5);
    vec3.transformMat4(vec3_3, vec3_3, this.transform);
    vec3.subtract(vec3_3, vec3_3, Tr2Renderer.GetViewPosition());
    const f32 = Math.fround;
    const z = Math.min(Math.max(f32(f32(vec3.length(vec3_3)) / Tr2Renderer.GetFrustumRadius()), 0), 1);
    return f32(f32(0xfffffff) * f32(1 - z)) >>> 0;
  }

  /**
   * This piece, for picking. Tr2InteriorPlaceable returns its raw root (h:99-102).
   *
   * @implemented
   * @param {number} _areaId The picked area; unused.
   * @returns {Tr2InteriorStatic} This piece.
   */
  GetID(_areaId)
  {
    return this;
  }

  /**
   * Gathers batches for each requested pick category, as Tr2InteriorPlaceable
   * (cpp:636-651).
   *
   * @implemented
   * @param {object} batches The batch accumulator.
   * @param {number} pickTypes A Tr2PickType bit mask.
   * @param {object} perObjectData This piece's per-object data.
   * @returns {void}
   */
  GetPickingBatches(batches, pickTypes, perObjectData)
  {
    if ((pickTypes & Tr2PickType.PICK_TYPE_PICKING) !== 0)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_PICKING, perObjectData);
    }
    if ((pickTypes & Tr2PickType.PICK_TYPE_OPAQUE) !== 0)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData);
    }
    if ((pickTypes & Tr2PickType.PICK_TYPE_TRANSPARENT) !== 0)
    {
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_TRANSPARENT, perObjectData);
      this.GetBatches(batches, TriBatchType.TRIBATCHTYPE_ADDITIVE, perObjectData);
    }
  }

}

export default Tr2InteriorStatic;
