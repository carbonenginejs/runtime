// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:260-269
import { vec3 } from "#math/vec3";
import { type, meta } from "#schema";
import { TriFrustumTestResult } from "../../generated/trinityCore/enums.js";
import { EveInstancedMeshManagerInstanceFlags } from "./EveInstancedMeshManagerInstanceFlags.js";


/**
 * Carbon EveInstancedMeshManager::SphereGroup (private, h:260-269): one
 * provider's set of instance cull spheres - the group's enclosing sphere and
 * flags (copied in), the provider's per-instance sphere array (read in
 * place), the provider's handle, and the per-instance screen sizes and last
 * frustum result the manager's culling writes.
 *
 * A sphere is the `{ center, radius }` record TriFrustum's sphere tests read.
 */
@meta.carbon("EveInstancedMeshManager::SphereGroup")
export class EveInstancedMeshManagerSphereGroup
{

  /**
   * bounds (CcpMath::Sphere), embedded by value. `= {}` runs Sphere's default
   * constructor (math/include/Sphere_inline.h:9-13): centre 0, radius -1.
   */
  @type.unknown
  bounds = { center: vec3.create(), radius: -1 };

  /** flags (InstanceFlags), embedded by value. */
  @type.rawStruct("EveInstancedMeshManagerInstanceFlags")
  flags = new EveInstancedMeshManagerInstanceFlags();

  /** count (uint32_t). */
  @type.uint32
  count = 0;

  /** boundingSpheres (const CcpMath::Sphere*): the provider's sphere array. Carbon initializes it to nullptr. */
  @type.unknown
  boundingSpheres = null;

  /** handle (BoundingSphereHandle*). Carbon initializes it to nullptr. */
  @type.rawStruct("EveInstancedMeshManagerDataHandle")
  handle = null;

  /** screenSizes (std::vector<float>). */
  @type.float32Array
  screenSizes = new Float32Array(0);

  /** lastTestResult (TriFrustumTestResult). Carbon initializes it to Outside. */
  @type.int32
  lastTestResult = TriFrustumTestResult.Outside;

}
