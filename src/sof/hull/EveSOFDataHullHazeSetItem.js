// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataHullHazeSetItem (eve) - generated from schema shapeHash 87e1b0e0.... */
@type.define({ className: "EveSOFDataHullHazeSetItem", family: "eve" })
export class EveSOFDataHullHazeSetItem extends CjsModel
{

  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("ColorType")
  colorType = 0;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  boneIndex = -1;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_hazeBrightness (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  hazeBrightness = 1;

  /** m_hazeFalloff (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  hazeFalloff = 6;

  /** m_sourceBrightness (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  sourceBrightness = 2;

  /** m_sourceSize (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  sourceSize = 0.2;

  /** m_boosterGainInfluence (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  boosterGainInfluence = false;

  /** m_lights (PEveSOFDataPointLightAttachmentVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataPointLightAttachment")
  lights = [];

  /** m_saturation (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  saturation = 1;

}
