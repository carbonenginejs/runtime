// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.cpp
import { carbon, impl, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { createChildPerObjectRecords, stampChildTransforms } from "../../perObjectData/childPerObjectRecords.js";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { withITr2Renderable } from "../../../core/ITr2Renderable.js";

// Packed (x, y, z, radius) cull-sphere scratch for IsCastingShadow.
const SPHERE_SCRATCH = vec4.create();
const TRANSPARENT_AABB_MIN = vec3.create();
const TRANSPARENT_AABB_MAX = vec3.create();
const TRANSPARENT_CENTER = vec3.create();

/** Runtime implementation of Carbon's swarm renderable component. */
@type.define({ className: "EveSwarmRenderable", family: "eve/spaceObject/swarm" })
export class EveSwarmRenderable extends withITr2Renderable(EveEntity)
{

  /** m_mesh (Tr2MeshBasePtr) */
  @type.objectRef("Tr2MeshBase")
  mesh = null;

  /** m_owner (BlueWeakRef<EveSwarm>) */
  @type.objectRef("EveSwarm")
  owner = null;

  /** m_worldTransform (Matrix) */
  @type.mat4
  worldTransform = mat4.create();

  /** m_decals (PEveSpaceObjectDecalVector) */
  @type.list("EveSpaceObjectDecal")
  decals = [];

  /** m_perObjectDataVs (Tr2PersistentPerObjectData<EveSwarmRenderable>) */
  @type.rawStruct("Tr2PersistentPerObjectData")
  perObjectDataVs = null;

  /** m_perObjectDataPs (Tr2PersistentPerObjectData<EveSwarmRenderable>) */
  @type.rawStruct("Tr2PersistentPerObjectData")
  perObjectDataPs = null;

  /** m_vsData / m_psData - this renderable PERSISTENT per-object pair. */
  #perObjectData = createChildPerObjectRecords();

  /** The previous LOGICAL world transform, for worldTransformLast. */
  #lastWorldTransform = mat4.create();

  /**
   * Binds this fighter to the swarm that owns it and the mesh it draws with.
   * @param {Object} owner - the owning swarm; also this renderable's pick ID
   * @param {Object} mesh - the shared fighter mesh
   */
  @impl.adapted
  InitializeRenderable(owner, mesh)
  {
    this.owner = owner ?? null;
    this.mesh = mesh ?? null;
  }

  /**
   * Carbon EveSwarmRenderable::SetWorldTransform (EveSwarm.cpp:115-125): the
   * OUTGOING transform becomes worldTransformLast, then the new one is stamped
   * into both records.
   */
  @impl.implemented
  SetWorldTransform(transform)
  {
    // The previous LOGICAL transform is what stampChildTransforms needs, so it
    // is kept alongside rather than read back out of the record.
    mat4.copy(this.#lastWorldTransform, this.worldTransform);
    mat4.copy(this.worldTransform, transform);
    stampChildTransforms(this.#perObjectData, this.worldTransform, this.#lastWorldTransform);
  }

  /**
   * This fighter's world placement, as last set by SetWorldTransform.
   * @returns {Float32Array} the live logical transform, not a copy
   */
  @impl.implemented
  GetWorldTransform()
  {
    return this.worldTransform;
  }

  /** Carbon EveSwarm.cpp:132: the booster glow rides in shipData.x. */
  @impl.implemented
  SetBoosterIntensity(intensity)
  {
    const shipData = this.#perObjectData.ps.Get("shipData");
    shipData[0] = intensity;
  }

  /**
   * Carbon EveSwarmRenderable::SetShaderData (EveSwarm.cpp:135-152): copies the
   * hull values a swarm ship shares with its owner. shipData.x is NOT copied -
   * it is this renderable own booster glow.
   * @param {RawData} vsData - the owner EveSpaceObjectVSData record
   * @param {RawData} psData - the owner EveSpaceObjectPSData record
   */
  @impl.implemented
  SetShaderData(vsData, psData)
  {
    const vs = this.#perObjectData.vs;
    const ps = this.#perObjectData.ps;

    for (const name of [ "clipData", "ellpsoidCenter", "ellpsoidRadii", "shipData" ])
    {
      vs.Set(name, vsData.Get(name));
    }
    ps.Set("clipSphereCenter", psData.Get("clipSphereCenter"));
    for (const name of [ "clipRadiusSq", "clipRadius2Sq", "impactDataOffset", "clipSphereFactor2", "clipSphereFactor" ])
    {
      ps.Set(name, psData.Get(name));
    }
    ps.Set("shLightingCoefficients", psData.Get("shLightingCoefficients"));

    // Carbon copies y/z/w only, leaving x (the booster glow) alone.
    const shipData = ps.Get("shipData");
    const owner = psData.Get("shipData");
    shipData[1] = owner[1];
    shipData[2] = owner[2];
    shipData[3] = owner[3];
  }

  /**
   * Takes this fighter's own copies of the squad's authored decals, so a decal
   * animating on one ship does not move on the rest.
   * @param {Array} decals - authored decals; each is cloned when it can be
   */
  @impl.adapted
  InitDecals(decals)
  {
    this.decals = decals.map(decal => decal.Clone());
  }

  /**
   * The pick identity of this fighter, which Carbon reports as its owning swarm.
   * @returns {Object} the owner, or null before InitializeRenderable
   */
  @impl.implemented
  GetID()
  {
    return this.owner;
  }

  /**
   * Forwards an authored shader option to the fighter mesh, if one is bound.
   * @param {String} name - option name
   * @param {String|Number} value - option value
   */
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (this.mesh)
    {
      this.mesh.SetShaderOption(name, value);
    }
  }

  /**
   * Carbon EveSwarmRenderable::GetBatches (EveSwarm.cpp:35-52): emits ordinary
   * mesh areas directly and transparent areas back-to-front by their
   * world-space bounding-box centres.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The render context supplies Carbon's renderer-global view position; GPU-free mesh batches retain geometry source descriptors for engine realization.")
  GetBatches(batches, batchType, perObjectData, _reason, renderContext = null)
  {
    if (!this.mesh)
    {
      return false;
    }

    const areas = this.mesh.GetAreas(batchType);
    if (!areas)
    {
      return false;
    }

    if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      return this.mesh.GetBatches(batches, areas, perObjectData);
    }

    const viewPosition = renderContext.GetViewPosition();
    const geometry = this.mesh.GetGeometryResource();
    const meshIndex = this.mesh.meshIndex ?? 0;
    const lod = geometry ? geometry.GetMeshLod(meshIndex, Number.MAX_VALUE) : null;
    const sorted = [];

    for (const area of areas)
    {
      if (!area || area.GetDisplay() === false)
      {
        continue;
      }

      vec3.set(TRANSPARENT_CENTER, 0, 0, 0);
      if (geometry && geometry.GetAreaBoundingBox(
        meshIndex, area.GetIndex(), TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX))
      {
        vec3.add(TRANSPARENT_CENTER, TRANSPARENT_AABB_MIN, TRANSPARENT_AABB_MAX);
        vec3.scale(TRANSPARENT_CENTER, TRANSPARENT_CENTER, 0.5);
      }
      vec3.transformMat4(TRANSPARENT_CENTER, TRANSPARENT_CENTER, this.worldTransform);
      sorted.push({ area, distance: vec3.squaredDistance(viewPosition, TRANSPARENT_CENTER) });
    }

    sorted.sort((a, b) => b.distance - a.distance);

    let committed = false;
    for (const entry of sorted)
    {
      if (!entry.area.GetMaterialInterface())
      {
        continue;
      }
      const batch = this.mesh.CreateGeometryBatch(geometry, entry.area, perObjectData, false, lod);
      if (batch)
      {
        committed = batches.Commit(batch) || committed;
      }
    }
    return committed;
  }

  /** Carbon reports whether the shared fighter mesh has transparent areas. */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return this.mesh !== null
      && this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length !== 0;
  }

  /** Distance from the active view position to this fighter's translation. */
  @carbon.method
  @impl.adapted
  @impl.reason("The render context replaces Carbon's Tr2Renderer global view-position accessor.")
  GetSortValue(renderContext)
  {
    const viewPosition = renderContext.GetViewPosition();
    return Math.hypot(
      viewPosition[0] - this.worldTransform[12],
      viewPosition[1] - this.worldTransform[13],
      viewPosition[2] - this.worldTransform[14]
    );
  }

  /** Carbon EveSwarmRenderable::RegisterComponents (EveSwarm.cpp:306-313):
   * unconditional ShadowCaster leaf self-registration. */
  @impl.adapted
  @impl.reason("Carbon's RegisterComponent<IEveShadowCaster> template is expressed as the registry's explicit component-name signature.")
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.ShadowCaster, this);
    }
  }

  /** Carbon EveSwarmRenderable::IsCastingShadow (EveSwarm.cpp:242-267): the
   * owner/reflection early-outs do NOT write the out-param (the scene hoists
   * the float outside its caster loop, so a stale previous value survives -
   * contract); the cull sphere is the OWNER's squad-wide sphere
   * (EveSwarm.cpp:801-808) with its center overwritten by THIS fighter's
   * world translation (cpp:257 - squad radius centered on the fighter);
   * threshold is > 15 (the turret uses 5) - so a swarm with 5 < size <= 15
   * casts volumetric/spot shadows (whose call sites ignore the return and
   * re-check > 5 themselves) but not cascades. Carbon's float& out-param
   * becomes the optional trailing length-1 array. */
  @impl.adapted
  @impl.reason("The length-1 out array replaces the float& out-param; the shadow math is ported, including exactly which paths write the out value.")
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.owner)
    {
      return false;
    }
    if (Number(renderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL) === Tr2RenderReason.TR2RENDERREASON_REFLECTION)
    {
      return false;
    }
    if (this.owner.GetBoundingSphere(SPHERE_SCRATCH) !== true)
    {
      return false;
    }
    SPHERE_SCRATCH[0] = this.worldTransform[12];
    SPHERE_SCRATCH[1] = this.worldTransform[13];
    SPHERE_SCRATCH[2] = this.worldTransform[14];

    let sizeInShadow = 0;
    if (sizeInShadowOut)
    {
      sizeInShadowOut[0] = 0;
    }
    if (shadowFrustum.IsVisible(cameraFrustum, SPHERE_SCRATCH))
    {
      sizeInShadow = shadowFrustum.GetSizeInShadow(SPHERE_SCRATCH);
      if (sizeInShadowOut)
      {
        sizeInShadowOut[0] = sizeInShadow;
      }
    }
    return sizeInShadow > 15;
  }

  /** Carbon EveSwarmRenderable::GetShadowBatches (EveSwarm.cpp:269-298): the
   * mesh's OPAQUE areas only, per displayed area via CreateGeometryBatch -
   * exactly Tr2MeshBase.GetBatches restricted to OPAQUE (no per-area
   * IsCastingShadows filter; area display double-checked in Carbon). QUIRK:
   * unlike the turret, shadowPixelSize IS consumed here - it drives the LOD
   * select (cpp:282), which is engine-resolved at realization. Returns
   * whether any batch was committed (JS addition; Carbon returns void). */
  @impl.adapted
  @impl.reason("Geometry IsGood/GetMeshLod realization (cpp:276-286) and the shadowPixelSize LOD select are engine-resolved; the delegation structure is ported (EveChildMesh precedent).")
  GetShadowBatches(batches, perObjectData, _shadowPixelSize)
  {
    if (!this.mesh || this.mesh.display === false)
    {
      return false;
    }
    return this.mesh.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData) === true;
  }

  /**
   * Carbon EveSwarmRenderable::GetPerObjectData (EveSwarm.cpp:61-71): a handle
   * over the two PERSISTENT records this class maintains through
   * SetWorldTransform and SetShaderData. No early-outs, unlike the turret gates.
   */
  @impl.implemented
  GetPerObjectData(_accumulator = null)
  {
    return { vs: this.#perObjectData.vs, ps: this.#perObjectData.ps };
  }

  /** Carbon EveSwarmRenderable::GetShadowPerObjectData (EveSwarm.cpp:300-303):
   * pure forward to GetPerObjectData. */
  @impl.implemented
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

}
