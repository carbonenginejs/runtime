// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:237-249
import { type, meta } from "#schema";
import { EveInstancedMeshManagerInstanceBufferAllocation } from "./EveInstancedMeshManagerInstanceBufferAllocation.js";


/**
 * Carbon EveInstancedMeshManager::MeshData (private, h:237-249): everything
 * the manager keeps for one MeshKey - the mesh groups registered under it,
 * the material, the mesh's bounding radius and per-LOD screen-size
 * thresholds (filled on first registration), and the per-frame culling and
 * binning results the draw side fills.
 */
@meta.define({"className":"EveInstancedMeshManagerMeshData","carbon":"EveInstancedMeshManager::MeshData"})
export class EveInstancedMeshManagerMeshData
{

  /** meshGroups (std::vector<MeshGroup>). */
  @type.list("EveInstancedMeshManagerMeshGroup")
  meshGroups = [];

  /** material (Tr2Effect*). Carbon initializes it to nullptr. */
  @type.rootRef("Tr2Effect")
  material = null;

  /** radius (float): the mesh's bounding-sphere radius plus its centre's distance from the origin. */
  @type.float32
  radius = 0;

  /** maxScreenSize (float). */
  @type.float32
  maxScreenSize = 0;

  /** totalVisibleInstances (uint32_t). */
  @type.uint32
  totalVisibleInstances = 0;

  /** currentAllocation (InstanceBuffer::Allocation), embedded by value. */
  @type.rawStruct("EveInstancedMeshManagerInstanceBufferAllocation")
  currentAllocation = new EveInstancedMeshManagerInstanceBufferAllocation();

  /**
   * lodIndices (std::vector<std::vector<std::pair<const void*, uint32_t>>>):
   * per LOD slot (two per LOD: plain and mirrored), the visible instances
   * binned there, each as [instance, perObjectDataIndex].
   */
  @type.unknown
  lodIndices = [];

  /** screenSizeThresholds (std::vector<float>): each LOD's authored maximum screen size. */
  @type.float32Array
  screenSizeThresholds = new Float32Array(0);

}
