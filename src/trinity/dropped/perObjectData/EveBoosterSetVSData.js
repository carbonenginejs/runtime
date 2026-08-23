// Maintained as runtime-trinity's backend-neutral booster constant-data contract.
//   trinity/trinity/Eve/SpaceObject/Attachments/EveBoosterSet2.h:51
import { type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec4 } from "#math/vec4";

/**
 * Carbon `EveBoosterSetPerObjectData::VertexShaderData` - the booster set's ship
 * matrix, its intensity/speed/size scalars, and the trail control ring.
 *
 * Named for the struct the producer allocates (`EveBoosterSetVSData`), matching
 * the EveTurretSetVSData/PSData pair rather than Carbon's nested-class spelling.
 */
@type.define({ className: "EveBoosterSetVSData", family: "eve/attachment/boosters" })
export class EveBoosterSetVSData extends CjsModel
{

  /** shipMatrix (Matrix) */
  @type.mat4
  shipMatrix = mat4.create();

  /** boosterIntensity (float) */
  @type.float32
  boosterIntensity = 0;

  /** shipSpeed (float) */
  @type.float32
  shipSpeed = 0;

  /** maxBoosterSize (float) */
  @type.float32
  maxBoosterSize = 0;

  /** padding (float) - Carbon's explicit register pad; never written. */
  @type.float32
  padding = 0;

  /** trailsControlPositions (Vector4[EVE_MAX_CONTROL_POINT_COUNT]) */
  @type.array("vec4")
  trailsControlPositions = Array.from(
    { length: EveBoosterSetVSData.CONTROL_POINT_COUNT },
    () => vec4.create()
  );

  /** trailsControlNormals (Vector4[EVE_MAX_CONTROL_POINT_COUNT]) */
  @type.array("vec4")
  trailsControlNormals = Array.from(
    { length: EveBoosterSetVSData.CONTROL_POINT_COUNT },
    () => vec4.create()
  );

  /** EveBoosterSet2.h:36 - `const unsigned int EVE_MAX_CONTROL_POINT_COUNT = 5`. */
  static CONTROL_POINT_COUNT = 5;

}
