import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes_Blue.cpp
import { EveEntity } from "../../EveEntity.js";
import { IEveShadowCaster } from "../../IEveShadowCaster.js";
import { IEveSpaceObjectChild } from "../IEveSpaceObjectChild.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { EveComponentType, EntityComponents } from "../../EntityComponents.js";
import { EveSpaceObjectChild } from "../EveSpaceObjectChild.js";
import { RawData } from "../../../core/rawData/RawData.js";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { EveMeshOverlayEffect } from "../../overlays/EveMeshOverlayEffect.js";
import { TriRenderBatchAreaBlock } from "../../../core/batch/TriRenderBatch/index.js";
import { TriBatchType } from "#consts/graphics";
import { EveDamageOverlay } from "../../overlays/EveDamageOverlay.js";
import { EveDamageOverlayOwnerInfo } from "../../overlays/EveDamageOverlayOwnerInfo.js";
import { EveGetLocatorPose } from "../../locator/EveLocatorSets.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { EveChildInstancedMeshArea } from "./EveChildInstancedMeshArea.js";
import { EveChildInstancedMeshInstance } from "./EveChildInstancedMeshInstance.js";
import { EveChildInstancedMesh } from "./EveChildInstancedMesh.js";
import { IEveInstanceMeshProvider } from "../../instancedMeshManager/IEveInstanceMeshProvider.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { CarbonVertexElements } from "../../../core/vertex/vertexUsage.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";

const POSITION_SCRATCH = vec3.create();
const OVERLAY_LOCAL_SCRATCH = mat4.create();
const OVERLAY_WORLD_SCRATCH = mat4.create();
const OVERLAY_WORLD_LAST_SCRATCH = mat4.create();
const OVERLAY_INV_WORLD_SCRATCH = mat4.create();
const OVERLAY_INV_LOCAL_SCRATCH = mat4.create();
const OVERLAY_CLIP_SCRATCH = vec3.create();

/** Stand-in for an instance sphere the async pass has not built yet: Carbon
 * sizes instanceSpheres at AddMesh (cpp:559), JS fills it lazily. */
const EMPTY_SPHERE = { center: vec3.create(), radius: 0 };

/**
 * Returns the locator list of a part's own "damage" set, or null (Carbon
 * EveChildInstancedMeshes.cpp:12-22, file-local).
 */
function FindDamageLocators(sets)
{
  for (const entry of sets)
  {
    if (entry.HasName("damage")) return entry.GetLocators();
  }
  return null;
}

/**
 * Space-object child that hands batches of instanced meshes to the engine's
 * instanced mesh manager, owning their registration handles, instance flags and
 * world cull bounds.
 */
