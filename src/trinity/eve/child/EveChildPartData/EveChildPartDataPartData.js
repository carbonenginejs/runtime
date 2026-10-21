import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPartData.h
//   struct PartData, nested in EveChildPartData; flattened for JS.
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type } from "#schema";


/**
 * One modular-object part's logical transform and local-space bounds.
 *
 * Carbon declares this as EveChildPartData::PartData. The JavaScript class is
 * exported under a legal identifier while retaining that nested schema name.
 */
@meta.define({"className":"EveChildPartData.PartData","carbon":"EveChildPartData::PartData"})
export class EveChildPartDataPartData
{
  @meta.attribute(meta.PERSIST)
  @type.uint32
  partId = 0;

  @meta.attribute(meta.PERSIST)
  @type.vec3
  position = vec3.create();

  @meta.attribute(meta.PERSIST)
  @type.quat
  rotation = quat.create();

  @meta.attribute(meta.PERSIST)
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** Packed CcpMath::Sphere: xyz center and w radius. */
  @meta.attribute(meta.PERSIST)
  @type.vec4
  boundingSphere = vec4.create();
}
