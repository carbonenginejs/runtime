import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
import { ITr2DebugRenderable } from "../../../../global/interfaces/ITr2DebugRenderable.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
// Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
//   trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp
import { CjsSchema, meta, type, blue } from "#schema";
import * as CcpLog from "../../../../global/logging/ccpLog.js";
import { Tr2RuntimeInstanceData } from "../../../core/mesh/Tr2RuntimeInstanceData.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2Renderable } from "../../../core/ITr2Renderable.js";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";

/** Carbon PARTICLE_CLUSTER_MIN_SIZE (EveSceneStaticParticles.cpp:14, a
 * file-scope const - NOT in the header): the pixel-size floor, scaled by the
 * context lodFactor, below which the cluster system is invisible. */
export const PARTICLE_CLUSTER_MIN_SIZE = 100;

// Packed (x, y, z, radius) world-space cull-sphere scratch.
const SPHERE_SCRATCH = vec4.create();
const DEBUG_CENTER_SCRATCH = vec3.create();
const OFFSET_SCRATCH = vec3.create();


/**
 * A scene-scale field of static particle clusters, held as CPU instance rows
 * around a double-precision aggregate origin and drawn through a single
 * instanced mesh.
 */
@be.define("EveSceneStaticParticles")
@blue.inherit(IInitialize, ITr2DebugRenderable, ITr2Renderable)
@be.mapInterface(IInitialize)
export class EveSceneStaticParticles
{

  /** Carbon ClusterData records retained on the CPU. */
  @type.list("ClusterData")
  clusters = [];

  /** Double-precision aggregate origin used for camera-relative placement. */
  @type.rawStruct("Vector3d")
  centerOfClusters = new Float64Array(3);

  /** Local particle bounds rebuilt with the CPU instance data. */
  @type.vec4
  boundingSphere = new Float32Array(4);

  /** m_clusterParticleDensityAdjust (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  clusterParticleDensityAdjust = 1;

  /** m_estimatedSize (float) [READ] */
  @be.mapAttribute(be.READ)
  @type.float32
  estimatedSize = 0;

  /** m_clusterParticleDensity (float) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  clusterParticleDensity = 100;

  /** m_maxSize (float) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  maxSize = 200;

  /** m_minSize (float) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.float32
  minSize = 5;

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.rootRef("Tr2InstancedMesh")
  mesh = null;

  /** m_maxParticleCount (size_t) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.uint64
  maxParticleCount = 100000;

  /** m_visible (bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  visible = false;

  /** m_worldMatrix (EveSceneStaticParticles.h:93; ctor identity, cpp:27) -
   * the camera-relative placement stamped by Update. */
  worldMatrix = mat4.create();

  /** m_lastWorldMatrix (h:94; ctor identity, cpp:28) - the previous frame's
   * placement, consumed by GetPerObjectData for motion vectors. */
  lastWorldMatrix = mat4.create();

  /** m_center (h:95; ctor zero, cpp:24) - the world-space sphere center
   * stamped by Update. */
  center = vec3.create();

  /** Carbon's post-hydration initializer has no additional work. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

  /** Carbon EveSceneStaticParticles::Update (cpp:90-105): the same
   * low-quality/clusters/mesh triple early-out as UpdateVisibility; stashes
   * the previous world matrix, rebuilds the camera-relative translation from
   * the DOUBLE-precision offset centerOfClusters - origin (narrowed to
   * float32 per component only when it enters the matrix, Carbon's
   * float(offset.x) casts), and stamps the world-space sphere center. */
  @blue.method
  @meta.implemented
  Update(updateContext)
  {
    if (Tr2Renderer.IsLowQuality() || this.clusters.length === 0 || !this.mesh)
    {
      return;
    }

    mat4.copy(this.lastWorldMatrix, this.worldMatrix);
    const origin = updateContext.GetOrigin();
    // Double-precision subtraction (Carbon Vector3d, cpp:100), narrowed per
    // component at the matrix boundary (cpp:102).
    vec3.set(
      OFFSET_SCRATCH,
      Math.fround(this.centerOfClusters[0] - origin[0]),
      Math.fround(this.centerOfClusters[1] - origin[1]),
      Math.fround(this.centerOfClusters[2] - origin[2])
    );
    mat4.fromTranslation(this.worldMatrix, OFFSET_SCRATCH);
    vec3.transformMat4(this.center, this.boundingSphere, this.worldMatrix);
  }

