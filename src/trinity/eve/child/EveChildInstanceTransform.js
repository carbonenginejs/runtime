// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/EveChildInstanceTransform.json).
import { type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveChildInstanceTransform (eve/child) - generated from schema shapeHash 9e0ec0c7.... */
@type.define({ className: "EveChildInstanceTransform", family: "eve/child" })
export class EveChildInstanceTransform extends CjsModel
{

  /** scale (Vector3) */
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  /** rotation (Quaternion) */
  @type.quat
  rotation = quat.create();

  /** translation (Vector3) */
  @type.vec3
  translation = vec3.create();

  /** boneIndex (int32_t) */
  @type.int32
  boneIndex = -1;

}
