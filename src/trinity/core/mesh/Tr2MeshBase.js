// Source: trinity/trinity/Tr2MeshBase.h
// Source: trinity/trinity/Tr2MeshBase.cpp
// Source: trinity/trinity/Tr2MeshBase_Blue.cpp
import { Tr2MeshArea } from "./Tr2MeshArea.js";
import { BLUELISTEVENT } from "#consts/blue";
import { BlueList, IListNotify } from "#blue";
import { vec3 } from "#math/vec3";
import { CjsSchema, meta } from "#schema";
import { TriGeometryRes } from "#resource/geometry";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderBatch, TriRenderBatchAreaBlock, TriRenderBatchAreaBlocksWithSharedMaterial } from "../batch/TriRenderBatch/index.js";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { CarbonVertexElements } from "../vertex/vertexUsage.js";


/**
 * Base mesh: owns one mesh-area list per batch type and turns the displayed
 * areas into GPU-free render batches and shadow area blocks.
 */
@meta.define({ className: "Tr2MeshBase", family: "trinityCore" })
@meta.blue.inherit(IListNotify)
export class Tr2MeshBase
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.readwrite
  @meta.type.boolean
  display = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  meshIndex = 0;

  /** m_jointMappingAnimRig: for each of the mesh's joint bindings, its bone index in the bound rig. */
  _jointMappingAnimRig = null;

  /** m_pBoneList: the bone list the mesh was last bound to. */
  _boneList = null;

  /** m_renderRig: the skeleton the mesh was last bound against. */
  _renderRig = null;

  /** m_numBones */
  _numBones = 0;

  /** m_forcedRebind */
  _forcedRebind = false;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  opaqueAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  decalAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  depthAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  transparentAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  additiveAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  pickableAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  mirrorAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  decalNormalAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  depthNormalAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  opaquePrepassAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  decalPrepassAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  geometryEraserAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2MeshArea")
  distortionAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  // Carbon routes TRIBATCHTYPE_FLARE but does not expose this list to Blue, so
  // this list is typed without being read or persisted: the type declaration is
  // what makes its areas reachable to graph traversal, independent of edit.

  @meta.type.list("Tr2MeshArea")
  flareAreas = new BlueList(Tr2MeshArea, { className: "Tr2MeshArea" });

  @meta.blue.read
  @meta.blue.persist
  @meta.type.float32
  maxVertexScale = 1;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.float32
  maxVertexDisplacement = 0;

  @meta.blue.read
  @meta.blue.persist
  @meta.type.boolean
  rotatesVertices = false;

  /** Installs the twelve native area-list observers (Tr2MeshBase.cpp:31-42). */
  constructor()
  {
    for (const property of Tr2MeshBase._observedAreaProperties) this[property].SetNotify(this);
  }

  /** Whether this mesh participates in rendering. */
  @meta.blue.method
  @meta.implemented
  GetDisplay()
  {
    return this.display;
  }

  /** Index of this mesh inside its geometry resource. */
  @meta.blue.method
  @meta.implemented
  GetMeshIndex()
  {
    return this.meshIndex;
  }

  /**
   * Carbon Tr2MeshBase::FindJoint (Tr2MeshBase.cpp:120-133): the index of name in the first numBones of boneList.
   * @param {string[]|null} boneList
   * @param {number} numBones
   * @param {string|null} name
   * @returns {number} the index, or 0xffffffff when absent
   */
  @meta.implemented
  FindJoint(boneList, numBones, name)
  {
    if (boneList && name)
    {
      for (let ix = 0; ix < numBones; ++ix)
      {
        if (name === boneList[ix])
        {
          return ix;
        }
      }
    }
    return 0xffffffff;
  }

  /**
   * Carbon Tr2MeshBase::BindToRig (Tr2MeshBase.cpp:135-216): maps each of the mesh's joint bindings to its bone in
   * boneList; a joint the rig lacks falls back through its render-rig parents until one is found. Every area then
   * shares the mapping and its joint count.
   *
   * Adapted: renderRig is the decoded payload skeleton, { name, bones: [names], parents }, so Carbon's
   * renderRig->FindJoint and m_joints[i].m_parentJoint / m_name read bones.indexOf, parents[i] and bones[i]; the mesh's
   * m_jointBindings are the payload mesh's boneBindings. Carbon's CCP_LOGWARN on an unknown joint is not reproduced.
   * @param {string[]} boneList - the animation rig's bone names
   * @param {number} numBones
   * @param {object} renderRig - the geometry resource's skeleton
   * @param {boolean} [forceRebind]
   * @returns {boolean} false while the geometry is not prepared
   */
  @meta.adapted
  BindToRig(boneList, numBones, renderRig, forceRebind = false)
  {
    forceRebind ||= this._forcedRebind;
    this._forcedRebind = false;

    const geometry = this.GetGeometryResource();
    if (!geometry || !geometry.IsPrepared())
    {
      return false;
    }

    if (this._boneList === boneList && this._renderRig === renderRig && this._numBones === numBones && !forceRebind)
    {
      return true;
    }

    const meshData = geometry.GetMeshData(this.meshIndex);
    if (!meshData)
    {
      // resource is prepared but mesh doesn't exist, this can happen for ragdoll dummy boxshapes.
      // don't trigger continuous rebindings, return true.
      return true;
    }

    const bindings = meshData.boneBindings;
    const n = bindings.length;
    this._jointMappingAnimRig = new Uint32Array(n); // alloc: the binding table the areas share until the next bind

    for (let j = 0; j < n; ++j)
    {
      let name = bindings[j].name;

      this._jointMappingAnimRig[j] = this.FindJoint(boneList, numBones, name);

      while (this._jointMappingAnimRig[j] === 0xffffffff)
      {
        const renderIndex = renderRig.bones.indexOf(name);
        if (renderIndex === -1)
        {
          break;
        }
        const parentIndex = renderRig.parents[renderIndex];
        if (parentIndex === 0xffffffff)
        {
          break;
        }
        const parentName = renderRig.bones[parentIndex];
        this._jointMappingAnimRig[j] = this.FindJoint(boneList, numBones, parentName);
        name = parentName;
      }
    }

    for (const property of Tr2MeshBase._areaProperties)
    {
      for (const area of this[property])
      {
        area.SetJointMappingAnimRig(this._jointMappingAnimRig);
        area.SetJointCount(n);
      }
    }

    // set this so we only do this once!
    this._boneList = boneList;
    this._renderRig = renderRig;
    this._numBones = numBones;

    return true;
  }

  /**
   * Carbon Tr2MeshBase::GetBounds (Tr2MeshBase.cpp:218-282). With bone transforms, the box around every joint
   * binding's oriented box under its bone, grown by the weighted morph-target deformation; a mesh bound to a rig
   * (BindToRig) uses its own binding table in place of meshBindingIndices and boneCount ("for old character stuff").
   * Otherwise, and when no binding applies, the geometry's box. Both then take Carbon's AdjustBounds: the
   * material-driven local scale, displacement and vertex-rotation expansion.
   *
   * Adapted: Carbon returns its cached box; here the box is read from the geometry, and null when there is none.
   * Bone transforms are mat4s whose memory matches Carbon's row-vector Matrix, so rows 0-2 are elements 0-2, 4-6
   * and 8-10 and the translation is 12-14. The payload's boneBindings carry the joint OBB as bounds or
   * minBounds/maxBounds. Morph growth reads the LOD's morphTargetDeformationAmounts, which Carbon fills at load
   * (TriGeometryRes.cpp:2134, 2293) and our decoders do not yet produce.
   * @param {mat4[]|null} [boneTransforms]
   * @param {ArrayLike<number>|null} [meshBindingIndices] - each binding's index into boneTransforms
   * @param {number} [boneCount]
   * @param {{ index: number, weight: number }[]|null} [morphTargets]
   * @param {number} [morphTargetsCount]
   * @returns {{ min: vec3, max: vec3 }|null}
   */
  @meta.blue.method
  @meta.adapted
  GetBounds(boneTransforms = null, meshBindingIndices = null, boneCount = 0, morphTargets = null, morphTargetsCount = 0)
  {
    const geometry = this.GetGeometryResource();
    if (!geometry) return null;

    const min = vec3.create();
    const max = vec3.create();
    if (!(boneTransforms && this._GetSkinnedBounds(geometry, boneTransforms, meshBindingIndices, boneCount, morphTargets, morphTargetsCount, min, max)))
    {
      const source = geometry.GetBoundingBox(this.meshIndex);
      if (!source) return null;
      vec3.copy(min, source.min ?? source.minBounds);
      vec3.copy(max, source.max ?? source.maxBounds);
    }
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

  /**
   * The bone branch of Carbon's GetBounds (Tr2MeshBase.cpp:220-276), written into min and max.
   * @returns {boolean} false when the mesh has no binding data or no bones, so the caller falls back to the box
   */
  _GetSkinnedBounds(geometry, boneTransforms, meshBindingIndices, boneCount, morphTargets, morphTargetsCount, min, max)
  {
    const meshData = geometry.GetMeshData(this.meshIndex);

    if (this._jointMappingAnimRig && this._jointMappingAnimRig.length)
    {
      // for old character stuff
      boneCount = this._jointMappingAnimRig.length;
      meshBindingIndices = this._jointMappingAnimRig;
    }

    if (!meshData || boneCount <= 0)
    {
      return false;
    }

    vec3.set(min, Infinity, Infinity, Infinity);
    vec3.set(max, -Infinity, -Infinity, -Infinity);
    for (let i = 0; i < boneCount; ++i)
    {
      const joint = TriGeometryRes.getBounds(meshData.boneBindings[i]);
      const m = boneTransforms[meshBindingIndices[i]];
      for (let axis = 0; axis < 3; ++axis)
      {
        // Row r of Carbon's Matrix is elements 4r..4r+2; the translation is 12..14.
        let low = m[12 + axis];
        let high = m[12 + axis];
        for (let row = 0; row < 3; ++row)
        {
          const fromMin = m[4 * row + axis] * joint.min[row];
          const fromMax = m[4 * row + axis] * joint.max[row];
          low += Math.min(fromMin, fromMax);
          high += Math.max(fromMin, fromMax);
        }
        min[axis] = Math.min(min[axis], low);
        max[axis] = Math.max(max[axis], high);
      }
    }

    let morphDeformation = 0;
    if (morphTargetsCount)
    {
      const lod = geometry.GetMeshLod_LodIndex(this.meshIndex, 0);
      for (let i = 0; i < morphTargetsCount; i++)
      {
        const morph = morphTargets[i];
        morphDeformation += lod.morphTargetDeformationAmounts[morph.index] * morph.weight;
      }
    }
    min[0] -= morphDeformation; min[1] -= morphDeformation; min[2] -= morphDeformation;
    max[0] += morphDeformation; max[1] += morphDeformation; max[2] += morphDeformation;
    return true;
  }

  /** Writes the adjusted mesh bounds into caller-owned minimum and maximum vectors. */
  @meta.blue.method
  @meta.implemented
  GetBoundingBox(min, max)
  {
    const bounds = this.GetBounds();
    if (!bounds) return false;
    vec3.copy(min, bounds.min);
    vec3.copy(max, bounds.max);
    return true;
  }

  /**
   * The geometry this mesh draws from.
   *
   * PURE VIRTUAL IN CARBON (`Tr2MeshBase.h:69`), and missing from this base
   * until 2026-09-05 - only `Tr2Mesh` declared it. Every caller therefore
   * wrote `mesh?.GetGeometryResource()`, hedging against a base that had the
   * method in Carbon and not here. A mesh with no geometry to name is not a
   * mesh, so this throws rather than returning null: returning null would let
   * a subclass that forgot it draw nothing, silently.
   *
   * @returns {object} The geometry resource.
   */
  @meta.blue.method
  @meta.abstract
  GetGeometryResource()
  {
    throw new Error("Tr2MeshBase.GetGeometryResource must be implemented by a mesh.");
  }

  /**
   * The live area list for a TriBatchType, or null for a non-integer or unmapped
   * type.
   */
  @meta.blue.method
  @meta.implemented
  GetAreas(areaType)
  {
    if (!Number.isInteger(areaType)) return null;
    const property = Tr2MeshBase._areaProperties[areaType];
    return property ? this[property] : null;
  }

  /**
   * Carbon OnListModified (Tr2MeshBase.cpp:76-118), one behaviour across all
   * twelve area lists it installs itself on (cpp:31-42): an area records the mesh
   * that took it, and forgets it when removed. LOADFINISHED and UNLOADSTART do
   * the same for every area at once, which is what a read and a teardown
   * produce.
   */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    // Which list, not merely whether it is one: a mesh has other array fields,
    // and Carbon reaches this only from the twelve it installed itself on
    // (cpp:31-42).
    if (!this._IsAreaList(list)) return;

    // Carbon's arms are guarded by BlueCastPtr to Tr2MeshAreaPtr - a real cast,
    // so a non-area entry is skipped rather than assumed to answer.
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        CjsSchema.cast(value, Tr2MeshArea)?.AddOwnerMesh(this);
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        CjsSchema.cast(value, Tr2MeshArea)?.RemoveOwnerMesh(this);
        break;
      case BLUELISTEVENT.BELIST_LOADFINISHED:
        for (const area of list) CjsSchema.cast(area, Tr2MeshArea)?.AddOwnerMesh(this);
        break;
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const area of list) CjsSchema.cast(area, Tr2MeshArea)?.RemoveOwnerMesh(this);
        break;
      default:
        break;
    }
  }

  /** Whether a list is one of the twelve area lists this mesh observes. */
  _IsAreaList(list)
  {
    if (!Array.isArray(list)) return false;
    return Tr2MeshBase._observedAreaProperties.some(property => this[property] === list);
  }

  /**
   * Appends an area to the list for a batch type; returns false when that type
   * has no list. The area's record of this mesh is the INSERTED arm's.
   */
  @meta.blue.method
  @meta.implemented
  AddArea(areaType, area)
  {
    const property = Number.isInteger(areaType) ? Tr2MeshBase._areaProperties[areaType] : null;
    if (!property) return false;
    return this[property].Append(area);
  }

  /**
   * Removes an area from the list for a batch type; the area forgets this mesh
   * in the REMOVED arm.
   */
  @meta.blue.method
  @meta.implemented
  RemoveArea(areaType, area)
  {
    const property = Number.isInteger(areaType) ? Tr2MeshBase._areaProperties[areaType] : null;
    if (!property) return false;
    const key = this[property].FindKey(area);
    return key >= 0 && this[property].Remove(key);
  }

  /**
   * Every area of every batch type, in batch-type order, as one newly allocated
   * array.
   */
  @meta.blue.method
  @meta.implemented
  GetAllAreas()
  {
    return Tr2MeshBase._areaProperties.flatMap(property => this[property]);
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
  @meta.blue.method
  @meta.implemented
  UseWithScreenSize(screenSize, worldRadius)
  {
    const geometry = this.GetGeometryResource();
    if (!geometry) return false;

    const lod = geometry.GetMeshLod_ScreenSize(this.meshIndex, screenSize);
    if (!lod) return false;

    // Carbon reads m_uvDensities off the resolved LOD; a resource that exposes
    // none yields an empty list, which the material treats as "no LOD data" and
    // requests the full resolution.
    const uvDensities = lod.uvDensities ?? lod.m_uvDensities ?? [];
    let reported = false;

    for (const area of this.GetAllAreas())
    {
      // Carbon: area && area->GetMaterialInterface() (Tr2MeshBase.cpp:590), then UsedWithScreenSize on the material.
      const material = area ? area.GetMaterialInterface() : null;
      if (!material) continue;

      material.UsedWithScreenSize(screenSize, worldRadius, uvDensities);
      reported = true;
    }

    return reported;
  }

  /**
   * Sets a shader option on every area effect that supports it; returns whether
   * at least one area was updated.
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
  @meta.adapted
  SetMaterialBoundsAdjustment(value)
  {
    const source = value || {};
    this.maxVertexScale = Number(source.maxLocalScale) || 0;
    this.maxVertexDisplacement = Number(source.maxLocalDisplacement) || 0;
    this.rotatesVertices = !!source.rotatesVertices;
    return true;
  }

  /** Empty at this level; Tr2Mesh overrides it with the real geometry path. */
  @meta.blue.method
  @meta.adapted
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
   *
   * Adapted: Emits descriptor batches; resolving geometry buffers and final draw args at dispatch is not ported yet.
   */
  @meta.blue.method
  @meta.adapted
  GetBatches(accumulator, areas, perObjectData, screenSize = Infinity, reverseWinding = false)
  {
    if (this.display === false) return false;

    const areaList = Array.isArray(areas) ? areas : this.GetAreas(areas);
    if (!areaList) return false;

    let committed = false;
    const geometry = this.GetGeometryResource() ?? null;

    // Carbon resolves the LOD once for the whole area list from the caller's
    // screen size (Tr2MeshBase.cpp:381) and passes it to every area. A resource
    // that cannot select a LOD yet yields null, and the batch then carries its
    // geometry-source descriptor with no draw arguments.
    const lod = geometry ? geometry.GetMeshLod_ScreenSize(this.meshIndex, screenSize) : null;

    for (const area of areaList)
    {
      const batch = this.CreateGeometryBatch(geometry, area, perObjectData, reverseWinding, lod);
      if (batch) committed = accumulator.Commit(batch) || committed;
    }
    return committed;
  }

  // Builds a single GPU-free batch for one mesh area: the area's effect is the
  // material/shader key, and the geometry + area range are recorded as a source
  // descriptor though the draw itself is not ported yet. Returns null for a hidden or
  // material-less area (Carbon returns an invalid batch in those cases).

  /**
   * Builds one GPU-free batch for a mesh area, using the area's effect as
   * material and shader key and recording geometry plus area range as a source
   * descriptor; returns null for a hidden or material-less area, where Carbon
   * returns an invalid batch.
   *
   * Adapted: Emits a geometry source descriptor; creating the Tr2BufferAL allocations Carbon makes here is not ported
   * yet.
   */
  @meta.blue.method
  @meta.adapted
  CreateGeometryBatch(geometry, area, perObjectData, reverseWinding = false, lod = null)
  {
    if (!area || area.GetDisplay() === false) return null;

    const effect = area.GetMaterialInterface();
    if (!effect) return null;
    // Ours: asking renews the effect's resources and re-registers it while its
    // resource is pending (Tr2Effect.IsGood). Carbon reaches the same skip
    // through the batch's null shader below. One area whose effect is not good
    // is skipped; the mesh's other areas still draw.
    if (!effect.IsGood()) return null;

    const batch = new Tr2RenderBatch();
    batch.SetMaterial(effect);
    if (!batch.IsValid()) return null;

    // Carbon XORs the area's authored winding with the caller's request
    // (Tr2MeshBase.cpp:373); it is not a property of the area alone. The
    // EveSpaceObject2 path always passes false, but EveChildMesh and the
    // reflection reason pass a live value.
    const reversed = area.GetReversed() !== reverseWinding;

    batch.SetGeometrySource(geometry, this.meshIndex, area.GetIndex(), area.GetCount(), reversed, lod);

    // Carbon binds lod->m_mesh->m_vertexDeclarationHandle onto the batch
    // (Tr2MeshBase.cpp:371). The handle is what binning and sorting compare, so
    // leaving it zero makes every mesh look like one declaration.
    const elements = geometry ? geometry.GetMeshVertexElements(this.meshIndex) : null;

    // The geometry layer hands back the PRODUCER's vocabulary - a CMF decl names
    // its usages - and a shader input carries Carbon's numeric UsageCode. The
    // two numberings collide rather than merely differ, so this translates
    // before interning: an untranslated decl interns to a handle that no shader
    // input can ever match, and the AL's `findInputElement` fails silently for
    // every mesh.
    const carbonElements = CarbonVertexElements(elements);

    if (carbonElements.length)
    {
      batch.SetVertexDeclaration(Tr2EffectStateManager.getVertexDeclarationHandle(carbonElements));
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
    batch.SetPickingData_MeshArea(this.meshIndex, area.GetIndex());
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
  @meta.blue.method
  @meta.implemented
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
   *
   * Adapted: Material grouping uses reference identity in place of Carbon's effect hash values.
   */
  @meta.blue.method
  @meta.adapted
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

  static _observedAreaProperties = Object.freeze([
    "opaqueAreas", "decalAreas", "depthAreas", "transparentAreas", "additiveAreas",
    "pickableAreas", "mirrorAreas", "depthNormalAreas", "opaquePrepassAreas",
    "decalPrepassAreas", "geometryEraserAreas", "distortionAreas"
  ]);

  static _areaProperties = Object.freeze([
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

meta.blue.interfaceTable({ interfaces: [], chainTo: null })(Tr2MeshBase, { kind: "class" });
