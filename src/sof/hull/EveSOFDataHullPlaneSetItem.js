// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

/** EveSOFDataHullPlaneSetItem (eve) - generated from schema shapeHash 40a65460.... */
@type.define({ className: "EveSOFDataHullPlaneSetItem", family: "eve" })
export class EveSOFDataHullPlaneSetItem extends CjsModel
{

  /** m_blinkMode (int32_t) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("BlinkType")
  blinkMode = 0;

  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ColorType")
  colorType = 0;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  boneIndex = -1;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_layer1Transform (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  layer1Transform = vec4.create();

  /** m_layer1Scroll (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  layer1Scroll = vec4.create();

  /** m_layer2Transform (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  layer2Transform = vec4.create();

  /** m_layer2Scroll (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  layer2Scroll = vec4.create();

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  groupIndex = -1;

  /** m_maskMapAtlasIndex (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  maskMapAtlasIndex = 0;

  /** m_phase (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blinkPhase = 0;

  /** m_rate (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blinkRate = 1;

  /** m_dutyCycle (float) - runtime-only Carbon field; not exposed to Blue. */
  dutyCycle = 1;

  /** m_lights (PEveSOFDataPointLightAttachmentVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataPointLightAttachment")
  lights = [];

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 1;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  saturation = 1;

}
