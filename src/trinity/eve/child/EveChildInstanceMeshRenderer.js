import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveEntity } from "../EveEntity.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceMeshRenderer.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceMeshRenderer.cpp
//   trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceMeshRenderer_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { sph3 } from "#math/sph3";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta } from "#schema";
import { EveChildMesh } from "./EveChildMesh.js";
import { ShouldReflect } from "../EveComponentTypes.js";
import { Tr2InstancedMesh } from "../../core/mesh/Tr2InstancedMesh.js";
import { Tr2RuntimeInstanceData } from "../../core/mesh/Tr2RuntimeInstanceData.js";
import { RotationalConstraints } from "../../generated/eve/child/enums.js";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { blue } from "#blue";


const UP = vec3.fromValues(0, 1, 0);
const LOCAL_POSITION = vec3.create();
const WORLD_POSITION = vec3.create();
const SCALING = vec3.create();
const CAMERA_DIRECTION = vec3.create();
const OBJECT_DIRECTION = vec3.create();
const RIGHT = vec3.create();
const OBJECT_UP = vec3.create();
const MESH_DIRECTION = vec3.create();
const ROW_VECTOR = vec3.create();
const LOCAL_EYE = vec3.create();
const ROTATION = quat.create();
const ORIGIN_ROTATION = quat.create();
const ROTATION_ARC = quat.create();
const OBJECT_UP_TO_CAMERA = quat.create();
const INVERSE_ARC = quat.create();
const ROLL_ADJUSTMENT = quat.create();
const MODIFICATION = quat.create();
const QUATERNION_SCRATCH = quat.create();
const ROTATION_MATRIX = mat4.create();
const ROW_ROTATION_MATRIX = mat4.create();
const INVERSE_WORLD = mat4.create();
const WORLD_SPHERE = vec4.create();
const INSTANCE_SPHERE = vec4.create();


/**
 * A child mesh whose distribution placements are converted into one logical
 * current/previous transform record per instance. Trinity owns the placement,
 * culling and CPU-byte policy; an engine realizes Tr2RuntimeInstanceData.
 */
@meta.define({ className: "EveChildInstanceMeshRenderer", family: "eve/child" })
// Carbon's renderer Blue surface omits currentScreenSize, but its
// EveSmartLightMesh descendant exposes that inherited field. CjsSchema hidden
// fields cannot be reintroduced by descendants, so this one shared field stays
// visible here while the other non-Blue EveChildMesh fields are hidden.
@meta.hideInherited([
  "translation",
  "scaling",
  "rotation",
  "localTransform",
  "worldTransform",
  "staticTransform",
  "useSRT",
  "useStaticRotation",
  "useStaticScale",
  "reflectionMode",
  "transformModifiers",
  "castShadow",
  "decals",
  "animationUpdater",
  "attachments",
  "lights",
  "lowestLodVisible",
  "sortValueOffset",
  "sortValueScale",
  "currentInstanceScreenSize",
  "updateAnimation",
  "origin",
  "instanceTransforms",
  "sofDna",
  "sofParentHullName",
  "sofLocatorSetName",
  "sofLocatorIndex"
])
@meta.blue.inherit(IInitialize, INotify)
export class EveChildInstanceMeshRenderer extends EveChildMesh
{
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveChildInstanceMeshRenderer.RotationalConstraints")
  rotationConstraint = RotationalConstraints.NONE;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  staticOffsetRotation = quat.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  staticOffsetTranslation = vec3.create();

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("IEveDistributionMethod")
  distribution = null;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  staticOffsetScale = vec3.fromValues(1, 1, 1);

  /** Carbon m_lastEntityCount; protected-style for EveSmartLightMesh. */
  _lastEntityCount = 0;

  /** Carbon m_refreshStaticGeometry. */
  _refreshStaticGeometry = false;

  /** Carbon m_totalObjectCount. */
  _totalObjectCount = 0;

