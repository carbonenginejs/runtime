import { IShaderConfigurer } from "../../../shader/IShaderConfigurer.js";
import { ITr2Pickable } from "../../../core/ITr2Pickable.js";
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.h
// Source: trinity/trinity/Eve/SpaceObject/EveSwarm.cpp
import { IEveShadowCaster } from "../../IEveShadowCaster.js";
import { meta, type, blue } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { EveComponentType } from "../../EntityComponents.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { TriBatchType } from "#consts/graphics";
import { createChildPerObjectRecords, stampChildTransforms } from "../../perObjectData/childPerObjectRecords.js";
import { Tr2RenderReason } from "../../../generated/trinityCore/enums.js";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2PickType } from "#consts/graphics/tr2PickType";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { EveSpaceObjectDecal } from "../../attachment/decal/EveSpaceObjectDecal.js";

/** Carbon's EveSwarmRenderable (EveSwarm.h:20-95): one fighter of an EveSwarm, drawing the squad's shared mesh at its own world transform. */
@blue.define("EveSwarmRenderable")
@blue.inherit(ITr2Renderable, ITr2Pickable, IShaderConfigurer, IEveShadowCaster)
@blue.interface(ITr2Pickable, EveEntity, IEveShadowCaster)
export class EveSwarmRenderable extends EveEntity
{

  /** m_mesh (Tr2MeshBasePtr) */
  @type.rootRef("Tr2MeshBase")
  mesh = null;

  /** m_owner (BlueWeakRef<EveSwarm>) */
  @type.rootRef("EveSwarm")
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
  _perObjectData = createChildPerObjectRecords();

  /** The previous LOGICAL world transform, for worldTransformLast. */
  _lastWorldTransform = mat4.create();

  /**
   * Carbon InitializeRenderable (EveSwarm.cpp:109-113): binds this fighter to the swarm that owns it and the mesh it
   * draws with; RemoveSwarmer passes null for both.
   * @param {EveSwarm|null} owner - the owning swarm; also this renderable's pick ID
   * @param {Tr2MeshBase|null} mesh - the shared fighter mesh
   */
  @meta.implemented
  @blue.method
  InitializeRenderable(owner, mesh)
  {
    this.mesh = mesh;
    this.owner = owner;
  }

  /**
   * Carbon EveSwarmRenderable::SetWorldTransform (EveSwarm.cpp:115-125): the
   * OUTGOING transform becomes worldTransformLast, then the new one is stamped
   * into both records.
   */
  @meta.implemented
  @blue.method
  SetWorldTransform(transform)
  {
    // The previous LOGICAL transform is what stampChildTransforms needs, so it
    // is kept alongside rather than read back out of the record.
    mat4.copy(this._lastWorldTransform, this.worldTransform);
    mat4.copy(this.worldTransform, transform);
    stampChildTransforms(this._perObjectData, this.worldTransform, this._lastWorldTransform);
  }

  /**
   * This fighter's world placement, as last set by SetWorldTransform.
   * @returns {Float32Array} the live logical transform, not a copy
   */
  @meta.implemented
  @blue.method
  GetWorldTransform()
  {
    return this.worldTransform;
  }

  /** Carbon EveSwarm.cpp:132: the booster glow rides in shipData.x. */
  @meta.implemented
  @blue.method
  SetBoosterIntensity(intensity)
  {
    const shipData = this._perObjectData.ps.Get("shipData");
    shipData[0] = intensity;
  }

