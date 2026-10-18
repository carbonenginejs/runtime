// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:251-258
import { meta } from "#schema";
import { identityOf } from "#utils/hash";


/**
 * Carbon EveInstancedMeshManager::KeyHasher (private, h:251-258): the hash
 * functor of m_meshInstances, `CcpHashFNV1` over the MeshKey's raw bytes with
 * the low 32 bits of its material hash as the seed.
 *
 * Adapted: JavaScript objects have no bytes and no address, so the hash
 * cannot be computed from the struct's memory, and a JavaScript Map cannot
 * take a custom hash or equality at all - it compares keys by string or
 * primitive value. So `hash` returns a string that stands for the key in both
 * roles at once: it folds in every field the C++ hash reads, the geometry
 * pointer as its stable per-object identity (`identityOf`, the runtime's
 * stand-in for a pointer value).
 *
 * WHY EVERY FIELD AND NOT ONLY operator=='S SEVEN. In Carbon the hash reads
 * all nine fields while `operator==` compares seven, so two keys that differ
 * only in `isDynamic` or `combinedVertexDeclaration` hash differently and in
 * practice land in separate entries; `operator==` would only merge them on a
 * bucket collision. A static and a dynamic mesh group of the same mesh
 * therefore get separate MeshData in Carbon, which matters because the key's
 * `isDynamic` chooses the instance buffer and element layout. A key from
 * operator=='s seven fields would merge them.
 *
 * Fixes CE-178: Carbon hashes all 40 bytes of MeshKey, including two
 * trailing padding bytes the aggregate initializations at cpp:252-260 and
 * cpp:317-324 leave indeterminate, while `operator==` compares only seven
 * fields (h:179-188, 251-258), breaking `std::unordered_map`'s
 * hash/equality contract; ours keys on all nine fields and nothing else, so
 * equal keys always share an entry and keys differing in any field never do.
 */
@meta.define({ className: "EveInstancedMeshManagerKeyHasher", carbon: "EveInstancedMeshManager::KeyHasher" })
export class EveInstancedMeshManagerKeyHasher
{

  /**
   * Carbon's `operator()` (h:253-257): the key's map identity.
   *
   * Adapted: returns a string standing for both Carbon's hash and its
   * equality, for the reason in the class description.
   * @param {EveInstancedMeshManagerMeshKey} k The key.
   * @returns {string} The key's identity in m_meshInstances.
   */
  @meta.renamed("operator()")
  @meta.adapted
  static hash(k)
  {
    return `${identityOf(k.geometry)}|${k.materialHash}|${k.combinedVertexDeclaration}|${k.batchType}|${k.meshIndex}|${k.areaIndex}|${k.areaCount}|${k.areaReversed ? 1 : 0}|${k.isDynamic ? 1 : 0}`;
  }

}