  /** Carbon m_boundingSphere, kept in distribution-local space. */
  _boundingSphere = vec4.create();

  /** Subclass visibility state used by Carbon's synchronous upload gate. */
  _placementVisible = false;

  /**
   * Keeps a skipped first-frame/count refresh armed until CPU bytes are
   * actually published. This JS adaptation records deferred publication
   * explicitly instead of consuming the count/refresh latch while invisible.
   */
  _geometryDirty = false;

  /** Distribution-local bound, valid whenever mesh and distribution exist. */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    if (!this.mesh || !this.distribution)
    {
      return false;
    }
    vec4.copy(out, this._boundingSphere);
    return true;
  }

  /** Distribution sphere culling before the full EveChildMesh visibility pass. */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  @meta.reason("Carbon reads the active renderer frustum through EveUpdateContext; the CPU sphere and threshold policy are unchanged.")
  IsVisible(updateContext)
  {
    if (this.GetNumberOfEntities() === 0 || this._boundingSphere[3] === 0)
    {
      return false;
    }

    vec3.transformMat4(WORLD_POSITION, this._boundingSphere, this.worldTransform);
    const frustum = updateContext.GetFrustum();
    const radius = this._boundingSphere[3];
    return frustum.IsSphereVisible(WORLD_POSITION, radius) &&
      frustum.GetPixelSizeAccrossEst(WORLD_POSITION, radius) >= updateContext.GetVisibilityThreshold();
  }

  /**
   * Carbon's shadow-frustum overload. The optional final one-element array is
   * the JavaScript form of float& sizeInShadow.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The float& sizeInShadow output is an optional one-element array; all culling and >5-pixel policy are ported.")
  IsCastingShadow(cameraFrustum, shadowFrustum, renderReason, sizeInShadowOut = null)
  {
    if (!this.display || !this.castShadow)
    {
      return false;
    }
    if (renderReason === Tr2RenderReason.TR2RENDERREASON_REFLECTION && !ShouldReflect(this.reflectionMode))
    {
      return false;
    }
    if (!this.mesh)
    {
      return false;
    }

    sph3.transformMat4(WORLD_SPHERE, this._boundingSphere, this.worldTransform);
    let sizeInShadow = 0;
    if (WORLD_SPHERE[3] <= 0)
    {
      if (sizeInShadowOut) sizeInShadowOut[0] = 0;
      return false;
    }

    if (shadowFrustum.IsVisible(cameraFrustum, WORLD_SPHERE))
    {
      let sphere = WORLD_SPHERE;
      if (CjsSchema.cast(this.mesh, Tr2InstancedMesh))
      {
        if (!mat4.invert(INVERSE_WORLD, this.worldTransform)) mat4.identity(INVERSE_WORLD);
        vec3.transformMat4(LOCAL_EYE, shadowFrustum.GetEyePos(), INVERSE_WORLD);
        const instanceBounds = this.mesh.GetInstanceBoundsClosestToPoint(LOCAL_EYE);
        if (instanceBounds)
        {
          sph3.set(
            INSTANCE_SPHERE,
            instanceBounds.center[0],
            instanceBounds.center[1],
            instanceBounds.center[2],
            instanceBounds.radius
          );
          sph3.transformMat4(INSTANCE_SPHERE, INSTANCE_SPHERE, this.worldTransform);
          sphere = INSTANCE_SPHERE;
        }
      }
      sizeInShadow = shadowFrustum.GetSizeInShadow(sphere);
    }

    if (sizeInShadowOut) sizeInShadowOut[0] = sizeInShadow;
    return sizeInShadow > 5;
  }

  /** Two-stage cull: the distribution sphere first, then EveChildMesh. */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    this._placementVisible = this.IsVisible(updateContext);
    if (this._placementVisible)
    {
      this._placementVisible = super.UpdateVisibility(updateContext, parentTransform, parentLod);
    }
    else
    {
      this._ResetVisibilityState();
    }
    return this._placementVisible;
  }

  /** Updates the distribution and republishes instance bytes when required. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2RuntimeInstanceData replaces Carbon's GPU-backed Tr2DirectInstanceData; logical transform production and refresh policy remain Trinity-owned.")
  UpdateSyncronous(updateContext, params)
  {
    super.UpdateSyncronous(updateContext, params);
    const distribution = this.distribution;
    if (!distribution)
    {
      return;
    }

    distribution.UpdateSyncronous(updateContext, params);
    const placements = distribution.GetPlacementData();
    const entityCount = this.GetNumberOfEntities();
    const updateCount = this._lastEntityCount !== entityCount;
    this._lastEntityCount = entityCount;

    // Carbon caches the downcast - m_instancedMesh = BlueCastPtr(m_mesh),
    // EveChildMesh.cpp:203 - and skips when it is null. The skip is the donor
    // behaviour, not a hedge: a non-instanced mesh has no instances to place.
    if (!CjsSchema.cast(this.mesh, Tr2InstancedMesh))
    {
      return;
    }

    const missingResource = !this.mesh.GetInstanceGeometryResource();
    if (missingResource)
    {
      this.ConfigureInstanceData();
      this._geometryDirty = true;
    }
    if (updateCount)
    {
      this._geometryDirty = true;
    }

    const alwaysUpdate = distribution.GetHasDynamicMovement() ||
      this.rotationConstraint !== RotationalConstraints.NONE;
    if (this._geometryDirty || alwaysUpdate || this._refreshStaticGeometry)
    {
      const published = this.UpdateGeometryResource(
        placements,
        entityCount,
        updateContext.renderContext
      );
      this.UpdateBoundingSphere(placements, distribution);
      if (published)
      {
        this._geometryDirty = false;
        this._refreshStaticGeometry = false;
      }
    }
  }

  /** Async mesh update followed by distribution lifetime work. */
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    super.UpdateAsyncronous(updateContext, params);
    if (this.distribution)
    {
      this.distribution.UpdateAsyncronous(updateContext, params);
    }
  }

  /** Creates the canonical CPU transform-stream provider and binds it. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The engine realizes the bound Tr2RuntimeInstanceData; Trinity owns its canonical transform layout and bytes.")
  ConfigureInstanceData()
  {
    if (!CjsSchema.cast(this.mesh, Tr2InstancedMesh))
    {
      return null;
    }
    const resource = new Tr2RuntimeInstanceData();
    this.mesh.SetInstanceGeometryRes(resource);
    return resource;
  }

  /** Number of live placements in the owned distribution. */
  @meta.blue.method
  @meta.implemented
  GetNumberOfEntities()
  {
    return this.distribution ? Number(this.distribution.GetNumberOfPlacements()) >>> 0 : 0;
  }

  /** Re-arms static instance geometry publication. */
  @meta.blue.method
  @meta.implemented
  RefreshStaticGeometry()
  {
    this._refreshStaticGeometry = true;
    this._geometryDirty = true;
  }

  /**
   * Builds logical current/previous matrices, publishes their canonical 3x4
   * bytes and stores the same logical matrices for ray/filter consumers.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon reads the global renderer camera, packs Tr2DirectInstanceData, and stores transposed auxiliary matrices; JS receives the active context, keeps auxiliary ray/filter transforms logical, and delegates row packing to Tr2RuntimeInstanceData.")
  UpdateGeometryResource(placements, size, renderContext)
  {
    this._totalObjectCount = Number(size) >>> 0;
    if (this._totalObjectCount === 0)
    {
      // The zero-count transition is logically handled without rewriting the
      // provider: old bytes remain retained but hidden by the zero count. A
      // later 0 -> N transition re-arms publication.
      return true;
    }
    if (
      !this._placementVisible ||
      !this.display ||
      this.currentScreenSize < this.minScreenSize
    )
    {
      return false;
    }

    const cameraPosition = renderContext.GetViewPosition();
    const instances = [];
    const logicalTransforms = [];

    for (let index = 0; index < this._totalObjectCount; index++)
    {
      const placement = placements[index];

      // Carbon row-vector: additionalRotation * initialRotation.
      quat.multiply(ROTATION, placement.initialRotation, placement.additionalRotation);
      EveChildInstanceMeshRenderer._RotateVectorQuaternion(
        LOCAL_POSITION,
        this.staticOffsetTranslation,
        ROTATION
      );
      vec3.add(LOCAL_POSITION, LOCAL_POSITION, placement.initialTranslation);
      vec3.add(LOCAL_POSITION, LOCAL_POSITION, placement.additionalTranslation);

      vec3.multiply(SCALING, placement.initialScale, placement.additionalScale);
      vec3.multiply(SCALING, SCALING, this.staticOffsetScale);

      if (this.rotationConstraint === RotationalConstraints.BILLBOARD)
      {
        vec3.transformMat4(WORLD_POSITION, LOCAL_POSITION, this.worldTransform);
        vec3.subtract(CAMERA_DIRECTION, cameraPosition, WORLD_POSITION);
        vec3.normalize(CAMERA_DIRECTION, CAMERA_DIRECTION);

        // Carbon RotationQuaternion intentionally reads the raw non-uniformly
        // scaled 3x3. mat4.getRotation normalizes scale and is not equivalent.
        EveChildInstanceMeshRenderer._RotationQuaternionRaw(ORIGIN_ROTATION, this.worldTransform);
        quat.invert(ORIGIN_ROTATION, ORIGIN_ROTATION);
        EveChildInstanceMeshRenderer._RotateVectorQuaternion(
          OBJECT_DIRECTION,
          UP,
          ORIGIN_ROTATION
        );

        vec3.cross(RIGHT, UP, OBJECT_DIRECTION);
        vec3.normalize(RIGHT, RIGHT);
        vec3.cross(OBJECT_UP, OBJECT_DIRECTION, RIGHT);
        if (RIGHT[0] === 0 && RIGHT[1] === 0 && RIGHT[2] === 0)
        {
          vec3.set(OBJECT_UP, 0, 0, -OBJECT_DIRECTION[1]);
        }

        const angle = Math.PI / 2 - Math.atan2(CAMERA_DIRECTION[0], CAMERA_DIRECTION[2]) * 0.5;
        quat.set(ROLL_ADJUSTMENT, 0, 0, Math.cos(angle), Math.sin(angle));
        // Carbon TriQuaternionRotationArc(out, from, to) - same argument order.
        quat.rotationArc(ROTATION_ARC, UP, OBJECT_UP);
        quat.rotationArc(OBJECT_UP_TO_CAMERA, CAMERA_DIRECTION, UP);
        quat.invert(INVERSE_ARC, OBJECT_UP_TO_CAMERA);

        // Carbon row-vector: rollAdjustment * rotationArc * inverse(cameraArc).
        quat.multiply(QUATERNION_SCRATCH, ROTATION_ARC, ROLL_ADJUSTMENT);
        quat.multiply(ROTATION, INVERSE_ARC, QUATERNION_SCRATCH);
      }
      else if (this.rotationConstraint === RotationalConstraints.BILLBOARD_WITH_Z_LOCKED)
      {
        vec3.transformMat4(WORLD_POSITION, LOCAL_POSITION, this.worldTransform);
        vec3.subtract(CAMERA_DIRECTION, cameraPosition, WORLD_POSITION);
        mat4.fromQuat(ROTATION_MATRIX, ROTATION);
        // Carbon row-vector: RotationMatrix(rotation) * worldTransform.
        mat4.multiply(ROW_ROTATION_MATRIX, this.worldTransform, ROTATION_MATRIX);
        EveChildInstanceMeshRenderer._TransformMatrixTimesDirection(
          ROW_VECTOR,
          ROW_ROTATION_MATRIX,
          CAMERA_DIRECTION
        );
        quat.setAxisAngle(MODIFICATION, UP, Math.atan2(ROW_VECTOR[0], ROW_VECTOR[2]));
        // Carbon row-vector: modification * rotation.
        quat.multiply(ROTATION, ROTATION, MODIFICATION);
      }
      else
      {
        EveChildInstanceMeshRenderer._RotateVectorQuaternion(
          MESH_DIRECTION,
          UP,
          ROTATION
        );
        vec3.normalize(MESH_DIRECTION, MESH_DIRECTION);
        vec3.scale(MESH_DIRECTION, MESH_DIRECTION, -1);
        quat.arcFromForward(ROTATION, MESH_DIRECTION);
      }

      // Carbon row-vector: staticOffsetRotation * rotation.
      quat.multiply(ROTATION, ROTATION, this.staticOffsetRotation);

      const transform = mat4.create();
      const previousTransform = mat4.create();
      mat4.fromRotationTranslationScale(transform, ROTATION, LOCAL_POSITION, SCALING);
      vec3.add(WORLD_POSITION, LOCAL_POSITION, placement.translationFrameDelta);
      mat4.fromRotationTranslationScale(previousTransform, ROTATION, WORLD_POSITION, SCALING);

      instances.push({
        transform,
        previousTransform,
        boneIndex: placement.boneIndex
      });
      logicalTransforms.push(transform);
    }

    this.UpdateInstanceData(instances);
    this.SetInstanceTransforms(logicalTransforms);
    return true;
  }

  /** Recomputes the distribution-local bounding sphere. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The bounding calculation is unchanged; JS reads the same mesh sphere through TriGeometryRes's maintained geometry facade.")
  UpdateBoundingSphere(placements, distribution)
  {
    if (!this.mesh || !distribution)
    {
      return false;
    }

    let baseMeshSize = 0;
    const geometry = this.mesh.GetGeometryResource();
    if (geometry && geometry.IsGood())
    {
      const sphere = geometry.GetBoundingSphere(this.mesh.GetMeshIndex());
      if (!sphere || sphere.length < 4)
      {
        throw new TypeError("EveChildInstanceMeshRenderer requires a bounding sphere for a good geometry mesh.");
      }
      baseMeshSize = Number(sphere[3]) || 0;
    }

    const center = distribution.GetPlacementDataCenter();
    let longestDistanceSquared = 0;
    let largestScale = 0;
    for (let index = 0; index < this._totalObjectCount; index++)
    {
      const placement = placements[index];
      const x = placement.initialTranslation[0] + placement.additionalTranslation[0] - center[0];
      const y = placement.initialTranslation[1] + placement.additionalTranslation[1] - center[1];
      const z = placement.initialTranslation[2] + placement.additionalTranslation[2] - center[2];
      longestDistanceSquared = Math.max(longestDistanceSquared, x * x + y * y + z * z);
      largestScale = Math.max(
        largestScale,
        placement.initialScale[0] * placement.additionalScale[0],
        placement.initialScale[1] * placement.additionalScale[1],
        placement.initialScale[2] * placement.additionalScale[2]
      );
    }

    vec4.set(
      this._boundingSphere,
      center[0],
      center[1],
      center[2],
      Math.sqrt(longestDistanceSquared) + largestScale * baseMeshSize
    );
    return true;
  }

  /** Publishes transform rows and updates the instanced mesh's dynamic scale. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2RuntimeInstanceData owns the canonical CPU transform packing while engines own physical instance-buffer realization.")
  UpdateInstanceData(instances)
  {
    if (!CjsSchema.cast(this.mesh, Tr2InstancedMesh))
    {
      return false;
    }

    let resource = this.mesh.GetInstanceGeometryResource();
    if (!CjsSchema.cast(resource, Tr2RuntimeInstanceData))
    {
      resource = this.ConfigureInstanceData();
    }
    const maxScale = resource.SetTransformInstances(instances);
    this.mesh.SetDynamicScaledBounds(maxScale);
    return true;
  }

  /** Carbon TriVectorRotateQuaternion, including non-unit quaternion scale. */
  static _RotateVectorQuaternion(out, value, quaternion)
  {
    const x = value[0];
    const y = value[1];
    const z = value[2];
    const qx = quaternion[0];
    const qy = quaternion[1];
    const qz = quaternion[2];
    const qw = quaternion[3];
    const ww = qw * qw;
    const wx = qw * qx;
    const wy = qw * qy;
    const wz = qw * qz;
    const xx = qx * qx;
    const xy = qx * qy;
    const xz = qx * qz;
    const yy = qy * qy;
    const yz = qy * qz;
    const zz = qz * qz;

    out[0] = x * (ww + xx - yy - zz) + 2 * (y * (xy - wz) + z * (xz + wy));
    out[1] = y * (ww - xx + yy - zz) + 2 * (x * (xy + wz) + z * (yz - wx));
    out[2] = z * (ww - xx - yy + zz) + 2 * (x * (xz - wy) + y * (yz + wx));
    return out;
  }

  /** Carbon CcpMath::RotationQuaternion(Matrix), including raw matrix scale. */
  static _RotationQuaternionRaw(out, matrix)
  {
    const trace = matrix[0] + matrix[5] + matrix[10] + 1;
    if (trace > 1)
    {
      const divisor = 2 * Math.sqrt(trace);
      out[0] = (matrix[6] - matrix[9]) / divisor;
      out[1] = (matrix[8] - matrix[2]) / divisor;
      out[2] = (matrix[1] - matrix[4]) / divisor;
      out[3] = Math.sqrt(trace) / 2;
      return out;
    }

    let maximum = 0;
    if (matrix[5] > matrix[0]) maximum = 1;
    if (matrix[10] > matrix[maximum === 0 ? 0 : 5]) maximum = 2;
    let scale;
    if (maximum === 0)
    {
      scale = 2 * Math.sqrt(1 + matrix[0] - matrix[5] - matrix[10]);
      quat.set(out, 0.25 * scale, (matrix[1] + matrix[4]) / scale, (matrix[2] + matrix[8]) / scale, (matrix[6] - matrix[9]) / scale);
    }
    else if (maximum === 1)
    {
      scale = 2 * Math.sqrt(1 + matrix[5] - matrix[0] - matrix[10]);
      quat.set(out, (matrix[1] + matrix[4]) / scale, 0.25 * scale, (matrix[6] + matrix[9]) / scale, (matrix[8] - matrix[2]) / scale);
    }
    else
    {
      scale = 2 * Math.sqrt(1 + matrix[10] - matrix[0] - matrix[5]);
      quat.set(out, (matrix[2] + matrix[8]) / scale, (matrix[6] + matrix[9]) / scale, 0.25 * scale, (matrix[1] - matrix[4]) / scale);
    }
    return out;
  }


  /** Carbon's literal Matrix * Vector4(w=0) row-dot operation. */
  static _TransformMatrixTimesDirection(out, matrix, direction)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[1] * y + matrix[2] * z;
    out[1] = matrix[4] * x + matrix[5] * y + matrix[6] * z;
    out[2] = matrix[8] * x + matrix[9] * y + matrix[10] * z;
    return out;
  }

  static RotationalConstraints = RotationalConstraints;
}


// EveChildInstanceMeshRenderer_Blue.cpp: native exposure; unported contracts: IEveShadowCaster.
meta.blue.interfaceTable({ interfaces: [EveChildInstanceMeshRenderer, EveEntity, EveChildMesh, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2Renderable, IInitialize, INotify], chainTo: null })(EveChildInstanceMeshRenderer, { kind: "class" });
