import { applyDecs2311 as _applyDecs2311, identity as _identity } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../EveEntity.js';
import { ShouldReflect, EveComponentType } from '../EveComponentTypes.js';
import { RawData } from '../../trinityCore/rawData/RawData.js';

let _initClass, _init_effect, _init_extra_effect, _init_batchType, _init_extra_batchType, _init_areaIndex, _init_extra_areaIndex, _init_areaCount, _init_extra_areaCount, _init_effectHash, _init_extra_effectHash, _initClass2, _init_transform, _init_extra_transform, _init_sphereIndex, _init_extra_sphereIndex, _initClass3, _init_geometryPath, _init_extra_geometryPath, _init_castsShadow, _init_extra_castsShadow, _init_reflectionMode, _init_extra_reflectionMode, _init_meshIndex, _init_extra_meshIndex, _init_areas, _init_extra_areas, _init_instances, _init_extra_instances, _init_sofHullName, _init_extra_sofHullName, _init_sofLocatorSetName, _init_extra_sofLocatorSetName, _init_display, _init_extra_display, _initProto, _initClass4, _init_name, _init_extra_name, _init_worldTransform, _init_extra_worldTransform, _init_hasUpdated, _init_extra_hasUpdated, _init_meshes, _init_extra_meshes;

/** Carbon EveInstancedMeshManager::InstanceFlags (EveInstancedMeshManager.h:
 * 13-26, cpp:998-1048): a uint32 bitfield - bit (1 << batchType) per present
 * batch type, CASTS_SHADOW = 1 << 30, RENDER_IN_REFLECTION = 1 << 31. */
const INSTANCE_FLAG_CASTS_SHADOW = 0x40000000;
const INSTANCE_FLAG_RENDER_IN_REFLECTION = 0x80000000;
const POSITION_SCRATCH = vec3.create();

/**
 * One shader area of an instanced mesh: the effect, its batch type, the area
 * range within the mesh, its cached effect hash and the mesh-group handle it is
 * registered under.
 */
let _EveChildInstancedMes;
class EveChildInstancedMeshArea extends CjsModel {
  static {
    ({
      e: [_init_effect, _init_extra_effect, _init_batchType, _init_extra_batchType, _init_areaIndex, _init_extra_areaIndex, _init_areaCount, _init_extra_areaCount, _init_effectHash, _init_extra_effectHash],
      c: [_EveChildInstancedMes, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildInstancedMeshArea",
      family: "eve/child"
    })], [[[void 0, io.rebuild("instanceBuffer"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[void 0, io.rebuild("instanceBuffer"), io, io.persist, type, type.uint32], 16, "batchType"], [[void 0, io.rebuild("instanceBuffer"), io, io.persist, type, type.uint32], 16, "areaIndex"], [[void 0, io.rebuild("instanceBuffer"), io, io.persist, type, type.uint32], 16, "areaCount"], [[io, io.read, type, type.float32], 16, "effectHash"]], 0, void 0, CjsModel));
  }
  effect = _init_effect(this, null);
  batchType = (_init_extra_effect(this), _init_batchType(this, 0));
  areaIndex = (_init_extra_batchType(this), _init_areaIndex(this, 0));
  areaCount = (_init_extra_areaIndex(this), _init_areaCount(this, 1));
  effectHash = (_init_extra_areaCount(this), _init_effectHash(this, 0));

