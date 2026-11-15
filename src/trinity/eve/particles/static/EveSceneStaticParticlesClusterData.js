// Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.h
// Source: trinity/trinity/Eve/Renderable/EveSceneStaticParticles.cpp
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";

/**
 * Carbon EveSceneStaticParticles::ClusterData (h:31-38): one cluster as AddCluster stores it (cpp:49-58). Carbon
 * gives its members no initializers; ours start at zero.
 */
@meta.define({"name":"EveSceneStaticParticles::ClusterData","carbon":"EveSceneStaticParticles::ClusterData"})
export class EveSceneStaticParticlesClusterData
{

  /** position (Vector3d): the cluster's centre, in double precision. */
  @type.vec3d
  position = new Float64Array(3); // alloc: Carbon Vector3d; no double-precision math type

  /** radius (float) */
  @type.float32
  radius = 0;

  /** color1 (Color) */
  @type.color
  color1 = vec4.create();

  /** color2 (Color) */
  @type.color
  color2 = vec4.create();

  /** randomSeed (unsigned int) */
  @type.uint32
  randomSeed = 0;

}
