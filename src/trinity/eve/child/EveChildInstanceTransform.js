// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildInstanceContainer.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema eve/child/EveChildInstanceTransform.json).
import { meta } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveChildInstanceTransform (eve/child) - generated from schema shapeHash 9e0ec0c7.... * Native 64-bit size 44; offsets and storage types: trinity/trinity/
 * Eve/SpaceObject/Children/EveChildInstanceContainer.h; Eve/SpaceObject/Children/EveChildInstanceContainer.cpp:13-19.
 */
@meta.define({ className: "EveChildInstanceTransform", family: "eve/child" })
@meta.struct.define({ size: 44 })
export class EveChildInstanceTransform
{

  /** scale (Vector3) */
  @meta.blue.persist
  @meta.struct.FLOAT32_3(0)
  scale = vec3.fromValues(1, 1, 1);

  /** rotation (Quaternion) */
  @meta.blue.persist
  @meta.struct.FLOAT32_4(12)
  @meta.type.quat
  rotation = quat.create();

  /** translation (Vector3) */
  @meta.blue.persist
  @meta.struct.FLOAT32_3(28)
  translation = vec3.create();

  /** boneIndex (int32_t) */
  @meta.blue.persist
  @meta.struct.INT32_1(40)
  boneIndex = -1;

}
