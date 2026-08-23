// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** EveSOFDataHullLightSetItem (eve) - generated from schema shapeHash 81e9a739.... */
@type.define({ className: "EveSOFDataHullLightSetItem", family: "eve" })
export class EveSOFDataHullLightSetItem extends CjsModel
{

  /** m_data.lightColor (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("ColorType")
  lightColor = 0;

  /** m_data.flags (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  flags = 1;

  /** m_data.boneIndex (int) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  boneIndex = -1;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_data.position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_data.radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 0;

  /** m_data.innerRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerRadius = 0;

  /** m_data.brightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightness = 0;

  /** m_data.noiseAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_data.noiseFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseFrequency = 1;

  /** m_data.noiseOctaves (int) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  noiseOctaves = 1;

  static LightType = Object.freeze({
    POINT_LIGHT: 0,
    TEXTURED_POINT_LIGHT: 1,
    SPOT_LIGHT: 2
  });

}
