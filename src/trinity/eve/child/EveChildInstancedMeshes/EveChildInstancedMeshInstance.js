// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstancedMeshes.h
//
// The two members are Carbon StaticPerInstanceData's - worldTransform and
// sphereIndex - declared at line 35 of the instanced mesh manager's header, not
// of this one. It lives with the meshes because our EveInstancedMeshManager is
// dropped (src/trinity/dropped). That manager header is deliberately NOT cited
// above: citing it puts its top-level types into lint:donor-coverage, and the
// two it would report are dropped, not missing. Record them there when the
// coverage baseline is next free to edit.
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { io, type } from "#schema";


/**
 * A single placement of an instanced mesh: its transform and the index of its
 * cull sphere in the owning mesh's instance sphere list.
 */
@type.define({ className: "EveChildInstancedMeshInstance", family: "eve/child" })
export class EveChildInstancedMeshInstance extends CjsModel
{
  @io.rebuild("instanceBuffer")
  @io.persist
  @type.mat4
  transform = mat4.create();

  @io.rebuild("instanceBuffer")
  @io.persist
  @type.uint32
  sphereIndex = 0;
}
