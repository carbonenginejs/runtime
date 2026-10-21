// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:167-189
import { meta, type } from "#schema";
import { TriBatchType } from "#consts/graphics";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";


/**
 * Carbon EveInstancedMeshManager::MeshKey (private, h:167-189): what makes
 * two mesh groups share one MeshData and therefore one instanced draw - the
 * geometry and mesh, the area range and its winding, the batch type and the
 * material. The manager keys m_meshInstances by it.
 *
 * `operator==` compares seven of the nine fields; `combinedVertexDeclaration`
 * and `isDynamic` are not among them. KeyHasher hashes all of them (see
 * EveInstancedMeshManagerKeyHasher).
 */
@meta.define({"className":"EveInstancedMeshManagerMeshKey","carbon":"EveInstancedMeshManager::MeshKey"})
export class EveInstancedMeshManagerMeshKey
{

  /** geometry (TriGeometryRes*). Carbon initializes it to nullptr. */
  @type.rootRef("TriGeometryRes")
  geometry = null;

  /** materialHash (uint64_t). */
  @type.uint64
  materialHash = 0;

  /** combinedVertexDeclaration (uint32_t). Carbon initializes it to Tr2EffectStateManager::UNINITIALIZED_DECLARATION. */
  @type.uint32
  combinedVertexDeclaration = Tr2EffectStateManager.Unknown;

  /** batchType (TriBatchType). Carbon initializes it to TRIBATCHTYPE_OPAQUE. */
  @type.int32
  batchType = TriBatchType.TRIBATCHTYPE_OPAQUE;

  /** meshIndex (uint32_t). */
  @type.uint32
  meshIndex = 0;

  /** areaIndex (uint32_t). */
  @type.uint32
  areaIndex = 0;

  /** areaCount (uint32_t). */
  @type.uint32
  areaCount = 1;

  /** areaReversed (bool). */
  @type.boolean
  areaReversed = false;

  /** isDynamic (bool): which instance buffer and element layout the mesh's instances use. */
  @type.boolean
  isDynamic = false;

  /**
   * Carbon's `operator==` (h:179-188), which JavaScript cannot overload:
   * geometry identity, batch type, mesh, area range, winding and material
   * hash. Not combinedVertexDeclaration and not isDynamic.
   * @param {EveInstancedMeshManagerMeshKey} other
   * @returns {boolean}
   */
  @meta.renamed("operator==")
  Equals(other)
  {
    return this.geometry === other.geometry &&
      this.batchType === other.batchType &&
      this.meshIndex === other.meshIndex &&
      this.areaIndex === other.areaIndex &&
      this.areaCount === other.areaCount &&
      this.areaReversed === other.areaReversed &&
      this.materialHash === other.materialHash;
  }

}
