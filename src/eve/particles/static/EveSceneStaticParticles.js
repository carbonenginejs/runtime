// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/Renderable/EveSceneStaticParticles.h
//   trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

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

@type.define({ className: "EveSceneStaticParticles", family: "eve/scene" })
export class EveSceneStaticParticles extends CjsModel
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
  @io.read
  @type.float32
  clusterParticleDensityAdjust = 1;

  /** m_estimatedSize (float) [READ] */
  @io.read
  @type.float32
  estimatedSize = 0;

  /** m_clusterParticleDensity (float) [READWRITE] */
  @io.readwrite
  @type.float32
  clusterParticleDensity = 100;

  /** m_maxSize (float) [READWRITE] */
  @io.readwrite
  @type.float32
  maxSize = 200;

  /** m_minSize (float) [READWRITE] */
  @io.readwrite
  @type.float32
  minSize = 5;

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE] */
  @io.readwrite
  @type.objectRef("Tr2InstancedMesh")
  mesh = null;

  /** m_maxParticleCount (size_t) [READWRITE] */
  @io.readwrite
  @type.uint64
  maxParticleCount = 100000;

  /** m_visible (bool) [READ] */
  @io.read
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::IsLowQuality relocates onto the update-context duck (lowQuality, default false).")
  Update(updateContext)
  {
    if ((updateContext?.lowQuality ?? updateContext?.device?.lowQuality) === true ||
      this.clusters.length === 0 || !this.mesh)
    {
      return;
    }

    mat4.copy(this.lastWorldMatrix, this.worldMatrix);
    const origin = updateContext?.GetOrigin?.();
    // Double-precision subtraction (Carbon Vector3d, cpp:100), narrowed per
    // component at the matrix boundary (cpp:102).
    vec3.set(
      OFFSET_SCRATCH,
      Math.fround(this.centerOfClusters[0] - (origin?.[0] ?? 0)),
      Math.fround(this.centerOfClusters[1] - (origin?.[1] ?? 0)),
      Math.fround(this.centerOfClusters[2] - (origin?.[2] ?? 0))
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
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2Renderer::IsLowQuality relocates onto the update-context duck (lowQuality, default false).")
  UpdateVisibility(updateContext)
  {
    this.visible = false;
    if ((updateContext?.lowQuality ?? updateContext?.device?.lowQuality) === true ||
      this.clusters.length === 0 || !this.mesh)
    {
      return;
    }
    const frustum = updateContext?.GetFrustum?.();
    if (!frustum)
    {
      return;
    }
    this.estimatedSize = frustum.GetPixelSizeAccross(this.boundingSphere);

    const estimatedSizeWithinBounds =
      this.estimatedSize > PARTICLE_CLUSTER_MIN_SIZE * (updateContext?.GetLodFactor?.() ?? 1);
    const viewPos = frustum.viewPos ?? frustum.m_viewPos;
    const dx = this.center[0] - (viewPos?.[0] ?? 0);
    const dy = this.center[1] - (viewPos?.[1] ?? 0);
    const dz = this.center[2] - (viewPos?.[2] ?? 0);
    const inBoundingSphere =
      dx * dx + dy * dy + dz * dz <= this.boundingSphere[3] * this.boundingSphere[3];

    this.visible = inBoundingSphere || (this.IsVisible(updateContext) && estimatedSizeWithinBounds);
  }

  /** Carbon EveSceneStaticParticles::IsVisible (cpp:170-174): the world-space
   * center with the local radius through the ONE-ARG IsSphereVisible - the
   * back-plane-ignored TriFrustum quirk applies (cullBackPlane false). */
  @carbon.method
  @impl.implemented
  IsVisible(updateContext)
  {
    const frustum = updateContext?.GetFrustum?.();
    if (!frustum)
    {
      return false;
    }
    vec4.set(SPHERE_SCRATCH, this.center[0], this.center[1], this.center[2], this.boundingSphere[3]);
    return frustum.IsSphereVisible(SPHERE_SCRATCH) === true;
  }

  /** Carbon EveSceneStaticParticles::GetRenderables (cpp:129-135): pushes the
   * object ITSELF when visible; the frustum parameter is deliberately unused
   * (kept for the scene call-site contract, EveSpaceScene.cpp:1504-1507). */
  @carbon.method
  @impl.implemented
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
   * screen size (engine-resolved at realization in the GPU-free model). */
  @carbon.method
  @impl.adapted
  @impl.reason("The estimatedSize LOD select is engine-resolved at realization; the delegation structure is ported.")
  GetBatches(batches, batchType, perObjectData, _reason)
  {
    const areas = this.mesh?.GetAreas?.(batchType) ?? batchType;
    return this.mesh?.GetBatches?.(batches, areas, perObjectData, this.estimatedSize) === true;
  }

  /** Carbon EveSceneStaticParticles::GetShadowBatches (cpp:142-145): the
   * particle clusters never cast shadows. */
  @carbon.method
  @impl.implemented
  GetShadowBatches(_batches, _perObjectData, _shadowPixelSize)
  {
    return false;
  }

  /** Carbon EveSceneStaticParticles::GetPerObjectData (cpp:147-158): the
   * world/lastWorld pair (HLSL packing transposes of single matrices - no
   * composition). */
  @carbon.method
  @impl.adapted
  @impl.reason("Constant-buffer layout/packing is engine-owned; Trinity Allocs the record from the accumulator's store and Sets the logical world/lastWorld by name (the store transposes per the engine layout). Both fields are fully CPU-filled, so no object backref is needed.")
  GetPerObjectData(accumulator)
  {
    const data = accumulator?.Alloc?.("EveSceneStaticParticlesPerObjectData");
    if (!data)
    {
      return null;
    }
    data.Set("world", this.worldMatrix);
    data.Set("lastWorld", this.lastWorldMatrix);
    return data;
  }

  /** Carbon EveSceneStaticParticles::HasTransparentBatches (cpp:160-163). */
  @carbon.method
  @impl.implemented
  HasTransparentBatches()
  {
    return false;
  }

  /** Carbon EveSceneStaticParticles::GetSortValue (cpp:165-168). */
  @carbon.method
  @impl.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Adds Carbon's sole debug option to a Set-like option bag. */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2DebugRendererOptions is represented by an injected Set-like option bag.")
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
  @carbon.method
  @impl.adapted
  @impl.reason("ITr2DebugRenderer2 is an injected engine-owned capability; its Effect::Wireframe value is retained as 0.")
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
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's native ClusterData/Vector3d value is represented by a plain record with a Float64Array position.")
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

  /** Carbon method Rebuild (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Builds Carbon's CPU instance rows and bounds; a deterministic local PRNG replaces Carbon's process-global C rand state, and boolean success plus safe empty-cluster cleanup replace Carbon's void native buffer path.")
  Rebuild()
  {
    const instanceData = this.mesh?.GetInstanceGeometryResource?.();
    if (!instanceData?.SetElementLayout || !instanceData?.SetData)
    {
      return false;
    }
    if (this.clusters.length === 0)
    {
      instanceData.DestroyData?.();
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
    instanceData.UpdateBoundingBox?.();
    instanceData.UpdateData?.();

    const bounds = instanceData.GetBoundingBox?.();
    if (bounds?.min && bounds?.max)
    {
      this.mesh.SetBoundingBox?.(bounds.min, bounds.max);
      for (let axis = 0; axis < 3; axis++)
      {
        this.boundingSphere[axis] = (bounds.min[axis] + bounds.max[axis]) * 0.5;
      }
      this.boundingSphere[3] = Math.hypot(
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2]
      ) * 0.5;
    }
    return true;
  }

  /** Carbon method ClearClusters (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon QueryInterface<Tr2RuntimeInstanceData> becomes the portable instance-resource duck exposed by the mesh.")
  ClearClusters()
  {
    this.clusters.length = 0;
    this.mesh?.GetInstanceGeometryResource?.()?.DestroyData?.();
  }

}
