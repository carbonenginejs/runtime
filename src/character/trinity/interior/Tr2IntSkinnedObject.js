import { exposure as be } from "#be";
import { IBluePlacementObserver } from "#blue/IBluePlacementObserver";
import { ITr2Interior } from "./ITr2Interior.js";
import { ITr2InteriorDynamic } from "./ITr2InteriorDynamic.js";
import { ITr2Pickable } from "../../../trinity/core/ITr2Pickable.js";
import { ITr2BoundingBox } from "#interfaces/ITr2BoundingBox";
// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { meta, type, blue } from "#schema";
import { IInitialize, INotify } from "#blue";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";
import { Tr2PerObjectDataSkinned, TR2_MAX_BONES_PER_MESHAREA } from "../trinityCore/Tr2PerObjectDataSkinned.js";
import { Tr2PerAreaDataSkinned } from "../trinityCore/Tr2PerAreaDataSkinned.js";
import { Tr2Renderer } from "../../../trinity/core/Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { CreateLodAllocations } from "../../../trinity/core/mesh/TriGeometryResAllocations.js";
import { Tr2VariableStore } from "../../../trinity/core/variable/Tr2VariableStore.js";
import { TriVariableContentType } from "../../../trinity/generated/trinityCore/enums.js";
import { Tr2InteriorLightSet } from "./Tr2InteriorLightSet.js";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { TriBatchType } from "#consts/graphics";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";