  /** Carbon EveSceneStaticParticles::UpdateVisibility (cpp:107-123): visible
   * is stamped false first (so a quality toggle / cleared clusters drop the
   * system the same frame); the pixel size is measured on the UNTRANSLATED
   * LOCAL bounding sphere (cpp:117) while the inside test and the frustum
   * test use the world-space center - Carbon's asymmetry, preserved; the
   * camera being inside the cluster sphere bypasses BOTH the frustum test
   * and the size gate; the size gate is strict > against
   * PARTICLE_CLUSTER_MIN_SIZE * lodFactor. estimatedSize is stamped even
   * when invisible - GetBatches consumes it as the LOD size (cpp:139). */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext)
  {
    this.visible = false;
    if (Tr2Renderer.IsLowQuality() || this.clusters.length === 0 || !this.mesh)
    {
      return;
    }
    const frustum = updateContext.GetFrustum();
    this.estimatedSize = frustum.GetPixelSizeAccross(this.boundingSphere);

    const estimatedSizeWithinBounds = this.estimatedSize > PARTICLE_CLUSTER_MIN_SIZE * updateContext.GetLodFactor();
    const viewPos = frustum.viewPos;
    const dx = this.center[0] - viewPos[0];
    const dy = this.center[1] - viewPos[1];
    const dz = this.center[2] - viewPos[2];
    const inBoundingSphere =
      dx * dx + dy * dy + dz * dz <= this.boundingSphere[3] * this.boundingSphere[3];

    this.visible = inBoundingSphere || (this.IsVisible(updateContext) && estimatedSizeWithinBounds);
  }

  /** Carbon EveSceneStaticParticles::IsVisible (cpp:170-174): the world-space
   * center with the local radius through the ONE-ARG IsSphereVisible - the
   * back-plane-ignored TriFrustum quirk applies (cullBackPlane false). */
  @blue.method
  @meta.implemented
  IsVisible(updateContext)
  {
    vec4.set(SPHERE_SCRATCH, this.center[0], this.center[1], this.center[2], this.boundingSphere[3]);
    return updateContext.GetFrustum().IsSphereVisible(SPHERE_SCRATCH);
  }

  /** Carbon EveSceneStaticParticles::GetRenderables (cpp:129-135): pushes the
   * object ITSELF when visible; the frustum parameter is deliberately unused
   * (kept for the scene call-site contract, EveSpaceScene.cpp:1504-1507). */
  @blue.method
  @meta.implemented
  GetRenderables(_frustum, out = [])
  {
    if (this.visible)
    {
      out.push(this);
    }
    return out;
  }

  /** Carbon EveSceneStaticParticles::GetBatches (cpp:137-140): the mesh's
   * areas of the requested type with the stamped estimatedSize as the LOD
   * screen size. */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData, this.estimatedSize);
  }

  /** Carbon EveSceneStaticParticles::GetShadowBatches (cpp:142-145): the
   * particle clusters never cast shadows. */
  @blue.method
  @meta.implemented
  GetShadowBatches(_batches, _perObjectData, _shadowPixelSize)
  {
    return false;
  }

  /** Carbon EveSceneStaticParticles::GetPerObjectData (cpp:147-158): the
   * world/lastWorld pair (HLSL packing transposes of single matrices - no
   * composition).
   *
   * Adapted: the accumulator allocates the catalogued record by name, and
   * SetAndTranspose writes the stored layout. */
  @blue.method
  @meta.adapted
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveSceneStaticParticlesPerObjectData");
    if (!data)
    {
      return null;
    }
    data.SetAndTranspose("world", this.worldMatrix);
    data.SetAndTranspose("lastWorld", this.lastWorldMatrix);
    return data;
  }

  /** Carbon EveSceneStaticParticles::HasTransparentBatches (cpp:160-163). */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveSceneStaticParticles::GetSortValue (cpp:165-168). */
  @blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Carbon EveSceneStaticParticles::GetDebugOptions (cpp:176-179).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Bounding Sphere");
  }

  /**
   * Carbon EveSceneStaticParticles::RenderDebugInfo (cpp:185-193): the
   * cluster bounding sphere, centre transformed into world space.
   * @param {ITr2DebugRenderer2} renderer
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (renderer.HasOption(this, "Bounding Sphere"))
    {
      vec3.transformMat4(DEBUG_CENTER_SCRATCH, this.boundingSphere, this.worldMatrix);
      renderer.DrawSphere__CenterRadius(
        Tr2DebugObjectReference.create__Object(this),
        DEBUG_CENTER_SCRATCH,
        this.boundingSphere[3],
        10,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xffffff00));
    }
  }

  /**
   * Carbon method AddCluster (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Carbon's native ClusterData/Vector3d value is represented by a plain record
   * with a Float64Array position.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  AddCluster(position, radius, color1, color2, randomSeed)
  {
    this.clusters.push({
      position: new Float64Array(position),
      radius,
      color1: vec4.clone(color1),
      color2: vec4.clone(color2),
      randomSeed: randomSeed >>> 0
    });
  }

  /**
   * Rebuilds particle instance rows and publishes their bounds.
   * Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp:225-327
   *
   * Adapted: CPU rows use SetElementLayout/SetData in place of native buffer
   * writes. Random draws use Carbon's shared CRT stream; a nonzero cluster seed reseeds it.
   * Boolean return and empty-cluster cleanup still differ from native.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  Rebuild()
  {
    const instanceData = this._GetInstanceDataObject();
    if (!instanceData)
    {
      return false;
    }
    if (this.clusters.length === 0)
    {
      instanceData.DestroyData();
      this.centerOfClusters.fill(0);
      this.boundingSphere.fill(0);
      return true;
    }

    this.centerOfClusters.fill(0);
    for (const cluster of this.clusters)
    {
      this.centerOfClusters[0] += cluster.position[0];
      this.centerOfClusters[1] += cluster.position[1];
      this.centerOfClusters[2] += cluster.position[2];
    }
    for (let axis = 0; axis < 3; axis++)
    {
      this.centerOfClusters[axis] /= this.clusters.length;
    }

    let unadjustedCount = 0;
    for (const cluster of this.clusters)
    {
      unadjustedCount += Math.max(0, Math.trunc(this.clusterParticleDensity * cluster.radius));
    }
    const maximum = Math.max(0, Number(this.maxParticleCount));
    this.clusterParticleDensityAdjust = unadjustedCount > maximum && unadjustedCount > 0
      ? maximum / unadjustedCount
      : 1;

    const rows = [];
    for (let clusterIndex = 0; clusterIndex < this.clusters.length; clusterIndex++)
    {
      const cluster = this.clusters[clusterIndex];
      const count = Math.max(0, Math.trunc(this.clusterParticleDensityAdjust * this.clusterParticleDensity * cluster.radius));
      const deviation = Math.min(cluster.radius, 2000);
      const relative = vec3.fromValues(
        cluster.position[0] - this.centerOfClusters[0],
        cluster.position[1] - this.centerOfClusters[1],
        cluster.position[2] - this.centerOfClusters[2]
      );
      if (cluster.randomSeed > 0) carbonRandom.triRandomSeed(cluster.randomSeed);

      for (let index = 0; index < count; index++)
      {
        const offsetZ = carbonRandom.triFloatRandomGauss(0, 2 * deviation);
        const offsetY = carbonRandom.triFloatRandomGauss(0, deviation);
        const offsetX = carbonRandom.triFloatRandomGauss(0, 2 * deviation);
        const offset = vec3.fromValues(offsetX, offsetY, offsetZ);
        const length = vec3.length(offset);
        const position = vec3.clone(relative);
        vec3.add(position, position, offset);
        if (length > 0)
        {
          vec3.scaleAndAdd(position, position, offset, cluster.radius / length);
        }

        const mix = carbonRandom.triFloatRandom01();
        const color = vec4.create();
        for (let channel = 0; channel < 4; channel++)
        {
          color[channel] = cluster.color1[channel] + (cluster.color2[channel] - cluster.color1[channel]) * mix;
        }
        color[3] = count > 0 ? index / count : 0;
        const size = carbonRandom.triFloatRandom01() * Math.min(cluster.radius / 10, this.maxSize) + this.minSize;
        rows.push([position, size, color]);
      }
    }

    instanceData.SetElementLayout([
      { usage: "POSITION", usageIndex: 0, type: "FLOAT32_3", name: "position" },
      { usage: "TEXCOORD", usageIndex: 0, type: "FLOAT32_1", name: "size" },
      { usage: "TEXCOORD", usageIndex: 1, type: "FLOAT32_4", name: "color" }
    ]);
    instanceData.SetData(rows);
    instanceData.UpdateBoundingBox();
    instanceData.UpdateData();

    const bounds = instanceData.GetBoundingBox();
    this.mesh.SetBoundingBox(bounds.min, bounds.max);
    for (let axis = 0; axis < 3; axis++)
    {
      this.boundingSphere[axis] = (bounds.min[axis] + bounds.max[axis]) * 0.5;
    }
    this.boundingSphere[3] = Math.hypot(
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2]
    ) * 0.5;
    return true;
  }

  /**
   * Clears clusters and destroys data only on the runtime instance-data class.
   * Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp:64-74
   */
  @be.mapMethodAndWrap()
  @meta.implemented
  ClearClusters()
  {
    this.clusters.length = 0;
    const instanceData = this._GetInstanceDataObject();
    if (!instanceData) return;
    instanceData.DestroyData();
  }

  /**
   * Gets the mesh's concrete runtime instance data, or null on a failed cast.
   * Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp:200-218
   *
   * Adapted: CjsSchema.cast represents QueryInterface and the logging channel
   * is explicit because JavaScript modules have no native module-name linker symbol.
   * @private
   * @returns {Tr2RuntimeInstanceData|null} The accepted instance-data receiver.
   */
  @meta.adapted
  @blue.method
  _GetInstanceDataObject()
  {
    if (!this.mesh) return null;
    const instanceData = this.mesh.GetInstanceGeometryResource();
    const data = CjsSchema.cast(instanceData, Tr2RuntimeInstanceData);
    if (!data)
    {
      CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "EveSceneStaticParticles: instance data is not of correct type!");
      return null;
    }
    return data;
  }

}
