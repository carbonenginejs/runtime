// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//   struct MeshArea, nested in EveChildInstancedMeshes (line 73); flattened for
//   JS. Our name drops the donor's plural, so it reads as though Carbon had an
//   EveChildInstancedMesh type. It does not; renaming is blocked because SOF
//   writes this className into DNA documents as a string.
import { CjsModel } from "#model";
import { edit, invalidation, type } from "#schema";


/**
 * One shader area of an instanced mesh: the effect, its batch type, the area
 * range within the mesh, its cached effect hash and the mesh-group handle it is
 * registered under.
 */
@type.define({ className: "EveChildInstancedMeshArea", family: "eve/child" })
export class EveChildInstancedMeshArea extends CjsModel
{
  @invalidation.rebuild("instanceBuffer")
  @edit.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  @invalidation.rebuild("instanceBuffer")
  @edit.persist
  @type.uint32
  batchType = 0;

  @invalidation.rebuild("instanceBuffer")
  @edit.persist
  @type.uint32
  areaIndex = 0;

  @invalidation.rebuild("instanceBuffer")
  @edit.persist
  @type.uint32
  areaCount = 1;

  /** Carbon MeshArea::alphaCutout (h:78) - one-sided cutout areas are ignored
   * for backface classification when raycasting occluders. */
  @edit.persist
  @type.boolean
  alphaCutout = false;

  /** Carbon MeshArea::reversed (h:79) - winding-reversed areas flip the
   * backface test during occluder raycasts. */
  @edit.persist
  @type.boolean
  reversed = false;

  @edit.read
  @type.uint64
  effectHash = 0;

  /** Carbon MeshArea::meshGroupHandle (EveChildInstancedMeshes.h:72) - an
   * opaque manager registration handle; runtime state, not persisted. */
  meshGroupHandle = null;
}