  /**
   * Carbon EveSwarmRenderable::SetShaderData (EveSwarm.cpp:135-152): copies the
   * hull values a swarm ship shares with its owner. shipData.x is NOT copied -
   * it is this renderable own booster glow.
   * @param {RawData} vsData - the owner EveSpaceObjectVSData record
   * @param {RawData} psData - the owner EveSpaceObjectPSData record
   */
  @meta.implemented
  @blue.method
  SetShaderData(vsData, psData)
  {
    const vs = this._perObjectData.vs;
    const ps = this._perObjectData.ps;

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
   * Carbon InitDecals (EveSwarm.cpp:154-164): appends this fighter's own copy of each of the squad's decals, so a
   * decal animating on one ship does not move on the rest.
   * @param {EveSpaceObjectDecal[]} decals - the owner's authored decals
   */
  @meta.implemented
  @blue.method
  InitDecals(decals)
  {
    for (const source of decals)
    {
      const decal = new EveSpaceObjectDecal();
      decal.CopyFrom(source);
      this.decals.push(decal);
    }
  }

  /**
   * Carbon PushDecals (EveSwarm.cpp:166-180): this fighter's decal renderables against the shared mesh's geometry.
   * @param {ITr2Renderable[]} renderables - the frame's renderable list
   * @param {number} screensize - the owner's mesh screen size
   */
  @meta.implemented
  @blue.method
  PushDecals(renderables, screensize)
  {
    const geometryRes = this.mesh.GetGeometryResource();
    if (geometryRes)
    {
      for (const decal of this.decals)
      {
        decal.GetRenderables(renderables, null, geometryRes, screensize);
      }
    }
  }

  /**
   * Carbon UpdateDecalVisibility (EveSwarm.cpp:182-202): this fighter's decals are placed at its own transform, with
   * the owner's bone palette when its animation is initialised.
   * @param {EveUpdateContext} updateContext - the frame's update context
   * @param {IEveSpaceObject2ParentData} pd - the owner's parent data; its transform is overwritten
   * @param {Tr2GrannyAnimation|null} animationUpdater - the owner's animation
   */
  @meta.implemented
  @blue.method
  UpdateDecalVisibility(updateContext, pd, animationUpdater)
  {
    const geometryRes = this.mesh.GetGeometryResource();
    if (geometryRes)
    {
      mat4.copy(pd.transform, this.worldTransform);
      for (const decal of this.decals)
      {
        if (animationUpdater && animationUpdater.GetMeshBoneCount() && animationUpdater.IsInitialized())
        {
          decal.SetBoneMatrix(animationUpdater.GetMeshBoneMatrixList(), animationUpdater.GetMeshBoneCount());
        }
        decal.UpdateVisibility(updateContext, pd);
      }
    }
  }

  /**
   * Carbon GetPickingBatches (EveSwarm.cpp:215-230): the mesh's picking, opaque, or transparent and additive areas.
   * @param {ITriRenderBatchAccumulator} batches - the accumulator
   * @param {number} pickTypes - Tr2PickType bits
   * @param {Tr2PerObjectData} perObjectData - this fighter's per-object data
   */
  @meta.implemented
  @blue.method
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
   * The pick identity of this fighter, which Carbon reports as its owning swarm.
   * @returns {Object} the owner, or null before InitializeRenderable
   */
  @meta.implemented
  @blue.method
  GetID()
  {
    return this.owner;
  }

  /**
   * Forwards an authored shader option to the fighter mesh, if one is bound.
   * @param {String} name - option name
   * @param {String|Number} value - option value
   */
  @meta.adapted
  @blue.method
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
   *
   * Adapted: the transparent sort is written out here rather than through Carbon's
   * GetSortedBatchesFromMeshAreaVector, and the view position comes from the render context, which defaults to the
   * main-thread context Carbon's Tr2Renderer::GetViewPosition reads. Returns whether a batch was committed.
   */
  @blue.method
  @meta.adapted
  GetBatches(batches, batchType, perObjectData, _reason, renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    if (!this.mesh)
    {
      return false;
    }

    const areas = this.mesh.GetAreas(batchType);
    if (batchType !== TriBatchType.TRIBATCHTYPE_TRANSPARENT)
    {
      return this.mesh.GetBatches(batches, areas, perObjectData);
    }

    // vec3_0 is the area centre, vec3_1 and vec3_2 its box.
    const { vec3_0, vec3_1, vec3_2 } = EveSwarmRenderable.scratch;
    const viewPosition = renderContext.GetViewPosition();
    const geometry = this.mesh.GetGeometryResource();
    const meshIndex = this.mesh.GetMeshIndex();
    const lod = geometry ? geometry.GetMeshLod__ScreenSize(meshIndex, Number.MAX_VALUE) : null;
    const sorted = [];

    for (const area of areas)
    {
      if (!area.GetDisplay())
      {
        continue;
      }

      vec3.set(vec3_0, 0, 0, 0);
      if (geometry && geometry.GetAreaBoundingBox(meshIndex, area.GetIndex(), vec3_1, vec3_2))
      {
        vec3.add(vec3_0, vec3_1, vec3_2);
        vec3.scale(vec3_0, vec3_0, 0.5);
      }
      vec3.transformMat4(vec3_0, vec3_0, this.worldTransform);
      sorted.push({ area, distance: vec3.squaredDistance(viewPosition, vec3_0) });
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
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return this.mesh !== null
      && this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length !== 0;
  }

  /**
   * Carbon GetSortValue (EveSwarm.cpp:54-59): distance from the view position to this fighter's translation.
   *
   * Adapted: the view position comes from the render context, which defaults to the main-thread context Carbon's
   * Tr2Renderer::GetViewPosition reads.
   */
  @blue.method
  @meta.adapted
  GetSortValue(renderContext = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const viewPosition = renderContext.GetViewPosition();
    return Math.hypot(
      viewPosition[0] - this.worldTransform[12],
      viewPosition[1] - this.worldTransform[13],
      viewPosition[2] - this.worldTransform[14]
    );
  }

  /**
   * Carbon EveSwarmRenderable::RegisterComponents (EveSwarm.cpp:306-313): unconditional ShadowCaster leaf
   * self-registration.
   *
   * Adapted: Carbon's RegisterComponent<IEveShadowCaster> template becomes the registry's explicit component type.
   */
  @meta.adapted
  @blue.method
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
   * re-check > 5 themselves) but not cascades.
   *
   * Adapted: Carbon's float& out-param becomes the optional trailing length-1 array; which paths write it is kept.
   */
  @meta.adapted
  @blue.method
  IsCastingShadow__ShadowFrustum(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.owner)
    {
      return false;
    }
    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION)
    {
      return false;
    }
    // vec4_0 is the cull sphere (x, y, z, radius).
    const { vec4_0 } = EveSwarmRenderable.scratch;
    if (!this.owner.GetBoundingSphere(vec4_0))
    {
      return false;
    }
    vec4_0[0] = this.worldTransform[12];
    vec4_0[1] = this.worldTransform[13];
    vec4_0[2] = this.worldTransform[14];