/** Carbon's 3.14159265f literal in UpdatePlacement (Tr2IntSkinnedObject.cpp:475-479), as a float. */
const PI_F = Math.fround(3.14159265);

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@be.define("Tr2IntSkinnedObject")
@be.inherit(IInitialize, INotify, ITr2InteriorDynamic, ITr2Pickable, ITr2BoundingBox, IBluePlacementObserver)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.mapInterface(ITr2Interior)
@be.mapInterface(ITr2InteriorDynamic)
@be.mapInterface(ITr2Pickable)
@be.mapInterface(ITr2BoundingBox)
@be.mapInterface(IBluePlacementObserver)
@be.exposureChainTo(Tr2SkinnedObject)
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

  /** m_boundingSphere[3] (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2VariableStore")
  variableStore = null;

  /**
   * m_currentPosition (Vector3): the last position SetPosition applied (Tr2IntSkinnedObject.h:116).
   *
   * @implemented
   */
  @meta.implemented
  _currentPosition = vec3.fromValues(0, 0, 0);

  /**
   * m_currentScaling (Vector3): the last scaling SetScaling applied (Tr2IntSkinnedObject.h:117).
   *
   * @implemented
   */
  @meta.implemented
  _currentScaling = vec3.fromValues(1, 1, 1);

  /**
   * m_currentRotation (Quaternion): the last rotation SetRotation applied (Tr2IntSkinnedObject.h:118).
   *
   * @implemented
   */
  @meta.implemented
  _currentRotation = quat.fromValues(0, 0, 0, 1);

  /**
   * m_positionSet (bool) (Tr2IntSkinnedObject.h:119).
   *
   * @implemented
   */
  @meta.implemented
  _positionSet = false;

  /**
   * m_scalingSet (bool) (Tr2IntSkinnedObject.h:120).
   *
   * @implemented
   */
  @meta.implemented
  _scalingSet = false;

  /**
   * m_rotationSet (bool) (Tr2IntSkinnedObject.h:121).
   *
   * @implemented
   */
  @meta.implemented
  _rotationSet = false;

  /**
   * m_isInApexScene (bool) (Tr2IntSkinnedObject.h:124).
   *
   * @implemented
   */
  @meta.implemented
  _isInApexScene = false;

  /**
   * m_lightSet (Tr2InteriorLightSet): the lights on this avatar (Tr2IntSkinnedObject.h:114).
   *
   * @implemented
   */
  @meta.implemented
  _lightSet = new Tr2InteriorLightSet();

  /**
   * m_cellReflectionMaps[2] (TriTextureResPtr): the current and previous per-cell reflection maps (Tr2IntSkinnedObject.h:132).
   *
   * @implemented
   */
  @meta.implemented
  _cellReflectionMaps = [ null, null ];

  /**
   * m_cellReflectionTime (float): seconds since the last per-cell reflection map change (Tr2IntSkinnedObject.h:134).
   *
   * @implemented
   */
  @meta.implemented
  _cellReflectionTime = 0;

  /**
   * m_previousUpdateTime (Be::Time): the time of the previous PostPhysicsUpdate, in Blue ticks (Tr2IntSkinnedObject.h:136).
   *
   * @implemented
   */
  @meta.implemented
  _previousUpdateTime = 0;

  /**
   * Carbon: Tr2IntSkinnedObject::Tr2IntSkinnedObject (Tr2IntSkinnedObject.cpp:17-40).
   * Creates the local variable store, parents it to the global store, and registers the
   * three per-cell reflection variables.
   *
   * Adapted: the registrations state their TriVariableContentType, as
   * Tr2VariableStore.RegisterVariableInternal requires (C++ deduces it from the argument
   * type). The wodIntSkinnedObjectsAlive statistic is not ported.
   */
  constructor()
  {
    super();
    this.variableStore = new Tr2VariableStore();
    this.variableStore.SetParentVariableStore(Tr2VariableStore.globalStore());
    this.variableStore.RegisterVariableInternal("CellReflectionMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("CellReflection2ndMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, null);
    this.variableStore.RegisterVariableInternal("CellReflectionInterpolation", TriVariableContentType.TRIVARIABLE_FLOAT, 0);
  }

  /**
   * Scratch for the transform decompositions in SetRotation and SetScaling.
   *
   * @adapted
   */
  @meta.adapted
  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), quat_0: quat.create(), quat_1: quat.create(), mat4_0: mat4.create() };

  /**
   * Carbon GetPerObjectData (h:75, cpp:173-180): display-gated local lighting.
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    return this.visualModel && this.DoDisplay()
      ? this.GetPerObjectDataGpuSkinning(accumulator, this._lightSet, this.GetSkinningTransform())
      : null;
  }

  /**
   * Carbon per-instance override (h:56-59, cpp:387-398), independent of display.
   *
   * @implemented
   */
  @blue.method
  @meta.implemented
  GetPerObjectDataWithPerInstanceLighting(accumulator, lightSet, objectToWorldMatrix)
  {
    return this.visualModel ? this.GetPerObjectDataGpuSkinning(accumulator, lightSet, objectToWorldMatrix) : null;
  }

  /**
   * Carbon GetPerObjectDataGpuSkinning (h:126-129, cpp:315-349).
   *
   * @adapted the existing per-object allocator leases the uploadable RawData,
   *   removing the native stack-struct memcpy. Explicit zeroing preserves memset,
   *   including unused light slots and non-identity unused spotlight matrices.
   */
  @blue.method
  @meta.adapted
  GetPerObjectDataGpuSkinning(accumulator, lightSet, objectToWorldMatrix)
  {
    this.UpdatePerObjectData();
    const data = Tr2PerObjectDataSkinned.alloc(accumulator, "Tr2InteriorPerObjectPSData");
    data.SetSkinningMatrices(this.skinningMatrixCount, this.GetSkinningMatrices());
    data.SetWorldMatrix(objectToWorldMatrix);
    const { mat4_0 } = Tr2IntSkinnedObject.scratch;
    mat4.identity(mat4_0);
    data.SetMirrorMatrix(mat4_0);
    data.ps.GetData().fill(0);
    if (lightSet) lightSet.PopulateLightData(data.ps);
    return data;
  }

  /**
   * Carbon GetBatches (h:76, cpp:184-302), including interior transparent depth.
   *
   * @adapted uses the shared lazy geometry allocator and JS area objects in
   *   place of native arena allocations. Scratch bounds start at zero rather
   *   than retaining a previous object's data if a producer has no valid bounds.
   *   Each area's data also copies the object's user data, as Carbon's objectId
   *   picking revision did (92483097^, cpp:272): our objectId picking reads it
   *   (Tr2RenderContext.eveSpacePickingFramework), so without it every skinned
   *   object picked as candidate 0.
   */
  @blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    if (!this.DoDisplay()) return;
    let depth = 0xffffffff;
    if (batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      const { vec3_0, vec3_1 } = Tr2IntSkinnedObject.scratch;
      vec3.set(vec3_0, 0, 0, 0);
      vec3.set(vec3_1, 0, 0, 0);
      this.GetLocalBoundingBox(vec3_0, vec3_1);
      vec3.add(vec3_0, vec3_0, vec3_1);
      vec3.scale(vec3_0, vec3_0, 0.5);
      vec3.transformMat4(vec3_0, vec3_0, this.transform);
      vec3.subtract(vec3_0, vec3_0, Tr2Renderer.GetViewPosition());
      // Vector3_inline.h:163-177: scalar float Dot then float sqrt, before
      // depthOffset is added. Rounding only the final ratio changes sort keys.
      const f32 = Math.fround;
      const lengthSquared = f32(f32(f32(vec3_0[0] * vec3_0[0]) + f32(vec3_0[1] * vec3_0[1])) + f32(vec3_0[2] * vec3_0[2]));
      const distance = f32(Math.sqrt(lengthSquared));
      const z = Math.min(Math.max(f32(f32(distance + this.depthOffset) / Tr2Renderer.GetFrustumRadius()), 0), 1);
      depth = f32(f32(0xfffffff) * f32(1 - z)) >>> 0;
    }
    for (const mesh of this.visualModel.GetMeshes())
    {
      if (!mesh || !mesh.GetDisplay()) continue;
      const areas = mesh.GetAreas(batchType);
      if (!areas) continue;
      const geometry = mesh.GetGeometryResource();
      if (!geometry || !geometry.IsGood()) continue;
      const meshIndex = mesh.GetMeshIndex();
      if (meshIndex < 0 || meshIndex >= geometry.GetMeshCount()) continue;
      const lod = geometry.GetMeshLod__LodIndex(meshIndex, 0);
      if (!lod || !CreateLodAllocations(geometry, meshIndex, lod, Tr2RenderContext_GetMainThreadRenderContext())) continue;
      for (const area of areas)
      {
        if (!area.GetDisplay() || !area.GetMaterialInterface()) continue;
        const count = area.GetJointCount();
        if (count > TR2_MAX_BONES_PER_MESHAREA) continue;
        const data = new Tr2PerAreaDataSkinned();
        data.SetPickingPointer(perObjectData.GetPickingPointer());
        data.SetUserData(perObjectData.GetUserData());
        const mapping = area.GetJointMappingAnimRig();
        if (this.visualModel.GetSkeleton() !== null && mapping !== null)
        {
          data.SetJointCount(count);
          for (let joint = 0; joint < count; joint++) data.SetJointTransform(joint, perObjectData.GetSkinningMatrix(mapping[joint]));
        }
        else
        {
          data.SetJointCount(TR2_MAX_BONES_PER_MESHAREA);
          const { mat4_0 } = Tr2IntSkinnedObject.scratch;
          mat4.identity(mat4_0);
          for (let joint = 0; joint < TR2_MAX_BONES_PER_MESHAREA; joint++) data.SetJointTransform(joint, mat4_0);
        }
        data.SetPerObjectData(perObjectData);
        const batch = mesh.CreateGeometryBatch(geometry, area, data, false, lod);
        if (batch)
        {
          batch.depth = depth;
          batches.Commit(batch);
        }
      }
    }
  }

  /**
   * Carbon IInitialize hook populates the owner's LOD proxies.
   *
   * @adapted JS exposes the native protected LOD member as lod; the owner model accessors
   *   alias its proxy storage.
   */

  @meta.adapted
  Initialize()
  {
    this.lod.PopulateLods();
    return true;
  }

  /**
   * Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes.
   *
   * @implemented
   */

  @meta.implemented
  OnModified(propertyName)
  {
    super.OnModified(propertyName);
    this.lod.OnModified(propertyName);
    return true;
  }

  /**
   * Carbon: Tr2IntSkinnedObject::PrePhysicsUpdate (Tr2IntSkinnedObject.cpp:68-71).
   *
   * Not implemented: Carbon's body only forwards to Tr2SkinnedObject::PrePhysicsUpdate
   * (Tr2SkinnedObject.cpp), which Tr2SkinnedObject does not carry yet.
   *
   * @notImplemented
   * @param {number} _time Blue time in ticks.
   * @returns {void}
   */
  @meta.notImplemented
  PrePhysicsUpdate(_time)
  {
    throw new Error("Tr2IntSkinnedObject.PrePhysicsUpdate requires the unported Tr2SkinnedObject.PrePhysicsUpdate.");
  }

  /**
   * Carbon: Tr2IntSkinnedObject::PostPhysicsUpdate (Tr2IntSkinnedObject.cpp:73-82).
   *
   * Not implemented: it begins with Tr2SkinnedObject::PostPhysicsUpdate (Tr2SkinnedObject.cpp),
   * which Tr2SkinnedObject does not carry yet; the reflection-variable republish that follows
   * (cpp:77-81) cannot run ahead of it and is written when the base lands.
   *
   * @notImplemented
   * @param {number} _time Blue time in ticks.
   * @param {object|null} _apexScene Physics scene.
   * @returns {void}
   */
  @meta.notImplemented
  PostPhysicsUpdate(_time, _apexScene)
  {
    throw new Error("Tr2IntSkinnedObject.PostPhysicsUpdate requires the unported Tr2SkinnedObject.PostPhysicsUpdate.");
  }

  /**
   * Carbon: Tr2IntSkinnedObject::AddReflectionMap (Tr2IntSkinnedObject.cpp:90-116), protected.
   * Adds a per-cell reflection map to the current pair and restarts the transition.
   *
   * @implemented
   * @param {object|null} texture The per-cell reflection map; null is ignored.
   * @returns {void}
   */
  @meta.implemented
  _AddReflectionMap(texture)
  {
    const maps = this._cellReflectionMaps;

    if (texture === null)
    {
      return;
    }
    if (texture === maps[0] || texture === maps[1])
    {
      return;
    }

    if (maps[0] === null)
    {
      maps[0] = maps[1] = texture;
      this._cellReflectionTime = 0.0;
    }
    else if (maps[1] === null)
    {
      maps[1] = texture;
      this._cellReflectionTime = 0.0;
    }
    else
    {
      maps[0] = maps[1];
      maps[1] = texture;
      this._cellReflectionTime = 0.0;
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::RemoveReflectionMap (Tr2IntSkinnedObject.cpp:124-136), protected.
   *
   * Quirk, reproduced: despite the name nothing is removed. When the texture is the second
   * map the pair is rotated (second takes the first, first takes the texture) and the
   * transition restarts (cpp:130-135).
   *
   * @implemented
   * @param {object|null} texture The per-cell reflection map; null is ignored.
   * @returns {void}
   */
  @meta.implemented
  _RemoveReflectionMap(texture)
  {
    const maps = this._cellReflectionMaps;

    if (texture === null)
    {
      return;
    }

    if (texture === maps[1])
    {
      maps[1] = maps[0];
      maps[0] = texture;
      this._cellReflectionTime = 0.0;
    }
  }

  /**
   * Carbon GetWorldBoundingBox (h:92, cpp:138-148), using all eight corners as
   * Utilities/BoundingBox.cpp:211-265 does. A single matrix has the same byte
   * layout in the row-vector donor and column-vector runtime convention.
   *
   * @adapted one retained vec3 scratch replaces the temporary corner array.
   *   Matrix_inline.h:560-576 TransformCoord requires float32 intermediates and
   *   a zero result when homogeneous W is zero; gl-matrix's W fallback differs.
   * @param {vec3} min Receives the world minimum.
   * @param {vec3} max Receives the world maximum.
   * @returns {boolean} Whether local bounds were available.
   */
  @blue.method
  @meta.adapted
  GetWorldBoundingBox(min, max)
  {
    if (!this.GetLocalBoundingBox(min, max)) return false;

    const minX = min[0], minY = min[1], minZ = min[2];
    const maxX = max[0], maxY = max[1], maxZ = max[2];
    const transform = this.GetSkinningTransform();
    const { vec3_2 } = Tr2IntSkinnedObject.scratch;
    const f32 = Math.fround;

    for (let i = 0; i < 8; i++)
    {
      const x = i & 1 ? maxX : minX;
      const y = i & 2 ? maxY : minY;
      const z = i & 4 ? maxZ : minZ;
      const norm = f32(f32(f32(f32(transform[3] * x) + f32(transform[7] * y)) + f32(transform[11] * z)) + transform[15]);

      if (norm === 0)
      {
        vec3.set(vec3_2, 0, 0, 0);
      }
      else
      {
        for (let axis = 0; axis < 3; axis++)
        {
          const coordinate = f32(f32(f32(f32(x * transform[axis]) + f32(y * transform[axis + 4])) + f32(z * transform[axis + 8])) + transform[axis + 12]);
          vec3_2[axis] = f32(coordinate / norm);
        }
      }

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
   * Carbon IsBoundingBoxReady (h:93, cpp:150-154): query the world box.
   *
   * @implemented
   */
  @meta.implemented
  IsBoundingBoxReady()
  {
    const { vec3_0, vec3_1 } = Tr2IntSkinnedObject.scratch;
    return this.GetWorldBoundingBox(vec3_0, vec3_1);
  }

  /**
   * Carbon: Tr2IntSkinnedObject::AddToApexScene (Tr2IntSkinnedObject.cpp:156-162).
   * Only records membership; the physics scene argument is unused, as in Carbon.
   *
   * @implemented
   * @param {object|null} _apexScene Unused physics scene.
   * @returns {void}
   */
  @meta.implemented
  AddToApexScene(_apexScene)
  {
    if (!this._isInApexScene)
    {
      this._isInApexScene = true;
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::RemoveFromApexScene (Tr2IntSkinnedObject.cpp:164-171).
   * Carbon's body tests the membership flag and does nothing in either case.
   *
   * @implemented
   * @returns {void}
   */
  @meta.implemented
  RemoveFromApexScene()
  {
    if (this._isInApexScene)
    {
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::AddToScene (Tr2IntSkinnedObject.cpp:354-364).
   *
   * Requires available bounds before adding the object to the physics scene.
   *
   * @implemented
   * @param {object|null} apexScene Physics scene.
   * @returns {boolean} Whether the object was ready to enter the scene.
   */
  @meta.implemented
  AddToScene(apexScene)
  {
    if (!this.IsBoundingBoxReady()) return false;

    this.AddToApexScene(apexScene);
    return true;
  }

  /**
   * Carbon: Tr2IntSkinnedObject::RemoveFromScene (Tr2IntSkinnedObject.cpp:367-371).
   * Leaves the physics scene.
   *
   * @implemented
   * @returns {void}
   */
  @meta.implemented
  RemoveFromScene()
  {
    // Get out of the Apex scene
    this.RemoveFromApexScene();
  }

  /**
   * Carbon: Tr2IntSkinnedObject::GetID (Tr2IntSkinnedObject.h:80-83), ITr2Pickable.
   *
   * @implemented
   * @param {number} _areaId Unused.
   * @returns {Tr2IntSkinnedObject} This object (Carbon's GetRawRoot()).
   */
  @meta.implemented
  GetID(_areaId)
  {
    return this;
  }

  /**
   * Carbon: Tr2IntSkinnedObject::SetPosition (Tr2IntSkinnedObject.cpp:400-411).
   * Writes the translation row unless the same position was already applied.
   *
   * Quirk, reproduced: the comparison is against the last position SetPosition applied,
   * not against the transform, so a transform changed any other way does not make an equal
   * position write again.
   *
   * @implemented
   * @param {vec3} pos The position.
   * @returns {void}
   */
  @meta.implemented
  SetPosition(pos)
  {
    if (!vec3.exactEquals(this._currentPosition, pos) || !this._positionSet)
    {
      vec3.copy(this._currentPosition, pos);
      this._positionSet = true;

      this.transform[12] = pos[0];
      this.transform[13] = pos[1];
      this.transform[14] = pos[2];
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::SetRotation (Tr2IntSkinnedObject.cpp:414-428).
   * Rebuilds the transform from its decomposed scale and translation and the new rotation,
   * unless the same rotation was already applied (the same last-applied comparison as
   * SetPosition).
   *
   * @implemented
   * @param {quat} rotQuat The rotation.
   * @returns {void}
   */
  @meta.implemented
  SetRotation(rotQuat)
  {
    if (!quat.exactEquals(this._currentRotation, rotQuat) || !this._rotationSet)
    {
      quat.copy(this._currentRotation, rotQuat);
      this._rotationSet = true;

      const { vec3_0, vec3_1, quat_0 } = Tr2IntSkinnedObject.scratch;
      mat4.decomposeCarbon(this.transform, quat_0, vec3_0, vec3_1);
      // Carbon TransformationMatrix( tmpScale, rotQuat, tmpTranslation ) on the shared byte layout.
      mat4.fromRotationTranslationScale(this.transform, rotQuat, vec3_0, vec3_1);
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::SetScaling (Tr2IntSkinnedObject.cpp:431-445).
   * Rebuilds the transform from the new scale and its decomposed rotation and translation,
   * unless the same scaling was already applied (the same last-applied comparison as
   * SetPosition).
   *
   * @implemented
   * @param {vec3} scaleVec The scaling.
   * @returns {void}
   */
  @meta.implemented
  SetScaling(scaleVec)
  {
    if (!vec3.exactEquals(this._currentScaling, scaleVec) || !this._scalingSet)
    {
      vec3.copy(this._currentScaling, scaleVec);
      this._scalingSet = true;

      const { vec3_0, vec3_1, quat_0 } = Tr2IntSkinnedObject.scratch;
      mat4.decomposeCarbon(this.transform, quat_0, vec3_0, vec3_1);
      // Carbon TransformationMatrix( scaleVec, tmpRotation, tmpTranslation ) on the shared byte layout.
      mat4.fromRotationTranslationScale(this.transform, quat_0, vec3_0, scaleVec);
    }
  }

  /**
   * Carbon: Tr2IntSkinnedObject::UpdatePlacement (Tr2IntSkinnedObject.cpp:456-487),
   * IBluePlacementObserver.
   * Works back from a front vector to a yaw-only rotation and applies it with the position.
   *
   * Quirk, reproduced: "terrible workaround" in Carbon's own words (cpp:458). The yaw is
   * acos of front.z alone, mirrored for negative front.x, with pi added on top; the top
   * vector and a local up vector (cpp:481-482) are never used. Float arithmetic follows the
   * donor's float literals.
   *
   * @implemented
   * @param {vec3} front The front vector.
   * @param {vec3} _top Unused.
   * @param {vec3} pos The position.
   * @returns {void}
   */
  @meta.implemented
  UpdatePlacement(front, _top, pos)
  {
    // Terrible workaround since the UpdatePlacement takes in a position and a front vector.
    // We have to work out way back to a quaternion
    const x = front[0];
    let z = front[2];
    if (z >= 1.0)
    {
      z = 1.0;
    }
    else if (z <= -1.0)
    {
      z = -1.0;
    }

    let yaw = Math.fround(Math.acos(z));
    // This is actually two answers, we need to determine which side of the axis we're on.
    // Correct for the other half of the circle
    if (x < 0.0)
    {
      yaw = Math.fround(Math.fround(2 * PI_F) - yaw);
    }

    // OK, this should go away once our rotations are sorted out !!!!
    yaw = Math.fround(yaw + PI_F);

    const q = quat.fromYawPitchRollCarbon(Tr2IntSkinnedObject.scratch.quat_1, yaw, 0, 0);

    this.SetRotation(q);
    this.SetPosition(pos);
  }

  /**
   * Carbon: Tr2IntSkinnedObject::IsInFrustum (Tr2IntSkinnedObject.cpp:491-500), ITr2InteriorCullable.
   *
   * Tests the world box, writing the current transform only when a box exists.
   *
   * @implemented
   * @param {TriFrustum} frustum The frustum to test against.
   * @param {mat4} objectToWorld Receives the transform.
   * @returns {boolean} Whether the box is visible.
   */
  @meta.implemented
  IsInFrustum(frustum, objectToWorld)
  {
    const { vec3_0, vec3_1 } = Tr2IntSkinnedObject.scratch;
    if (!this.GetWorldBoundingBox(vec3_0, vec3_1)) return false;

    mat4.copy(objectToWorld, this.transform);
    return frustum.IsBoxVisible__BoundsMinMax(vec3_0, vec3_1);
  }

  /**
   * Carbon: Tr2IntSkinnedObject::GetPickingBatches (Tr2IntSkinnedObject.cpp:502-517), ITr2Pickable.
   * Gathers native skinned area batches for each requested pick category.
   *
   * @implemented
   * @param {object} batches The batch accumulator.
   * @param {number} pickTypes A Tr2PickType bit mask.
   * @param {object} perObjectData The object's per-object data.
   * @returns {void}
   */
  @meta.implemented
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
   * Carbon override delegates LOD selection to Tr2SkinnedObject.
   *
   * @implemented
   */

  @meta.implemented
  SetLOD(frustum)
  {
    return super.SetLOD(frustum);
  }

}

// Whole-scene submission and physics remain open beyond the direct batch path.
