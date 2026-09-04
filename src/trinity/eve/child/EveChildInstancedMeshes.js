// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { EveComponentType, ShouldReflect } from "../EveComponentTypes.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { RawData } from "../../core/rawData/RawData.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import {
  CollectInstancedOverlayAreaBlocks,
  EmitOverlayBatches
} from "../overlays/overlayBatches.js";
import { withITr2Renderable } from "../../core/ITr2Renderable.js";

/** Carbon EveInstancedMeshManager::InstanceFlags (EveInstancedMeshManager.h:
 * 13-26, cpp:998-1048): a uint32 bitfield - bit (1 << batchType) per present
 * batch type, CASTS_SHADOW = 1 << 30, RENDER_IN_REFLECTION = 1 << 31. */
export const INSTANCE_FLAG_CASTS_SHADOW = 0x40000000;
export const INSTANCE_FLAG_RENDER_IN_REFLECTION = 0x80000000;

const POSITION_SCRATCH = vec3.create();
const OVERLAY_LOCAL_SCRATCH = mat4.create();
const OVERLAY_WORLD_SCRATCH = mat4.create();
const OVERLAY_WORLD_LAST_SCRATCH = mat4.create();
const OVERLAY_INV_WORLD_SCRATCH = mat4.create();
const OVERLAY_INV_LOCAL_SCRATCH = mat4.create();
const OVERLAY_CLIP_SCRATCH = vec3.create();


/**
 * One shader area of an instanced mesh: the effect, its batch type, the area
 * range within the mesh, its cached effect hash and the mesh-group handle it is
 * registered under.
 */
@type.define({ className: "EveChildInstancedMeshArea", family: "eve/child" })
export class EveChildInstancedMeshArea extends CjsModel
{
  @io.rebuild("instanceBuffer")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  batchType = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  areaIndex = 0;

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  areaCount = 1;

  /** Carbon MeshArea::alphaCutout (h:78) - one-sided cutout areas are ignored
   * for backface classification when raycasting occluders. */
  @io.persist
  @type.boolean
  alphaCutout = false;

  /** Carbon MeshArea::reversed (h:79) - winding-reversed areas flip the
   * backface test during occluder raycasts. */
  @io.persist
  @type.boolean
  reversed = false;

  @io.read
  @type.uint64
  effectHash = 0;

  /** Carbon MeshArea::meshGroupHandle (EveChildInstancedMeshes.h:72) - an
   * opaque manager registration handle; runtime state, not persisted. */
  meshGroupHandle = null;
}


/**
 * A single placement of an instanced mesh: its transform and the index of its
 * cull sphere in the owning mesh's instance sphere list.
 */
@type.define({ className: "EveChildInstancedMeshInstance", family: "eve/child" })
export class EveChildInstancedMeshInstance extends CjsModel
{
  @io.rebuild("instanceBuffer")
  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  sphereIndex = 0;
}


/**
 * One geometry-and-areas record inside an EveChildInstancedMeshes child, holding
 * its instance placements, per-instance world cull spheres, instance flags and
 * manager registration handles.
 */
@type.define({ className: "EveChildInstancedMesh", family: "eve/child" })
export class EveChildInstancedMesh extends CjsModel
{
  @io.persist
  @type.string
  geometryPath = "";

  @io.persist
  @type.boolean
  castsShadow = false;

  @io.persist
  @type.int32
  reflectionMode = 3;

  @io.persist
  @type.uint32
  meshIndex = 0;

  @io.persist
  @type.list("EveChildInstancedMeshArea")
  areas = [];

  @io.persist
  @type.list("EveChildInstancedMeshInstance")
  instances = [];

  /** Carbon's one-to-one modular ownership tag array for instances. */
  @io.persist
  @type.array("uint32")
  partTags = [];

  @io.persist
  @type.string
  sofHullName = "";

  @io.persist
  @type.string
  sofLocatorSetName = "";

  @io.persist
  @type.boolean
  display = true;

  @io.persist
  @type.boolean
  inheritOverlayEffects = true;

  @io.persist
  @type.list("EveMeshOverlayEffect")
  ownOverlayEffects = [];

  overlayAreaBlocks = [ [], [] ];

  overlayAreaBlocksBuilt = false;

  overlayPods = null;

  /** Carbon Mesh::sphereHandle (h:110) - manager registration handle;
   * runtime state, not persisted. */
  sphereHandle = null;

