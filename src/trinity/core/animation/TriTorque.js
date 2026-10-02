// Source: trinity/trinity/TriRigidOrientation.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/TriTorque.json.).
import { carbon, edit, type } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Native IRoot torque key; TriRigidOrientation_Blue.cpp maps no query interfaces. */
@type.define({ className: "TriTorque", family: "trinityCore" })
export class TriTorque
{

  /**
   * Start of this torque interval in seconds relative to the orientation curve.
   * Sort orders the keys by this value before propagating their initial states.
   * @type {number}
   */
  @edit.readwrite
  @edit.persist
  @type.float32
  time = 0;

  /**
   * Orientation at this key's start, stored as an [x, y, z, w] quaternion.
   * Sort propagates this buffer from the previous key for every key after the first.
   * @type {Float32Array|Float64Array|number[]}
   */
  @edit.readwrite
  @edit.persist
  @type.quat
  rot0 = quat.create();

  /**
   * Initial quaternion-integration rate in [x, y, z] component order, used by
   * the torque-and-drag integrator. Sort propagates it for keys after the first.
   * @type {Float32Array|Float64Array|number[]}
   */
  @edit.readwrite
  @edit.persist
  @type.vec3
  omega0 = vec3.create();

  /**
   * Constant applied torque vector in [x, y, z] component order for this
   * key's interval, integrated using the curve's inertia and drag coefficients.
   * @type {Float32Array|Float64Array|number[]}
   */
  @edit.readwrite
  @edit.persist
  @type.vec3
  torque = vec3.create();

}

carbon.interfaceTable({ interfaces: [], chainTo: null })(TriTorque);
