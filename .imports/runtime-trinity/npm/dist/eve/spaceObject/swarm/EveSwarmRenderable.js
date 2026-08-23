import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveComponentType } from '../../EveComponentTypes.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { createChildPerObjectRecords, stampChildTransforms } from '../../perObjectData/childPerObjectRecords.js';
import { Tr2RenderReason } from '../../../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_mesh, _init_extra_mesh, _init_owner, _init_extra_owner, _init_worldTransform, _init_extra_worldTransform, _init_decals, _init_extra_decals, _init_perObjectDataVs, _init_extra_perObjectDataVs, _init_perObjectDataPs, _init_extra_perObjectDataPs;

// Packed (x, y, z, radius) cull-sphere scratch for IsCastingShadow.
const SPHERE_SCRATCH = vec4.create();

/** EveSwarmRenderable (eve/spaceObject/swarm) - generated from schema shapeHash a22c3310.... */
let _EveSwarmRenderable;
class EveSwarmRenderable extends _EveEntity {
  static {
    ({
      e: [_init_mesh, _init_extra_mesh, _init_owner, _init_extra_owner, _init_worldTransform, _init_extra_worldTransform, _init_decals, _init_extra_decals, _init_perObjectDataVs, _init_extra_perObjectDataVs, _init_perObjectDataPs, _init_extra_perObjectDataPs, _initProto],
      c: [_EveSwarmRenderable, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSwarmRenderable",
      family: "eve/spaceObject/swarm"
    })], [[type.objectRef("Tr2MeshBase"), 0, "mesh"], [type.objectRef("EveSwarm"), 0, "owner"], [[type, type.mat4], 16, "worldTransform"], [type.list("EveSpaceObjectDecal"), 0, "decals"], [type.rawStruct("Tr2PersistentPerObjectData"), 0, "perObjectDataVs"], [type.rawStruct("Tr2PersistentPerObjectData"), 0, "perObjectDataPs"], [[impl, impl.adapted], 18, "InitializeRenderable"], [[impl, impl.implemented], 18, "SetWorldTransform"], [[impl, impl.implemented], 18, "GetWorldTransform"], [[impl, impl.implemented], 18, "SetBoosterIntensity"], [[impl, impl.implemented], 18, "SetShaderData"], [[impl, impl.adapted], 18, "InitDecals"], [[impl, impl.implemented], 18, "GetID"], [[impl, impl.adapted], 18, "SetShaderOption"], [[impl, impl.adapted, void 0, impl.reason("Carbon's RegisterComponent<IEveShadowCaster> template is expressed as the registry's explicit component-name signature.")], 18, "RegisterComponents"], [[impl, impl.adapted, void 0, impl.reason("The length-1 out array replaces the float& out-param; the shadow math is ported, including exactly which paths write the out value.")], 18, "IsCastingShadow"], [[impl, impl.adapted, void 0, impl.reason("Geometry IsGood/GetMeshLod realization (cpp:276-286) and the shadowPixelSize LOD select are engine-resolved; the delegation structure is ported (EveChildMesh precedent).")], 18, "GetShadowBatches"], [[impl, impl.implemented], 18, "GetPerObjectData"], [[impl, impl.implemented], 18, "GetShadowPerObjectData"]], 0, void 0, _EveEntity));
  }
  /** m_mesh (Tr2MeshBasePtr) */
  mesh = (_initProto(this), _init_mesh(this, null));

  /** m_owner (BlueWeakRef<EveSwarm>) */
  owner = (_init_extra_mesh(this), _init_owner(this, null));

  /** m_worldTransform (Matrix) */
  worldTransform = (_init_extra_owner(this), _init_worldTransform(this, mat4.create()));

  /** m_decals (PEveSpaceObjectDecalVector) */
  decals = (_init_extra_worldTransform(this), _init_decals(this, []));

  /** m_perObjectDataVs (Tr2PersistentPerObjectData<EveSwarmRenderable>) */
  perObjectDataVs = (_init_extra_decals(this), _init_perObjectDataVs(this, null));

  /** m_perObjectDataPs (Tr2PersistentPerObjectData<EveSwarmRenderable>) */
  perObjectDataPs = (_init_extra_perObjectDataVs(this), _init_perObjectDataPs(this, null));

  /** m_vsData / m_psData - this renderable PERSISTENT per-object pair. */
  #perObjectData = (_init_extra_perObjectDataPs(this), createChildPerObjectRecords());

  /** The previous LOGICAL world transform, for worldTransformLast. */
  #lastWorldTransform = mat4.create();

  /**
   * Binds this fighter to the swarm that owns it and the mesh it draws with.
   * @param {Object} owner - the owning swarm; also this renderable's pick ID
   * @param {Object} mesh - the shared fighter mesh
   */
  InitializeRenderable(owner, mesh) {
    this.owner = owner ?? null;
    this.mesh = mesh ?? null;
  }

  /**
   * Carbon EveSwarmRenderable::SetWorldTransform (EveSwarm.cpp:115-125): the
   * OUTGOING transform becomes worldTransformLast, then the new one is stamped
   * into both records.
   */
  SetWorldTransform(transform) {
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
  GetWorldTransform() {
    return this.worldTransform;
  }

  /** Carbon EveSwarm.cpp:132: the booster glow rides in shipData.x. */
  SetBoosterIntensity(intensity) {
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
  SetShaderData(vsData, psData) {
    const vs = this.#perObjectData.vs;
    const ps = this.#perObjectData.ps;
    for (const name of ["clipData", "ellpsoidCenter", "ellpsoidRadii", "shipData"]) {
      vs.Set(name, vsData.Get(name));
    }
    ps.Set("clipSphereCenter", psData.Get("clipSphereCenter"));
    for (const name of ["clipRadiusSq", "clipRadius2Sq", "impactDataOffset", "clipSphereFactor2", "clipSphereFactor"]) {
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
  InitDecals(decals) {
    this.decals = decals.map(decal => decal?.Clone?.() ?? decal);
  }

  /**
   * The pick identity of this fighter, which Carbon reports as its owning swarm.
   * @returns {Object} the owner, or null before InitializeRenderable
   */
  GetID() {
    return this.owner;
  }

  /**
   * Forwards an authored shader option to the fighter mesh, if one is bound.
   * @param {String} name - option name
   * @param {String|Number} value - option value
   */
  SetShaderOption(name, value) {
    this.mesh?.SetShaderOption?.(name, value);
  }

  /** Carbon EveSwarmRenderable::RegisterComponents (EveSwarm.cpp:306-313):
   * unconditional ShadowCaster leaf self-registration. */
  RegisterComponents() {
    const registry = this.GetComponentRegistry();
    if (registry) {
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
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null) {
    if (!this.owner) {
      return false;
    }
    if (Number(renderReason ?? Tr2RenderReason.TR2RENDERREASON_NORMAL) === Tr2RenderReason.TR2RENDERREASON_REFLECTION) {
      return false;
    }
    if (this.owner.GetBoundingSphere?.(SPHERE_SCRATCH) !== true) {
      return false;
    }
    SPHERE_SCRATCH[0] = this.worldTransform[12];
    SPHERE_SCRATCH[1] = this.worldTransform[13];
    SPHERE_SCRATCH[2] = this.worldTransform[14];
    let sizeInShadow = 0;
    if (sizeInShadowOut) {
      sizeInShadowOut[0] = 0;
    }
    if (shadowFrustum?.IsVisible?.(cameraFrustum, SPHERE_SCRATCH)) {
      sizeInShadow = shadowFrustum.GetSizeInShadow(SPHERE_SCRATCH);
      if (sizeInShadowOut) {
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
  GetShadowBatches(batches, perObjectData, _shadowPixelSize) {
    if (!this.mesh || this.mesh.display === false) {
      return false;
    }
    return this.mesh.GetBatches?.(batches, TriBatchType.TRIBATCHTYPE_OPAQUE, perObjectData) === true;
  }

  /**
   * Carbon EveSwarmRenderable::GetPerObjectData (EveSwarm.cpp:61-71): a handle
   * over the two PERSISTENT records this class maintains through
   * SetWorldTransform and SetShaderData. No early-outs, unlike the turret gates.
   */
  GetPerObjectData(_accumulator = null) {
    return {
      vs: this.#perObjectData.vs,
      ps: this.#perObjectData.ps
    };
  }

  /** Carbon EveSwarmRenderable::GetShadowPerObjectData (EveSwarm.cpp:300-303):
   * pure forward to GetPerObjectData. */
  GetShadowPerObjectData(accumulator = null) {
    return this.GetPerObjectData(accumulator);
  }
  static {
    _initClass();
  }
}

export { _EveSwarmRenderable as EveSwarmRenderable };
//# sourceMappingURL=EveSwarmRenderable.js.map