  /** Carbon Mesh::worldBoundingSphere - stamped by UpdateAsyncronous
   * (cpp:270); the TriFrustum sphere-duck shape. */
  worldBoundingSphere = { center: vec3.create(), radius: 0 };

  /** Carbon Mesh::instanceSpheres - per-instance world cull spheres, stamped
   * by UpdateAsyncronous (cpp:259-269). */
  instanceSpheres = [];

  /** Carbon Mesh::flags (InstanceFlags uint32) - batch-type bits stamped at
   * AddMesh (cpp:422-425), CASTS_SHADOW at AddMesh (cpp:418-421),
   * RENDER_IN_REFLECTION refreshed each async pass (cpp:251). */
  flags = 0;

  #geometry = null;

  /**
   * Returns the geometry resource backing this mesh, or null while none has been
   * assigned; the mesh does not register with the manager until it is present
   * and good.
   */
  GetGeometryResource()
  {
    return this.#geometry;
  }

  /**
   * Assigns the geometry resource this mesh renders from; a nullish value clears
   * it. Runtime state, deliberately not persisted.
   */
  SetGeometryResource(resource)
  {
    this.#geometry = resource ?? null;
  }
}


/**
 * Space-object child that hands batches of instanced meshes to the engine's
 * instanced mesh manager, owning their registration handles, instance flags and
 * world cull bounds.
 */
@type.define({ className: "EveChildInstancedMeshes", family: "eve/child" })
export class EveChildInstancedMeshes extends withITr2Renderable(EveSpaceObjectChild)
{
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.mat4
  worldTransform = mat4.create();

  @io.read
  @type.boolean
  hasUpdated = false;

  @io.persist
  @type.list("EveChildInstancedMesh")
  meshes = [];

  #revision = 0;

  /** Carbon m_perObjectDataHandle (h:143) - manager registration handle. */
  #perObjectDataHandle = null;

  /**
   * Carbon m_perObjectData (EveSpacePerObjectData): the PERSISTENT per-instance
   * record the mesh manager uploads into its structured buffer.
   */
  #perObjectData = RawData.create("EveSpacePerObjectData");

  /** Base-hull record used by meshes that opt out of the parent's clip. */
  #perObjectDataNoClip = RawData.create("EveSpacePerObjectData");

  #perObjectDataNoClipHandle = null;

  /** Engine manager that owns every currently retained opaque handle. */
  #meshManager = null;

  #parentOverlayEffects = null;

  #lastCameraFrustum = null;

  #lastInvLodFactor = 1;

  static #inverseScratch = mat4.create();

  static #customMaskScratch = mat4.create();

  /** EVE_SPACEOBJECT_CUSTOWMASK_MAX (EveSpaceObject2.h:49). */
  static CUSTOM_MASK_COUNT = 2;

  /** Carbon m_allRegistered (h:147) - the AddMeshesToManager retry latch:
   * set optimistically each pass, cleared by ANY not-ready mesh/area so the
   * per-frame CollectMeshes retries until geometry streams in. */
  #allRegistered = false;

  /**
   * The authored name, persisted with the child and used to identify it in the
   * parent graph.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Sets the authored child name, coercing nullish to the empty string. */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Carbon EveChildInstancedMeshes::UpdateVisibility (cpp:183-186) only caches
   * the frame's camera frustum for later use; the JS port has no consumer for
   * that cache, so the frame hook does nothing.
   */
  @carbon.method
  @impl.adapted
  UpdateVisibility(updateContext)
  {
    this.#lastCameraFrustum = updateContext.GetFrustum();
    this.#lastInvLodFactor = updateContext.GetInvLodFactor();
  }

