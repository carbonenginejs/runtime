import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.h
//   trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp
import { CjsSchema, meta } from "#schema";
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


function createRandom(seed)
{
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () =>
  {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}


function randomGauss(random, deviation)
{
  const first = Math.max(random(), 1e-100);
  return deviation * Math.pow(-2 * Math.log(first), 0.75) * Math.cos(random() * Math.PI * 2);
}

/**
 * A scene-scale field of static particle clusters, held as CPU instance rows
 * around a double-precision aggregate origin and drawn through a single
 * instanced mesh.
 */
@meta.define({ className: "EveSceneStaticParticles", family: "eve/scene" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveSceneStaticParticles
{

  /** Carbon ClusterData records retained on the CPU. */
  @meta.type.list("ClusterData")
  clusters = [];

  /** Double-precision aggregate origin used for camera-relative placement. */
  @meta.type.rawStruct("Vector3d")
  centerOfClusters = new Float64Array(3);

  /** Local particle bounds rebuilt with the CPU instance data. */
  @meta.type.vec4
  boundingSphere = new Float32Array(4);

  /** m_clusterParticleDensityAdjust (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  clusterParticleDensityAdjust = 1;

  /** m_estimatedSize (float) [READ] */
  @meta.blue.read
  @meta.type.float32
  estimatedSize = 0;

  /** m_clusterParticleDensity (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  clusterParticleDensity = 100;

  /** m_maxSize (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  maxSize = 200;

  /** m_minSize (float) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.float32
  minSize = 5;

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.objectRef("Tr2InstancedMesh")
  mesh = null;

  /** m_maxParticleCount (size_t) [READWRITE] */
  @meta.blue.readwrite
  @meta.type.uint64
  maxParticleCount = 100000;

  /** m_visible (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  IsVisible(updateContext)
  {
    vec4.set(SPHERE_SCRATCH, this.center[0], this.center[1], this.center[2], this.boundingSphere[3]);
    return updateContext.GetFrustum().IsSphereVisible(SPHERE_SCRATCH);
  }

  /** Carbon EveSceneStaticParticles::GetRenderables (cpp:129-135): pushes the
   * object ITSELF when visible; the frustum parameter is deliberately unused
   * (kept for the scene call-site contract, EveSpaceScene.cpp:1504-1507). */
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData, this.estimatedSize);
  }

  /** Carbon EveSceneStaticParticles::GetShadowBatches (cpp:142-145): the
   * particle clusters never cast shadows. */
  @meta.blue.method
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
  @meta.blue.method
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
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveSceneStaticParticles::GetSortValue (cpp:165-168). */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Adds Carbon's sole debug option to a Set-like option bag. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")
  GetDebugOptions(options = new Set())
  {
    if (options?.add)
    {
      options.add("Bounding Sphere");
    }
    else
    {
      options?.insert?.("Bounding Sphere");
    }
    return options;
  }

  /** Draws the transformed cluster bounds through the injected debug renderer. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("ITr2DebugRenderer2 is an injected engine-owned capability; its Effect::Wireframe value is retained as 0.")
  RenderDebugInfo(renderer)
  {
    if (!renderer?.HasOption?.(this, "Bounding Sphere"))
    {
      return;
    }
    vec3.transformMat4(DEBUG_CENTER_SCRATCH, this.boundingSphere, this.worldMatrix);
    renderer.DrawSphere?.(
      this,
      DEBUG_CENTER_SCRATCH,
      this.boundingSphere[3],
      10,
      0,
      0xffffff00
    );
  }

  /** Carbon method AddCluster (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's native ClusterData/Vector3d value is represented by a plain record with a Float64Array position.")
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
   * writes. The existing local PRNG, boolean return and empty-cluster cleanup
   * remain unresolved parity differences from Carbon's global randomness,
   * void return and unguarded empty-cluster calculation.
   */
  @meta.blue.method
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
      const random = createRandom(cluster.randomSeed || clusterIndex + 1);

      for (let index = 0; index < count; index++)
      {
        const offset = vec3.fromValues(
          randomGauss(random, 2 * deviation),
          randomGauss(random, deviation),
          randomGauss(random, 2 * deviation)
        );
        const length = vec3.length(offset);
        const position = vec3.clone(relative);
        vec3.add(position, position, offset);
        if (length > 0)
        {
          vec3.scaleAndAdd(position, position, offset, cluster.radius / length);
        }

        const mix = random();
        const color = vec4.create();
        for (let channel = 0; channel < 4; channel++)
        {
          color[channel] = cluster.color1[channel] + (cluster.color2[channel] - cluster.color1[channel]) * mix;
        }
        color[3] = count > 0 ? index / count : 0;
        const size = random() * Math.min(cluster.radius / 10, this.maxSize) + this.minSize;
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
  @meta.blue.method
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
  @meta.blue.renamed("GetInstanceDataObject")
  @meta.adapted
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