@be.define("EveChildInstancedMeshes")
@blue.inherit(ITr2Renderable, IEveShadowCaster, IEveInstanceMeshProvider)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(EveEntity)
@be.mapInterface(ITr2Renderable)
@be.mapInterface(IEveShadowCaster)
@be.mapInterface(IEveInstanceMeshProvider)
export class EveChildInstancedMeshes extends EveSpaceObjectChild
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @meta.attribute(meta.READ)
  @type.mat4
  worldTransform = mat4.create();

  @meta.attribute(meta.READ)
  @type.boolean
  hasUpdated = false;

  @meta.attribute(meta.PERSIST)
  @type.list("EveChildInstancedMesh")
  meshes = [];

  _revision = 0;

  /** Carbon m_perObjectDataHandle (h:143) - manager registration handle. */
  _perObjectDataHandle = null;

  /**
   * Carbon m_perObjectData (EveSpacePerObjectData): the PERSISTENT per-instance
   * record the mesh manager uploads into its structured buffer.
   */
  _perObjectData = RawData.create("EveSpacePerObjectData");

  /** Base-hull record used by meshes that opt out of the parent's clip. */
  _perObjectDataNoClip = RawData.create("EveSpacePerObjectData");

  _perObjectDataNoClipHandle = null;

  /** Engine manager that owns every currently retained opaque handle. */
  _meshManager = null;

  _parentOverlayEffects = null;

  _lastCameraFrustum = null;

  _lastInvLodFactor = 1;

  /** Carbon m_partDamageOverlays (h:215): one damage overlay per part tag,
   * created on first damage through CreatePartDamageOverlay. */
  _partDamageOverlays = new Map();

  /** The damage locator list the current part's owner record resolves against; set per part during the async update. */
  _partDamageLocators = null;

  /** Carbon cpp:349-356: an absent list or an out-of-range index resolves nothing and leaves out untouched. */
  _getPartDamageLocatorPositionOS = (index, out) =>
  {
    const locators = this._partDamageLocators;
    if (!locators || index < 0 || index >= locators.length) return false;
    vec3.copy(out, locators[index].position);
    return true;
  };

  /** One owner record reused for every part; each overlay reads it during its own update only (Carbon cpp:335). */
  static _partOwnerInfo = new EveDamageOverlayOwnerInfo();

  static _inverseScratch = mat4.create();



  /** EVE_SPACEOBJECT_CUSTOWMASK_MAX (EveSpaceObject2.h:49). */
  static CUSTOM_MASK_COUNT = 2;

  /** Carbon m_allRegistered (h:147) - the AddMeshesToManager retry latch:
   * set optimistically each pass, cleared by ANY not-ready mesh/area so the
   * per-frame CollectMeshes retries until geometry streams in. */
  _allRegistered = false;

  /**
   * The authored name, persisted with the child and used to identify it in the
   * parent graph.
   */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name, coercing nullish to the empty string. */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Carbon EveChildInstancedMeshes::UpdateVisibility (cpp:183-186) only caches
   * the frame's camera frustum for later use; the JS port has no consumer for
   * that cache, so the frame hook does nothing.
   */
  @blue.method
  @meta.adapted
  UpdateVisibility(updateContext)
  {
    this._lastCameraFrustum = updateContext.GetFrustum();
    this._lastInvLodFactor = updateContext.GetInvLodFactor();
  }

  /**
   * Carbon EveChildInstancedMeshes::GetRenderables (cpp:200-207): the base
   * hull draws through the instanced mesh manager, so this child is a
   * renderable only for overlay draws - inherited, own, or part damage.
   */
  @blue.method
  @meta.implemented
  GetRenderables(renderables = [])
  {
    if (this.hasUpdated &&
      ((this._parentOverlayEffects?.length && this._AnyMeshInheritsOverlayEffects()) ||
        this._HasAnyOwnOverlayEffects() || this._partDamageOverlays.size !== 0))
    {
      renderables.push(this);
    }
    return renderables;
  }

  /**
   * Carbon EveChildInstancedMeshes::GetBoundingSphere (cpp:192-195) always
   * returns false - the child publishes no bounds of its own, because each mesh
   * registers its own sphere group with the manager.
   */
  @blue.method
  @meta.implemented
  GetBoundingSphere()
  {
    return false;
  }

  /**
   * Carbon EveChildInstancedMeshes::UpdateAsyncronous (cpp:204-238): the
   * per-instance record is this child's own transforms plus the hull values it
   * inherits, flattened into ONE struct - EveSpacePerObjectData carries both
   * the VS and PS halves because the manager uploads it as a single instance.
   * @param {Object} parent - the space-object parent, when there is one
   */
  _UpdatePerObjectData(parent)
  {
    const record = this._perObjectData;

    // Carbon UpdateAsyncronous copies the previous packed transform unchanged.
    record.SetWithoutTransposing("worldTransformLast", record.Get("worldTransform"));
    record.SetAndTranspose("worldTransform", this.worldTransform);

    // cpp:214 inverts the transposed matrix; by carbon-math-conventions F2 that
    // equals the transpose of the logical inverse, which is what this produces.
    const inverse = EveChildInstancedMeshes._inverseScratch;
    if (!mat4.invert(inverse, this.worldTransform))
    {
      mat4.identity(inverse);
    }
    record.SetAndTranspose("invWorldTransform", inverse);

    if (!parent)
    {
      this._perObjectDataNoClip.CopyFrom(record);
      return { vs: RawData.create("EveSpaceObjectVSData"), ps: RawData.create("EveSpaceObjectPSData") };
    }

    const { vs, ps } = parent.GetPerObjectStructs();

    for (const name of [ "shipData", "clipSphereCenter", "clipRadiusSq", "clipRadius2Sq",
      "impactDataOffset", "clipSphereFactor2", "clipSphereFactor" ])
    {
      record.Set(name, ps.Get(name));
    }
    for (const name of [ "ellpsoidRadii", "ellpsoidCenter", "customData" ])
    {
      record.Set(name, vs.Get(name));
    }
    record.Set("customMaskClamps", ps.Get("customMaskClamps"));
    record.Set("boneOffsets", vs.Get("boneOffsets"));

    for (let slot = 0; slot < EveChildInstancedMeshes.CUSTOM_MASK_COUNT; slot++)
    {
      // Carbon copies customMaskMatrix from the parent's packed VS record.
      record.SetWithoutTransposingIndex(
        "customMaskMatrix", slot, vs.GetIndex("customMaskMatrix", slot));
      record.SetIndex("customMaskData", slot, vs.GetIndex("customMaskData", slot));
      record.SetIndex("customMaskMaterialIDs", slot, ps.GetIndex("customMaskMaterialIDs", slot));
      record.SetIndex("customMaskTargets", slot, ps.GetIndex("customMaskTargets", slot));
    }

    // cpp:238: the PS record's coefficients land in the record's shLighting.
    record.Set("shLighting", ps.Get("shLightingCoefficients"));

    this._perObjectDataNoClip.CopyFrom(record);
    this._perObjectDataNoClip.Set("clipRadiusSq", [ 0 ]);
    this._perObjectDataNoClip.Set("clipRadius2Sq", [ 0 ]);
    this._perObjectDataNoClip.Set("clipSphereFactor", [ 0 ]);
    this._perObjectDataNoClip.Set("clipSphereFactor2", [ 0 ]);
    return { vs, ps };
  }

  /**
   * Stamps the child's world transform from the parent's localToWorldTransform
   * (Carbon cpp:197-200); every per-instance cull sphere the async pass builds
   * is derived from it.
   */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (params?.localToWorldTransform?.length === 16)
    {
      mat4.copy(this.worldTransform, params.localToWorldTransform);
    }

    const time = updateContext.GetTime();
    for (const mesh of this.meshes)
    {
      for (const overlay of mesh.ownOverlayEffects) overlay.Update(time, time);
    }

    // Carbon cpp:228-231: every part's damage overlay publishes its block.
    for (const overlay of this._partDamageOverlays.values()) overlay.UpdateSyncronous(updateContext);
  }

  /**
   * Carbon EveChildInstancedMeshes::UpdateAsyncronous (cpp:234-413), the CPU
   * half: per-mesh RENDER_IN_REFLECTION refresh (cpp:251), the mesh-local
   * bounds sphere radius = |center| + radius (cpp:254-255), per-instance
   * world cull spheres - position from the instance translation (Carbon reads
   * the packed rows' w = _41.._43, i.e. the transform translation) moved
   * through the child world transform, radius scaled by the instance's max
   * basis length times the child worldScale (cpp:259-269; NOTE Carbon's two
   * scale extractions deliberately differ - worldScale uses the world
   * transform's basis ROWS while the instance scale uses the packed rows'
   * xyz = the transpose's rows; equal under rotation + uniform scale,
   * ported exactly) - the world bounding sphere over all instance spheres
   * (cpp:257-270), a live SetSphereGroupBounds refresh on registered handles
   * (cpp:272-278), and the hasUpdated stamp (cpp:281).
   *
   * Adapted: Trinity fills the CPU per-object data; the raytracing mesh build is not ported.
   * Bounds are read through GetMeshData, and entries without minBounds or maxBounds are
   * skipped.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    const previousWorldTransform = mat4.create();
    mat4.transpose(previousWorldTransform, this._perObjectData.Get("worldTransform"));
    const parentRecords = this._UpdatePerObjectData(params?.spaceObjectParent ?? null);
    const w = this.worldTransform;
    // cpp:240-242 - worldScale from the world transform's basis rows.
    const worldScale = Math.max(
      Math.hypot(w[0], w[1], w[2]),
      Math.hypot(w[4], w[5], w[6]),
      Math.hypot(w[8], w[9], w[10])
    );

    for (const mesh of this.meshes)
    {
      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood() === false)
      {
        continue;
      }

      // cpp:251 - refreshed every pass (set OR cleared).
      mesh.flags.SetRenderInReflections(EntityComponents.shouldReflect(mesh.reflectionMode));

      const meshData = geometry.GetMeshData(mesh.meshIndex);
      const minBounds = meshData.minBounds;
      const maxBounds = meshData.maxBounds;
      if (!minBounds || !maxBounds)
      {
        continue;
      }
      // cpp:254-255 - Sphere(AABB): center (min+max)/2, radius |max-min|/2;
      // then radius = sphere.radius + |sphere.center| (origin-inclusive).
      const centerX = (minBounds[0] + maxBounds[0]) * 0.5;
      const centerY = (minBounds[1] + maxBounds[1]) * 0.5;
      const centerZ = (minBounds[2] + maxBounds[2]) * 0.5;
      const localRadius =
        Math.hypot(maxBounds[0] - minBounds[0], maxBounds[1] - minBounds[1], maxBounds[2] - minBounds[2]) * 0.5 +
        Math.hypot(centerX, centerY, centerZ);

      mesh.instanceSpheres.length = mesh.instances.length;
      let boundsMinX = Infinity, boundsMinY = Infinity, boundsMinZ = Infinity;
      let boundsMaxX = -Infinity, boundsMaxY = -Infinity, boundsMaxZ = -Infinity;
      for (let index = 0; index < mesh.instances.length; index++)
      {
        const transform = mesh.instances[index].transform;
        // cpp:261 - packed rows' w = the transform translation (gl [12..14]).
        POSITION_SCRATCH[0] = transform[12];
        POSITION_SCRATCH[1] = transform[13];
        POSITION_SCRATCH[2] = transform[14];
        // cpp:262-264 - instance scale from the packed rows' xyz (the
        // transpose's rows: gl (t[0],t[4],t[8]) / (t[1],t[5],t[9]) /
        // (t[2],t[6],t[10])) - deliberately NOT the same extraction as
        // worldScale above.
        const scale = Math.max(
          Math.hypot(transform[0], transform[4], transform[8]),
          Math.hypot(transform[1], transform[5], transform[9]),
          Math.hypot(transform[2], transform[6], transform[10])
        ) * worldScale;
        vec3.transformMat4(POSITION_SCRATCH, POSITION_SCRATCH, w);

        const radius = localRadius * scale;
        const sphere = mesh.instanceSpheres[index] ??= { center: vec3.create(), radius: 0 };
        vec3.copy(sphere.center, POSITION_SCRATCH);
        sphere.radius = radius;

        boundsMinX = Math.min(boundsMinX, POSITION_SCRATCH[0] - radius);
        boundsMinY = Math.min(boundsMinY, POSITION_SCRATCH[1] - radius);
        boundsMinZ = Math.min(boundsMinZ, POSITION_SCRATCH[2] - radius);
        boundsMaxX = Math.max(boundsMaxX, POSITION_SCRATCH[0] + radius);
        boundsMaxY = Math.max(boundsMaxY, POSITION_SCRATCH[1] + radius);
        boundsMaxZ = Math.max(boundsMaxZ, POSITION_SCRATCH[2] + radius);
      }
      if (mesh.instances.length)
      {
        // cpp:270 - Sphere(worldBounds).
        const sphereCenter = mesh.worldBoundingSphere.center;
        sphereCenter[0] = (boundsMinX + boundsMaxX) * 0.5;
        sphereCenter[1] = (boundsMinY + boundsMaxY) * 0.5;
        sphereCenter[2] = (boundsMinZ + boundsMaxZ) * 0.5;
        mesh.worldBoundingSphere.radius =
          Math.hypot(boundsMaxX - boundsMinX, boundsMaxY - boundsMinY, boundsMaxZ - boundsMinZ) * 0.5;

        // cpp:272-278 - live refresh of a registered sphere group.
        if (mesh.sphereHandle !== null)
        {
          this._meshManager.SetSphereGroupBounds(
            mesh.sphereHandle, mesh.worldBoundingSphere, mesh.flags);
        }
      }
    }

    const parent = params?.spaceObjectParent ?? null;
    this._parentOverlayEffects = Array.isArray(parent?.overlayEffects) && parent.overlayEffects.length
      ? parent.overlayEffects
      : null;

    // Carbon cpp:333-359: each part's overlay is aged against its own
    // instance - local mesh sphere, world instance sphere, and the part's own
    // bind-pose damage locators. A part whose mesh is not loaded gets Carbon's
    // default owner info, which resolves no locators.
    for (const [ partTag, overlay ] of this._partDamageOverlays)
    {
      const info = EveDamageOverlayOwnerInfo.Reset(EveChildInstancedMeshes._partOwnerInfo);
      const found = this._FindMeshByPartTag(partTag);
      const geometry = found ? found.mesh.GetGeometryResource() : null;
      if (geometry && geometry.IsGood())
      {
        const meshData = geometry.GetMeshData(found.mesh.meshIndex);
        if (meshData)
        {
          const minBounds = meshData.minBounds;
          const maxBounds = meshData.maxBounds;
          vec4.set(info.boundingSphere,
            (minBounds[0] + maxBounds[0]) * 0.5,
            (minBounds[1] + maxBounds[1]) * 0.5,
            (minBounds[2] + maxBounds[2]) * 0.5,
            Math.hypot(maxBounds[0] - minBounds[0], maxBounds[1] - minBounds[1], maxBounds[2] - minBounds[2]) * 0.5);
        }
        const worldSphere = found.mesh.instanceSpheres[found.instanceIndex] ?? EMPTY_SPHERE;
        const frustum = updateContext.GetFrustum();
        info.estimatedPixelDiameter = Math.max(
          frustum.GetPixelSizeAccrossEst__CenterRadius(worldSphere.center, worldSphere.radius) * updateContext.GetInvLodFactor(), 0);
        info.isInFrustum = frustum.IsSphereVisible__CenterRadius(worldSphere.center, worldSphere.radius);
        this._partDamageLocators = FindDamageLocators(found.mesh.ownedLocatorSets);
        info.getDamageLocatorPositionOS = this._getPartDamageLocatorPositionOS;
      }
      overlay.UpdateAsyncronous(updateContext, info, 0, false);
    }

    if ((this._parentOverlayEffects && this._AnyMeshInheritsOverlayEffects()) ||
      this._HasAnyOwnOverlayEffects() || this._partDamageOverlays.size !== 0)
    {
      this._UpdateOverlayInstanceData(updateContext, parentRecords.vs, parentRecords.ps, previousWorldTransform);
    }

    this.hasUpdated = true;
  }

  /** Builds one persistent VS/PS record pair per authored instance. */
  _UpdateOverlayInstanceData(updateContext, parentVs, parentPs, previousWorldTransform)
  {
    for (const mesh of this.meshes)
    {
      if (!mesh.instances.length || !mesh.display || !this._MeshNeedsOverlayPods(mesh)) continue;

      if (!mesh.overlayPods || mesh.overlayPods.length !== mesh.instances.length)
      {
        mesh.overlayPods = Array.from({ length: mesh.instances.length }, () => ({
          vs: RawData.create("EveSpaceObjectVSData"),
          ps: RawData.create("EveSpaceObjectPSData"),
          framePod: null
        }));
      }

      for (let index = 0; index < mesh.instances.length; index++)
      {
        const local = mat4.copy(OVERLAY_LOCAL_SCRATCH, mesh.instances[index].transform);
        const world = mat4.multiply(OVERLAY_WORLD_SCRATCH, this.worldTransform, local);
        const worldLast = mat4.multiply(
          OVERLAY_WORLD_LAST_SCRATCH, previousWorldTransform, local);
        if (!mat4.invert(OVERLAY_INV_WORLD_SCRATCH, world)) mat4.identity(OVERLAY_INV_WORLD_SCRATCH);
        if (!mat4.invert(OVERLAY_INV_LOCAL_SCRATCH, local)) mat4.identity(OVERLAY_INV_LOCAL_SCRATCH);

        const pod = mesh.overlayPods[index];
        pod.vs.CopyFrom(parentVs);
        pod.ps.CopyFrom(parentPs);
        pod.vs.SetAndTranspose("worldTransform", world);
        pod.vs.SetAndTranspose("worldTransformLast", worldLast);
        pod.vs.SetAndTranspose("invWorldTransform", OVERLAY_INV_WORLD_SCRATCH);
        pod.ps.SetAndTranspose("worldTransform", world);
        pod.ps.SetAndTranspose("worldTransformLast", worldLast);
        pod.ps.SetAndTranspose("invWorldTransform", OVERLAY_INV_WORLD_SCRATCH);

        const clipData = pod.vs.Get("clipData");
        vec3.set(OVERLAY_CLIP_SCRATCH, clipData[0], clipData[1], clipData[2]);
        vec3.transformMat4(OVERLAY_CLIP_SCRATCH, OVERLAY_CLIP_SCRATCH, OVERLAY_INV_LOCAL_SCRATCH);
        pod.vs.Set("clipData", [
          OVERLAY_CLIP_SCRATCH[0], OVERLAY_CLIP_SCRATCH[1], OVERLAY_CLIP_SCRATCH[2], clipData[3]
        ]);

        vec3.copy(OVERLAY_CLIP_SCRATCH, pod.ps.Get("clipSphereCenter"));
        vec3.transformMat4(OVERLAY_CLIP_SCRATCH, OVERLAY_CLIP_SCRATCH, OVERLAY_INV_LOCAL_SCRATCH);
        pod.ps.Set("clipSphereCenter", OVERLAY_CLIP_SCRATCH);

        if (!mesh.inheritOverlayEffects)
        {
          const neutralClip = pod.vs.Get("clipData");
          pod.vs.Set("clipData", [ neutralClip[0], neutralClip[1], neutralClip[2], 0 ]);
          pod.ps.Set("clipRadiusSq", [ 0 ]);
          pod.ps.Set("clipRadius2Sq", [ 0 ]);
          pod.ps.Set("clipSphereFactor", [ 0 ]);
          pod.ps.Set("clipSphereFactor2", [ 0 ]);
        }

        // Carbon cpp:1238-1242: a damaged part flickers and reads its own
        // rows of the damage data texture.
        const damageOverlay = this._FindPartDamageOverlay(mesh.partTags[index]);
        if (damageOverlay)
        {
          const shipData = pod.ps.Get("shipData");
          pod.ps.Set("shipData", [
            shipData[0], shipData[1] * damageOverlay.GetActivationStrength(updateContext), shipData[2], shipData[3]
          ]);
          pod.ps.Set("impactDataOffset", [ damageOverlay.GetDataTextureOffset() ]);
        }
      }
    }
  }

  /** Reports whether any instanced mesh owns an overlay effect. */
  _HasAnyOwnOverlayEffects()
  {
    return this.meshes.some(mesh => mesh.ownOverlayEffects.length !== 0);
  }

  /** Reports whether any instanced mesh inherits its parent's overlays. */
  _AnyMeshInheritsOverlayEffects()
  {
    return this.meshes.some(mesh => mesh.inheritOverlayEffects);
  }

  /** Reports whether one mesh has an own or inherited overlay path. */
  _MeshHasActiveOverlayEffects(mesh)
  {
    return mesh.ownOverlayEffects.length !== 0 ||
      (this._parentOverlayEffects !== null && mesh.inheritOverlayEffects);
  }

  /**
   * Finds the mesh holding an instance of a part, and that instance's index
   * (Carbon FindMeshByPartTag, cpp:1115-1132; the size_t* out-param becomes
   * the returned record).
   * @returns {{mesh: EveChildInstancedMesh, instanceIndex: Number}|null}
   */
  _FindMeshByPartTag(partTag)
  {
    for (const mesh of this.meshes)
    {
      const instanceIndex = mesh.partTags.indexOf(partTag);
      if (instanceIndex !== -1) return { mesh, instanceIndex };
    }
    return null;
  }

  /** Returns a part's damage overlay, or null (Carbon FindPartDamageOverlay, cpp:1134-1142). */
  _FindPartDamageOverlay(partTag)
  {
    return this._partDamageOverlays.get(partTag) ?? null;
  }

  /** Reports whether any instance of a mesh belongs to a damaged part (Carbon cpp:1144-1158). */
  _MeshHasDamageOverlays(mesh)
  {
    if (this._partDamageOverlays.size === 0) return false;
    return mesh.partTags.some(tag => this._partDamageOverlays.has(tag));
  }

  /** Reports whether a mesh needs per-instance overlay pods (Carbon cpp:1160-1163). */
  _MeshNeedsOverlayPods(mesh)
  {
    return this._MeshHasActiveOverlayEffects(mesh) || this._MeshHasDamageOverlays(mesh);
  }

  /**
   * Carbon GetLocalToWorldTransform( Matrix& ) (EveChildInstancedMeshes.cpp:415-418): copies the world transform into out, and returns out.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    return mat4.copy(out, this.worldTransform);
  }

  /**
   * Carbon EveChildInstancedMeshes::Setup (cpp:335-337) is an intentional no-op:
   * placement comes from the authored per-instance transforms, not from an SRT
   * setup.
   */
  @blue.method
  @meta.implemented
  Setup()
  {
  }

  /**
   * Carbon EveChildInstancedMeshes::ChangeLOD (cpp:339-341) is an intentional
   * no-op; the child keeps no LOD state.
   */
  @blue.method
  @meta.implemented
  ChangeLOD()
  {
  }

  /**
   * Accepts and discards the placement origin; this child has no Carbon origin
   * field and stores none.
   */
  @blue.method
  @meta.adapted
  SetOrigin()
  {
  }

  /**
   * Returns false, so owners treat this child as subject to normal activation
   * gating.
   */
  @blue.method
  @meta.implemented
  IsAlwaysOn()
  {
    return false;
  }

  /**
   * Carbon EveChildInstancedMeshes::SetShaderOption (cpp:343-359): flips the
   * option and refreshes the effect hash on every area, then removes any
   * registered mesh-group handle and clears the latch - so the groups
   * re-register with the NEW effectHash on the next AddMeshesToManager pass.
   * Sphere/per-object handles deliberately stay registered.
   *
   * Adapted: Handle invalidation after manager removal is explicit in JavaScript; the option
   * write, hash refresh and registration lifecycle otherwise follow Carbon.
   */
  @blue.method
  @meta.adapted
  SetShaderOption(name, value)
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        area.effect.SetOption(name, value);
        area.effectHash = EveChildInstancedMeshes._GetEffectHash(area.effect);
        if (area.meshGroupHandle !== null)
        {
          this._meshManager.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
          this._allRegistered = false;
        }
      }
    }
    this._revision++;
  }

  /**
   * Carbon AddMesh (cpp:443-590). Instances join an existing mesh with the same geometry, mesh index, shadow and reflection flags, areas (effect path, hash, batch type and range), SOF hull and locator set, and locator-set ownership (cpp:464-538): they are appended after its instances, the mesh's manager registrations are dropped, and the latch clears so they re-register. Otherwise a mesh is appended: the area ducks are normalized, the instance transforms copied with each instance's sphere index, mirroring and picking indices (cpp:557-567), CASTS_SHADOW plus one flag bit per area batch type stamped (cpp:583-590), and the latch cleared.
   * @param {Iterable} areas - area ducks ({effect, batchType, areaIndex, areaCount})
   * @param {Iterable<Float32Array>} instanceTransforms - 16-value matrices; copied, not retained
   * @param {Number} partTag - modular owner shared by every appended instance
   * @param {Iterable} ownedLocatorSets - the part's hull-local EveLocatorSets, merged by the owner per instance
   * @param {Object|null} armorDamageShader - the part's armour damage Tr2Effect
   * @returns {Boolean} false when no areas or no instances were supplied (nothing is added)
   */
  @blue.method
  @meta.adapted
  AddMesh(
    geometryPath,
    castsShadow,
    reflectionMode,
    meshIndex,
    areas,
    instanceTransforms,
    sofHullName = "",
    sofLocatorSetName = "",
    partTag = 0,
    ownedLocatorSets = [],
    armorDamageShader = null
  )
  {
    const sourceAreas = Array.from(areas ?? []);
    const sourceTransforms = Array.from(instanceTransforms ?? []);
    if (!sourceAreas.length || !sourceTransforms.length)
    {
      return false;
    }

    // Carbon cpp:463: the new mesh's index, which every instance's picking
    // hit decodes to.
    const pickingMeshIndex = this.meshes.length >>> 0;
    const normalizedAreas = sourceAreas.map(area => EveChildInstancedMeshes._CreateArea(area));
    for (const transform of sourceTransforms)
    {
      if (!transform || transform.length !== 16)
      {
        throw new TypeError("EveChildInstancedMeshes instance transforms must contain 16 values");
      }
    }
    // Carbon cpp:521-527 and 559-565: the per-instance record. IsMirrored is
    // Determinant( m ) < 0 (MatrixUtils.cpp:28-31); a transpose has the same
    // determinant, so gl-matrix's reads Carbon's bytes unchanged.
    const CreateInstance = (transform, sphereIndex, instanceMeshIndex, instanceIndex) =>
    {
      const instance = new EveChildInstancedMeshInstance();
      mat4.copy(instance.transform, transform);
      instance.sphereIndex = sphereIndex >>> 0;
      instance.mirrored = mat4.determinant(transform) < 0;
      instance.pickingMeshIndex = instanceMeshIndex >>> 0;
      instance.pickingInstanceIndex = instanceIndex >>> 0;
      return instance;
    };

    const path = String(geometryPath ?? "");
    const index = Number(meshIndex) >>> 0;
    const reflection = reflectionMode === undefined ? 3 : Number(reflectionMode) | 0;
    const hullName = String(sofHullName ?? "");
    const locatorSetName = String(sofLocatorSetName ?? "");
    const ownsLocatorSets = Array.from(ownedLocatorSets ?? []).length !== 0;

    // Carbon cpp:464-538: merge into the first matching mesh.
    for (let existingIndex = 0; existingIndex < this.meshes.length; existingIndex++)
    {
      const existing = this.meshes[existingIndex];
      if (existing.geometryPath !== path || existing.meshIndex !== index)
      {
        continue;
      }
      if (existing.flags.GetCastsShadow() !== !!castsShadow || existing.reflectionMode !== reflection)
      {
        continue;
      }
      if (existing.areas.length !== normalizedAreas.length)
      {
        continue;
      }
      let areasEqual = true;
      for (let i = 0; i < normalizedAreas.length; ++i)
      {
        const a = existing.areas[i];
        const b = normalizedAreas[i];
        if (a.effect.GetEffectPathName() !== b.effect.GetEffectPathName() || a.batchType !== b.batchType ||
          a.areaIndex !== b.areaIndex || a.areaCount !== b.areaCount)
        {
          areasEqual = false;
          break;
        }
        if (a.effectHash !== EveChildInstancedMeshes._GetEffectHash(b.effect))
        {
          areasEqual = false;
          break;
        }
      }
      if (!areasEqual)
      {
        continue;
      }
      if (!(existing.sofHullName === hullName && existing.sofLocatorSetName === locatorSetName))
      {
        continue;
      }
      if ((existing.ownedLocatorSets.length === 0) !== !ownsLocatorSets)
      {
        continue;
      }

      const existingCount = existing.instances.length;
      let instanceIndex = existingCount;
      for (let i = 0; i < sourceTransforms.length; ++i)
      {
        existing.instances.push(CreateInstance(sourceTransforms[i], existingCount + i, existingIndex, instanceIndex++));
        existing.partTags.push(Number(partTag) >>> 0);
      }
      existing.instanceSpheres.length = existing.instances.length;
      if (existing.sphereHandle !== null)
      {
        existing.sphereHandle.owner.RemoveBoundingSphereGroup(existing.sphereHandle);
        existing.sphereHandle = null;
      }
      for (const area of existing.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          area.meshGroupHandle.owner.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
        }
      }
      if (existing.ownedLocatorSets.length && this.GetOwner())
      {
        this.GetOwner().InvalidateMergedLocators("structure");
      }
      this._allRegistered = false;
      this._revision++;
      return true;
    }

    const instances = sourceTransforms.map((transform, sphereIndex) => CreateInstance(transform, sphereIndex, pickingMeshIndex, sphereIndex));

    const mesh = new EveChildInstancedMesh();
    mesh.geometryPath = path;
    mesh.castsShadow = !!castsShadow;
    mesh.reflectionMode = reflection;
    mesh.meshIndex = index;
    mesh.areas = normalizedAreas;
    mesh.instances = instances;
    mesh.partTags = instances.map(() => Number(partTag) >>> 0);
    mesh.sofHullName = hullName;
    mesh.sofLocatorSetName = locatorSetName;
    mesh.ownedLocatorSets = Array.from(ownedLocatorSets ?? []);
    mesh.armorDamageShader = armorDamageShader ?? null;
    // Carbon cpp:586-589: the owner merges this part's sets per instance.
    if (mesh.ownedLocatorSets.length && this.GetOwner())
    {
      this.GetOwner().InvalidateMergedLocators("structure");
    }
    // Carbon (cpp:574-581): the CASTS_SHADOW flag and one bit per area batch
    // type are stamped at add time; RENDER_IN_REFLECTION is refreshed each
    // async pass. cpp:590 clears the registration latch.
    if (mesh.castsShadow)
    {
      mesh.flags.SetCastsShadow(true);
    }
    for (const area of mesh.areas)
    {
      mesh.flags.AddBatchType(area.batchType);
    }
    this.meshes.push(mesh);
    this._allRegistered = false;
    this._revision++;
    return true;
  }

  /**
   * Removes every instance owned by a modular part, dropping empty meshes and
   * invalidating manager registrations.
   *
   * Adapted: JavaScript explicitly nulls manager handles after removal; Carbon invalidates
   * them by reference.
   */
  @blue.method
  @meta.adapted
  RemoveInstancesByPartTag(partTag)
  {
    const tag = Number(partTag) >>> 0;
    let changed = false;
    let removedOwnedLocators = false;
    for (let meshIndex = this.meshes.length - 1; meshIndex >= 0; meshIndex--)
    {
      const mesh = this.meshes[meshIndex];
      const keptInstances = [];
      const keptTags = [];
      for (let instanceIndex = 0; instanceIndex < mesh.instances.length; instanceIndex++)
      {
        const instanceTag = Number(mesh.partTags[instanceIndex] ?? 0) >>> 0;
        if (instanceTag === tag)
        {
          changed = true;
          continue;
        }
        keptInstances.push(mesh.instances[instanceIndex]);
        keptTags.push(instanceTag);
      }
      if (keptInstances.length === mesh.instances.length) continue;
      removedOwnedLocators ||= mesh.ownedLocatorSets.length !== 0;

      if (mesh.sphereHandle !== null)
      {
        this._meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
        mesh.sphereHandle = null;
      }
      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          this._meshManager.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
        }
      }
      if (keptInstances.length === 0)
      {
        this.meshes.splice(meshIndex, 1);
        continue;
      }
      mesh.instances = keptInstances;
      mesh.partTags = keptTags;
      mesh.instanceSpheres.length = keptInstances.length;
      for (let instanceIndex = 0; instanceIndex < keptInstances.length; instanceIndex++)
      {
        keptInstances[instanceIndex].sphereIndex = instanceIndex;
      }
    }
    if (changed)
    {
      this._allRegistered = false;
      this._revision++;
    }
    // Carbon cpp:659-663: the part's damage overlay goes with it, and the
    // owner re-merges without the part's locators.
    this._partDamageOverlays.delete(tag);
    if (removedOwnedLocators && this.GetOwner())
    {
      this.GetOwner().InvalidateMergedLocators("structure");
    }
    return changed;
  }

  /**
   * Contributes every instance of every mesh to the owner's merged raycast set
   * (Carbon EveChildInstancedMeshes.cpp:1279-1324): the type-matching areas
   * are appended ONCE per mesh and shared by all of that mesh's instance
   * records via areaStart/areaCount; meshes with no matching areas contribute
   * nothing. Carbon row-vector instanceTransform * parentTransform maps to
   * gl-matrix multiply(out, parentTransform, instanceTransform).
   */
  @blue.method
  @meta.implemented
  CollectOwnedGeometry(type, parentTransform, out, areaPool)
  {
    for (const mesh of this.meshes)
    {
      const geometry = mesh.GetGeometryResource();
      if (!geometry || !mesh.instances.length) continue;

      const areaStart = areaPool.length;
      for (const area of mesh.areas)
      {
        if (area.batchType !== type) continue;
        areaPool.push({
          index: area.areaIndex,
          count: area.areaCount,
          alphaCutout: !!area.alphaCutout,
          reversed: !!area.reversed
        });
      }
      const areaCount = areaPool.length - areaStart;
      if (areaCount === 0) continue;

      for (const instance of mesh.instances)
      {
        const childToObject = mat4.create();
        mat4.multiply(childToObject, parentTransform, instance.transform);
        out.push({ geometry, childToObject, areaStart, areaCount });
      }
    }
  }

  /**
   * Contributes each part's owned locator sets once per instance, tagged with
   * that instance's part (Carbon EveChildInstancedMeshes.cpp:1473-1495).
   * Carbon row-vector instanceTransform * parentTransform maps to gl-matrix
   * multiply(out, parentTransform, instanceTransform).
   */
  @blue.method
  @meta.implemented
  CollectOwnedLocatorSets(parentTransform, out)
  {
    for (const mesh of this.meshes)
    {
      for (const sets of mesh.ownedLocatorSets)
      {
        if (!sets || !sets.GetLocators().length) continue;
        for (let index = 0; index < mesh.instances.length; index++)
        {
          const childToObject = mat4.create();
          mat4.multiply(childToObject, parentTransform, mesh.instances[index].transform);
          out.push({ childToObject, owner: this, partTag: mesh.partTags[index], sets });
        }
      }
    }
  }

  /** Returns a part's damage overlay, or null while it has none (Carbon cpp:1497-1500). */
  @blue.method
  @meta.implemented
  GetPartDamageOverlay(partTag)
  {
    return this._FindPartDamageOverlay(partTag);
  }

  /** Creates a part's damage overlay when it does not yet exist (Carbon cpp:1502-1509). */
  @blue.method
  @meta.implemented
  CreatePartDamageOverlay(partTag)
  {
    if (!this._partDamageOverlays.has(partTag))
    {
      this._partDamageOverlays.set(partTag, new EveDamageOverlay());
    }
  }

  /** Returns the armour damage shader of the mesh carrying a part (Carbon cpp:1511-1518). */
  @blue.method
  @meta.implemented
  GetPartArmorDamageShaderEffect(partTag)
  {
    return this._FindMeshByPartTag(partTag)?.mesh.armorDamageShader ?? null;
  }

  /**
   * Writes the part-local pose of one of a part's damage locators. Shared
   * instances carry no skeleton, so the pose is the authored one (Carbon
   * cpp:1520-1534 passes a null animation updater).
   */
  @blue.method
  @meta.implemented
  GetPartDamageLocatorAnimatedLocal(partTag, index, position, direction)
  {
    const found = this._FindMeshByPartTag(partTag);
    if (!found) return false;
    const locators = FindDamageLocators(found.mesh.ownedLocatorSets);
    if (!locators || index < 0 || index >= locators.length) return false;
    EveGetLocatorPose(position, direction, null, locators[index]);
    return true;
  }

  /**
   * Overwrites the transform and mirroring of every instance owned by a modular part with an
   * ABSOLUTE new transform (Carbon EveChildInstancedMeshes.cpp:674-696,
   * PLAT-11963). No handle teardown - the per-frame async pass refreshes the
   * cull spheres from the live transforms - but a part that owns locators
   * invalidates the owner's merged set. The per-part filter lives HERE, not at
   * the call site (the shared child carries many parts' instances).
   */
  @blue.method
  @meta.implemented
  SetInstanceTransformByPartTag(partTag, translation, rotation, scale)
  {
    const tag = Number(partTag) >>> 0;
    const transform = mat4.fromRotationTranslationScale(mat4.create(), rotation, translation, scale);
    // Carbon cpp:678: IsMirrored( m ), Determinant( m ) < 0.
    const mirrored = mat4.determinant(transform) < 0;
    let movedOwnedLocators = false;
    for (const mesh of this.meshes)
    {
      for (let index = 0; index < mesh.instances.length; index++)
      {
        if ((Number(mesh.partTags[index] ?? 0) >>> 0) === tag)
        {
          mat4.copy(mesh.instances[index].transform, transform);
          mesh.instances[index].mirrored = mirrored;
          movedOwnedLocators ||= mesh.ownedLocatorSets.length !== 0;
        }
      }
    }
    // Carbon cpp:681-684: moved part-owned locators are re-merged.
    if (movedOwnedLocators && this.GetOwner())
    {
      this.GetOwner().InvalidateMergedLocators("partMoved");
    }
  }

  /**
   * Returns one [translation, rotation, scale] decomposition per instance of a
   * mesh (Carbon EveChildInstancedMeshes.cpp:781-806, script-exposed tooling);
   * throws RangeError where Carbon raises IndexError.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetInstancesTransforms(meshId)
  {
    const index = Number(meshId) >>> 0;
    if (index >= this.meshes.length)
    {
      throw new RangeError("Mesh index out of range");
    }
    return this.meshes[index].instances.map(instance =>
    {
      const translation = vec3.create();
      const rotation = quat.create();
      const scale = vec3.create();
      mat4.getTranslation(translation, instance.transform);
      mat4.getRotation(rotation, instance.transform);
      quat.normalize(rotation, rotation);
      mat4.getScaling(scale, instance.transform);
      return { translation, rotation, scale };
    });
  }

  /**
   * Drops every mesh and clears the hasUpdated stamp so nothing re-registers
   * until another update pass runs; registration handles are NOT released here,
   * so call UnregisterFromMeshManager first when a manager still holds them.
   */
  @meta.adapted
  Clear()
  {
    this.meshes.length = 0;
    this.hasUpdated = false;
    this._revision++;
  }

  /**
   * Decodes a picking area id back to the SOF locator it came from.
   * @param {Number} areaId - mesh ordinal in the high 16 bits, locator index in the low 16 (the pairing AddMeshesToManager registers)
   * @returns {Array|null} [sofHullName, sofLocatorSetName, locatorIndex], or null when the mesh is unknown or carries no SOF hull name
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetSofSourceLocator(areaId)
  {
    const value = Number(areaId) >>> 0;
    const mesh = this.meshes[value >>> 16];
    if (!mesh || !mesh.sofHullName)
    {
      return null;
    }
    return [mesh.sofHullName, mesh.sofLocatorSetName, value & 0xffff];
  }

  /** Number of meshes currently held. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetMeshCount()
  {
    return this.meshes.length;
  }

  /**
   * Reports one mesh's authoring state as a positional tuple (Carbon's multiple out-params).
   * @param {Number} meshId - mesh index; RangeError when out of range
   * @returns {Array} [geometryPath, geometryResource, meshIndex, castsShadow, reflectionMode, areaCount, instanceCount]
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetMeshInfo(meshId)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    return [
      mesh.geometryPath,
      mesh.GetGeometryResource(),
      mesh.meshIndex,
      mesh.castsShadow,
      mesh.reflectionMode,
      mesh.areas.length,
      mesh.instances.length
    ];
  }

  /**
   * Reports one area of one mesh as a positional tuple (Carbon's multiple out-params).
   * @param {Number} meshId - mesh index; RangeError when out of range
   * @param {Number} areaId - area index within that mesh; RangeError when out of range
   * @returns {Array} [effect, batchType, areaIndex, areaCount] - the effect is the live reference
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetAreaInfo(meshId, areaId)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    const index = Number(areaId) >>> 0;
    if (index >= mesh.areas.length)
    {
      throw new RangeError(`EveChildInstancedMeshes area index ${index} is out of range`);
    }
    const area = mesh.areas[index];
    return [area.effect, area.batchType, area.areaIndex, area.areaCount];
  }

  /**
   * Whether the given mesh is currently displayed; throws RangeError for an
   * unknown mesh index.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  GetMeshDisplay(meshId)
  {
    return EveChildInstancedMeshes._GetMesh(this.meshes, meshId).display;
  }

  /**
   * Carbon EveChildInstancedMeshes::SetMeshDisplay (cpp:663-691): a toggle
   * clears the latch; turning a mesh OFF eagerly removes its sphere and
   * mesh-group handles - which is why AddMeshesToManager's display-off skip
   * does NOT clear the latch (the handles are already gone).
   *
   * Adapted: Handle invalidation after removal is explicit (Carbon's DataHandle is
   * invalidated by the manager by reference).
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  SetMeshDisplay(meshId, display)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    const next = !!display;
    if (mesh.display !== next)
    {
      mesh.display = next;
      this._allRegistered = false;
      if (!next)
      {
        if (mesh.sphereHandle !== null)
        {
          this._meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
          mesh.sphereHandle = null;
        }
        for (const area of mesh.areas)
        {
          if (area.meshGroupHandle !== null)
          {
            this._meshManager.RemoveMeshGroup(area.meshGroupHandle);
            area.meshGroupHandle = null;
          }
        }
      }
      this._revision++;
    }
  }

  /** Returns whether one instanced mesh inherits parent overlay effects. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetMeshInheritOverlayEffects(meshId)
  {
    return EveChildInstancedMeshes._GetMesh(this.meshes, meshId).inheritOverlayEffects;
  }

  /** Enables or disables parent-overlay inheritance for one mesh. */
  @be.mapMethodAndWrap()
  @meta.implemented
  SetMeshInheritOverlayEffects(meshId, inherit)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    const next = !!inherit;
    if (mesh.inheritOverlayEffects === next) return;

    mesh.inheritOverlayEffects = next;
    this._allRegistered = false;
    for (const area of mesh.areas)
    {
      if (area.meshGroupHandle === null) continue;
      this._meshManager.RemoveMeshGroup(area.meshGroupHandle);
      area.meshGroupHandle = null;
    }
  }

  /** Adds an overlay effect owned by one instanced mesh. */
  @be.mapMethodAndWrap()
  @meta.implemented
  AddMeshOverlayEffect(meshId, overlayEffect)
  {
    if (!overlayEffect) throw new TypeError("overlayEffect must not be null");
    EveChildInstancedMeshes._GetMesh(this.meshes, meshId).ownOverlayEffects.push(overlayEffect);
  }

  /** Removes an overlay effect owned by one instanced mesh. */
  @be.mapMethodAndWrap()
  @meta.implemented
  RemoveMeshOverlayEffect(meshId, overlayEffect)
  {
    const overlays = EveChildInstancedMeshes._GetMesh(this.meshes, meshId).ownOverlayEffects;
    const index = overlays.indexOf(overlayEffect);
    if (index !== -1) overlays.splice(index, 1);
  }

  /** Removes every overlay effect owned by one instanced mesh. */
  @be.mapMethodAndWrap()
  @meta.implemented
  ClearMeshOverlayEffects(meshId)
  {
    EveChildInstancedMeshes._GetMesh(this.meshes, meshId).ownOverlayEffects.length = 0;
  }

  /** Returns the number of overlay effects owned by one instanced mesh. */
  @be.mapMethodAndWrap()
  @meta.implemented
  GetMeshOverlayEffectCount(meshId)
  {
    return EveChildInstancedMeshes._GetMesh(this.meshes, meshId).ownOverlayEffects.length;
  }

  /**
   * Assigns one mesh's geometry resource, bumping the revision only when it
   * actually changes; registration waits for the next AddMeshesToManager pass.
   */
  @meta.adapted
  SetGeometryResource(meshId, geometry)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    if (mesh.GetGeometryResource() !== geometry)
    {
      mesh.SetGeometryResource(geometry);
      this._revision++;
    }
  }

  /**
   * Returns a detached snapshot of one mesh - instance transforms cloned, areas
   * shallow-copied, geometry resource shared by reference - so callers can read
   * it without touching live registration state.
   */
  @meta.adapted
  GetMeshData(meshId)
  {
    const mesh = EveChildInstancedMeshes._GetMesh(this.meshes, meshId);
    return EveChildInstancedMeshes._CloneMesh(mesh);
  }

  /**
   * Monotonic counter bumped by every structural change (AddMesh, Clear,
   * SetMeshDisplay, SetGeometryResource, SetShaderOption), for consumers caching
   * derived data.
   */
  @meta.implemented
  GetRevision()
  {
    return this._revision;
  }

  /** Reports whether any active own or inherited overlay has a transparent pass. */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    for (const overlay of this._parentOverlayEffects ?? [])
    {
      if (this._AnyMeshInheritsOverlayEffects() && overlay.HasTransparentArea()) return true;
    }
    for (const mesh of this.meshes)
    {
      for (const overlay of mesh.ownOverlayEffects)
      {
        if (overlay.HasTransparentArea()) return true;
      }
    }
    return false;
  }

  /** Returns the squared camera distance used to sort transparent overlays. */
  @blue.method
  @meta.adapted
  GetSortValue()
  {
    const viewPosition = Tr2Renderer.GetViewPosition();
    return Math.hypot(
      viewPosition[0] - this.worldTransform[12],
      viewPosition[1] - this.worldTransform[13],
      viewPosition[2] - this.worldTransform[14]);
  }

  /** Exposes stable per-instance CPU record pairs for this frame's overlay batches. */
  @blue.method
  @meta.adapted
  GetPerObjectData(_accumulator = null)
  {
    if ((!this._parentOverlayEffects || !this._AnyMeshInheritsOverlayEffects()) &&
      !this._HasAnyOwnOverlayEffects() && this._partDamageOverlays.size === 0) return null;

    let first = null;
    for (const mesh of this.meshes)
    {
      if (!mesh.overlayPods) continue;
      if (!mesh.display || !this._MeshNeedsOverlayPods(mesh))
      {
        for (const pod of mesh.overlayPods) pod.framePod = null;
        continue;
      }
      for (const pod of mesh.overlayPods)
      {
        pod.framePod = { vs: pod.vs, ps: pod.ps };
        first ??= pod.framePod;
      }
    }
    return first;
  }

  /** Emits child-owned then inherited overlays per visible instance and LOD. */
  @blue.method
  @meta.adapted
  GetBatches(
    batches,
    batchType,
    _perObjectData = null,
    reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.hasUpdated) return false;
    let committed = false;

    for (const mesh of this.meshes)
    {
      const inherited = this._parentOverlayEffects && mesh.inheritOverlayEffects
        ? this._parentOverlayEffects
        : null;
      const hasDamageOverlays = this._MeshHasDamageOverlays(mesh);
      if ((!inherited?.length && !mesh.ownOverlayEffects.length && !hasDamageOverlays) ||
        !mesh.display || !mesh.overlayPods) continue;
      if (reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION && !EntityComponents.shouldReflect(mesh.reflectionMode)) continue;

      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood() === false) continue;
      if (!mesh.overlayAreaBlocksBuilt)
      {
        EveChildInstancedMeshes.rebuildOverlayAreaBlocks(mesh);
        mesh.overlayAreaBlocksBuilt = true;
      }

      for (let index = 0; index < mesh.overlayPods.length; index++)
      {
        const pod = mesh.overlayPods[index];
        if (!pod.framePod) continue;
        const sphere = mesh.instanceSpheres[index];
        if (!sphere) continue;
        if (this._lastCameraFrustum &&
          this._lastCameraFrustum.IsSphereVisible__CenterRadius(sphere.center, sphere.radius) === false) continue;

        const screenSize = this._lastCameraFrustum
          ? this._lastCameraFrustum.GetPixelSizeAccrossEst__CenterRadius(sphere.center, sphere.radius) * this._lastInvLodFactor
          : Infinity;
        const lod = geometry.GetMeshLod__ScreenSize(mesh.meshIndex, screenSize);

        // Carbon cpp:1404-1413: the part's damage pass comes first, under
        // its own and the inherited overlays.
        if (hasDamageOverlays)
        {
          const damageShader = this._FindPartDamageOverlay(mesh.partTags[index])?.GetArmorDamageShader(batchType);
          if (damageShader)
          {
            committed = EveMeshOverlayEffect.emitDamageOverlayBatches(
              batches, pod.framePod, damageShader,
              mesh.overlayAreaBlocks, geometry, mesh.meshIndex, lod) || committed;
          }
        }
        if (mesh.ownOverlayEffects.length)
        {
          committed = EveMeshOverlayEffect.emitOverlayBatches(
            batches, pod.framePod, batchType, mesh.ownOverlayEffects,
            mesh.overlayAreaBlocks, geometry, mesh.meshIndex, lod) || committed;
        }
        if (inherited?.length)
        {
          committed = EveMeshOverlayEffect.emitOverlayBatches(
            batches, pod.framePod, batchType, inherited,
            mesh.overlayAreaBlocks, geometry, mesh.meshIndex, lod) || committed;
        }
      }
    }
    return committed;
  }

  /** Carbon EveChildInstancedMeshes::RegisterComponents (cpp:36-43):
   * unconditional InstancedMeshProvider + ShadowCaster leaf
   * self-registration. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.InstancedMeshProvider, this);
      registry.RegisterComponent(EveComponentType.ShadowCaster, this);
    }
  }

  /** Carbon EveChildInstancedMeshes::UnRegisterComponents (cpp:45-48) only
   * calls UnregisterFromMeshManager; own components were already removed by
   * EveEntity::UnRegister (EveEntity.cpp:90). */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    this.UnregisterFromMeshManager();
  }

  /**
   * Carbon EveChildInstancedMeshes::UnregisterFromMeshManager (cpp:50-71):
   * every registered mesh-group / sphere-group / per-object handle is removed
   * through the manager that issued the opaque handles, then the latch clears.
   *
   * Adapted: Handle invalidation after removal is explicit (Carbon's DataHandle is
   * invalidated by the manager by reference).
   */
  @blue.method
  @meta.adapted
  UnregisterFromMeshManager()
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          this._meshManager.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
        }
      }
      if (mesh.sphereHandle !== null)
      {
        this._meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
        mesh.sphereHandle = null;
      }
    }
    if (this._perObjectDataHandle !== null)
    {
      this._meshManager.RemovePerObjectData(this._perObjectDataHandle);
      this._perObjectDataHandle = null;
    }
    if (this._perObjectDataNoClipHandle !== null)
    {
      this._meshManager.RemovePerObjectData(this._perObjectDataNoClipHandle);
      this._perObjectDataNoClipHandle = null;
    }
    this._meshManager = null;
    this._allRegistered = false;
  }

  /**
   * Carbon EveChildInstancedMeshes::AddMeshesToManager (cpp:741-828), the
   * InstancedMeshProvider entry the engine's CollectMeshes drives
   * (EveInstancedMeshManager.cpp:80-82; scene EveSpaceScene.cpp:1525).
   * Contract quirks preserved: nothing registers before the first update
   * pass (cpp:743); switching managers - read off the per-object handle's
   * owner - tears EVERYTHING down BEFORE the latch early-out (cpp:747-754);
   * the no-clip per-object record registers inside the mesh loop, after a
   * mesh passes the readiness checks (cpp:789-792); the latch is set optimistically and
   * cleared by ANY not-ready mesh/area so the per-frame caller retries until
   * geometry streams in - EXCEPT display-off meshes, which skip WITHOUT
   * clearing it (their handles were already removed by SetMeshDisplay);
   * handles are add-once (partial re-registration after SetShaderOption /
   * display toggles); an area-level effect failure clears the latch while
   * the mesh's sphere group STAYS registered (Carbon's asymmetry);
   * pickingOwnerIndex is the mesh ordinal (pairs with GetSofSourceLocator's
   * meshIndex<<16 decode).
   *
   * Adapted: Manager allocation returns opaque handles instead of filling native output
   * parameters. Geometry presence and IsGood replace the native combined-vertex-declaration
   * gate; the declaration argument is zero and the JavaScript object is the picking owner.
   */
  @blue.method
  @meta.adapted
  AddMeshesToManager(manager)
  {
    if (!this.hasUpdated)
    {
      return;
    }
    // Carbon cpp:747: the manager switch is read off the per-object handle's owner.
    if (this._perObjectDataHandle !== null && this._perObjectDataHandle.owner !== manager)
    {
      this.UnregisterFromMeshManager();
    }
    if (this._allRegistered)
    {
      return;
    }

    this._meshManager = manager;

    if (this._perObjectDataHandle === null)
    {
      this._perObjectDataHandle = manager.AddPerObjectData(this._perObjectData);
    }

    this._allRegistered = true;
    for (let meshIndex = 0; meshIndex < this.meshes.length; meshIndex++)
    {
      const mesh = this.meshes[meshIndex];
      if (!mesh.display)
      {
        continue;
      }
      const geometry = mesh.GetGeometryResource();
      // Carbon rebuilds the declaration when the geometry finishes loading
      // (RebuildCachedData, an IBlueAsyncResNotifyTarget callback). That
      // notification is not ported, so the first pass that finds the
      // geometry good rebuilds it here.
      if (geometry && mesh.combinedVertexDeclaration === Tr2EffectStateManager.Unknown && geometry.IsGood())
      {
        this.RebuildCachedData(geometry);
      }
      // Carbon cpp:766-770: no geometry or no combined declaration yet.
      if (!geometry || mesh.combinedVertexDeclaration === Tr2EffectStateManager.Unknown)
      {
        this._allRegistered = false;
        continue;
      }
      // cpp:771-775.
      if (!geometry.IsGood())
      {
        this._allRegistered = false;
        continue;
      }
      if (!mesh.instances.length)
      {
        this._allRegistered = false;
        continue;
      }
      if (mesh.instances.length !== mesh.instanceSpheres.length)
      {
        this._allRegistered = false;
        continue;
      }

      // Carbon cpp:789-792: the no-clip record registers inside the loop, for
      // the first mesh that is ready to register and opts out of the clip.
      if (!mesh.inheritOverlayEffects && this._perObjectDataNoClipHandle === null)
      {
        this._perObjectDataNoClipHandle = manager.AddPerObjectData(this._perObjectDataNoClip);
      }

      if (mesh.sphereHandle === null)
      {
        mesh.sphereHandle = manager.AddBoundingSphereGroup(
          mesh.worldBoundingSphere,
          mesh.flags,
          mesh.instanceSpheres,
          mesh.instanceSpheres.length
        );
      }

      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          continue;
        }
        // Asked before registering: renews it, and a not-good effect retries later.
        if (!area.effect || !area.effect.IsGood())
        {
          this._allRegistered = false;
          continue;
        }
        area.meshGroupHandle = manager.AddMeshGroup__StaticPerInstanceData(
          geometry,
          mesh.combinedVertexDeclaration,
          area.batchType,
          mesh.meshIndex,
          area.areaIndex,
          area.areaCount,
          area.reversed,
          area.effect,
          area.effectHash,
          mesh.inheritOverlayEffects ? this._perObjectDataHandle : this._perObjectDataNoClipHandle,
          mesh.sphereHandle,
          mesh.instances,
          mesh.instances.length,
          this,
          meshIndex
        );
      }
    }
  }

  /** Carbon EveChildInstancedMeshes::IsCastingShadow (cpp:73-76) always
   * returns false (instanced shadows cull per instance group); presence
   * satisfies the "ShadowCaster" duck contract. */
  @meta.implemented
  IsCastingShadow__ShadowFrustum(..._args)
  {
    return false;
  }

  /** Carbon EveChildInstancedMeshes::GetShadowBatches (cpp:78-80) is an
   * intentional no-op (the instanced mesh manager emits the batches). */
  @blue.method
  @meta.noop
  GetShadowBatches(..._args)
  {
  }

  /** Carbon EveChildInstancedMeshes::GetShadowPerObjectData (cpp:82-85)
   * returns null (per-object data flows through the mesh manager). */
  @blue.method
  @meta.implemented
  GetShadowPerObjectData(..._args)
  {
    return null;
  }

  /**
   * Resolves a mesh index against the list, throwing RangeError rather than
   * returning undefined so every public accessor fails loudly.
   */
  /**
   * Carbon's static EveChildInstancedMeshes::RebuildOverlayAreaBlocks( Mesh& ) (cpp:1264-1286):
   * rebuilds the mesh's own two cached overlay block lists from its authored area descriptors.
   */
  static rebuildOverlayAreaBlocks(mesh)
  {
    const out = mesh.overlayAreaBlocks;
    for (const blocks of out) blocks.length = 0;

    for (const area of mesh.areas)
    {
      if (area.batchType === TriBatchType.TRIBATCHTYPE_OPAQUE ||
        area.batchType === TriBatchType.TRIBATCHTYPE_TRANSPARENT ||
        area.batchType === TriBatchType.TRIBATCHTYPE_DECAL)
      {
        out[EveMeshOverlayEffect.OverlayType.TYPE_ALL].push(
          new TriRenderBatchAreaBlock(area.areaIndex, area.areaCount));
      }

      if (area.batchType === TriBatchType.TRIBATCHTYPE_OPAQUE)
      {
        out[EveMeshOverlayEffect.OverlayType.TYPE_OPAQUEONLY].push(
          new TriRenderBatchAreaBlock(area.areaIndex, area.areaCount));
      }
    }

    for (const blocks of out) TriRenderBatchAreaBlock.Optimize(blocks);
  }

  /**
   * Looks up a mesh after converting its index to an unsigned 32-bit value.
   *
   * @param {EveChildInstancedMesh[]} meshes The owned mesh records.
   * @param {number} meshId The requested mesh index.
   * @returns {EveChildInstancedMesh} The indexed mesh record.
   * @throws {RangeError} When the converted index is outside the array.
   */
  static _GetMesh(meshes, meshId)
  {
    const index = Number(meshId) >>> 0;
    if (index >= meshes.length)
    {
      throw new RangeError(`EveChildInstancedMeshes mesh index ${index} is out of range`);
    }
    return meshes[index];
  }

  /**
   * Builds an area record from a plain duck, defaulting areaCount to 1 and
   * caching the effect hash the manager registers the mesh group under.
   */
  static _CreateArea(value)
  {
    const source = value ?? {};
    const area = new EveChildInstancedMeshArea();
    area.effect = source.effect ?? null;
    area.batchType = Number(source.batchType) >>> 0;
    area.areaIndex = Number(source.areaIndex) >>> 0;
    area.areaCount = source.areaCount === undefined ? 1 : Number(source.areaCount) >>> 0;
    area.alphaCutout = !!source.alphaCutout;
    area.reversed = !!source.reversed;
    area.effectHash = EveChildInstancedMeshes._GetEffectHash(area.effect);
    return area;
  }

  /**
   * Carbon RebuildCachedData (cpp:702-739): for each mesh drawing `resource`,
   * the combined vertex declaration - the mesh's own elements on stream 0
   * plus the instance record's inputs on stream 1 at step rate 1: three
   * FLOAT32_4 rows at TEXCOORD8-10, three more at TEXCOORD11-13, a UINT32_1
   * at TEXCOORD14 and a UINT32_2 at TEXCOORD15. A mesh without elements
   * keeps UNINITIALIZED_DECLARATION and does not register.
   *
   * Carbon quirk, reproduced: `m_nextOffset[1] = 0` after TEXCOORD10
   * (cpp:719) restarts the stream-1 ledger, so TEXCOORD11-13 read the same
   * bytes as TEXCOORD8-10 - a static instance record's world transform
   * stands in as its previous-frame transform. That looks deliberate (a
   * static record has no previous transform), so it is not a CE.
   *
   * Adapted: the trigger, since IBlueAsyncResNotifyTarget is not ported (see
   * AddMeshesToManager); the mesh's elements are the geometry payload's
   * declaration (GetMeshVertexElements) rather than the handle Carbon's
   * loader stored; and the raytracing meshes Carbon frees here (cpp:729-737)
   * are not ported.
   * @param {TriGeometryRes} resource The geometry that finished loading.
   */
  @meta.adapted
  RebuildCachedData(resource)
  {
    for (const mesh of this.meshes)
    {
      if (mesh.GetGeometryResource() !== resource)
      {
        continue;
      }
      mesh.combinedVertexDeclaration = Tr2EffectStateManager.Unknown;

      const meshElements = CarbonVertexElements(resource.GetMeshVertexElements(mesh.meshIndex));
      if (meshElements.length === 0)
      {
        continue;
      }
      const instance = new Tr2VertexDefinition();
      instance.Add("FLOAT32_4", "TEXCOORD", 8, 1, 1);
      instance.Add("FLOAT32_4", "TEXCOORD", 9, 1, 1);
      instance.Add("FLOAT32_4", "TEXCOORD", 10, 1, 1);
      instance.nextOffset[1] = 0;
      instance.Add("FLOAT32_4", "TEXCOORD", 11, 1, 1);
      instance.Add("FLOAT32_4", "TEXCOORD", 12, 1, 1);
      instance.Add("FLOAT32_4", "TEXCOORD", 13, 1, 1);
      instance.Add("UINT32_1", "TEXCOORD", 14, 1, 1);

      instance.Add("UINT32_2", "TEXCOORD", 15, 1, 1);
      const elements = meshElements.map(item => ({ ...item }));
      for (const item of instance.items)
      {
        elements.push(item);
      }
      mesh.combinedVertexDeclaration = Tr2EffectStateManager.getVertexDeclarationHandle(elements);
    }
  }

  /**
   * Deep-copies a mesh into a plain object for GetMeshData: instance transforms
   * cloned, areas spread-copied, the geometry resource shared by reference.
   */
  static _CloneMesh(mesh)
  {
    return {
      geometryPath: mesh.geometryPath,
      geometry: mesh.GetGeometryResource(),
      castsShadow: mesh.castsShadow,
      reflectionMode: mesh.reflectionMode,
      meshIndex: mesh.meshIndex,
      areas: mesh.areas.map(area => ({ ...area })),
      instances: mesh.instances.map(instance => ({
        transform: mat4.clone(instance.transform),
        sphereIndex: instance.sphereIndex,
        mirrored: instance.mirrored,
        pickingMeshIndex: instance.pickingMeshIndex,
        pickingInstanceIndex: instance.pickingInstanceIndex
      })),
      partTags: mesh.partTags.slice(),
      sofHullName: mesh.sofHullName,
      sofLocatorSetName: mesh.sofLocatorSetName,
      display: mesh.display
    };
  }

  /**
   * Reads an owned effect's stable registration hash; null areas retain the
   * Carbon zero hash until their effect arrives.
   */
  static _GetEffectHash(effect)
  {
    return effect ? Number(effect.GetHashValue()) || 0 : 0;
  }

  /** Carbon EveChildInstancedMeshes::MeshArea (public, EveChildInstancedMeshes.h:74-84). */
  static MeshArea = EveChildInstancedMeshArea;

  /** Carbon EveChildInstancedMeshes::Mesh (private, EveChildInstancedMeshes.h:142-188). */
  static Mesh = EveChildInstancedMesh;

}

// EveChildInstancedMeshes_Blue.cpp: native exposure.