  /**
   * Carbon EveChildInstancedMeshes::GetRenderables (cpp:188-190) collects
   * nothing: the instanced mesh manager emits the draws, so the accumulator
   * comes back unchanged.
   */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    if (this.hasUpdated &&
      ((this.#parentOverlayEffects?.length && this.#AnyMeshInheritsOverlayEffects()) ||
        this.#HasAnyOwnOverlayEffects()))
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
  @carbon.method
  @impl.implemented
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
  #UpdatePerObjectData(parent)
  {
    const record = this.#perObjectData;

    // Recover the previous logical transform from its stored transposed bytes,
    // then encode it into worldTransformLast.
    mat4.transpose(EveChildInstancedMeshes.#inverseScratch, record.GetTransposed("worldTransform"));
    record.SetAndTranspose("worldTransformLast", EveChildInstancedMeshes.#inverseScratch);
    record.SetAndTranspose("worldTransform", this.worldTransform);

    // cpp:214 inverts the transposed matrix; by carbon-math-conventions F2 that
    // equals the transpose of the logical inverse, which is what this produces.
    const inverse = EveChildInstancedMeshes.#inverseScratch;
    if (!mat4.invert(inverse, this.worldTransform))
    {
      mat4.identity(inverse);
    }
    record.SetAndTranspose("invWorldTransform", inverse);

    if (!parent)
    {
      this.#perObjectDataNoClip.CopyFrom(record);
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
      mat4.transpose(
        EveChildInstancedMeshes.#customMaskScratch,
        vs.GetTransposedIndex("customMaskMatrix", slot));
      record.SetAndTransposeIndex(
        "customMaskMatrix", slot, EveChildInstancedMeshes.#customMaskScratch);
      record.SetIndex("customMaskData", slot, vs.GetIndex("customMaskData", slot));
      record.SetIndex("customMaskMaterialIDs", slot, ps.GetIndex("customMaskMaterialIDs", slot));
      record.SetIndex("customMaskTargets", slot, ps.GetIndex("customMaskTargets", slot));
    }

    // cpp:238: the PS record's coefficients land in the record's shLighting.
    record.Set("shLighting", ps.Get("shLightingCoefficients"));

    this.#perObjectDataNoClip.CopyFrom(record);
    this.#perObjectDataNoClip.Set("clipRadiusSq", [ 0 ]);
    this.#perObjectDataNoClip.Set("clipRadius2Sq", [ 0 ]);
    this.#perObjectDataNoClip.Set("clipSphereFactor", [ 0 ]);
    this.#perObjectDataNoClip.Set("clipSphereFactor2", [ 0 ]);
    return { vs, ps };
  }

  /**
   * Stamps the child's world transform from the parent's localToWorldTransform
   * (Carbon cpp:197-200); every per-instance cull sphere the async pass builds
   * is derived from it.
   */
  @carbon.method
  @impl.implemented
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
  }

  /** Carbon EveChildInstancedMeshes::UpdateAsyncronous (cpp:202-328), the CPU
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
   * (cpp:272-278), and the hasUpdated stamp (cpp:281). */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity owns the CPU per-object field copy; the raytracing mesh build (cpp:283-327) remains engine-owned. Mesh bounds come from a GetMeshData duck ({minBounds, maxBounds}) and meshes without one are skipped fail-closed.")
  UpdateAsyncronous(_updateContext, params)
  {
    const previousWorldTransform = mat4.create();
    mat4.transpose(previousWorldTransform, this.#perObjectData.GetTransposed("worldTransform"));
    const parentRecords = this.#UpdatePerObjectData(params?.spaceObjectParent ?? null);
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
      mesh.flags = ShouldReflect(mesh.reflectionMode)
        ? (mesh.flags | INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0
        : (mesh.flags & ~INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0;

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
          this.#meshManager.SetSphereGroupBounds(
            mesh.sphereHandle, mesh.worldBoundingSphere, mesh.flags);
        }
      }
    }

    const parent = params?.spaceObjectParent ?? null;
    this.#parentOverlayEffects = Array.isArray(parent?.overlayEffects) && parent.overlayEffects.length
      ? parent.overlayEffects
      : null;
    if ((this.#parentOverlayEffects && this.#AnyMeshInheritsOverlayEffects()) ||
      this.#HasAnyOwnOverlayEffects())
    {
      this.#UpdateOverlayInstanceData(parentRecords.vs, parentRecords.ps, previousWorldTransform);
    }

    this.hasUpdated = true;
  }

  /** Builds one persistent VS/PS record pair per authored instance. */
  #UpdateOverlayInstanceData(parentVs, parentPs, previousWorldTransform)
  {
    for (const mesh of this.meshes)
    {
      if (!mesh.instances.length || !mesh.display || !this.#MeshHasActiveOverlayEffects(mesh)) continue;

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
      }
    }
  }

  /** Reports whether any instanced mesh owns an overlay effect. */
  #HasAnyOwnOverlayEffects()
  {
    return this.meshes.some(mesh => mesh.ownOverlayEffects.length !== 0);
  }

  /** Reports whether any instanced mesh inherits its parent's overlays. */
  #AnyMeshInheritsOverlayEffects()
  {
    return this.meshes.some(mesh => mesh.inheritOverlayEffects);
  }

  /** Reports whether one mesh has an own or inherited overlay path. */
  #MeshHasActiveOverlayEffects(mesh)
  {
    return mesh.ownOverlayEffects.length !== 0 ||
      (this.#parentOverlayEffects !== null && mesh.inheritOverlayEffects);
  }

  /**
   * Returns the child's world transform as stamped by the last sync update.
   * @param {Float32Array} [out] - caller-owned; when given, receives a copy and is returned instead of the live matrix
   * @returns {Float32Array} out when supplied, otherwise the live internal matrix
   */
  @carbon.method
  @impl.implemented
  GetLocalToWorldTransform(out = null)
  {
    if (out)
    {
      return mat4.copy(out, this.worldTransform);
    }
    return this.worldTransform;
  }

  /**
   * Carbon EveChildInstancedMeshes::Setup (cpp:335-337) is an intentional no-op:
   * placement comes from the authored per-instance transforms, not from an SRT
   * setup.
   */
  @carbon.method
  @impl.implemented
  Setup()
  {
  }

  /**
   * Carbon EveChildInstancedMeshes::ChangeLOD (cpp:339-341) is an intentional
   * no-op; the child keeps no LOD state.
   */
  @carbon.method
  @impl.implemented
  ChangeLOD()
  {
  }

  /**
   * Accepts and discards the placement origin; this child has no Carbon origin
   * field and stores none.
   */
  @carbon.method
  @impl.adapted
  SetOrigin()
  {
  }

  /**
   * Returns false, so owners treat this child as subject to normal activation
   * gating.
   */
  @carbon.method
  @impl.implemented
  IsAlwaysOn()
  {
    return false;
  }

  /** Carbon EveChildInstancedMeshes::SetShaderOption (cpp:343-359): flips the
   * option and refreshes the effect hash on every area, then removes any
   * registered mesh-group handle and clears the latch - so the groups
   * re-register with the NEW effectHash on the next AddMeshesToManager pass.
   * Sphere/per-object handles deliberately stay registered. */
  @carbon.method
  @impl.adapted
  @impl.reason("Handle invalidation after manager removal is explicit in JavaScript; the option write, hash refresh and registration lifecycle otherwise follow Carbon.")
  SetShaderOption(name, value)
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        area.effect.SetOption(name, value);
        area.effectHash = EveChildInstancedMeshes.#GetEffectHash(area.effect);
        if (area.meshGroupHandle !== null)
        {
          this.#meshManager.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
          this.#allRegistered = false;
        }
      }
    }
    this.#revision++;
  }

  /**
   * Appends one instanced mesh: normalizes the area ducks, copies the instance transforms, stamps CASTS_SHADOW plus one flag bit per area batch type (Carbon cpp:418-425), and clears the registration latch so the next AddMeshesToManager pass picks it up.
   * @param {Iterable} areas - area ducks ({effect, batchType, areaIndex, areaCount})
   * @param {Iterable<Float32Array>} instanceTransforms - 16-value matrices; copied, not retained
   * @param {Number} partTag - modular owner shared by every appended instance
   * @returns {Boolean} false when no areas or no instances were supplied (nothing is added)
   */
  @carbon.method
  @impl.adapted
  AddMesh(
    geometryPath,
    castsShadow,
    reflectionMode,
    meshIndex,
    areas,
    instanceTransforms,
    sofHullName = "",
    sofLocatorSetName = "",
    partTag = 0
  )
  {
    const sourceAreas = Array.from(areas ?? []);
    const sourceTransforms = Array.from(instanceTransforms ?? []);
    if (!sourceAreas.length || !sourceTransforms.length)
    {
      return false;
    }

    const normalizedAreas = sourceAreas.map(area => EveChildInstancedMeshes.#CreateArea(area));
    const instances = sourceTransforms.map((transform, sphereIndex) =>
    {
      if (!transform || transform.length !== 16)
      {
        throw new TypeError("EveChildInstancedMeshes instance transforms must contain 16 values");
      }
      const instance = new EveChildInstancedMeshInstance();
      mat4.copy(instance.transform, transform);
      instance.sphereIndex = sphereIndex;
      return instance;
    });

    const mesh = new EveChildInstancedMesh();
    mesh.geometryPath = String(geometryPath ?? "");
    mesh.castsShadow = !!castsShadow;
    mesh.reflectionMode = reflectionMode === undefined ? 3 : Number(reflectionMode) | 0;
    mesh.meshIndex = Number(meshIndex) >>> 0;
    mesh.areas = normalizedAreas;
    mesh.instances = instances;
    mesh.partTags = instances.map(() => Number(partTag) >>> 0);
    mesh.sofHullName = String(sofHullName ?? "");
    mesh.sofLocatorSetName = String(sofLocatorSetName ?? "");
    // Carbon (cpp:418-425): the CASTS_SHADOW flag and one bit per area batch
    // type are stamped at add time; RENDER_IN_REFLECTION is refreshed each
    // async pass. cpp:428 clears the registration latch.
    if (mesh.castsShadow)
    {
      mesh.flags = (mesh.flags | INSTANCE_FLAG_CASTS_SHADOW) >>> 0;
    }
    for (const area of mesh.areas)
    {
      mesh.flags = (mesh.flags | (1 << area.batchType)) >>> 0;
    }
    this.meshes.push(mesh);
    this.#allRegistered = false;
    this.#revision++;
    return true;
  }

  /**
   * Removes every instance owned by a modular part, dropping empty meshes and
   * invalidating manager registrations.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript explicitly nulls manager handles after removal; Carbon invalidates them by reference.")
  RemoveInstancesByPartTag(partTag)
  {
    const tag = Number(partTag) >>> 0;
    let changed = false;
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

      if (mesh.sphereHandle !== null)
      {
        this.#meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
        mesh.sphereHandle = null;
      }
      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          this.#meshManager.RemoveMeshGroup(area.meshGroupHandle);
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
      this.#allRegistered = false;
      this.#revision++;
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
  @carbon.method
  @impl.implemented
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
   * Overwrites the transform of every instance owned by a modular part with an
   * ABSOLUTE new transform (Carbon EveChildInstancedMeshes.cpp:591-605,
   * PLAT-11963). Carbon writes only the instance transform: no dirty flag, no
   * handle teardown - the per-frame async pass refreshes the cull spheres from
   * the live transforms, and the per-part filter lives HERE, not at the call
   * site (the shared child carries many parts' instances).
   */
  @carbon.method
  @impl.implemented
  SetInstanceTransformByPartTag(partTag, translation, rotation, scale)
  {
    const tag = Number(partTag) >>> 0;
    const transform = mat4.fromRotationTranslationScale(mat4.create(), rotation, translation, scale);
    for (const mesh of this.meshes)
    {
      for (let index = 0; index < mesh.instances.length; index++)
      {
        if ((Number(mesh.partTags[index] ?? 0) >>> 0) === tag)
        {
          mat4.copy(mesh.instances[index].transform, transform);
        }
      }
    }
  }

  /**
   * Returns one [translation, rotation, scale] decomposition per instance of a
   * mesh (Carbon EveChildInstancedMeshes.cpp:781-806, script-exposed tooling);
   * throws RangeError where Carbon raises IndexError.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  Clear()
  {
    this.meshes.length = 0;
    this.hasUpdated = false;
    this.#revision++;
  }

  /**
   * Decodes a picking area id back to the SOF locator it came from.
   * @param {Number} areaId - mesh ordinal in the high 16 bits, locator index in the low 16 (the pairing AddMeshesToManager registers)
   * @returns {Array|null} [sofHullName, sofLocatorSetName, locatorIndex], or null when the mesh is unknown or carries no SOF hull name
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  GetMeshCount()
  {
    return this.meshes.length;
  }

  /**
   * Reports one mesh's authoring state as a positional tuple (Carbon's multiple out-params).
   * @param {Number} meshId - mesh index; RangeError when out of range
   * @returns {Array} [geometryPath, geometryResource, meshIndex, castsShadow, reflectionMode, areaCount, instanceCount]
   */
  @carbon.method
  @impl.adapted
  GetMeshInfo(meshId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
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
  @carbon.method
  @impl.adapted
  GetAreaInfo(meshId, areaId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
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
  @carbon.method
  @impl.adapted
  GetMeshDisplay(meshId)
  {
    return EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).display;
  }

  /** Carbon EveChildInstancedMeshes::SetMeshDisplay (cpp:663-691): a toggle
   * clears the latch; turning a mesh OFF eagerly removes its sphere and
   * mesh-group handles - which is why AddMeshesToManager's display-off skip
   * does NOT clear the latch (the handles are already gone). */
  @carbon.method
  @impl.adapted
  @impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")
  SetMeshDisplay(meshId, display)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    const next = !!display;
    if (mesh.display !== next)
    {
      mesh.display = next;
      this.#allRegistered = false;
      if (!next)
      {
        if (mesh.sphereHandle !== null)
        {
          this.#meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
          mesh.sphereHandle = null;
        }
        for (const area of mesh.areas)
        {
          if (area.meshGroupHandle !== null)
          {
            this.#meshManager.RemoveMeshGroup(area.meshGroupHandle);
            area.meshGroupHandle = null;
          }
        }
      }
      this.#revision++;
    }
  }

  /** Returns whether one instanced mesh inherits parent overlay effects. */
  @carbon.method
  @impl.implemented
  GetMeshInheritOverlayEffects(meshId)
  {
    return EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).inheritOverlayEffects;
  }

  /** Enables or disables parent-overlay inheritance for one mesh. */
  @carbon.method
  @impl.implemented
  SetMeshInheritOverlayEffects(meshId, inherit)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    const next = !!inherit;
    if (mesh.inheritOverlayEffects === next) return;

    mesh.inheritOverlayEffects = next;
    this.#allRegistered = false;
    for (const area of mesh.areas)
    {
      if (area.meshGroupHandle === null) continue;
      this.#meshManager.RemoveMeshGroup(area.meshGroupHandle);
      area.meshGroupHandle = null;
    }
  }

  /** Adds an overlay effect owned by one instanced mesh. */
  @carbon.method
  @impl.implemented
  AddMeshOverlayEffect(meshId, overlayEffect)
  {
    if (!overlayEffect) throw new TypeError("overlayEffect must not be null");
    EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).ownOverlayEffects.push(overlayEffect);
  }

  /** Removes an overlay effect owned by one instanced mesh. */
  @carbon.method
  @impl.implemented
  RemoveMeshOverlayEffect(meshId, overlayEffect)
  {
    const overlays = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).ownOverlayEffects;
    const index = overlays.indexOf(overlayEffect);
    if (index !== -1) overlays.splice(index, 1);
  }

  /** Removes every overlay effect owned by one instanced mesh. */
  @carbon.method
  @impl.implemented
  ClearMeshOverlayEffects(meshId)
  {
    EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).ownOverlayEffects.length = 0;
  }