  /** Carbon MeshArea::meshGroupHandle (EveChildInstancedMeshes.h:72) - the
   * manager registration handle; runtime state, not persisted. Truthy handles
   * carry .owner for the removal routing (EveInstancedMeshManager.h:41-72). */
  meshGroupHandle = (_init_extra_effectHash(this), null);
  static {
    _initClass();
  }
}
let _EveChildInstancedMes2;
class EveChildInstancedMeshInstance extends CjsModel {
  static {
    ({
      e: [_init_transform, _init_extra_transform, _init_sphereIndex, _init_extra_sphereIndex],
      c: [_EveChildInstancedMes2, _initClass2]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildInstancedMeshInstance",
      family: "eve/child"
    })], [[[void 0, io.rebuild("instanceBuffer"), io, io.persist, type, type.mat4], 16, "transform"], [[void 0, io.rebuild("instanceBuffer"), io, io.persist, type, type.uint32], 16, "sphereIndex"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_sphereIndex(this);
  }
  transform = _init_transform(this, mat4.create());
  sphereIndex = (_init_extra_transform(this), _init_sphereIndex(this, 0));
  static {
    _initClass2();
  }
}
let _EveChildInstancedMes3;
class EveChildInstancedMesh extends CjsModel {
  static {
    ({
      e: [_init_geometryPath, _init_extra_geometryPath, _init_castsShadow, _init_extra_castsShadow, _init_reflectionMode, _init_extra_reflectionMode, _init_meshIndex, _init_extra_meshIndex, _init_areas, _init_extra_areas, _init_instances, _init_extra_instances, _init_sofHullName, _init_extra_sofHullName, _init_sofLocatorSetName, _init_extra_sofLocatorSetName, _init_display, _init_extra_display],
      c: [_EveChildInstancedMes3, _initClass3]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildInstancedMesh",
      family: "eve/child"
    })], [[[io, io.persist, type, type.string], 16, "geometryPath"], [[io, io.persist, type, type.boolean], 16, "castsShadow"], [[io, io.persist, type, type.int32], 16, "reflectionMode"], [[io, io.persist, type, type.uint32], 16, "meshIndex"], [[io, io.persist, void 0, type.list("EveChildInstancedMeshArea")], 16, "areas"], [[io, io.persist, void 0, type.list("EveChildInstancedMeshInstance")], 16, "instances"], [[io, io.persist, type, type.string], 16, "sofHullName"], [[io, io.persist, type, type.string], 16, "sofLocatorSetName"], [[io, io.persist, type, type.boolean], 16, "display"]], 0, void 0, CjsModel));
  }
  geometryPath = _init_geometryPath(this, "");
  castsShadow = (_init_extra_geometryPath(this), _init_castsShadow(this, false));
  reflectionMode = (_init_extra_castsShadow(this), _init_reflectionMode(this, 3));
  meshIndex = (_init_extra_reflectionMode(this), _init_meshIndex(this, 0));
  areas = (_init_extra_meshIndex(this), _init_areas(this, []));
  instances = (_init_extra_areas(this), _init_instances(this, []));
  sofHullName = (_init_extra_instances(this), _init_sofHullName(this, ""));
  sofLocatorSetName = (_init_extra_sofHullName(this), _init_sofLocatorSetName(this, ""));
  display = (_init_extra_sofLocatorSetName(this), _init_display(this, true));

  /** Carbon Mesh::sphereHandle (h:110) - manager registration handle;
   * runtime state, not persisted. */
  sphereHandle = (_init_extra_display(this), null);

  /** Carbon Mesh::worldBoundingSphere - stamped by UpdateAsyncronous
   * (cpp:270); the TriFrustum sphere-duck shape. */
  worldBoundingSphere = {
    center: vec3.create(),
    radius: 0
  };

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
  GetGeometryResource() {
    return this.#geometry;
  }

  /**
   * Assigns the geometry resource this mesh renders from; a nullish value clears
   * it. Runtime state, deliberately not persisted.
   */
  SetGeometryResource(resource) {
    this.#geometry = resource ?? null;
  }
  static {
    _initClass3();
  }
}
let _EveChildInstancedMes4;
new class extends _identity {
  static [class EveChildInstancedMeshes extends _EveEntity {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_worldTransform, _init_extra_worldTransform, _init_hasUpdated, _init_extra_hasUpdated, _init_meshes, _init_extra_meshes, _initProto],
        c: [_EveChildInstancedMes4, _initClass4]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildInstancedMeshes",
        family: "eve/child"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.read, type, type.boolean], 16, "hasUpdated"], [[io, io.persist, void 0, type.list("EveChildInstancedMesh")], 16, "meshes"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetName"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The EveSpaceObjectVS/PSData per-object constant copy (cpp:204-238) and the raytracing mesh build (cpp:283-327) are engine-owned; mesh bounds come from a GetMeshData duck ({minBounds, maxBounds}) and meshes without one are skipped fail-closed.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetOrigin"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsAlwaysOn"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon dereferences area.effect unguarded; the JS option write is optional-chained. Handle removal + latch clear are ported.")], 18, "SetShaderOption"], [[carbon, carbon.method, impl, impl.adapted], 18, "AddMesh"], [[carbon, carbon.method, impl, impl.adapted], 18, "Clear"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSofSourceLocator"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMeshCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetAreaInfo"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshDisplay"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")], 18, "SetMeshDisplay"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetGeometryResource"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMeshData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRevision"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Handle invalidation after removal is explicit (Carbon's DataHandle is invalidated by the manager by reference).")], 18, "UnregisterFromMeshManager"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The manager is an injected engine duck returning handles (out-params become returns; .owner is stamped when the duck omits it); Carbon's combinedVertexDeclaration gate (cpp:499, a D3D declaration handle rebuilt in RebuildCachedData cpp:435-457) reduces to geometry presence + IsGood, and the declaration argument is passed as 0 for the engine to rebuild; GetRawRoot() becomes the object itself as picking owner.")], 18, "AddMeshesToManager"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsCastingShadow"], [[carbon, carbon.method, impl, impl.noop], 18, "GetShadowBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShadowPerObjectData"]], 0, void 0, _EveEntity));
    }
    name = (_initProto(this), _init_name(this, ""));
    worldTransform = (_init_extra_name(this), _init_worldTransform(this, mat4.create()));
    hasUpdated = (_init_extra_worldTransform(this), _init_hasUpdated(this, false));
    meshes = (_init_extra_hasUpdated(this), _init_meshes(this, []));
    #revision = (_init_extra_meshes(this), 0);

    /** Carbon m_perObjectDataHandle (h:143) - manager registration handle. */
    #perObjectDataHandle = null;

    /**
     * Carbon m_perObjectData (EveSpacePerObjectData): the PERSISTENT per-instance
     * record the mesh manager uploads into its structured buffer.
     */
    #perObjectData = RawData.create("EveSpacePerObjectData");

    /** EVE_SPACEOBJECT_CUSTOWMASK_MAX (EveSpaceObject2.h:49). */

    /** Carbon m_allRegistered (h:147) - the AddMeshesToManager retry latch:
     * set optimistically each pass, cleared by ANY not-ready mesh/area so the
     * per-frame CollectMeshes retries until geometry streams in. */
    #allRegistered = false;

    /**
     * The authored name, persisted with the child and used to identify it in the
     * parent graph.
     */
    GetName() {
      return this.name;
    }

    /** Sets the authored child name, coercing nullish to the empty string. */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /**
     * Carbon EveChildInstancedMeshes::UpdateVisibility (cpp:183-186) only caches
     * the frame's camera frustum for later use; the JS port has no consumer for
     * that cache, so the frame hook does nothing.
     */
    UpdateVisibility() {}

    /**
     * Carbon EveChildInstancedMeshes::GetRenderables (cpp:188-190) collects
     * nothing: the instanced mesh manager emits the draws, so the accumulator
     * comes back unchanged.
     */
    GetRenderables(renderables = []) {
      return renderables;
    }

    /**
     * Carbon EveChildInstancedMeshes::GetBoundingSphere (cpp:192-195) always
     * returns false - the child publishes no bounds of its own, because each mesh
     * registers its own sphere group with the manager.
     */
    GetBoundingSphere() {
      return false;
    }

    /**
     * Carbon EveChildInstancedMeshes::UpdateAsyncronous (cpp:204-238): the
     * per-instance record is this child's own transforms plus the hull values it
     * inherits, flattened into ONE struct - EveSpacePerObjectData carries both
     * the VS and PS halves because the manager uploads it as a single instance.
     * @param {Object} parent - the space-object parent, when there is one
     */
    #UpdatePerObjectData(parent) {
      const record = this.#perObjectData;

      // cpp:211: the STORED (already transposed) transform rolls into last.
      record.SetAndTranspose("worldTransformLast", record.GetTransposed("worldTransform"));
      record.SetAndTranspose("worldTransform", this.worldTransform);

      // cpp:214 inverts the transposed matrix; by carbon-math-conventions F2 that
      // equals the transpose of the logical inverse, which is what this produces.
      const inverse = _EveChildInstancedMes4.#inverseScratch;
      if (!mat4.invert(inverse, this.worldTransform)) {
        mat4.identity(inverse);
      }
      record.SetAndTranspose("invWorldTransform", inverse);
      if (typeof parent?.GetPerObjectStructs !== "function") {
        return;
      }
      const {
        vs,
        ps
      } = parent.GetPerObjectStructs();
      for (const name of ["shipData", "clipSphereCenter", "clipRadiusSq", "clipRadius2Sq", "impactDataOffset", "clipSphereFactor2", "clipSphereFactor"]) {
        record.Set(name, ps.Get(name));
      }
      for (const name of ["ellpsoidRadii", "ellpsoidCenter", "customData"]) {
        record.Set(name, vs.Get(name));
      }
      record.Set("customMaskClamps", ps.Get("customMaskClamps"));
      record.Set("boneOffsets", vs.Get("boneOffsets"));
      for (let slot = 0; slot < _EveChildInstancedMes4.CUSTOM_MASK_COUNT; slot++) {
        record.SetAndTransposeIndex("customMaskMatrix", slot, vs.GetTransposedIndex("customMaskMatrix", slot));
        record.SetIndex("customMaskData", slot, vs.GetIndex("customMaskData", slot));
        record.SetIndex("customMaskMaterialIDs", slot, ps.GetIndex("customMaskMaterialIDs", slot));
        record.SetIndex("customMaskTargets", slot, ps.GetIndex("customMaskTargets", slot));
      }

      // cpp:238: the PS record's coefficients land in the record's shLighting.
      record.Set("shLighting", ps.Get("shLightingCoefficients"));
    }

    /**
     * Stamps the child's world transform from the parent's localToWorldTransform
     * (Carbon cpp:197-200); every per-instance cull sphere the async pass builds
     * is derived from it.
     */
    UpdateSyncronous(_updateContext, params) {
      if (params?.localToWorldTransform?.length === 16) {
        mat4.copy(this.worldTransform, params.localToWorldTransform);
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
    UpdateAsyncronous(_updateContext, _params) {
      const w = this.worldTransform;
      // cpp:240-242 - worldScale from the world transform's basis rows.
      const worldScale = Math.max(Math.hypot(w[0], w[1], w[2]), Math.hypot(w[4], w[5], w[6]), Math.hypot(w[8], w[9], w[10]));
      for (const mesh of this.meshes) {
        const geometry = mesh.GetGeometryResource();
        if (!geometry || geometry.IsGood?.() === false) {
          continue;
        }

        // cpp:251 - refreshed every pass (set OR cleared).
        mesh.flags = ShouldReflect(mesh.reflectionMode) ? (mesh.flags | INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0 : (mesh.flags & ~INSTANCE_FLAG_RENDER_IN_REFLECTION) >>> 0;
        const meshData = geometry.GetMeshData?.(mesh.meshIndex);
        const minBounds = meshData?.minBounds ?? meshData?.m_minBounds;
        const maxBounds = meshData?.maxBounds ?? meshData?.m_maxBounds;
        if (!minBounds || !maxBounds) {
          continue;
        }
        // cpp:254-255 - Sphere(AABB): center (min+max)/2, radius |max-min|/2;
        // then radius = sphere.radius + |sphere.center| (origin-inclusive).
        const centerX = (minBounds[0] + maxBounds[0]) * 0.5;
        const centerY = (minBounds[1] + maxBounds[1]) * 0.5;
        const centerZ = (minBounds[2] + maxBounds[2]) * 0.5;
        const localRadius = Math.hypot(maxBounds[0] - minBounds[0], maxBounds[1] - minBounds[1], maxBounds[2] - minBounds[2]) * 0.5 + Math.hypot(centerX, centerY, centerZ);
        mesh.instanceSpheres.length = mesh.instances.length;
        let boundsMinX = Infinity,
          boundsMinY = Infinity,
          boundsMinZ = Infinity;
        let boundsMaxX = -Infinity,
          boundsMaxY = -Infinity,
          boundsMaxZ = -Infinity;
        for (let index = 0; index < mesh.instances.length; index++) {
          const transform = mesh.instances[index].transform;
          // cpp:261 - packed rows' w = the transform translation (gl [12..14]).
          POSITION_SCRATCH[0] = transform[12];
          POSITION_SCRATCH[1] = transform[13];
          POSITION_SCRATCH[2] = transform[14];
          // cpp:262-264 - instance scale from the packed rows' xyz (the
          // transpose's rows: gl (t[0],t[4],t[8]) / (t[1],t[5],t[9]) /
          // (t[2],t[6],t[10])) - deliberately NOT the same extraction as
          // worldScale above.
          const scale = Math.max(Math.hypot(transform[0], transform[4], transform[8]), Math.hypot(transform[1], transform[5], transform[9]), Math.hypot(transform[2], transform[6], transform[10])) * worldScale;
          vec3.transformMat4(POSITION_SCRATCH, POSITION_SCRATCH, w);
          const radius = localRadius * scale;
          const sphere = mesh.instanceSpheres[index] ??= {
            center: vec3.create(),
            radius: 0
          };
          vec3.copy(sphere.center, POSITION_SCRATCH);
          sphere.radius = radius;
          boundsMinX = Math.min(boundsMinX, POSITION_SCRATCH[0] - radius);
          boundsMinY = Math.min(boundsMinY, POSITION_SCRATCH[1] - radius);
          boundsMinZ = Math.min(boundsMinZ, POSITION_SCRATCH[2] - radius);
          boundsMaxX = Math.max(boundsMaxX, POSITION_SCRATCH[0] + radius);
          boundsMaxY = Math.max(boundsMaxY, POSITION_SCRATCH[1] + radius);
          boundsMaxZ = Math.max(boundsMaxZ, POSITION_SCRATCH[2] + radius);
        }
        if (mesh.instances.length) {
          // cpp:270 - Sphere(worldBounds).
          const sphereCenter = mesh.worldBoundingSphere.center;
          sphereCenter[0] = (boundsMinX + boundsMaxX) * 0.5;
          sphereCenter[1] = (boundsMinY + boundsMaxY) * 0.5;
          sphereCenter[2] = (boundsMinZ + boundsMaxZ) * 0.5;
          mesh.worldBoundingSphere.radius = Math.hypot(boundsMaxX - boundsMinX, boundsMaxY - boundsMinY, boundsMaxZ - boundsMinZ) * 0.5;

          // cpp:272-278 - live refresh of a registered sphere group.
          if (mesh.sphereHandle) {
            mesh.sphereHandle.owner?.SetSphereGroupBounds?.(mesh.sphereHandle, mesh.worldBoundingSphere, mesh.flags);
          }
        }
      }
      this.hasUpdated = true;
    }

    /**
     * Returns the child's world transform as stamped by the last sync update.
     * @param {Float32Array} [out] - caller-owned; when given, receives a copy and is returned instead of the live matrix
     * @returns {Float32Array} out when supplied, otherwise the live internal matrix
     */
    GetLocalToWorldTransform(out = null) {
      if (out) {
        return mat4.copy(out, this.worldTransform);
      }
      return this.worldTransform;
    }

    /**
     * Carbon EveChildInstancedMeshes::Setup (cpp:335-337) is an intentional no-op:
     * placement comes from the authored per-instance transforms, not from an SRT
     * setup.
     */
    Setup() {}

    /**
     * Carbon EveChildInstancedMeshes::ChangeLOD (cpp:339-341) is an intentional
     * no-op; the child keeps no LOD state.
     */
    ChangeLOD() {}

    /**
     * Accepts and discards the placement origin; this child has no Carbon origin
     * field and stores none.
     */
    SetOrigin() {}

    /**
     * Returns false, so owners treat this child as subject to normal activation
     * gating.
     */
    IsAlwaysOn() {
      return false;
    }

    /** Carbon EveChildInstancedMeshes::SetShaderOption (cpp:343-359): flips the
     * option and refreshes the effect hash on every area, then removes any
     * registered mesh-group handle and clears the latch - so the groups
     * re-register with the NEW effectHash on the next AddMeshesToManager pass.
     * Sphere/per-object handles deliberately stay registered. */
    SetShaderOption(name, value) {
      for (const mesh of this.meshes) {
        for (const area of mesh.areas) {
          area.effect?.SetOption?.(name, value);
          area.effectHash = _EveChildInstancedMes4.#GetEffectHash(area.effect);
          if (area.meshGroupHandle) {
            area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
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
     * @returns {Boolean} false when no areas or no instances were supplied (nothing is added)
     */
    AddMesh(geometryPath, castsShadow, reflectionMode, meshIndex, areas, instanceTransforms, sofHullName = "", sofLocatorSetName = "") {
      const sourceAreas = Array.from(areas ?? []);
      const sourceTransforms = Array.from(instanceTransforms ?? []);
      if (!sourceAreas.length || !sourceTransforms.length) {
        return false;
      }
      const normalizedAreas = sourceAreas.map(area => _EveChildInstancedMes4.#CreateArea(area));
      const instances = sourceTransforms.map((transform, sphereIndex) => {
        if (!transform || transform.length !== 16) {
          throw new TypeError("EveChildInstancedMeshes instance transforms must contain 16 values");
        }
        const instance = new _EveChildInstancedMes2();
        mat4.copy(instance.transform, transform);
        instance.sphereIndex = sphereIndex;
        return instance;
      });
      const mesh = new _EveChildInstancedMes3();
      mesh.geometryPath = String(geometryPath ?? "");
      mesh.castsShadow = !!castsShadow;
      mesh.reflectionMode = reflectionMode === undefined ? 3 : Number(reflectionMode) | 0;
      mesh.meshIndex = Number(meshIndex) >>> 0;
      mesh.areas = normalizedAreas;
      mesh.instances = instances;
      mesh.sofHullName = String(sofHullName ?? "");
      mesh.sofLocatorSetName = String(sofLocatorSetName ?? "");
      // Carbon (cpp:418-425): the CASTS_SHADOW flag and one bit per area batch
      // type are stamped at add time; RENDER_IN_REFLECTION is refreshed each
      // async pass. cpp:428 clears the registration latch.
      if (mesh.castsShadow) {
        mesh.flags = (mesh.flags | INSTANCE_FLAG_CASTS_SHADOW) >>> 0;
      }
      for (const area of mesh.areas) {
        mesh.flags = (mesh.flags | 1 << area.batchType) >>> 0;
      }
      this.meshes.push(mesh);
      this.#allRegistered = false;
      this.#revision++;
      return true;
    }

    /**
     * Drops every mesh and clears the hasUpdated stamp so nothing re-registers
     * until another update pass runs; registration handles are NOT released here,
     * so call UnregisterFromMeshManager first when a manager still holds them.
     */
    Clear() {
      this.meshes.length = 0;
      this.hasUpdated = false;
      this.#revision++;
    }

    /**
     * Decodes a picking area id back to the SOF locator it came from.
     * @param {Number} areaId - mesh ordinal in the high 16 bits, locator index in the low 16 (the pairing AddMeshesToManager registers)
     * @returns {Array|null} [sofHullName, sofLocatorSetName, locatorIndex], or null when the mesh is unknown or carries no SOF hull name
     */
    GetSofSourceLocator(areaId) {
      const value = Number(areaId) >>> 0;
      const mesh = this.meshes[value >>> 16];
      if (!mesh || !mesh.sofHullName) {
        return null;
      }
      return [mesh.sofHullName, mesh.sofLocatorSetName, value & 0xffff];
    }

    /** Number of meshes currently held. */
    GetMeshCount() {
      return this.meshes.length;
    }

    /**
     * Reports one mesh's authoring state as a positional tuple (Carbon's multiple out-params).
     * @param {Number} meshId - mesh index; RangeError when out of range
     * @returns {Array} [geometryPath, geometryResource, meshIndex, castsShadow, reflectionMode, areaCount, instanceCount]
     */
    GetMeshInfo(meshId) {
      const mesh = _EveChildInstancedMes4.#GetMesh(this.meshes, meshId);
      return [mesh.geometryPath, mesh.GetGeometryResource(), mesh.meshIndex, mesh.castsShadow, mesh.reflectionMode, mesh.areas.length, mesh.instances.length];
    }

    /**
     * Reports one area of one mesh as a positional tuple (Carbon's multiple out-params).
     * @param {Number} meshId - mesh index; RangeError when out of range
     * @param {Number} areaId - area index within that mesh; RangeError when out of range
     * @returns {Array} [effect, batchType, areaIndex, areaCount] - the effect is the live reference
     */
    GetAreaInfo(meshId, areaId) {
      const mesh = _EveChildInstancedMes4.#GetMesh(this.meshes, meshId);
      const index = Number(areaId) >>> 0;
      if (index >= mesh.areas.length) {
        throw new RangeError(`EveChildInstancedMeshes area index ${index} is out of range`);
      }
      const area = mesh.areas[index];
      return [area.effect, area.batchType, area.areaIndex, area.areaCount];
    }

    /**
     * Whether the given mesh is currently displayed; throws RangeError for an
     * unknown mesh index.
     */
    GetMeshDisplay(meshId) {
      return _EveChildInstancedMes4.#GetMesh(this.meshes, meshId).display;
    }

    /** Carbon EveChildInstancedMeshes::SetMeshDisplay (cpp:663-691): a toggle
     * clears the latch; turning a mesh OFF eagerly removes its sphere and
     * mesh-group handles - which is why AddMeshesToManager's display-off skip
     * does NOT clear the latch (the handles are already gone). */
    SetMeshDisplay(meshId, display) {
      const mesh = _EveChildInstancedMes4.#GetMesh(this.meshes, meshId);
      const next = !!display;
      if (mesh.display !== next) {
        mesh.display = next;
        this.#allRegistered = false;
        if (!next) {
          if (mesh.sphereHandle) {
            mesh.sphereHandle.owner?.RemoveBoundingSphereGroup?.(mesh.sphereHandle);
            mesh.sphereHandle = null;
          }
          for (const area of mesh.areas) {
            if (area.meshGroupHandle) {
              area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
              area.meshGroupHandle = null;
            }
          }
        }
        this.#revision++;
      }
    }

    /**
     * Assigns one mesh's geometry resource, bumping the revision only when it
     * actually changes; registration waits for the next AddMeshesToManager pass.
     */
    SetGeometryResource(meshId, geometry) {
      const mesh = _EveChildInstancedMes4.#GetMesh(this.meshes, meshId);
      if (mesh.GetGeometryResource() !== geometry) {
        mesh.SetGeometryResource(geometry);
        this.#revision++;
      }
    }

    /**
     * Returns a detached snapshot of one mesh - instance transforms cloned, areas
     * shallow-copied, geometry resource shared by reference - so callers can read
     * it without touching live registration state.
     */
    GetMeshData(meshId) {
      const mesh = _EveChildInstancedMes4.#GetMesh(this.meshes, meshId);
      return _EveChildInstancedMes4.#CloneMesh(mesh);
    }

    /**
     * Monotonic counter bumped by every structural change (AddMesh, Clear,
     * SetMeshDisplay, SetGeometryResource, SetShaderOption), for consumers caching
     * derived data.
     */
    GetRevision() {
      return this.#revision;
    }

    /** Carbon EveChildInstancedMeshes::RegisterComponents (cpp:36-43):
     * unconditional InstancedMeshProvider + ShadowCaster leaf
     * self-registration. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.InstancedMeshProvider, this);
        registry.RegisterComponent(EveComponentType.ShadowCaster, this);
      }
    }

    /** Carbon EveChildInstancedMeshes::UnRegisterComponents (cpp:45-48) only
     * calls UnregisterFromMeshManager; own components were already removed by
     * EveEntity::UnRegister (EveEntity.cpp:90). */
    UnRegisterComponents() {
      this.UnregisterFromMeshManager();
    }

    /** Carbon EveChildInstancedMeshes::UnregisterFromMeshManager (cpp:50-71):
     * every registered mesh-group / sphere-group / per-object handle is removed
     * through ITS OWN handle.owner (handles may span managers after a switch),
     * then the latch clears. */
    UnregisterFromMeshManager() {
      for (const mesh of this.meshes) {
        for (const area of mesh.areas) {
          if (area.meshGroupHandle) {
            area.meshGroupHandle.owner?.RemoveMeshGroup?.(area.meshGroupHandle);
            area.meshGroupHandle = null;
          }
        }
        if (mesh.sphereHandle) {
          mesh.sphereHandle.owner?.RemoveBoundingSphereGroup?.(mesh.sphereHandle);
          mesh.sphereHandle = null;
        }
      }
      if (this.#perObjectDataHandle) {
        this.#perObjectDataHandle.owner?.RemovePerObjectData?.(this.#perObjectDataHandle);
        this.#perObjectDataHandle = null;
      }
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
    AddMeshesToManager(manager) {
      if (!this.hasUpdated) {
        return;
      }
      if (this.#perObjectDataHandle && this.#perObjectDataHandle.owner !== manager) {
        this.UnregisterFromMeshManager();
      }
      if (this.#allRegistered) {
        return;
      }
      if (!this.#perObjectDataHandle) {
        const handle = manager?.AddPerObjectData?.(this) ?? null;
        if (handle && typeof handle === "object" && !handle.owner) {
          handle.owner = manager;
        }
        this.#perObjectDataHandle = handle;
      }
      this.#allRegistered = true;
      for (let meshIndex = 0; meshIndex < this.meshes.length; meshIndex++) {
        const mesh = this.meshes[meshIndex];
        if (!mesh.display) {
          continue;
        }
        const geometry = mesh.GetGeometryResource();
        if (!geometry || geometry.IsGood?.() === false) {
          this.#allRegistered = false;
          continue;
        }
        if (!mesh.instances.length) {
          this.#allRegistered = false;
          continue;
        }
        if (mesh.instances.length !== mesh.instanceSpheres.length) {
          this.#allRegistered = false;
          continue;
        }
        if (!mesh.sphereHandle) {
          const handle = manager?.AddBoundingSphereGroup?.(mesh.worldBoundingSphere, mesh.flags, mesh.instanceSpheres, mesh.instanceSpheres.length) ?? null;
          if (handle && typeof handle === "object" && !handle.owner) {
            handle.owner = manager;
          }
          mesh.sphereHandle = handle;
        }
        for (const area of mesh.areas) {
          if (area.meshGroupHandle) {
            continue;
          }
          if (!area.effect) {
            this.#allRegistered = false;
            continue;
          }
          const handle = manager?.AddMeshGroup?.(geometry, 0, area.batchType, mesh.meshIndex, area.areaIndex, area.areaCount, area.effect, area.effectHash, this.#perObjectDataHandle, mesh.sphereHandle, mesh.instances, mesh.instances.length, this, meshIndex) ?? null;
          if (handle && typeof handle === "object" && !handle.owner) {
            handle.owner = manager;
          }
          area.meshGroupHandle = handle;
        }
      }
    }

    /** Carbon EveChildInstancedMeshes::IsCastingShadow (cpp:73-76) always
     * returns false (instanced shadows cull per instance group); presence
     * satisfies the "ShadowCaster" duck contract. */
    IsCastingShadow(..._args) {
      return false;
    }

    /** Carbon EveChildInstancedMeshes::GetShadowBatches (cpp:78-80) is an
     * intentional no-op (the instanced mesh manager emits the batches). */
    GetShadowBatches(..._args) {}

    /** Carbon EveChildInstancedMeshes::GetShadowPerObjectData (cpp:82-85)
     * returns null (per-object data flows through the mesh manager). */
    GetShadowPerObjectData(..._args) {
      return null;
    }

    /**
     * Resolves a mesh index against the list, throwing RangeError rather than
     * returning undefined so every public accessor fails loudly.
     */

    /**
     * Builds an area record from a plain duck, defaulting areaCount to 1 and
     * caching the effect hash the manager registers the mesh group under.
     */

    /**
     * Deep-copies a mesh into a plain object for GetMeshData: instance transforms
     * cloned, areas spread-copied, the geometry resource shared by reference.
     */

    /**
     * Reads an effect's hash through GetHashValue() or a .hash field, yielding 0
     * when neither is available so a hashless effect still registers
     * deterministically.
     */
  }];
  #inverseScratch = mat4.create();
  CUSTOM_MASK_COUNT = 2;
  #GetMesh(meshes, meshId) {
    const index = Number(meshId) >>> 0;
    if (index >= meshes.length) {
      throw new RangeError(`EveChildInstancedMeshes mesh index ${index} is out of range`);
    }
    return meshes[index];
  }
  #CreateArea(value) {
    const source = value ?? {};
    const area = new _EveChildInstancedMes();
    area.effect = source.effect ?? null;
    area.batchType = Number(source.batchType) >>> 0;
    area.areaIndex = Number(source.areaIndex) >>> 0;
    area.areaCount = source.areaCount === undefined ? 1 : Number(source.areaCount) >>> 0;
    area.effectHash = _EveChildInstancedMes4.#GetEffectHash(area.effect);
    return area;
  }
  #CloneMesh(mesh) {
    return {
      geometryPath: mesh.geometryPath,
      geometry: mesh.GetGeometryResource(),
      castsShadow: mesh.castsShadow,
      reflectionMode: mesh.reflectionMode,
      meshIndex: mesh.meshIndex,
      areas: mesh.areas.map(area => ({
        ...area
      })),
      instances: mesh.instances.map(instance => ({
        transform: mat4.clone(instance.transform),
        sphereIndex: instance.sphereIndex
      })),
      sofHullName: mesh.sofHullName,
      sofLocatorSetName: mesh.sofLocatorSetName,
      display: mesh.display
    };
  }
  #GetEffectHash(effect) {
    const hash = effect?.GetHashValue?.() ?? effect?.hash ?? 0;
    return Number(hash) || 0;
  }
  constructor() {
    super(_EveChildInstancedMes4), _initClass4();
  }
}();

export { _EveChildInstancedMes3 as EveChildInstancedMesh, _EveChildInstancedMes as EveChildInstancedMeshArea, _EveChildInstancedMes2 as EveChildInstancedMeshInstance, _EveChildInstancedMes4 as EveChildInstancedMeshes, INSTANCE_FLAG_CASTS_SHADOW, INSTANCE_FLAG_RENDER_IN_REFLECTION };
//# sourceMappingURL=EveChildInstancedMeshes.js.map
