// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveSpaceObjectDecal.h
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * Vertex-stage per-object matrices for a space-object decal - the hull world
 * transform, the decal projection transform and the parent bone transform, each
 * paired with its inverse - as values a renderer packs into a constant buffer.
 */
@type.define({
  className: "DecalVSPerObjectData",
  family: "eve/perObjectData"
})
export class DecalVSPerObjectData extends CjsModel
{
  @type.mat4
  worldMatrix = mat4.create();

  @type.mat4
  invWorldMatrix = mat4.create();

  @type.mat4
  decalMatrix = mat4.create();

  @type.mat4
  inverseDecalMatrix = mat4.create();

  @type.mat4
  parentBoneMatrix = mat4.create();

  @type.mat4
  invParentBoneMatrix = mat4.create();
}
