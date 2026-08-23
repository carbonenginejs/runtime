// Source: trinity/trinity/TriRigidOrientation.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/TriTorque.json.).
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** TriTorque (trinityCore) - generated from schema shapeHash 10c5e0d6.... */
@type.define({ className: "TriTorque", family: "trinityCore" })
export class TriTorque extends CjsModel
{

  /** mTime (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  time = 0;

  /** mRot0 (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rot0 = quat.create();

  /** mOmega0 (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  omega0 = vec3.create();

  /** mTorque (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  torque = vec3.create();

}
