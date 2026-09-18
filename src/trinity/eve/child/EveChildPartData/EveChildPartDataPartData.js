// Carbon source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.h
//   struct PartData, nested in EveChildPartData; flattened for JS.
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { edit, type } from "#schema";


/**
 * One modular-object part's logical transform and local-space bounds.
 *
 * Carbon declares this as EveChildPartData::PartData. The JavaScript class is
 * exported under a legal identifier while retaining that nested schema name.
 */
@type.define({ className: "EveChildPartData.PartData", family: "eve/child" })
export class EveChildPartDataPartData extends CjsModel
{
  @edit.persist
  @type.uint32
  partId = 0;

  @edit.persist
  @type.vec3
  position = vec3.create();

  @edit.persist
  @type.quat
  rotation = quat.create();

  @edit.persist
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** Packed CcpMath::Sphere: xyz center and w radius. */
  @edit.persist
  @type.vec4
  boundingSphere = vec4.create();
}
