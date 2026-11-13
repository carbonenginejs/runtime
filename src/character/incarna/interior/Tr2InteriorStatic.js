// Incarna: retired from Carbon. Donor: trinity 24d033fa~1, Interior/Tr2InteriorStatic.h, .cpp and _Blue.cpp. See ../README.md.
import { exposure as be } from "#be";
import { blue, CcpTime, IInitialize, INotify, IsMatch, BlueList } from "#blue";
import { IRoot } from "#exposure/IRoot";
import { CjsSchema, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2Renderable } from "../../../trinity/core/ITr2Renderable.js";
import { Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { CreateLodAllocations } from "../../../trinity/core/mesh/TriGeometryResAllocations.js";
import { Tr2PerObjectDataStandard } from "../../../trinity/core/rawData/perObjectData/Tr2PerObjectDataStandard.js";
import { Tr2Effect } from "../../../trinity/shader/Tr2Effect.js";
import { TriCurveSet } from "../../../trinity/curves/TriCurveSet.js";
import { VisualizeMethod } from "../../generated/interior/enums.js";
import { ITr2Interior } from "../../trinity/interior/ITr2Interior.js";
import { Tr2ShaderMaterial } from "../shader/Tr2ShaderMaterial.js";

/**
 * Carbon's CullResult (Interior/Tr2InteriorStatic.h at trinity 24d033fa~1): what
 * `AddToCell` reports.
 */
export const CullResult = Object.freeze({ CULLRES_OK: 0, CULLRES_FAILED: 1, CULLRES_NOTREADY: 2 });

/**
 * One fixed piece of an Incarna interior, such as a section of a captain's
 * quarters walkway. It belongs to a Tr2InteriorCell, which places it in the
 * scene and lends its variable store to the piece's effects.
 *
 * Carbon removed the class in trinity 24d033fa (2017-06-28), with
 * Tr2InteriorCell. Its members, flags and methods are those of
 * `Interior/Tr2InteriorStatic.h`, `.cpp` and `_Blue.cpp` at 24d033fa~1. Build
 * 1142708's records (`res:/graphics/interior/<race>/modular_<kit>/<piece>.black`)
 * write only `name`, `detailMeshes` and `geometryResPath`; the rest keep their
 * Carbon defaults until set.
 *
 * Carbon's mesh areas held Tr2ShaderMaterials, which bound low-level shaders
 * chosen from a situation (`BindLowLevelShaders`). Ours become Tr2Effects when
 * the piece initializes, and situation selection is not ported. Each method's
 * JSDoc says where it differs.
 *
 * @adapted mesh areas hold Tr2Effects, not Tr2ShaderMaterials
 */
@be.define("Tr2InteriorStatic")
@be.inherit(ITr2Interior, ITr2Renderable, IInitialize, INotify, ITr2Pickable)
@be.mapInterface(IInitialize)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(INotify)
export class Tr2InteriorStatic extends IRoot
{

  /** m_name (std::string) [READWRITE, PERSIST]: such as "Walkway_04_Cal". */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.string
  name = "";

  /** m_display (bool) [READWRITE] = true (cpp:21): whether the piece draws. */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  display = true;

  /** m_detailMeshes (PTr2MeshVector) [READWRITE, PERSIST]: the piece's meshes. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.list("Tr2Mesh")
  detailMeshes = [];

  /**
   * m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY]: the geometry
   * whose meshes bound the piece. The same file as its meshes' own in every
   * record read.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.path
  geometryResPath = "";

  /** m_geometryResource (TriGeometryResPtr) [READ], exposed as "geometry". */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriGeometryRes")
  geometry = null;

  /**
   * m_position (Vector3) [READWRITE, PERSIST, NOTIFY], exposed as
   * "worldPosition" = (0, 0, 0) (cpp:22): the piece's position in its cell's
   * space.
   */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.vec3
  worldPosition = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST, NOTIFY] = identity (cpp:23). */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)
  @type.quat
  rotation = quat.create();

  /**
   * m_uvTranslation (Vector2) [READ, PERSIST] = (0, 0) (cpp:34-35): where the
   * piece's light-map UVs sit in its cell's light map.
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.vec2
  uvTranslation = vec2.create();

  /**
   * m_uvLinearTransform (Vector4) [READ, PERSIST] = (1, 0, 0, 1) (cpp:29-32):
   * the rotation and scale of the piece's light-map UVs into its cell's light map.
   */
  @be.mapAttribute(be.READ | be.PERSIST)
  @type.vec4
  uvLinearTransform = vec4.fromValues(1, 0, 0, 1);

  /** m_curveSets (PTriCurveSetVector) [READWRITE, PERSIST]: curve sets that animate light attributes. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.list("TriCurveSet")
  curveSets = new BlueList(TriCurveSet, { className: "TriCurveSet" });

  /** m_depthOffset (float) [READWRITE, PERSIST] = 0 (cpp:26): added to the transparent sort distance. */
  @be.mapAttribute(be.READWRITE | be.PERSIST)
  @type.float32
  depthOffset = 0;

  /** m_transform (Matrix) = identity (cpp:27): rotation, then translation. */
  _transform = mat4.create();

  /** m_worldBoundingBox: the geometry's box through `_transform`. */
  _worldBoundingBox = { min: vec3.create(), max: vec3.create() };

  /** m_isDirty = true (cpp:38). */
  _isDirty = true;

  /** m_parentCell = nullptr (cpp:24): the Tr2InteriorCell holding the piece. */
  _parentCell = null;

  /** m_visualizeMethod = VM_NONE (cpp:41). */
  _visualizeMethod = VisualizeMethod.VM_NONE;

  /** m_mirrorToWorldMatrix = identity (cpp:43): the inverse transpose of the last mirror matrix. */
  _mirrorToWorldMatrix = mat4.create();

  static scratch = {
    vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), vec3_3: vec3.create(),
    mat4_0: mat4.create(), identity: mat4.create()
  };

  /**
   * MAP_PROPERTY_READONLY( "worldTransform", GetWorldTransform ) (_Blue.cpp).
   *
   * @implemented
   * @returns {mat4} The piece's transform.
   */
  @be.mapPropertyReadOnly()
  @type.mat4
  get worldTransform()
  {
    return this.GetWorldTransform();
  }

  /**
   * Carbon SetInstanceData (cpp:75-81): places the piece's light-map UVs in its
   * cell's light map, "for data that has been loaded from database and not
   * disk". The instance index is unused, as in Carbon.
   *
   * @implemented
   * @param {vec4} linearTransform The 2x2 rotation and scale.
   * @param {vec2} translation The UV offset.
   * @param {number} _instanceInSystemIdx Unused.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  SetInstanceData(linearTransform, translation, _instanceInSystemIdx)
  {
    vec4.copy(this.uvLinearTransform, linearTransform);
    vec2.copy(this.uvTranslation, translation);
  }

  /**
   * Carbon GetBoundingBox (cpp:84-109): the union of every mesh's box in the
   * piece's geometry, in its own space. False until the geometry is good, or
   * when a mesh has no box.
   *
   * @adapted asks through GetGeometryResource, which renews the piece's link to
   *   its geometry and reacquires an expired one, as every resource holder here does.
   * @param {vec3} minBounds Receives the minimum corner.
   * @param {vec3} maxBounds Receives the maximum corner.
   * @returns {boolean} Whether the box is known.
   */
  GetBoundingBox(minBounds, maxBounds)
  {
    const geometry = this.GetGeometryResource();
    if (!geometry || !geometry.IsGood(this)) return false;

    const { vec3_0, vec3_1, vec3_2, vec3_3 } = Tr2InteriorStatic.scratch;
    vec3.set(vec3_0, Infinity, Infinity, Infinity);
    vec3.set(vec3_1, -Infinity, -Infinity, -Infinity);
    for (let i = 0; i < geometry.GetMeshCount(); i++)
    {
      if (!geometry.GetBoundingBox(i, vec3_2, vec3_3)) return false;
      vec3.min(vec3_0, vec3_0, vec3_2);
      vec3.max(vec3_1, vec3_1, vec3_3);
    }
    vec3.copy(minBounds, vec3_0);
    vec3.copy(maxBounds, vec3_1);
    return true;
  }

  /**
   * Carbon GetWorldBoundingBox (cpp:121-131): the box kept since the geometry
   * last rebuilt or the piece last moved.
   *
   * Carbon quirk, reproduced: it answers true even when the geometry is not
   * ready, and then leaves the bounds untouched (cpp:130).
   *
   * @adapted asks through GetGeometryResource, which renews or reacquires the geometry link.
   * @param {vec3} minBounds Receives the minimum corner.
   * @param {vec3} maxBounds Receives the maximum corner.
   * @returns {boolean} Always true.
   */
  GetWorldBoundingBox(minBounds, maxBounds)
  {
    const geometry = this.GetGeometryResource();
    if (geometry && geometry.IsGood(this))
    {
      vec3.copy(minBounds, this._worldBoundingBox.min);
      vec3.copy(maxBounds, this._worldBoundingBox.max);
      return true;
    }
    return true;
  }

  /**
   * Carbon GetWorldTransform (cpp:133-136).
   *
   * @implemented
   * @returns {mat4} The piece's transform.
   */
  GetWorldTransform()
  {
    return this._transform;
  }

  /**
   * Carbon GetTransform (Tr2InteriorStatic.h).
   *
   * @implemented
   * @returns {mat4} The piece's transform.
   */
  GetTransform()
  {
    return this._transform;
  }

  /**
   * Carbon Initialize (cpp:139-153): the transform from `rotation` and
   * `worldPosition`, then the geometry.
   *
   * @adapted it also puts in each mesh area the Tr2Effect its
   *   Tr2ShaderMaterial becomes, and drops the material, so the areas hold
   *   Tr2Effects as current Carbon's do (`trinity/trinity/Tr2MeshArea.h:77`).
   *   Carbon bound the material's own low-level shader instead (`BindLowLevelShaders`).
   * @returns {boolean} true.
   */
  Initialize()
  {
    mat4.fromRotationTranslation(this._transform, this.rotation, this.worldPosition);
    this.InitializeGeometryResource();
    this._ConvertMaterials();
    this._isDirty = true;
    return true;
  }

  /**
   * Replaces each area's Tr2ShaderMaterial with the Tr2Effect it becomes.
   *
   * @cjs the conversion Initialize adds; Carbon has no such step.
   * @returns {void}
   */
  _ConvertMaterials()
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
  }

  /**
   * Carbon OnModified (cpp:156-185): a moved piece rebuilds its transform and
   * world box, and its cell's box; a new geometry path loads.
   *
   * @implemented
   * @param {string} name The changed member.
   * @returns {boolean} true.
   */
  OnModified(name)
  {
    if (IsMatch(name, "worldPosition") || IsMatch(name, "rotation"))
    {
      mat4.fromRotationTranslation(this._transform, this.rotation, this.worldPosition);
      this.GetBoundingBox(this._worldBoundingBox.min, this._worldBoundingBox.max);
      Tr2InteriorStatic._TransformBox(this._worldBoundingBox.min, this._worldBoundingBox.max, this._transform);
      this._isDirty = true;
      if (this._parentCell) this._parentCell.RebuildBoundingBox();
    }
    else if (IsMatch(name, "geometryResPath"))
    {
      this.InitializeGeometryResource();
    }
    return true;
  }

  /**
   * Carbon Update (cpp:188-194): the curve sets.
   *
   * @implemented
   * @param {number} time Blue time in ticks.
   * @returns {void}
   */
  Update(time)
  {
    for (let i = 0; i < this.curveSets.length; i++) this.curveSets[i].Update(CcpTime.timeAsDouble(time));
  }

  /**
   * Carbon BindLowLevelShaders (cpp:202-223): binds every area of every detail
   * mesh under the parent cell's variable store, or under the global store when
   * the piece has no cell. Each area's Tr2Effect takes the store and rebuilds,
   * as Carbon's Tr2Mesh::BindAreaShaders does for an area holding a Tr2Effect
   * (`Tr2Mesh.cpp:191-245` at trinity a198e5da~1).
   *
   * @adapted Carbon passed the situation StaticObject, Interior and
   *   EnlightenDirectionalIrradiance to Tr2Mesh::BindLowLevelShaders, which chose
   *   each Tr2ShaderMaterial's low-level shader from it. Our areas hold
   *   Tr2Effects (see Initialize) and situation selection is not ported, so only
   *   the store binds. Current Tr2Mesh has no BindLowLevelShaders, so the piece
   *   walks its areas itself, and binds whether or not a mesh's geometry has
   *   loaded: the store needs none of it.
   * @returns {void}
   */
  @be.mapMethodAndWrap()
  BindLowLevelShaders()
  {
    const variableStore = this._parentCell ? this._parentCell.GetVariableStore() : null;
    for (const mesh of this.detailMeshes)
    {
      for (let areaType = 0; areaType < TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES; areaType++)
      {
        for (const area of mesh.GetAreas(areaType) ?? [])
        {
          const effect = CjsSchema.cast(area.GetMaterialInterface(), Tr2Effect);
          if (!effect) continue;
          effect.SetVariableStore(variableStore);
          effect.RebuildCachedData();
        }
      }
    }
  }

  /**
   * Carbon GetPerObjectDataWithLightSet (cpp:239-289): the transposed world
   * matrix and the light-map UV placement for the vertex stage, the lights for
   * the pixel stage, both zeroed first. Under VM_EN_ONLY or VM_ALL_LIGHTING the
   * piece is marked as the first shadow caster (cpp:277-280).
   *
   * @adapted current Carbon's Tr2InteriorPerObjectPSData has no
   *   mirrorToWorldMatrix (`Interior/Tr2InteriorConstantBufferFormats.h:36-47`),
   *   so the mirror matrix is not written; the piece still keeps its inverse
   *   transpose for the transparent depth, as Carbon does (cpp:286).
   * @param {object} accumulator The batch accumulator that leases the data.
   * @param {object|null} lightSet The Tr2InteriorLightSet lighting the piece, or null.
   * @param {mat4} objectToWorldMatrix The piece's transform.
   * @param {mat4} mirrorToWorldMatrix The mirror matrix; identity outside a mirror pass.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  GetPerObjectDataWithLightSet(accumulator, lightSet, objectToWorldMatrix, mirrorToWorldMatrix)
  {
    const data = Tr2PerObjectDataStandard.alloc(accumulator, "Tr2InteriorPerObjectVSData", "Tr2InteriorPerObjectPSData");
    data.vs.GetData().fill(0);
    data.ps.GetData().fill(0);

    data.vs.SetAndTranspose("WorldMat", objectToWorldMatrix);
    data.vs.Set("uvLinearTransform", this.uvLinearTransform);
    data.vs.Set("uvTranslation", this.uvTranslation);
    if (lightSet) lightSet.PopulateLightData(data.ps);
    if (this._visualizeMethod === VisualizeMethod.VM_EN_ONLY || this._visualizeMethod === VisualizeMethod.VM_ALL_LIGHTING)
    {
      data.ps.Set("shadowCaster0", Tr2InteriorStatic.SHADOW_CASTER_MARK);
    }

    const { mat4_0 } = Tr2InteriorStatic.scratch;
    mat4.invert(this._mirrorToWorldMatrix, mat4.transpose(mat4_0, mirrorToWorldMatrix));
    return data;
  }

  /** The shadowCaster0 a visualized piece writes (cpp:279). */
  static SHADOW_CASTER_MARK = vec4.fromValues(0, 1, 0, 1);

  /**
   * Carbon GetPerObjectData (cpp:292-299): no lights, the piece's transform and
   * an identity mirror.
   *
   * @implemented
   * @param {object} accumulator The batch accumulator that leases the data.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  GetPerObjectData(accumulator)
  {
    return this.GetPerObjectDataWithLightSet(accumulator, null, this.GetWorldTransform(), Tr2InteriorStatic.scratch.identity);
  }

  /**
   * Carbon GetPerObjectDataWithPerInstanceLighting (cpp:483-493).
   *
   * @adapted current Carbon's ITr2Interior passes no mirror matrix
   *   (`trinity/trinity/Include/ITr2Interior.h`), so the mirror is identity.
   * @param {object} accumulator The batch accumulator that leases the data.
   * @param {object|null} lightSet The Tr2InteriorLightSet lighting the piece.
   * @param {mat4} objectToWorldMatrix The piece's transform.
   * @returns {Tr2PerObjectDataStandard} The leased data.
   */
  GetPerObjectDataWithPerInstanceLighting(accumulator, lightSet, objectToWorldMatrix)
  {
    return this.GetPerObjectDataWithLightSet(accumulator, lightSet, objectToWorldMatrix, Tr2InteriorStatic.scratch.identity);
  }

  /**
   * Carbon HasTransparentBatches (cpp:302-317).
   *
   * @implemented
   * @returns {boolean} Whether any mesh has transparent areas.
   */
  HasTransparentBatches()
  {
    for (const mesh of this.detailMeshes)
    {
      const areas = mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT);
      if (areas && areas.length) return true;
    }
    return false;
  }

  /**
   * Carbon GetBatches (cpp:326-378): nothing when hidden; transparent areas
   * through GetTransparentBatches, each with its own depth; every other type
   * from each mesh's areas of that type.
   *
   * @adapted an opaque request also draws the meshes' `opaquePrepassAreas`.
   *   Incarna's interior drew those in the forward gather after its light pass
   *   (`Interior/Tr2InteriorScene.cpp:3039-3048`, trinity 71329945~1); current
   *   Carbon's Tr2InteriorScene asks only for opaque, decal and transparent
   *   batches, and the walkway kits hold their opaque geometry nowhere else.
   * @param {object} batches The batch accumulator.
   * @param {number} batchType A TriBatchType.
   * @param {object} perObjectData This piece's per-object data.
   * @param {number} [_reason] The render reason; unused, as in Carbon.
   * @returns {void}
   */
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (!this.display) return;

    if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      for (const mesh of this.detailMeshes) this.GetTransparentBatches(batches, mesh, perObjectData);
      return;
    }

    for (const mesh of this.detailMeshes)
    {
      this._GetMeshBatches(batches, mesh, mesh.GetAreas(batchType), perObjectData, null);
      if (batchType === TriBatchType.TRIBATCHTYPE_OPAQUE)
      {
        this._GetMeshBatches(batches, mesh, mesh.GetAreas(TriBatchType.TRIBATCHTYPE_OPAQUE_PREPASS), perObjectData, null);
      }
    }
  }

  /**
   * Carbon GetTransparentBatches (cpp:602-659): each displayed area with a
   * material gets a batch whose depth is its area box's centre, through the
   * transform and the stored mirror matrix, its distance from the eye plus
   * `depthOffset` over the frustum radius.
   *
   * @implemented
   * @param {object} batches The batch accumulator.
   * @param {object} mesh The Tr2Mesh.
   * @param {object} perObjectData This piece's per-object data.
   * @returns {void}
   */
  GetTransparentBatches(batches, mesh, perObjectData)
  {
    if (!mesh.GetDisplay()) return;
    const areas = mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT);
    if (!areas || !areas.length) return;
    this._GetMeshBatches(batches, mesh, areas, perObjectData, area => this._TransparentDepth(mesh, area));
  }

  /**
   * One batch per displayed area with a material, in the mesh's first LOD.
   *
   * @cjs stands in for Tr2Mesh::GetBatches and the batch building in
   *   GetTransparentBatches: the LOD's buffers are allocated here, before the
   *   batches are made, as the other interior objects do.
   * @param {object} batches The batch accumulator.
   * @param {object} mesh The Tr2Mesh.
   * @param {object[]|null} areas The areas to draw.
   * @param {object} perObjectData This piece's per-object data.
   * @param {((area: object) => number)|null} depthOf Each batch's depth, or null for 0.
   * @returns {void}
   */
  _GetMeshBatches(batches, mesh, areas, perObjectData, depthOf)
  {
    if (!areas || !areas.length || !mesh.GetDisplay()) return;

    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    const meshIndex = mesh.GetMeshIndex();
    if (meshIndex < 0 || meshIndex >= geometry.GetMeshCount()) return;
    const lod = geometry.GetMeshLod__LodIndex(meshIndex, 0);
    if (!lod || !CreateLodAllocations(geometry, meshIndex, lod, Tr2RenderContext_GetMainThreadRenderContext())) return;

    for (const area of areas)
    {
      if (!area.GetDisplay() || !area.GetMaterialInterface()) continue;
      const batch = mesh.CreateGeometryBatch(geometry, area, perObjectData, false, lod);
      if (!batch) continue;
      batch.depth = depthOf ? depthOf(area) : 0;
      batches.Commit(batch);
    }
  }

  /**
   * A transparent area's depth key (cpp:630-638): its box's centre through
   * `transform * mirrorToWorld`, its distance from the eye plus `depthOffset`
   * over the frustum radius, clamped to [0, 1], then 0xFFFFFFF * (1 - z).
   *
   * @implemented
   * @param {object} mesh The Tr2Mesh.
   * @param {object} area The Tr2MeshArea.
   * @returns {number} The unsigned depth key.
   */
  _TransparentDepth(mesh, area)
  {
    const { vec3_0, vec3_1, vec3_2, mat4_0 } = Tr2InteriorStatic.scratch;
    const geometry = mesh.GetGeometryResource();
    if (!geometry.GetAreaBoundingBox(mesh.GetMeshIndex(), area.GetIndex(), vec3_0, vec3_1))
    {
      vec3.zero(vec3_0);
      vec3.zero(vec3_1);
    }
    // Carbon's row-vector m_transform * m_mirrorToWorldMatrix; gl-matrix's operands reverse.
    mat4.multiply(mat4_0, this._mirrorToWorldMatrix, this._transform);
    vec3.add(vec3_2, vec3_0, vec3_1);
    vec3.scale(vec3_2, vec3_2, 0.5);
    vec3.transformMat4(vec3_2, vec3_2, mat4_0);
    vec3.subtract(vec3_2, vec3_2, Tr2Renderer.GetViewPosition());
    const f32 = Math.fround;
    const z = Math.min(Math.max(f32(f32(f32(vec3.length(vec3_2)) + this.depthOffset) / Tr2Renderer.GetFrustumRadius()), 0), 1);
    return f32(f32(0xfffffff) * f32(1 - z)) >>> 0;
  }

  /**
   * Carbon GetSortValue (cpp:380-395): the eye's distance to the centre of the
   * local box's two corners through the transform.
   *
   * @implemented
   * @returns {number} The distance.
   */
  GetSortValue()
  {
    const { vec3_0, vec3_1 } = Tr2InteriorStatic.scratch;
    vec3.zero(vec3_0);
    vec3.zero(vec3_1);
    this.GetBoundingBox(vec3_0, vec3_1);
    vec3.transformMat4(vec3_0, vec3_0, this._transform);
    vec3.transformMat4(vec3_1, vec3_1, this._transform);
    vec3.add(vec3_0, vec3_0, vec3_1);
    vec3.scale(vec3_0, vec3_0, 0.5);
    return vec3.distance(Tr2Renderer.GetViewPosition(), vec3_0);
  }

  /**
   * Carbon IsInFrustum (cpp:399-407): false until the geometry is good; writes
   * the transform and tests the world box.
   *
   * @adapted asks through GetGeometryResource, so the scene's per-frame culling
   *   is what keeps the piece's geometry link alive.
   * @param {object} frustum The TriFrustum.
   * @param {mat4} objectToWorld Receives the piece's transform.
   * @returns {boolean} Whether the piece is visible.
   */
  IsInFrustum(frustum, objectToWorld)
  {
    const geometry = this.GetGeometryResource();
    if (!geometry || !geometry.IsGood(this)) return false;
    mat4.copy(objectToWorld, this._transform);
    return frustum.IsBoxVisible__BoundsMinMax(this._worldBoundingBox.min, this._worldBoundingBox.max);
  }

  /**
   * Carbon AddToCell (cpp:410-438): grows the parent cell's box by the piece's.
   *
   * @adapted asks through GetGeometryResource, which renews or reacquires the geometry link.
   * @returns {number} A CullResult.
   */
  AddToCell()
  {
    const geometry = this.GetGeometryResource();
    if (!geometry) return CullResult.CULLRES_FAILED;
    if (geometry.IsLoading()) return CullResult.CULLRES_NOTREADY;

    const { vec3_0, vec3_1 } = Tr2InteriorStatic.scratch;
    if (!this.GetBoundingBox(vec3_0, vec3_1)) return CullResult.CULLRES_FAILED;
    if (this._parentCell)
    {
      Tr2InteriorStatic._TransformBox(vec3_0, vec3_1, this._transform);
      this._parentCell.UpdateBoundingBox__Bounds(vec3_0, vec3_1);
    }
    return CullResult.CULLRES_OK;
  }

  /**
   * Carbon RemoveFromCell (cpp:441-444).
   *
   * @implemented
   * @returns {void}
   */
  RemoveFromCell()
  {
    this._parentCell = null;
  }

  /**
   * Carbon SetParentCell (cpp:447-460): joining a cell grows its box and binds
   * the shaders under its store.
   *
   * @implemented
   * @param {object|null} parentCell The Tr2InteriorCell, or null.
   * @returns {void}
   */
  SetParentCell(parentCell)
  {
    this._parentCell = parentCell ?? null;
    if (this._parentCell)
    {
      this.AddToCell();
      this.BindLowLevelShaders();
    }
    else
    {
      this.RemoveFromCell();
    }
  }

  /**
   * The Tr2InteriorCell holding the piece, or null.
   *
   * @cjs Carbon reads m_parentCell directly; tests and the scene ask through this.
   * @returns {object|null} The cell.
   */
  GetParentCell()
  {
    return this._parentCell;
  }

  /**
   * Carbon SetVisualizeMethod (cpp:463-466).
   *
   * @implemented
   * @param {number} method A VisualizeMethod.
   * @returns {void}
   */
  SetVisualizeMethod(method)
  {
    this._visualizeMethod = method;
  }

  /**
   * Carbon GetGeometryResource (cpp:496-504).
   *
   * @adapted the resource manager expires a holder's link when the holder stops
   *   using the resource, and RemoveCachedData then drops `geometry`. As
   *   Tr2Mesh.GetGeometryResource does, an expired geometry is reacquired from
   *   `geometryResPath` here, on use; Carbon's reference-counted pointer never
   *   expires.
   * @returns {object|null} The TriGeometryRes.
   */
  GetGeometryResource()
  {
    if (!this.geometry && this.geometryResPath) this.InitializeGeometryResource();
    return this.geometry;
  }

  /**
   * Carbon GetGeometryResourcePath (cpp:506-509).
   *
   * @implemented
   * @returns {string} The geometry path.
   */
  GetGeometryResourcePath()
  {
    return this.geometryResPath;
  }

  /**
   * Carbon IsDirty (cpp:518-521).
   *
   * @implemented
   * @returns {boolean} Whether the piece moved or changed since the flag was reset.
   */
  IsDirty()
  {
    return this._isDirty;
  }

  /**
   * Carbon ResetDirtyFlag (cpp:527-530).
   *
   * @implemented
   * @returns {void}
   */
  ResetDirtyFlag()
  {
    this._isDirty = false;
  }

  /**
   * Carbon InitializeGeometryResource (cpp:547-560): the geometry for
   * `geometryResPath`, notifying the piece.
   *
   * @adapted Carbon marks the resource immutable as it is created (cpp:536-545);
   *   our TriGeometryRes has no immutable flag. Notification links belong to the
   *   resource manager, as for every holder here.
   * @returns {void}
   */
  InitializeGeometryResource()
  {
    if (this.geometry) blue.resMan.notify.Remove(this, this.geometry);
    this.geometry = null;
    if (this.geometryResPath)
    {
      this.geometry = blue.resMan.GetResource(this.geometryResPath);
      if (this.geometry) blue.resMan.notify.Add(this, this.geometry, this, "geometry");
    }
  }

  /**
   * Carbon ReleaseCachedData (cpp:562-571): the parent cell rebuilds its box.
   *
   * @implemented
   * @param {object} resource The resource releasing its data.
   * @returns {void}
   */
  ReleaseCachedData(resource)
  {
    if (resource === this.geometry && this._parentCell) this._parentCell.RebuildBoundingBox();
  }

  /**
   * Carbon RebuildCachedData (cpp:573-588): once the geometry is good, the
   * piece grows its cell's box and binds; either way it rebuilds its world box.
   *
   * @implemented
   * @param {object} resource The resource that finished.
   * @returns {void}
   */
  RebuildCachedData(resource)
  {
    if (resource !== this.geometry) return;
    if (resource.IsGood() && this._parentCell)
    {
      this.AddToCell();
      this.BindLowLevelShaders();
    }
    this.GetBoundingBox(this._worldBoundingBox.min, this._worldBoundingBox.max);
    Tr2InteriorStatic._TransformBox(this._worldBoundingBox.min, this._worldBoundingBox.max, this._transform);
  }

  /**
   * Lets go of an expired geometry.
   *
   * @cjs Carbon never expires a resource. The resource manager calls this when
   *   the link expires; the piece reloads from geometryResPath on its next
   *   InitializeGeometryResource.
   * @param {object} resource The expired resource.
   * @returns {void}
   */
  RemoveCachedData(resource)
  {
    this.ReleaseCachedData(resource);
    if (this.geometry === resource) this.geometry = null;
    blue.resMan.notify.Remove(this, resource);
  }

  /**
   * Detaches the parent cell and removes the geometry notification link.
   * Carbon: Trinity 24d033fa~1, Interior/Tr2InteriorStatic.cpp:47-56.
   * @adapted Manager-owned links replace Carbon's per-resource notify targets.
   * @adapted JavaScript has no reference count to Unlock; IRoot.Unlock is unsupported.
   * @returns {void}
   * @adapted Preserves existing explicit Destruct fences and owned-slot clearing after native cleanup.
   */
  _Destructor()
  {
    this.RemoveFromCell();
    if (this.geometry) blue.resMan.notify.Remove(this, this.geometry);
    this.geometry = null;
  }

  /**
   * Carbon GetID (Tr2InteriorStatic.h:63): the piece itself.
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
   * Carbon GetPickingBatches (cpp:661-676).
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

  /**
   * Carbon PyGetBoundingBoxInLocalSpace (_Blue.cpp): the local box, or nothing
   * when it is not known.
   *
   * @adapted Python's tuple pair is an array pair, and its NULL return is null.
   * @returns {Array<vec3>|null} [min, max], or null.
   */
  @be.mapMethod()
  GetBoundingBoxInLocalSpace()
  {
    const min = vec3.create(), max = vec3.create();
    return this.GetBoundingBox(min, max) ? [ min, max ] : null;
  }

  /**
   * Carbon PyGetBoundingBoxInWorldSpace (_Blue.cpp): the world box.
   *
   * @adapted Python's tuple pair is an array pair. GetWorldBoundingBox always
   *   answers true, so before the geometry is ready this returns zeros, as
   *   Carbon's untouched (0, 0, 0) pair does.
   * @returns {Array<vec3>} [min, max].
   */
  @be.mapMethod()
  GetBoundingBoxInWorldSpace()
  {
    const min = vec3.create(), max = vec3.create();
    this.GetWorldBoundingBox(min, max);
    return [ min, max ];
  }


  /**
   * AxisAlignedBoundingBox::Transform and BoundingBoxTransform: the box of the
   * eight corners through a matrix, written back in place.
   *
   * @cjs Carbon's free helpers have no home of their own here.
   * @param {vec3} min The minimum corner, transformed in place.
   * @param {vec3} max The maximum corner, transformed in place.
   * @param {mat4} matrix The transform.
   * @returns {void}
   */
  static _TransformBox(min, max, matrix)
  {
    const corner = vec3.create();
    const lo = vec3.fromValues(Infinity, Infinity, Infinity), hi = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < 8; i++)
    {
      vec3.set(corner, i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]);
      vec3.transformMat4(corner, corner, matrix);
      vec3.min(lo, lo, corner);
      vec3.max(hi, hi, corner);
    }
    vec3.copy(min, lo);
    vec3.copy(max, hi);
  }

}
CjsSchema.be.interface()(Tr2InteriorStatic, { kind: "class" });