    let sizeInShadow = 0;
    if (sizeInShadowOut)
    {
      sizeInShadowOut[0] = 0;
    }
    if (shadowFrustum.IsVisible(cameraFrustum, vec4_0))
    {
      sizeInShadow = shadowFrustum.GetSizeInShadow(vec4_0);
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
   * unlike the turret, shadowPixelSize IS consumed here: it selects the LOD
   * (GetMeshLod( meshIx, shadowPixelSize ), cpp:282), passed as the mesh's
   * batch screen size.
   *
   * Adapted: the geometry IsGood and GetMeshLod steps (cpp:276-286) run inside Tr2MeshBase.GetBatches rather than
   * here, as for EveChildMesh. Returns whether any batch was committed; Carbon returns void.
   */
  @meta.adapted
  @blue.method
  GetShadowBatches(batches, perObjectData, shadowPixelSize)
  {
    if (!this.mesh || this.mesh.display === false)
    {
      return false;
    }
    return this.mesh.GetBatches(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData, shadowPixelSize) === true;
  }

  /**
   * Carbon EveSwarmRenderable::GetPerObjectData (EveSwarm.cpp:61-71): a handle
   * over the two PERSISTENT records this class maintains through
   * SetWorldTransform and SetShaderData. No early-outs, unlike the turret gates.
   */
  @meta.implemented
  @blue.method
  GetPerObjectData(_accumulator = null)
  {
    return { vs: this._perObjectData.vs, ps: this._perObjectData.ps };
  }

  /** Carbon EveSwarmRenderable::GetShadowPerObjectData (EveSwarm.cpp:300-303):
   * pure forward to GetPerObjectData. */
  @meta.implemented
  @blue.method
  GetShadowPerObjectData(accumulator = null)
  {
    return this.GetPerObjectData(accumulator);
  }

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec4_0: vec4.create()
  };

}