  /** Returns the number of overlay effects owned by one instanced mesh. */
  @carbon.method
  @impl.implemented
  GetMeshOverlayEffectCount(meshId)
  {
    return EveChildInstancedMeshes.#GetMesh(this.meshes, meshId).ownOverlayEffects.length;
  }

  /**
   * Assigns one mesh's geometry resource, bumping the revision only when it
   * actually changes; registration waits for the next AddMeshesToManager pass.
   */
  @carbon.method
  @impl.adapted
  SetGeometryResource(meshId, geometry)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    if (mesh.GetGeometryResource() !== geometry)
    {
      mesh.SetGeometryResource(geometry);
      this.#revision++;
    }
  }

  /**
   * Returns a detached snapshot of one mesh - instance transforms cloned, areas
   * shallow-copied, geometry resource shared by reference - so callers can read
   * it without touching live registration state.
   */
  @carbon.method
  @impl.adapted
  GetMeshData(meshId)
  {
    const mesh = EveChildInstancedMeshes.#GetMesh(this.meshes, meshId);
    return EveChildInstancedMeshes.#CloneMesh(mesh);
  }

  /**
   * Monotonic counter bumped by every structural change (AddMesh, Clear,
   * SetMeshDisplay, SetGeometryResource, SetShaderOption), for consumers caching
   * derived data.
   */
  @carbon.method
  @impl.implemented
  GetRevision()
  {
    return this.#revision;
  }

  /** Reports whether any active own or inherited overlay has a transparent pass. */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    for (const overlay of this.#parentOverlayEffects ?? [])
    {
      if (this.#AnyMeshInheritsOverlayEffects() && overlay.HasTransparentArea()) return true;
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
  @carbon.method
  @impl.adapted
  GetSortValue(renderContext = null)
  {
    const viewPosition = renderContext?.GetViewPosition?.() ?? [ 0, 0, 0 ];
    return Math.hypot(
      viewPosition[0] - this.worldTransform[12],
      viewPosition[1] - this.worldTransform[13],
      viewPosition[2] - this.worldTransform[14]);
  }

  /** Exposes stable per-instance CPU record pairs for this frame's overlay batches. */
  @carbon.method
  @impl.adapted
  GetPerObjectData(_accumulator = null)
  {
    if ((!this.#parentOverlayEffects || !this.#AnyMeshInheritsOverlayEffects()) &&
      !this.#HasAnyOwnOverlayEffects()) return null;

    let first = null;
    for (const mesh of this.meshes)
    {
      if (!mesh.overlayPods) continue;
      if (!mesh.display || !this.#MeshHasActiveOverlayEffects(mesh))
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
  @carbon.method
  @impl.adapted
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
      const inherited = this.#parentOverlayEffects && mesh.inheritOverlayEffects
        ? this.#parentOverlayEffects
        : null;
      if ((!inherited?.length && !mesh.ownOverlayEffects.length) || !mesh.display || !mesh.overlayPods) continue;
      if (reason === Tr2RenderReason.TR2RENDERREASON_REFLECTION && !ShouldReflect(mesh.reflectionMode)) continue;

      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood() === false) continue;
      if (!mesh.overlayAreaBlocksBuilt)
      {
        CollectInstancedOverlayAreaBlocks(mesh, mesh.overlayAreaBlocks);
        mesh.overlayAreaBlocksBuilt = true;
      }

      for (let index = 0; index < mesh.overlayPods.length; index++)
      {
        const pod = mesh.overlayPods[index];
        if (!pod.framePod) continue;
        const sphere = mesh.instanceSpheres[index];
        if (!sphere) continue;
        if (this.#lastCameraFrustum &&
          this.#lastCameraFrustum.IsSphereVisible(sphere.center, sphere.radius) === false) continue;

        const screenSize = this.#lastCameraFrustum
          ? this.#lastCameraFrustum.GetPixelSizeAccrossEst(sphere.center, sphere.radius) * this.#lastInvLodFactor
          : Infinity;
        const lod = geometry.GetMeshLod(mesh.meshIndex, screenSize);

        if (mesh.ownOverlayEffects.length)
        {
          committed = EmitOverlayBatches(
            batches, pod.framePod, batchType, mesh.ownOverlayEffects,
            mesh.overlayAreaBlocks, geometry, mesh.meshIndex, lod) || committed;
        }
        if (inherited?.length)
        {
          committed = EmitOverlayBatches(
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    this.UnregisterFromMeshManager();
  }

  /** Carbon EveChildInstancedMeshes::UnregisterFromMeshManager (cpp:50-71):
   * every registered mesh-group / sphere-group / per-object handle is removed
   * through the manager that issued the opaque handles, then the latch clears. */
  @carbon.method
  @impl.adapted
  @impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")
  UnregisterFromMeshManager()
  {
    for (const mesh of this.meshes)
    {
      for (const area of mesh.areas)
      {
        if (area.meshGroupHandle !== null)
        {
          this.#meshManager.RemoveMeshGroup(area.meshGroupHandle);
          area.meshGroupHandle = null;
        }
      }
      if (mesh.sphereHandle !== null)
      {
        this.#meshManager.RemoveBoundingSphereGroup(mesh.sphereHandle);
        mesh.sphereHandle = null;
      }
    }
    if (this.#perObjectDataHandle !== null)
    {
      this.#meshManager.RemovePerObjectData(this.#perObjectDataHandle);
      this.#perObjectDataHandle = null;
    }
    if (this.#perObjectDataNoClipHandle !== null)
    {
      this.#meshManager.RemovePerObjectData(this.#perObjectDataNoClipHandle);
      this.#perObjectDataNoClipHandle = null;
    }
    this.#meshManager = null;
    this.#allRegistered = false;
  }

  /** Carbon EveChildInstancedMeshes::AddMeshesToManager (cpp:472-553), the
   * InstancedMeshProvider entry the engine's CollectMeshes drives
   * (EveInstancedMeshManager.cpp:45-56; scene EveSpaceScene.cpp:1516).
   * Contract quirks preserved: nothing registers before the first update
   * pass (cpp:474); switching managers tears EVERYTHING down BEFORE the
   * latch early-out (cpp:478-481); the latch is set optimistically and
   * cleared by ANY not-ready mesh/area so the per-frame caller retries until
   * geometry streams in - EXCEPT display-off meshes, which skip WITHOUT
   * clearing it (their handles were already removed by SetMeshDisplay);
   * handles are add-once (partial re-registration after SetShaderOption /
   * display toggles); an area-level effect failure clears the latch while
   * the mesh's sphere group STAYS registered (Carbon's asymmetry);
   * pickingOwnerIndex is the mesh ordinal (pairs with GetSofSourceLocator's
   * meshIndex<<16 decode). */
  @carbon.method
  @impl.adapted
  @impl.reason("The manager is an injected CjsInstancedMeshManager implementation returning opaque handles (out-params become returns); Carbon's combinedVertexDeclaration gate (cpp:499, a D3D declaration handle rebuilt in RebuildCachedData cpp:435-457) reduces to geometry presence + IsGood, and the declaration argument is passed as 0 for the engine to rebuild; GetRawRoot() becomes the object itself as picking owner.")
  AddMeshesToManager(manager)
  {
    if (!this.hasUpdated)
    {
      return;
    }
    if (this.#meshManager !== null && this.#meshManager !== manager)
    {
      this.UnregisterFromMeshManager();
    }
    if (this.#allRegistered)
    {
      return;
    }

    this.#meshManager = manager;

    if (this.#perObjectDataHandle === null)
    {
      this.#perObjectDataHandle = manager.AddPerObjectData(this.#perObjectData);
    }

    if (this.meshes.some(mesh => !mesh.inheritOverlayEffects) &&
      this.#perObjectDataNoClipHandle === null)
    {
      this.#perObjectDataNoClipHandle = manager.AddPerObjectData(this.#perObjectDataNoClip);
    }

    this.#allRegistered = true;
    for (let meshIndex = 0; meshIndex < this.meshes.length; meshIndex++)
    {
      const mesh = this.meshes[meshIndex];
      if (!mesh.display)
      {
        continue;
      }
      const geometry = mesh.GetGeometryResource();
      if (!geometry || geometry.IsGood() === false)
      {
        this.#allRegistered = false;
        continue;
      }
      if (!mesh.instances.length)
      {
        this.#allRegistered = false;
        continue;
      }
      if (mesh.instances.length !== mesh.instanceSpheres.length)
      {
        this.#allRegistered = false;
        continue;
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
        if (!area.effect || !area.effect.GetShaderStateInterface())
        {
          this.#allRegistered = false;
          continue;
        }
        area.meshGroupHandle = manager.AddMeshGroup(
          geometry,
          0,
          area.batchType,
          mesh.meshIndex,
          area.areaIndex,
          area.areaCount,
          area.effect,
          area.effectHash,
          mesh.inheritOverlayEffects ? this.#perObjectDataHandle : this.#perObjectDataNoClipHandle,
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
  @carbon.method
  @impl.implemented
  IsCastingShadow(..._args)
  {
    return false;
  }

  /** Carbon EveChildInstancedMeshes::GetShadowBatches (cpp:78-80) is an
   * intentional no-op (the instanced mesh manager emits the batches). */
  @carbon.method
  @impl.noop
  GetShadowBatches(..._args)
  {
  }

  /** Carbon EveChildInstancedMeshes::GetShadowPerObjectData (cpp:82-85)
   * returns null (per-object data flows through the mesh manager). */
  @carbon.method
  @impl.implemented
  GetShadowPerObjectData(..._args)
  {
    return null;
  }

  /**
   * Resolves a mesh index against the list, throwing RangeError rather than
   * returning undefined so every public accessor fails loudly.
   */
  static #GetMesh(meshes, meshId)
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
  static #CreateArea(value)
  {
    const source = value ?? {};
    const area = new EveChildInstancedMeshArea();
    area.effect = source.effect ?? null;
    area.batchType = Number(source.batchType) >>> 0;
    area.areaIndex = Number(source.areaIndex) >>> 0;
    area.areaCount = source.areaCount === undefined ? 1 : Number(source.areaCount) >>> 0;
    area.alphaCutout = !!source.alphaCutout;
    area.reversed = !!source.reversed;
    area.effectHash = EveChildInstancedMeshes.#GetEffectHash(area.effect);
    return area;
  }

  /**
   * Deep-copies a mesh into a plain object for GetMeshData: instance transforms
   * cloned, areas spread-copied, the geometry resource shared by reference.
   */
  static #CloneMesh(mesh)
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
        sphereIndex: instance.sphereIndex
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
  static #GetEffectHash(effect)
  {
    return effect ? Number(effect.GetHashValue()) || 0 : 0;
  }

}
