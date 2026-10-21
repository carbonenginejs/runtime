import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//   struct MeshArea, nested in EveChildInstancedMeshes (line 73); flattened for
//   JS. Our name drops the donor's plural, so it reads as though Carbon had an
//   EveChildInstancedMesh type. It does not; renaming is blocked because SOF
//   writes this className into DNA documents as a string.
import { meta, type } from "#schema";


/**
 * One shader area of an instanced mesh: the effect, its batch type, the area
 * range within the mesh, its cached effect hash and the mesh-group handle it is
 * registered under.
 * The name stays because it is the SOF-persisted `_type` (EveSOF.js:2884), and SOF's layout is the sanctioned divergence.
 */
@meta.carbon("EveChildInstancedMeshes::MeshArea")
export class EveChildInstancedMeshArea
{

  @meta.attribute(meta.PERSIST)
  @type.rootRef("Tr2Effect")
  effect = null;

  @meta.attribute(meta.PERSIST)
  @type.uint32
  batchType = 0;

  @meta.attribute(meta.PERSIST)
  @type.uint32
  areaIndex = 0;

  @meta.attribute(meta.PERSIST)
  @type.uint32
  areaCount = 1;

  /** Carbon MeshArea::alphaCutout (h:78) - one-sided cutout areas are ignored
   * for backface classification when raycasting occluders. */
  @meta.attribute(meta.PERSIST)
  @type.boolean
  alphaCutout = false;

  /** Carbon MeshArea::reversed (h:79) - winding-reversed areas flip the
   * backface test during occluder raycasts. */
  @meta.attribute(meta.PERSIST)
  @type.boolean
  reversed = false;

  @meta.attribute(meta.READ)
  @type.uint64
  effectHash = 0;

  /** Carbon MeshArea::meshGroupHandle (EveChildInstancedMeshes.h:72) - an
   * opaque manager registration handle; runtime state, not persisted. */
  meshGroupHandle = null;
}
