import { applyDecs2311 as _applyDecs2311 } from '../../../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveComponentType } from '../../../../eve/EveComponentTypes.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { EveSpaceObjectPSData as _EveSpaceObjectPSData } from '../../../../eve/perObjectData/EveSpaceObjectPSData.js';
import { EveSpaceObjectVSData as _EveSpaceObjectVSData } from '../../../../eve/perObjectData/EveSpaceObjectVSData.js';
import { Tr2PerObjectData } from '../../../../trinityCore/Tr2PerObjectData.js';
import { Tr2RenderReason } from '../../../trinityCore/enums.js';

let _initProto, _initClass, _init_mesh, _init_extra_mesh, _init_owner, _init_extra_owner, _init_worldTransform, _init_extra_worldTransform, _init_decals, _init_extra_decals, _init_perObjectDataVs, _init_extra_perObjectDataVs, _init_perObjectDataPs, _init_extra_perObjectDataPs, _init_psData, _init_extra_psData, _init_vsData, _init_extra_vsData;

// Packed (x, y, z, radius) cull-sphere scratch for IsCastingShadow.
const SPHERE_SCRATCH = vec4.create();

/** EveSwarmRenderable (eve/spaceObject/swarm) - generated from schema shapeHash a22c3310.... */
let _EveSwarmRenderable;
class EveSwarmRenderable extends _EveEntity {
  static {
    ({
      e: [_init_mesh, _init_extra_mesh, _init_owner, _init_extra_owner, _init_worldTransform, _init_extra_worldTransform, _init_decals, _init_extra_decals, _init_perObjectDataVs, _init_extra_perObjectDataVs, _init_perObjectDataPs, _init_extra_perObjectDataPs, _init_psData, _init_extra_psData, _init_vsData, _init_extra_vsData, _initProto],
      c: [_EveSwarmRenderable, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSwarmRenderable",
      family: "eve/spaceObject/swarm"
    })], [[type.objectRef("Tr2MeshBase"), 0, "mesh"], [type.objectRef("EveSwarm"), 0, "owner"], [[type, type.mat4], 16, "worldTransform"], [type.list("EveSpaceObjectDecal"), 0, "decals"], [type.rawStruct("Tr2PersistentPerObjectData"), 0, "perObjectDataVs"], [type.rawStruct("Tr2PersistentPerObjectData"), 0, "perObjectDataPs"], [type.rawStruct("EveSpaceObjectPSData"), 0, "psData"], [type.rawStruct("EveSpaceObjectVSData"), 0, "vsData"], [[impl, impl.adapted], 18, "InitializeRenderable"], [[impl, impl.adapted], 18, "SetWorldTransform"], [[impl, impl.implemented], 18, "GetWorldTransform"], [[impl, impl.implemented], 18, "SetBoosterIntensity"], [[impl, impl.adapted], 18, "SetShaderData"], [[impl, impl.adapted], 18, "InitDecals"], [[impl, impl.implemented], 18, "GetID"], [[impl, impl.adapted], 18, "SetShaderOption"], [[impl, impl.adapted, void 0, impl.reason("Carbon's RegisterComponent<IEveShadowCaster> template is expressed as the registry's explicit component-name signature.")], 18, "RegisterComponents"], [[impl, impl.adapted, void 0, impl.reason("The length-1 out array replaces the float& out-param; the shadow math is ported, including exactly which paths write the out value.")], 18, "IsCastingShadow"], [[impl, impl.adapted, void 0, impl.reason("Geometry IsGood/GetMeshLod realization (cpp:276-286) and the shadowPixelSize LOD select are engine-resolved; the delegation structure is ported (EveChildMesh precedent).")], 18, "GetShadowBatches"], [[impl, impl.adapted, void 0, impl.reason("Persistent VS/PS device buffers are engine-owned; the record carries the object reference whose live vsData/psData the engine serializer consumes.")], 18, "GetPerObjectData"], [[impl, impl.implemented], 18, "GetShadowPerObjectData"]], 0, void 0, _EveEntity));
  }
  constructor(...args) {
    super(...args);
    _init_extra_vsData(this);
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

  /** m_psData (EveSpaceObjectPSData) */
  psData = (_init_extra_perObjectDataPs(this), _init_psData(this, new _EveSpaceObjectPSData()));

  /** m_vsData (EveSpaceObjectVSData) */
  vsData = (_init_extra_psData(this), _init_vsData(this, new _EveSpaceObjectVSData()));
  InitializeRenderable(owner, mesh) {
    this.owner = owner ?? null;
    this.mesh = mesh ?? null;
  }
  SetWorldTransform(transform) {
    mat4.copy(this.worldTransform, transform);
    mat4.copy(this.vsData.worldTransformLast, this.vsData.worldTransform);
    mat4.transpose(this.vsData.worldTransform, this.worldTransform);
    if (!mat4.invert(this.vsData.invWorldTransform, this.vsData.worldTransform)) {
      mat4.identity(this.vsData.invWorldTransform);
    }
    mat4.copy(this.psData.worldTransform, this.vsData.worldTransform);
    mat4.copy(this.psData.worldTransformLast, this.vsData.worldTransformLast);
    mat4.copy(this.psData.invWorldTransform, this.vsData.invWorldTransform);
  }
  GetWorldTransform() {
    return this.worldTransform;
  }
  SetBoosterIntensity(intensity) {
    this.psData.shipData[0] = intensity;
  }
  SetShaderData(vsData, psData) {
    for (const name of ["clipData", "ellpsoidCenter", "ellpsoidRadii", "shipData"]) {
      vec4.copy(this.vsData[name], vsData[name]);
    }
    vec3.copy(this.psData.clipSphereCenter, psData.clipSphereCenter);
    for (const name of ["clipRadiusSq", "clipRadius2Sq", "impactDataOffset", "clipSphereFactor2", "clipSphereFactor"]) {
      this.psData[name] = psData[name];
    }
    for (let index = 0; index < this.psData.shLightingCoefficients.length; index++) {
      vec4.copy(this.psData.shLightingCoefficients[index], psData.shLightingCoefficients[index]);
    }
    this.psData.shipData[1] = psData.shipData[1];
    this.psData.shipData[2] = psData.shipData[2];
    this.psData.shipData[3] = psData.shipData[3];
  }
  InitDecals(decals) {
    this.decals = decals.map(decal => decal?.Clone?.() ?? decal);
  }
  GetID() {
    return this.owner;
  }
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

  /** Carbon EveSwarmRenderable::GetPerObjectData (EveSwarm.cpp:61-71):
   * allocates Tr2PerObjectDataWithPersistentBuffers over the vsData/psData
   * blocks this class already maintains CPU-side (SetWorldTransform /
   * SetShaderData above); the persistent device buffers are engine-owned, so
   * the GPU-free record carries the live object reference - the engine
   * serializer reads vsData/psData at realization. No early-outs (unlike the
   * turret's null-returning geometry gates). */
  GetPerObjectData(accumulator = null) {
    const data = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(Tr2PerObjectData) : new Tr2PerObjectData();
    data.object = this;
    return data;
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
